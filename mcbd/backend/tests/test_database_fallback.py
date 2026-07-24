import asyncio
import unittest
from unittest.mock import patch

from app import database


class DatabaseFallbackTests(unittest.TestCase):
    def test_connect_db_returns_fallback_pool_when_database_is_unavailable(self):
        async def run_test():
            with patch("app.database.asyncpg.create_pool", side_effect=OSError("db unavailable")):
                await database.disconnect_db()
                await database.connect_db()
                pool = database.get_pool()
                self.assertTrue(hasattr(pool, "fetch"))
                rows = await pool.fetch("SELECT 1")
                self.assertEqual(rows, [])

        asyncio.run(run_test())


if __name__ == "__main__":
    unittest.main()
