import re

from fastapi import APIRouter, Depends, HTTPException

from app.auth import get_current_admin
from app.database import get_pool
from app.models.schemas import (
    MemberCreate,
    MemberOut,
    MemberUpdate,
    NewsCreate,
    NewsOut,
    NewsUpdate,
    RuleCreate,
    RuleOut,
    RuleUpdate,
    ServerCreate,
    ServerOut,
    ServerUpdate,
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


# ═══════════════ STATS ═══════════════
@router.patch("/stats/{key}", response_model=StatOut)
async def update_stat(key: str, payload: StatUpdate, admin: dict = Depends(get_current_admin)):
    pool = get_pool()
    fields = payload.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")
    set_sql, values = _set_clause(fields, start_idx=1)
    values.extend([admin["sub"], key])
    row = await pool.fetchrow(
        f"""UPDATE site_stats SET {set_sql}, updated_at = now(), updated_by = ${len(values) - 1}
            WHERE key = ${len(values)}
            RETURNING key, label, value, suffix, icon, sort_order""",
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
        """SELECT id, slug, title, excerpt, body, category, cover_icon, is_published, is_pinned, published_at
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
        """INSERT INTO news_posts (slug, title, excerpt, body, category, cover_icon,
                                    is_published, is_pinned, author_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           RETURNING id, slug, title, excerpt, body, category, cover_icon, is_published, is_pinned, published_at""",
        slug, payload.title, payload.excerpt, payload.body, payload.category,
        payload.cover_icon, payload.is_published, payload.is_pinned, int(admin["sub"]),
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
            RETURNING id, slug, title, excerpt, body, category, cover_icon, is_published, is_pinned, published_at""",
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
        """INSERT INTO members (display_name, role_title, role_group, icon, bio, discord_tag,
                                 is_active, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           RETURNING id, display_name, role_title, role_group, icon, bio, discord_tag, sort_order""",
        payload.display_name, payload.role_title, payload.role_group, payload.icon,
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
            RETURNING id, display_name, role_title, role_group, icon, bio, discord_tag, sort_order""",
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
