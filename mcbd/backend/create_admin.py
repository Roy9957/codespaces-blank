"""
One-off CLI to create an admin user with a securely hashed password.

Usage:
    python create_admin.py

Prompts for username, display name, role, and password (hidden input).
"""
import asyncio
import getpass

import asyncpg

from app.auth import hash_password
from app.config import settings


async def main():
    username = input("Username: ").strip()
    display_name = input("Display name: ").strip()
    role = input("Role [owner/admin/moderator] (default: admin): ").strip() or "admin"
    password = getpass.getpass("Password: ")
    confirm = getpass.getpass("Confirm password: ")

    if password != confirm:
        print("Passwords do not match. Aborting.")
        return
    if len(password) < 4:
        print("Password should be at least 4 characters. Aborting.")
        return

    password_hash = hash_password(password)

    conn = await asyncpg.connect(settings.database_url)
    try:
        await conn.execute(
            """INSERT INTO admin_users (username, password_hash, display_name, role)
               VALUES ($1, $2, $3, $4)""",
            username, password_hash, display_name, role,
        )
        print(f"Admin user '{username}' created with role '{role}'.")
    except asyncpg.UniqueViolationError:
        print(f"Username '{username}' already exists.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
