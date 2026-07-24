-- ═══════════════════════════════════════════════════════════
-- Minecraft Bangladesh — PostgreSQL schema
-- Run with: psql -U youruser -d mcbd -f schema.sql
-- ═══════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()

-- ─── Admin users (the only people who can log into /admin) ───
CREATE TABLE admin_users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,   -- bcrypt hash, never plaintext
    display_name  VARCHAR(100) NOT NULL,
    role          VARCHAR(30) NOT NULL DEFAULT 'moderator', -- 'owner' | 'admin' | 'moderator'
    is_active     BOOLEAN NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at TIMESTAMPTZ
);

-- ─── Site-wide live stats (the numbers shown on the homepage) ───
CREATE TABLE site_stats (
    key         VARCHAR(50) PRIMARY KEY,   -- e.g. 'total_members', 'discord_online'
    label       VARCHAR(100) NOT NULL,     -- e.g. 'Community Members'
    value       BIGINT NOT NULL DEFAULT 0,
    suffix      VARCHAR(10) DEFAULT '',    -- e.g. '+', 'K'
    icon        VARCHAR(50) DEFAULT 'fa-solid fa-cube',
    image_url   VARCHAR(500),              -- optional custom stat icon/image URL
    sort_order  INT NOT NULL DEFAULT 0,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by  INT REFERENCES admin_users(id)
);

