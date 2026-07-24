import re

from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_admin, hash_password, require_role
from app.database import get_pool
from app.models.schemas import (
    AdminUserCreate,
    AdminUserOut,
    AdminUserUpdate,
    FormCategoryCreate,
    FormCategoryOut,
    FormCategoryUpdate,
    JourneyStepCreate,
    JourneyStepOut,
    JourneyStepUpdate,
    MemberCreate,
    MemberOut,
    MemberUpdate,
    NewsCreate,
    NewsOut,
    NewsUpdate,
    PartnershipCreate,
    PartnershipOut,
    PartnershipUpdate,
    RuleCreate,
    RuleOut,
    RuleUpdate,
    ServerCreate,
    ServerOut,
    ServerUpdate,
    SiteSettingOut,
    SiteSettingsBatchUpdate,
    StatOut,
    StatUpdate,
    SubmissionOut,
    SubmissionUpdate,
)

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(get_current_admin)])


def _slugify(title: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return slug or "post"


def _set_clause(fields: dict, start_idx: int = 1) -> tuple[str, list]:
    """Build a dynamic SET clause from non-None fields. Returns (sql, values)."""
    parts, values = [], []
    idx = start_idx
    for key, val in fields.items():
        if val is not None:
            parts.append(f"{key} = ${idx}")
            values.append(val)
            idx += 1
    return ", ".join(parts), values


# ═══════════════ SITE SETTINGS / CMS ═══════════════
@router.get("/site-settings", response_model=list[SiteSettingOut])
async def admin_list_site_settings():
    pool = get_pool()
    rows = await pool.fetch("SELECT key, page, section, value FROM site_settings ORDER BY page, key")
    return [dict(r) for r in rows]


@router.patch("/site-settings", response_model=list[SiteSettingOut])
async def admin_update_site_settings(payload: SiteSettingsBatchUpdate, admin: dict = Depends(get_current_admin)):
    pool = get_pool()
    admin_id = int(admin["sub"])
    async with pool.acquire() as conn:
        async with conn.transaction():
            for item in payload.settings:
                page = item.page or item.key.split(".")[0] if "." in item.key else "global"
                section = item.section or "general"
                await conn.execute(
                    """INSERT INTO site_settings (key, page, section, value, updated_at, updated_by)
                       VALUES ($1, $2, $3, $4, now(), $5)
                       ON CONFLICT (key) DO UPDATE
                       SET value = EXCLUDED.value, page = EXCLUDED.page, section = EXCLUDED.section,
                           updated_at = now(), updated_by = EXCLUDED.updated_by""",
                    item.key, page, section, item.value, admin_id
                )
    rows = await pool.fetch("SELECT key, page, section, value FROM site_settings ORDER BY page, key")
    return [dict(r) for r in rows]


# ═══════════════ STATS ═══════════════
@router.get("/stats", response_model=list[StatOut])
async def admin_list_stats():
    pool = get_pool()
    rows = await pool.fetch("SELECT key, label, value, suffix, icon, image_url, sort_order FROM site_stats ORDER BY sort_order ASC")
    return [dict(r) for r in rows]


@router.patch("/stats/{key}", response_model=StatOut)
async def update_stat(key: str, payload: StatUpdate, admin: dict = Depends(get_current_admin)):
    pool = get_pool()
    fields = payload.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    set_sql, values = _set_clause(fields, start_idx=1)
    admin_id = int(admin["sub"])
    values.extend([admin_id, key])
    row = await pool.fetchrow(
        f"""UPDATE site_stats SET {set_sql}, updated_at = now(), updated_by = ${len(values) - 1}
            WHERE key = ${len(values)}
            RETURNING key, label, value, suffix, icon, image_url, sort_order""",
        *values,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Stat not found")
    return dict(row)



# ═══════════════ SERVERS ═══════════════
@router.post("/servers", response_model=ServerOut, status_code=201)
async def create_server(payload: ServerCreate):
    pool = get_pool()
    row = await pool.fetchrow(
        """INSERT INTO servers (name, server_type, ip_address, port, edition, status,
                                 players_online, players_max, description, is_whitelisted,
                                 is_featured, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           RETURNING id, name, server_type, ip_address, port, edition, status, players_online,
                     players_max, description, is_whitelisted, is_featured, sort_order""",
        payload.name, payload.server_type, payload.ip_address, payload.port, payload.edition,
        payload.status, payload.players_online, payload.players_max, payload.description,
        payload.is_whitelisted, payload.is_featured, payload.sort_order,
    )
    return dict(row)


@router.patch("/servers/{server_id}", response_model=ServerOut)
async def update_server(server_id: int, payload: ServerUpdate):
    pool = get_pool()
    fields = payload.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    set_sql, values = _set_clause(fields)
    values.append(server_id)
    row = await pool.fetchrow(
        f"""UPDATE servers SET {set_sql}, updated_at = now() WHERE id = ${len(values)}
            RETURNING id, name, server_type, ip_address, port, edition, status, players_online,
                      players_max, description, is_whitelisted, is_featured, sort_order""",
        *values,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Server not found")
    return dict(row)


@router.delete("/servers/{server_id}", status_code=204)
async def delete_server(server_id: int):
    pool = get_pool()
    result = await pool.execute("DELETE FROM servers WHERE id = $1", server_id)
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Server not found")


# ═══════════════ NEWS ═══════════════
@router.get("/news", response_model=list[NewsOut])
async def admin_list_news():
    pool = get_pool()
    rows = await pool.fetch(
        """SELECT id, slug, title, excerpt, body, category, cover_icon, image_url, is_published, is_pinned, published_at
           FROM news_posts ORDER BY published_at DESC"""
    )
    return [dict(r) for r in rows]


@router.post("/news", response_model=NewsOut, status_code=201)
async def create_news(payload: NewsCreate, admin: dict = Depends(get_current_admin)):
    pool = get_pool()
    base_slug = _slugify(payload.title)
    slug = base_slug
    suffix = 1
    while await pool.fetchval("SELECT 1 FROM news_posts WHERE slug = $1", slug):
        suffix += 1
        slug = f"{base_slug}-{suffix}"

    row = await pool.fetchrow(
        """INSERT INTO news_posts (slug, title, excerpt, body, category, cover_icon, image_url,
                                    is_published, is_pinned, author_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
           RETURNING id, slug, title, excerpt, body, category, cover_icon, image_url, is_published, is_pinned, published_at""",
        slug, payload.title, payload.excerpt, payload.body, payload.category,
        payload.cover_icon, payload.image_url, payload.is_published, payload.is_pinned, int(admin["sub"]),
    )
    return dict(row)


@router.patch("/news/{news_id}", response_model=NewsOut)
async def update_news(news_id: int, payload: NewsUpdate):
    pool = get_pool()
    fields = payload.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    set_sql, values = _set_clause(fields)
    values.append(news_id)
    row = await pool.fetchrow(
        f"""UPDATE news_posts SET {set_sql}, updated_at = now() WHERE id = ${len(values)}
            RETURNING id, slug, title, excerpt, body, category, cover_icon, image_url, is_published, is_pinned, published_at""",
        *values,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Post not found")
    return dict(row)


@router.delete("/news/{news_id}", status_code=204)
async def delete_news(news_id: int):
    pool = get_pool()
    result = await pool.execute("DELETE FROM news_posts WHERE id = $1", news_id)
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Post not found")


# ═══════════════ MEMBERS ═══════════════
@router.post("/members", response_model=MemberOut, status_code=201)
async def create_member(payload: MemberCreate):
    pool = get_pool()
    row = await pool.fetchrow(
        """INSERT INTO members (display_name, role_title, role_group, icon, image_url, bio, discord_tag,
                                 is_active, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           RETURNING id, display_name, role_title, role_group, icon, image_url, bio, discord_tag, sort_order""",
        payload.display_name, payload.role_title, payload.role_group, payload.icon, payload.image_url,
        payload.bio, payload.discord_tag, payload.is_active, payload.sort_order,
    )
    return dict(row)


@router.patch("/members/{member_id}", response_model=MemberOut)
async def update_member(member_id: int, payload: MemberUpdate):
    pool = get_pool()
    fields = payload.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    set_sql, values = _set_clause(fields)
    values.append(member_id)
    row = await pool.fetchrow(
        f"""UPDATE members SET {set_sql} WHERE id = ${len(values)}
            RETURNING id, display_name, role_title, role_group, icon, image_url, bio, discord_tag, sort_order""",
        *values,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Member not found")
    return dict(row)


@router.delete("/members/{member_id}", status_code=204)
async def delete_member(member_id: int):
    pool = get_pool()
    result = await pool.execute("DELETE FROM members WHERE id = $1", member_id)
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Member not found")


# ═══════════════ JOURNEY STEPS ═══════════════
@router.get("/journey-steps", response_model=list[JourneyStepOut])
async def admin_list_journey_steps():
    pool = get_pool()
    rows = await pool.fetch(
        "SELECT id, step_number, title, description, icon, image_url, sort_order FROM journey_steps ORDER BY sort_order ASC, step_number ASC"
    )
    return [dict(r) for r in rows]


@router.post("/journey-steps", response_model=JourneyStepOut, status_code=201)
async def create_journey_step(payload: JourneyStepCreate):
    pool = get_pool()
    row = await pool.fetchrow(
        """INSERT INTO journey_steps (step_number, title, description, icon, image_url, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6)
           RETURNING id, step_number, title, description, icon, image_url, sort_order""",
        payload.step_number, payload.title, payload.description, payload.icon, payload.image_url, payload.sort_order
    )
    return dict(row)


@router.patch("/journey-steps/{step_id}", response_model=JourneyStepOut)
async def update_journey_step(step_id: int, payload: JourneyStepUpdate):
    pool = get_pool()
    fields = payload.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    set_sql, values = _set_clause(fields)
    values.append(step_id)
    row = await pool.fetchrow(
        f"""UPDATE journey_steps SET {set_sql} WHERE id = ${len(values)}
            RETURNING id, step_number, title, description, icon, image_url, sort_order""",
        *values,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Journey step not found")
    return dict(row)


@router.delete("/journey-steps/{step_id}", status_code=204)
async def delete_journey_step(step_id: int):
    pool = get_pool()
    result = await pool.execute("DELETE FROM journey_steps WHERE id = $1", step_id)
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Journey step not found")


# ═══════════════ RULES ═══════════════
@router.post("/rules", response_model=RuleOut, status_code=201)
async def create_rule(payload: RuleCreate):
    pool = get_pool()
    row = await pool.fetchrow(
        """INSERT INTO rules (title, body, sort_order) VALUES ($1,$2,$3)
           RETURNING id, title, body, sort_order""",
        payload.title, payload.body, payload.sort_order,
    )
    return dict(row)


@router.patch("/rules/{rule_id}", response_model=RuleOut)
async def update_rule(rule_id: int, payload: RuleUpdate):
    pool = get_pool()
    fields = payload.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    set_sql, values = _set_clause(fields)
    values.append(rule_id)
    row = await pool.fetchrow(
        f"""UPDATE rules SET {set_sql}, updated_at = now() WHERE id = ${len(values)}
            RETURNING id, title, body, sort_order""",
        *values,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Rule not found")
    return dict(row)


@router.delete("/rules/{rule_id}", status_code=204)
async def delete_rule(rule_id: int):
    pool = get_pool()
    result = await pool.execute("DELETE FROM rules WHERE id = $1", rule_id)
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Rule not found")


# ═══════════════ SUBMISSIONS (form inbox, categorized) ═══════════════
@router.get("/submissions", response_model=list[SubmissionOut])
async def list_submissions(status: str | None = None, category_key: str | None = None):
    pool = get_pool()
    query = """
        SELECT s.id, s.category_id, fc.label AS category_label, s.full_name, s.contact,
               s.subject, s.message, s.status, s.admin_notes, s.created_at
        FROM submissions s
        JOIN form_categories fc ON fc.id = s.category_id
        WHERE 1=1
    """
    conditions, values, idx = [], [], 1
    if status:
        conditions.append(f"s.status = ${idx}")
        values.append(status)
        idx += 1
    if category_key:
        conditions.append(f"fc.key = ${idx}")
        values.append(category_key)
        idx += 1
    if conditions:
        query += " AND " + " AND ".join(conditions)
    query += " ORDER BY s.created_at DESC"

    rows = await pool.fetch(query, *values)
    return [dict(r) for r in rows]


@router.patch("/submissions/{submission_id}", response_model=SubmissionOut)
async def update_submission(submission_id: str, payload: SubmissionUpdate, admin: dict = Depends(get_current_admin)):
    pool = get_pool()
    fields = payload.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    fields["handled_by"] = int(admin["sub"])
    set_sql, values = _set_clause(fields)
    values.append(submission_id)
    row = await pool.fetchrow(
        f"""UPDATE submissions SET {set_sql}, updated_at = now() WHERE id = ${len(values)}
            RETURNING id, category_id, full_name, contact, subject, message, status, admin_notes, created_at""",
        *values,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Submission not found")
    return dict(row)


@router.delete("/submissions/{submission_id}", status_code=204)
async def delete_submission(submission_id: str):
    pool = get_pool()
    result = await pool.execute("DELETE FROM submissions WHERE id = $1", submission_id)
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Submission not found")


# ═══════════════ PARTNERSHIPS ═══════════════
@router.get("/partnerships", response_model=list[PartnershipOut])
async def admin_list_partnerships():
    pool = get_pool()
    rows = await pool.fetch(
        """SELECT id, title, partner_type, logo_url, description, website_url, discord_url,
                  is_featured, is_active, sort_order, created_at
           FROM partnerships ORDER BY is_featured DESC, sort_order ASC, created_at DESC"""
    )
    return [dict(r) for r in rows]


@router.post("/partnerships", response_model=PartnershipOut, status_code=201)
async def create_partnership(payload: PartnershipCreate):
    pool = get_pool()
    row = await pool.fetchrow(
        """INSERT INTO partnerships (title, partner_type, logo_url, description, website_url,
                                     discord_url, is_featured, is_active, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           RETURNING id, title, partner_type, logo_url, description, website_url, discord_url,
                     is_featured, is_active, sort_order, created_at""",
        payload.title, payload.partner_type, payload.logo_url, payload.description,
        payload.website_url, payload.discord_url, payload.is_featured, payload.is_active, payload.sort_order
    )
    return dict(row)


@router.patch("/partnerships/{partnership_id}", response_model=PartnershipOut)
async def update_partnership(partnership_id: int, payload: PartnershipUpdate):
    pool = get_pool()
    fields = payload.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    set_sql, values = _set_clause(fields)
    values.append(partnership_id)
    row = await pool.fetchrow(
        f"""UPDATE partnerships SET {set_sql} WHERE id = ${len(values)}
            RETURNING id, title, partner_type, logo_url, description, website_url, discord_url,
                      is_featured, is_active, sort_order, created_at""",
        *values,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Partnership not found")
    return dict(row)


@router.delete("/partnerships/{partnership_id}", status_code=204)
async def delete_partnership(partnership_id: int):
    pool = get_pool()
    result = await pool.execute("DELETE FROM partnerships WHERE id = $1", partnership_id)
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Partnership not found")


# ═══════════════ FORM CATEGORIES ADMIN ═══════════════
@router.get("/form-categories", response_model=list[FormCategoryOut])
async def admin_list_form_categories():
    pool = get_pool()
    rows = await pool.fetch("SELECT id, key, label, description FROM form_categories ORDER BY sort_order ASC")
    return [dict(r) for r in rows]


@router.post("/form-categories", response_model=FormCategoryOut, status_code=201)
async def create_form_category(payload: FormCategoryCreate):
    pool = get_pool()
    row = await pool.fetchrow(
        """INSERT INTO form_categories (key, label, description, is_active, sort_order)
           VALUES ($1,$2,$3,$4,$5)
           RETURNING id, key, label, description""",
        payload.key, payload.label, payload.description, payload.is_active, payload.sort_order
    )
    return dict(row)


@router.patch("/form-categories/{cat_id}", response_model=FormCategoryOut)
async def update_form_category(cat_id: int, payload: FormCategoryUpdate):
    pool = get_pool()
    fields = payload.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    set_sql, values = _set_clause(fields)
    values.append(cat_id)
    row = await pool.fetchrow(
        f"""UPDATE form_categories SET {set_sql} WHERE id = ${len(values)}
            RETURNING id, key, label, description""",
        *values,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Category not found")
    return dict(row)


@router.delete("/form-categories/{cat_id}", status_code=204)
async def delete_form_category(cat_id: int):
    pool = get_pool()
    result = await pool.execute("DELETE FROM form_categories WHERE id = $1", cat_id)
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Category not found")


# ═══════════════ SUPER ADMIN USER MANAGEMENT ═══════════════
@router.get("/users", response_model=list[AdminUserOut], dependencies=[Depends(require_role("super_admin", "owner"))])
async def list_admin_users():
    pool = get_pool()
    rows = await pool.fetch(
        "SELECT id, username, display_name, role, is_active, last_login_at, created_at FROM admin_users ORDER BY id ASC"
    )
    return [dict(r) for r in rows]


@router.post("/users", response_model=AdminUserOut, status_code=201, dependencies=[Depends(require_role("super_admin", "owner"))])
async def create_admin_user(payload: AdminUserCreate):
    pool = get_pool()
    hashed = hash_password(payload.password)
    try:
        row = await pool.fetchrow(
            """INSERT INTO admin_users (username, password_hash, display_name, role, is_active)
               VALUES ($1,$2,$3,$4,$5)
               RETURNING id, username, display_name, role, is_active, last_login_at, created_at""",
            payload.username, hashed, payload.display_name, payload.role, payload.is_active
        )
        return dict(row)
    except Exception as e:
        if "unique" in str(e).lower():
            raise HTTPException(status_code=400, detail="Username already exists")
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/users/{user_id}", response_model=AdminUserOut, dependencies=[Depends(require_role("super_admin", "owner"))])
async def update_admin_user(user_id: int, payload: AdminUserUpdate):
    pool = get_pool()
    fields = payload.model_dump(exclude_unset=True)
    if "password" in fields:
        raw_pwd = fields.pop("password")
        if raw_pwd and raw_pwd.strip():
            fields["password_hash"] = hash_password(raw_pwd.strip())

    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    set_sql, values = _set_clause(fields)
    values.append(user_id)
    row = await pool.fetchrow(
        f"""UPDATE admin_users SET {set_sql} WHERE id = ${len(values)}
            RETURNING id, username, display_name, role, is_active, last_login_at, created_at""",
        *values,
    )
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    return dict(row)


@router.delete("/users/{user_id}", status_code=204, dependencies=[Depends(require_role("super_admin", "owner"))])
async def delete_admin_user(user_id: int, current_admin: dict = Depends(get_current_admin)):
    if int(current_admin["sub"]) == user_id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    pool = get_pool()
    result = await pool.execute("DELETE FROM admin_users WHERE id = $1", user_id)
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="User not found")

