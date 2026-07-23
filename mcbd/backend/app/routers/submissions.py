import hashlib

from fastapi import APIRouter, HTTPException, Request

from app.database import get_pool
from app.models.schemas import SubmissionCreate

router = APIRouter(tags=["submissions"])


def _hash_ip(request: Request) -> str:
    ip = request.client.host if request.client else "unknown"
    return hashlib.sha256(ip.encode()).hexdigest()


@router.post("/submissions", status_code=201)
async def create_submission(payload: SubmissionCreate, request: Request):
    # Honeypot: bots fill every field including hidden ones. Pretend success, do nothing.
    if payload.website:
        return {"status": "received"}

    pool = get_pool()
    category = await pool.fetchrow(
        "SELECT id FROM form_categories WHERE key = $1 AND is_active = true",
        payload.category_key,
    )
    if not category:
        raise HTTPException(status_code=400, detail="Unknown or inactive category")

    ip_hash = _hash_ip(request)

    await pool.execute(
        """INSERT INTO submissions (category_id, full_name, contact, subject, message, ip_hash)
           VALUES ($1, $2, $3, $4, $5, $6)""",
        category["id"],
        payload.full_name,
        payload.contact,
        payload.subject,
        payload.message,
        ip_hash,
    )
    return {"status": "received"}
