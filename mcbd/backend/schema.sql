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
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at TIMESTAMPTZ
);

-- ─── Site-wide live stats (the numbers shown on the homepage) ───
-- Single-row-per-key table so admin can update any stat independently.
CREATE TABLE site_stats (
    key         VARCHAR(50) PRIMARY KEY,   -- e.g. 'total_members', 'discord_online'
    label       VARCHAR(100) NOT NULL,     -- e.g. 'Community Members'
    value       BIGINT NOT NULL DEFAULT 0,
    suffix      VARCHAR(10) DEFAULT '',    -- e.g. '+', 'K'
    icon        VARCHAR(50) DEFAULT 'fa-solid fa-cube',
    sort_order  INT NOT NULL DEFAULT 0,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by  INT REFERENCES admin_users(id)
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

-- ─── Form categories (admin-managed, drives the dropdown on the form) ───
CREATE TABLE form_categories (
    id          SERIAL PRIMARY KEY,
    key         VARCHAR(40) UNIQUE NOT NULL,  -- 'join_application' | 'support_ticket' | 'report' | 'general'
    label       VARCHAR(100) NOT NULL,
    description VARCHAR(300),
    is_active   BOOLEAN NOT NULL DEFAULT true,
    sort_order  INT NOT NULL DEFAULT 0
);

-- ─── Form submissions (join applications, tickets, reports, contact msgs) ───
CREATE TABLE submissions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id  INT NOT NULL REFERENCES form_categories(id),
    full_name    VARCHAR(150) NOT NULL,
    contact      VARCHAR(150) NOT NULL,       -- email or discord tag
    subject      VARCHAR(200),
    message      TEXT NOT NULL,
    status       VARCHAR(20) NOT NULL DEFAULT 'new', -- 'new'|'in_review'|'resolved'|'rejected'
    admin_notes  TEXT,
    handled_by   INT REFERENCES admin_users(id),
    ip_hash      VARCHAR(64),                 -- hashed, not raw IP — basic spam tracking
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_submissions_status ON submissions(status, created_at DESC);
CREATE INDEX idx_submissions_category ON submissions(category_id);

-- ─── Seed data ───
INSERT INTO site_stats (key, label, value, suffix, icon, sort_order) VALUES
('total_members', 'Community Members', 52000, '+', 'fa-solid fa-users', 1),
('discord_online', 'Online on Discord', 1800, '+', 'fa-brands fa-discord', 2),
('active_servers', 'Active Servers', 6, '', 'fa-solid fa-server', 3),
('events_hosted', 'Events Hosted', 140, '+', 'fa-solid fa-trophy', 4);

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

-- Remember to insert your first admin user via the backend's create-admin script
-- (never insert a plaintext password directly into password_hash).
