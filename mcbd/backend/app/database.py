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

                CREATE TABLE IF NOT EXISTS site_settings (
                    key         VARCHAR(100) PRIMARY KEY,
                    page        VARCHAR(50) NOT NULL DEFAULT 'global',
                    section     VARCHAR(50) NOT NULL DEFAULT 'general',
                    value       TEXT NOT NULL,
                    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
                    updated_by  INT REFERENCES admin_users(id)
                );

                INSERT INTO site_settings (key, page, section, value)
                SELECT * FROM (VALUES
                    ('global.discord_url', 'global', 'links', 'https://discord.gg/minecraftbd'),
                    ('global.facebook_url', 'global', 'links', 'https://facebook.com'),
                    ('global.community_name', 'global', 'branding', 'Minecraft Bangladesh'),
                    ('global.server_ip', 'global', 'server', 'play.mcbd.gg'),
                    ('home.hero_badge', 'home', 'hero', '52,000+ MEMBERS ONLINE'),
                    ('home.hero_subbadge', 'home', 'hero', 'VERIFIED COMMUNITY NETWORK'),
                    ('home.hero_title_1', 'home', 'hero', 'MINECRAFT'),
                    ('home.hero_title_2', 'home', 'hero', 'BANGLADESH'),
                    ('home.hero_typewriter', 'home', 'hero', 'BUILD A CASTLE, NOT AN ARGUMENT.|52,000+ BUILDERS|BANGLADESH #1 MC HUB'),
                    ('home.hero_description', 'home', 'hero', 'Join Minecraft Bangladesh for survival worlds, redstone labs, and community events across Bangladesh — the biggest local Minecraft family.'),
                    ('home.about_eyebrow', 'home', 'about', '📖 THE SPAWN POINT'),
                    ('home.about_title', 'home', 'about', 'Who We Are'),
                    ('home.about_desc', 'home', 'about', 'A vibrant community of builders, redstoners, event hosts, and Minecraft fans across Bangladesh — where creativity and teamwork thrive.'),
                    ('news.header_eyebrow', 'news', 'header', '📰 THE NOTICE BOARD'),
                    ('news.header_title', 'news', 'header', 'News & Announcements'),
                    ('news.header_desc', 'news', 'header', 'Stay updated with the latest server news, events, and community announcements.'),
                    ('members.header_eyebrow', 'members', 'header', '👑 THE CREW'),
                    ('members.header_title', 'members', 'header', 'Community Leaders'),
                    ('members.header_desc', 'members', 'header', 'Meet the staff, builders, moderators and community leaders who keep Minecraft Bangladesh running.'),
                    ('about.header_eyebrow', 'about', 'header', '📜 COMMUNITY GUIDELINES'),
                    ('about.header_title', 'about', 'header', 'About & Server Rules'),
                    ('about.header_desc', 'about', 'header', 'Learn how to join, stay safe, and play together in one of Bangladesh’s friendliest Minecraft communities.'),
                    ('stats.header_eyebrow', 'stats', 'header', '📊 LIVE TELEMETRY'),
                    ('stats.header_title', 'stats', 'header', 'Community Statistics'),
                    ('stats.header_desc', 'stats', 'header', 'Track our active players, online communities, servers, and events in real time.'),
                    ('join.header_eyebrow', 'join', 'header', '✉️ SEND A MESSAGE'),
                    ('join.header_title', 'join', 'header', 'Join Us / Contact'),
                    ('join.header_desc', 'join', 'header', 'Submit your join request, support ticket, or community feedback using the form below.' )
                ) AS t(key, page, section, value)
                WHERE NOT EXISTS (SELECT 1 FROM site_settings)
                ON CONFLICT (key) DO NOTHING;
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
