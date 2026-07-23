import unittest


class MainEntrypointTests(unittest.TestCase):
    def test_main_module_exports_app(self):
        import main

        self.assertTrue(hasattr(main, "app"))


if __name__ == "__main__":
    unittest.main()