-- ─── Partnerships & Collaborations (Homepage Ticker + Popup) ───
CREATE TABLE partnerships (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(150) NOT NULL,
    partner_type VARCHAR(50) NOT NULL DEFAULT 'community', -- 'community'|'tech'|'creator'|'event'
    logo_url    VARCHAR(500),
    description TEXT,
    website_url VARCHAR(500),
    discord_url VARCHAR(500),
    is_featured BOOLEAN NOT NULL DEFAULT false,
    is_active   BOOLEAN NOT NULL DEFAULT true,
    sort_order  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Journey / How to Get Involved Steps ───
CREATE TABLE journey_steps (
    id          SERIAL PRIMARY KEY,
    step_number INT NOT NULL DEFAULT 1,
    title       VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    icon        VARCHAR(50) DEFAULT 'fa-solid fa-compass',
    image_url   VARCHAR(500),
    sort_order  INT NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Servers (availability / status / how to join) ───
CREATE TABLE servers (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    server_type   VARCHAR(30) NOT NULL,        -- 'survival' | 'creative' | 'minigame' | 'redstone' | 'pvp'
    ip_address    VARCHAR(100),                -- e.g. play.mcbd.gg
    port          INT DEFAULT 25565,
    edition       VARCHAR(20) NOT NULL DEFAULT 'both', -- 'java' | 'bedrock' | 'both'
    status        VARCHAR(20) NOT NULL DEFAULT 'online', -- 'online' | 'offline' | 'maintenance'
    players_online INT NOT NULL DEFAULT 0,
    players_max    INT NOT NULL DEFAULT 100,
    description   TEXT,
    is_whitelisted BOOLEAN NOT NULL DEFAULT false,
    is_featured    BOOLEAN NOT NULL DEFAULT false,
    sort_order     INT NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── News / announcements feed ───
CREATE TABLE news_posts (
    id          SERIAL PRIMARY KEY,
    slug        VARCHAR(160) UNIQUE NOT NULL,
    title       VARCHAR(200) NOT NULL,
    excerpt     VARCHAR(400),
    body        TEXT NOT NULL,               -- markdown or plain text
    category    VARCHAR(40) NOT NULL DEFAULT 'announcement', -- 'announcement'|'event'|'update'|'contest'
    cover_icon  VARCHAR(50) DEFAULT 'fa-solid fa-newspaper',
    image_url   VARCHAR(500),                -- optional cover image URL
    is_published BOOLEAN NOT NULL DEFAULT true,
    is_pinned    BOOLEAN NOT NULL DEFAULT false,
    published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    author_id    INT REFERENCES admin_users(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_news_published ON news_posts(is_published, published_at DESC);

-- ─── Community leaders / staff (Members page) ───
CREATE TABLE members (
    id          SERIAL PRIMARY KEY,
    display_name VARCHAR(100) NOT NULL,
    role_title   VARCHAR(100) NOT NULL,     -- e.g. 'Community Manager'
    role_group   VARCHAR(30) NOT NULL DEFAULT 'staff', -- 'owner'|'staff'|'mod'|'builder'|'creator'
    icon         VARCHAR(50) DEFAULT 'fa-solid fa-user',
    image_url    VARCHAR(500),              -- avatar photo URL
    bio          VARCHAR(300),
    discord_tag  VARCHAR(60),
    is_active    BOOLEAN NOT NULL DEFAULT true,
    sort_order   INT NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Community rules (About/Rules page, admin-editable) ───
CREATE TABLE rules (
    id          SERIAL PRIMARY KEY,
    title       VARCHAR(150) NOT NULL,
    body        TEXT NOT NULL,
    sort_order  INT NOT NULL DEFAULT 0,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Form categories ───
CREATE TABLE form_categories (
    id          SERIAL PRIMARY KEY,
    key         VARCHAR(40) UNIQUE NOT NULL,
    label       VARCHAR(100) NOT NULL,
    description VARCHAR(300),
    is_active   BOOLEAN NOT NULL DEFAULT true,
    sort_order  INT NOT NULL DEFAULT 0
);

-- ─── Form submissions ───
CREATE TABLE submissions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id  INT NOT NULL REFERENCES form_categories(id),
    full_name    VARCHAR(150) NOT NULL,
    contact      VARCHAR(150) NOT NULL,
    subject      VARCHAR(200),
    message      TEXT NOT NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'new',
    admin_notes  TEXT,
    handled_by   INT REFERENCES admin_users(id),
    ip_hash      VARCHAR(64),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_submissions_status ON submissions(status, created_at DESC);
CREATE INDEX idx_submissions_category ON submissions(category_id);

-- ─── SEED DATA ───
INSERT INTO site_stats (key, label, value, suffix, icon, sort_order) VALUES
('total_members', 'Community Members', 52000, '+', 'fa-solid fa-users', 1),
('discord_online', 'Online on Discord', 1800, '+', 'fa-brands fa-discord', 2),
('active_servers', 'Active Servers', 6, '', 'fa-solid fa-server', 3),
('events_hosted', 'Events Hosted', 140, '+', 'fa-solid fa-trophy', 4);

INSERT INTO partnerships (title, partner_type, logo_url, description, website_url, discord_url, is_featured, sort_order) VALUES
('Bangladesh MC Network', 'COMMUNITY PARTNER', 'logo.png', 'Collaborating on national build contests and cross-community tournaments across Bangladesh.', 'https://mcbd.gg', 'https://discord.gg/minecraftbd', true, 1),
('BD Redstone Guild', 'TECH PARTNER', 'logo.png', 'Technical workshops, redstone showcases, and automation engineering competitions for advanced builders.', 'https://mcbd.gg', 'https://discord.gg/minecraftbd', false, 2),
('Creators Alliance', 'CREATOR HUB', 'logo.png', 'Supporting local Minecraft streamers, YouTubers, and video creators across Bangladesh.', 'https://mcbd.gg', 'https://discord.gg/minecraftbd', false, 3),
('BD Esports Hub', 'EVENT PARTNER', 'logo.png', 'Co-hosting esports championships, minigame leagues, and community game nights.', 'https://mcbd.gg', 'https://discord.gg/minecraftbd', false, 4);

INSERT INTO journey_steps (step_number, title, description, icon, sort_order) VALUES
(1, 'Join the Hub', 'Hop into our Facebook group or Discord server — takes 30 seconds, no application needed.', 'fa-solid fa-users', 1),
(2, 'Say Hello', 'Introduce yourself in #new-arrivals. Tell us what you build — survival, redstone, or pure chaos.', 'fa-solid fa-comments', 2),
(3, 'Join Channels', 'Choose your interests — #build-showcase, #redstone-tech, or #minigame-lobby.', 'fa-solid fa-layer-group', 3),
(4, 'Start Building', 'Join events, enter contests, and become part of Bangladesh''s biggest Minecraft story.', 'fa-solid fa-hammer', 4);

INSERT INTO form_categories (key, label, description, sort_order) VALUES
('join_application', 'Join Application', 'Apply to join the community and get whitelisted', 1),
('support_ticket', 'Support Ticket', 'Get help from our team', 2),
('report', 'Report a Player/Issue', 'Report rule-breaking or bugs', 3),
('general', 'General Inquiry', 'Anything else', 4);

INSERT INTO servers (name, server_type, ip_address, edition, status, players_online, players_max, description, is_featured, sort_order) VALUES
('MCBD Survival', 'survival', 'play.mcbd.gg', 'both', 'online', 214, 300, 'Our flagship long-term survival world. Land claims, economy, and community projects.', true, 1),
('MCBD Creative', 'creative', 'creative.mcbd.gg', 'both', 'online', 88, 200, 'Unlimited creative plots for builders. Show off your skills.', false, 2),
('MCBD Redstone Lab', 'redstone', 'redstone.mcbd.gg', 'java', 'online', 34, 100, 'A dedicated space for redstone engineers and technical builders.', false, 3),
('MCBD Minigames', 'minigame', 'play.mcbd.gg:25566', 'both', 'online', 156, 250, 'Bed Wars, SkyWars, and more community-made minigames.', false, 4);
