from fastapi import APIRouter, HTTPException

from app.database import get_pool
from app.models.schemas import (
    FormCategoryOut,
    MemberOut,
    NewsOut,
    PartnershipOut,
    RuleOut,
    ServerOut,
    StatOut,
)

router = APIRouter(tags=["public"])


@router.get("/stats", response_model=list[StatOut])
async def list_stats():
    try:
        pool = get_pool()
        rows = await pool.fetch(
            "SELECT key, label, value, suffix, icon, sort_order FROM site_stats ORDER BY sort_order"
        )
        return [dict(r) for r in rows]
    except Exception:
        return []


@router.get("/servers", response_model=list[ServerOut])
async def list_servers():
    try:
        pool = get_pool()
        rows = await pool.fetch(
            """SELECT id, name, server_type, ip_address, port, edition, status,
                      players_online, players_max, description, is_whitelisted,
                      is_featured, sort_order
               FROM servers ORDER BY is_featured DESC, sort_order"""
        )
        return [dict(r) for r in rows]
    except Exception:
        return []


@router.get("/news", response_model=list[NewsOut])
async def list_news(limit: int = 20, category: str | None = None):
    try:
        pool = get_pool()
        if category:
            rows = await pool.fetch(
                """SELECT id, slug, title, excerpt, body, category, cover_icon, image_url, is_published, is_pinned, published_at
                   FROM news_posts
                   WHERE is_published = true AND category = $1
                   ORDER BY is_pinned DESC, published_at DESC LIMIT $2""",
                category,
                limit,
            )
        else:
            rows = await pool.fetch(
                """SELECT id, slug, title, excerpt, body, category, cover_icon, image_url, is_published, is_pinned, published_at
                   FROM news_posts
                   WHERE is_published = true
                   ORDER BY is_pinned DESC, published_at DESC LIMIT $1""",
                limit,
            )
        return [dict(r) for r in rows]
    except Exception:
        return []


@router.get("/news/{slug}", response_model=NewsOut)
async def get_news_post(slug: str):
    try:
        pool = get_pool()
        row = await pool.fetchrow(
            """SELECT id, slug, title, excerpt, body, category, cover_icon, image_url, is_pinned, published_at
               FROM news_posts WHERE slug = $1 AND is_published = true""",
            slug,
        )
        if not row:
            raise HTTPException(status_code=404, detail="Post not found")
        return dict(row)
    except Exception:
        raise HTTPException(status_code=404, detail="Post not found")


@router.get("/members", response_model=list[MemberOut])
async def list_members():
    try:
        pool = get_pool()
        rows = await pool.fetch(
            """SELECT id, display_name, role_title, role_group, icon, bio, discord_tag, sort_order
               FROM members WHERE is_active = true ORDER BY sort_order"""
        )
        return [dict(r) for r in rows]
    except Exception:
        return []


@router.get("/rules", response_model=list[RuleOut])
async def list_rules():
    try:
        pool = get_pool()
        rows = await pool.fetch("SELECT id, title, body, sort_order FROM rules ORDER BY sort_order")
        return [dict(r) for r in rows]
    except Exception:
        return []


@router.get("/form-categories", response_model=list[FormCategoryOut])
async def list_form_categories():
    try:
        pool = get_pool()
        rows = await pool.fetch(
            """SELECT id, key, label, description FROM form_categories
               WHERE is_active = true ORDER BY sort_order"""
        )
        return [dict(r) for r in rows]
    except Exception:
        return []


@router.get("/partnerships", response_model=list[PartnershipOut])
async def list_partnerships():
    try:
        pool = get_pool()
        rows = await pool.fetch(
            """SELECT id, title, partner_type, logo_url, description, website_url, discord_url,
                      is_featured, is_active, sort_order, created_at
               FROM partnerships
               WHERE is_active = true
               ORDER BY is_featured DESC, sort_order ASC, created_at DESC"""
        )
        return [dict(r) for r in rows]
    except Exception:
        return []
