from fastapi import APIRouter, HTTPException

from app.auth import create_access_token, verify_password
from app.database import get_pool
from app.models.schemas import LoginRequest, LoginResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
    try:
        pool = get_pool()
        user = await pool.fetchrow(
            "SELECT id, username, password_hash, display_name, role, is_active FROM admin_users WHERE username = $1",
            payload.username,
        )
        # Deliberately vague error — don't reveal whether the username exists.
        if not user or not verify_password(payload.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid username or password")

        if not user.get("is_active", True):
            raise HTTPException(status_code=403, detail="Account suspended. Contact Super Admin.")

        await pool.execute(
            "UPDATE admin_users SET last_login_at = now() WHERE id = $1", user["id"]
        )

        token = create_access_token(
            {"sub": str(user["id"]), "username": user["username"], "role": user["role"], "type": "admin"}
        )
        return LoginResponse(access_token=token, display_name=user["display_name"], role=user["role"])
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid username or password")
