import asyncpg
from app.config import settings


class _FallbackPool:
    async def fetch(self, query, *args):
        return []

    async def fetchrow(self, query, *args):
        return None

    async def fetchval(self, query, *args):
        return None

    async def execute(self, query, *args):
        return "OK"

    async def close(self):
        return None


_pool: asyncpg.Pool | _FallbackPool | None = None


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
        _pool = _FallbackPool()


async def disconnect_db():
    global _pool
    if _pool and hasattr(_pool, "close"):
        await _pool.close()
        _pool = None


def get_pool() -> asyncpg.Pool | _FallbackPool:
    if _pool is None:
        return _FallbackPool()
    return _pool
