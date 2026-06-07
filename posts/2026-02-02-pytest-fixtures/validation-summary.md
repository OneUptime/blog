# Validation Summary: How to Use pytest Fixtures

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- pytest (testing framework)
- Python
- pytest-asyncio (async fixture support)
- pytest built-in fixtures (`tmp_path`, `capsys`, `capfd`, `monkeypatch`, `request`)
- conftest.py mechanism
- aiohttp / asyncpg (referenced in async examples)
- Docker (referenced in session-scope example)

## Sources Consulted
- Official pytest fixtures documentation: https://docs.pytest.org/en/stable/explanation/fixtures.html
- pytest fixture reference: https://docs.pytest.org/en/stable/reference/fixtures.html
- pytest built-in fixtures: https://docs.pytest.org/en/stable/reference/fixtures.html#built-in-fixtures
- pytest `monkeypatch` docs: https://docs.pytest.org/en/stable/how-to/monkeypatch.html
- pytest `tmp_path` docs: https://docs.pytest.org/en/stable/how-to/tmp_path.html
- pytest capture: https://docs.pytest.org/en/stable/how-to/capture-stdout-stderr.html
- pytest-asyncio docs: https://pytest-asyncio.readthedocs.io/en/latest/
- pytest CLI flags (`--setup-show`, `--fixtures`): https://docs.pytest.org/en/stable/reference/reference.html

## Issues Found
- **Async fixtures decorator**: The "Async Fixtures" section and the "Quick Reference" used `@pytest.fixture` on `async def` functions. In `pytest-asyncio` 0.21+, this pattern is deprecated; async fixtures must be decorated with `@pytest_asyncio.fixture`. Updated both code blocks to import `pytest_asyncio` and use `@pytest_asyncio.fixture` instead. Also removed the unused `import asyncio` and `import pytest` from the conftest snippet (pytest is no longer needed there since only `pytest_asyncio.fixture` is used).

## Review Notes
- All five fixture scopes (`function`, `class`, `module`, `package`, `session`) and their lifecycle descriptions are accurate.
- `request.node.get_closest_marker(...)`, `request.addfinalizer(...)`, and `request.param` are all valid pytest APIs as documented.
- `monkeypatch.setenv`, `monkeypatch.delenv` (with `raising=False`), and `monkeypatch.setattr` are correctly used.
- `capsys.readouterr()` returning a namedtuple with `.out` and `.err` is correct.
- `tmp_path` is correctly described as a `pathlib.Path` unique per test.
- `pytest.param("...", id="...")` is valid syntax for labelling parametrized cases.
- The `--setup-show` example output format (`SETUP    S/M/F`, `TEARDOWN    S/M/F`) matches pytest's actual output.
- The `Factory with Database Persistence` example uses generic `?` SQL placeholders — this is conceptual code and the placeholder style isn't claimed to be DB-specific, so it's left as-is.
- The `monkeypatch.setattr` example references an `api` variable without showing the import; this is a minor stylistic omission in a snippet meant to illustrate the API, not a technical error.
- The post does not pin a specific pytest or pytest-asyncio version. Information presented is accurate for pytest 7.x/8.x and pytest-asyncio 0.21+.
