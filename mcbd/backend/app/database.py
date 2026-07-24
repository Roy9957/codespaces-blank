import asyncpg
from app.config import settings

_pool: asyncpg.Pool | None = None


async def connect_db():
    global _pool
    try:
        _pool = await asyncpg.create_pool(
            settings.database_url,
            min_size=2,
            max_size=10,
            command_timeout=30,
        )
        # Ensure database schema is up-to-date with new tables & columns
        async with _pool.acquire() as conn:
            await conn.execute("""
                ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

                CREATE TABLE IF NOT EXISTS partnerships (
                    id            SERIAL PRIMARY KEY,
                    title         VARCHAR(120) NOT NULL,
                    partner_type  VARCHAR(40) NOT NULL DEFAULT 'community',
                    logo_url      VARCHAR(500),
                    description   TEXT,
                    website_url   VARCHAR(500),
                    discord_url   VARCHAR(500),
                    is_featured   BOOLEAN NOT NULL DEFAULT false,
                    is_active     BOOLEAN NOT NULL DEFAULT true,
                    sort_order    INT NOT NULL DEFAULT 0,
                    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
                );
            """)
    except Exception:
        _pool = None


async def disconnect_db():
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("Database pool not initialized. Did startup run?")
    return _pool
