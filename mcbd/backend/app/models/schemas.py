from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


# ═══════════════ AUTH ═══════════════
class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    display_name: str
    role: str


# ═══════════════ STATS ═══════════════
class StatOut(BaseModel):
    key: str
    label: str
    value: int
    suffix: str
    icon: str
    image_url: Optional[str] = None
    sort_order: int


class StatUpdate(BaseModel):
    label: Optional[str] = None
    value: Optional[int] = None
    suffix: Optional[str] = None
    icon: Optional[str] = None
    image_url: Optional[str] = None
    sort_order: Optional[int] = None


# ═══════════════ JOURNEY STEPS ═══════════════
class JourneyStepOut(BaseModel):
    id: int
    step_number: int
    title: str
    description: str
    icon: str
    image_url: Optional[str] = None
    sort_order: int


class JourneyStepCreate(BaseModel):
    step_number: int = 1
    title: str
    description: str
    icon: str = "fa-solid fa-compass"
    image_url: Optional[str] = None
    sort_order: int = 0


class JourneyStepUpdate(BaseModel):
    step_number: Optional[int] = None
    title: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    image_url: Optional[str] = None
    sort_order: Optional[int] = None


# ═══════════════ SERVERS ═══════════════
class ServerOut(BaseModel):
    id: int
    name: str
    server_type: str
    ip_address: Optional[str]
    port: int
    edition: str
    status: str
    players_online: int
    players_max: int
    description: Optional[str]
    is_whitelisted: bool
    is_featured: bool
    sort_order: int


class ServerCreate(BaseModel):
    name: str
    server_type: str
    ip_address: Optional[str] = None
    port: int = 25565
    edition: str = "both"
    status: str = "online"
    players_online: int = 0
    players_max: int = 100
    description: Optional[str] = None
    is_whitelisted: bool = False
    is_featured: bool = False
    sort_order: int = 0


class ServerUpdate(BaseModel):
    name: Optional[str] = None
    server_type: Optional[str] = None
    ip_address: Optional[str] = None
    port: Optional[int] = None
    edition: Optional[str] = None
    status: Optional[str] = None
    players_online: Optional[int] = None
    players_max: Optional[int] = None
    description: Optional[str] = None
    is_whitelisted: Optional[bool] = None
    is_featured: Optional[bool] = None
    sort_order: Optional[int] = None


# ═══════════════ NEWS ═══════════════
class NewsOut(BaseModel):
    id: int
    slug: str
    title: str
    excerpt: Optional[str]
    body: str
    category: str
    cover_icon: str
    image_url: Optional[str] = None
    is_published: bool
    is_pinned: bool
    published_at: datetime


class NewsCreate(BaseModel):
    title: str
    excerpt: Optional[str] = None
    body: str
    category: str = "announcement"
    cover_icon: str = "fa-solid fa-newspaper"
    image_url: Optional[str] = None
    is_published: bool = True
    is_pinned: bool = False

    @field_validator("title")
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("title cannot be empty")
        return v.strip()


class NewsUpdate(BaseModel):
    title: Optional[str] = None
    excerpt: Optional[str] = None
    body: Optional[str] = None
    category: Optional[str] = None
    cover_icon: Optional[str] = None
    image_url: Optional[str] = None
    is_published: Optional[bool] = None
    is_pinned: Optional[bool] = None


# ═══════════════ MEMBERS ═══════════════
class MemberOut(BaseModel):
    id: int
    display_name: str
    role_title: str
    role_group: str
    icon: str
    image_url: Optional[str] = None
    bio: Optional[str]
    discord_tag: Optional[str]
    sort_order: int


class MemberCreate(BaseModel):
    display_name: str
    role_title: str
    role_group: str = "staff"
    icon: str = "fa-solid fa-user"
    image_url: Optional[str] = None
    bio: Optional[str] = None
    discord_tag: Optional[str] = None
    is_active: bool = True
    sort_order: int = 0


class MemberUpdate(BaseModel):
    display_name: Optional[str] = None
    role_title: Optional[str] = None
    role_group: Optional[str] = None
    icon: Optional[str] = None
    image_url: Optional[str] = None
    bio: Optional[str] = None
    discord_tag: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


# ═══════════════ RULES ═══════════════
class RuleOut(BaseModel):
    id: int
    title: str
    body: str
    sort_order: int


class RuleCreate(BaseModel):
    title: str
    body: str
    sort_order: int = 0


class RuleUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    sort_order: Optional[int] = None


# ═══════════════ FORM CATEGORIES ═══════════════
class FormCategoryOut(BaseModel):
    id: int
    key: str
    label: str
    description: Optional[str]


# ═══════════════ SUBMISSIONS ═══════════════
class SubmissionCreate(BaseModel):
    category_key: str
    full_name: str = Field(min_length=1, max_length=150)
    contact: str = Field(min_length=1, max_length=150)
    subject: Optional[str] = Field(default=None, max_length=200)
    message: str = Field(min_length=1, max_length=5000)
    website: Optional[str] = None

    @field_validator("full_name", "message")
    @classmethod
    def not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("field cannot be blank")
        return v.strip()


class SubmissionOut(BaseModel):
    id: UUID
    category_id: int
    category_label: Optional[str] = None
    full_name: str
    contact: str
    subject: Optional[str]
    message: str
    status: str
    admin_notes: Optional[str]
    created_at: datetime


class SubmissionUpdate(BaseModel):
    status: Optional[str] = None
    admin_notes: Optional[str] = None


# ═══════════════ PARTNERSHIPS ═══════════════
class PartnershipOut(BaseModel):
    id: int
    title: str
    partner_type: str
    logo_url: Optional[str]
    description: Optional[str]
    website_url: Optional[str]
    discord_url: Optional[str]
    is_featured: bool
    is_active: bool
    sort_order: int
    created_at: datetime


class PartnershipCreate(BaseModel):
    title: str
    partner_type: str = "community"
    logo_url: Optional[str] = None
    description: Optional[str] = None
    website_url: Optional[str] = None
    discord_url: Optional[str] = None
    is_featured: bool = False
    is_active: bool = True
    sort_order: int = 0


class PartnershipUpdate(BaseModel):
    title: Optional[str] = None
    partner_type: Optional[str] = None
    logo_url: Optional[str] = None
    description: Optional[str] = None
    website_url: Optional[str] = None
    discord_url: Optional[str] = None
    is_featured: Optional[bool] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


# ═══════════════ ADMIN USERS ═══════════════
class AdminUserOut(BaseModel):
    id: int
    username: str
    display_name: str
    role: str
    is_active: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime


class AdminUserCreate(BaseModel):
    username: str
    password: str
    display_name: str
    role: str = "moderator"
    is_active: bool = True


class AdminUserUpdate(BaseModel):
    display_name: Optional[str] = None
    role: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None


# ═══════════════ FORM CATEGORY ADMIN ═══════════════
class FormCategoryCreate(BaseModel):
    key: str
    label: str
    description: Optional[str] = None
    is_active: bool = True
    sort_order: int = 0


class FormCategoryUpdate(BaseModel):
    key: Optional[str] = None
    label: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None
