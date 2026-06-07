# Validation Summary: How to Use SQLite in Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SQLite (in-memory `:memory:` databases, PRAGMAs, savepoints, backup/serialize)
- Node.js with `better-sqlite3`
- Python with the standard-library `sqlite3` module
- Jest (JavaScript testing framework)
- pytest (Python testing framework, fixtures)
- Django (`TestCase`, ORM, settings overrides for tests)
- Flask + Flask-SQLAlchemy
- PostgreSQL (referenced as the production counterpart, JSON operators, `NOW()`)
- SQL migrations testing patterns

## Sources Consulted
- SQLite documentation — `:memory:` database and shared-cache behavior: https://www.sqlite.org/inmemorydb.html
- SQLite SQL syntax — `datetime()` and modifiers: https://www.sqlite.org/lang_datefunc.html
- SQLite SAVEPOINT documentation: https://www.sqlite.org/lang_savepoint.html
- better-sqlite3 API documentation (Database, prepare, exec, pragma, backup, serialize): https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md
- Python `sqlite3` module documentation: https://docs.python.org/3/library/sqlite3.html
- pytest fixtures documentation: https://docs.pytest.org/en/stable/how-to/fixtures.html
- Django testing documentation (`TestCase` transactional wrapping): https://docs.djangoproject.com/en/stable/topics/testing/tools/
- Django database settings: https://docs.djangoproject.com/en/stable/ref/settings/#databases
- Flask-SQLAlchemy quickstart: https://flask-sqlalchemy.palletsprojects.com/
- PostgreSQL JSON functions and operators (`->` vs `->>`): https://www.postgresql.org/docs/current/functions-json.html

## Issues Found
1. **Incorrect use of `better-sqlite3`'s `backup()` API for in-memory cloning.**
   - The original "Parallel Test Execution with Database Cloning" example called `this.template.backup(clone)` and passed a `Database` instance as the destination. Per the better-sqlite3 API, `db.backup(destinationFile, [options])` takes a **file path string** (and is asynchronous, returning a Promise), not another Database object. The example would not work as written.
   - Fix: rewrote the example to use `db.serialize()` to capture a `Buffer` snapshot of the template once, and then construct each clone via `new Database(buffer)`, which deserializes a fresh in-memory database. This is the documented mechanism in better-sqlite3 for snapshot-based cloning and is the correct way to give each parallel test an independent copy of a seeded database. Updated the section's introductory sentence to reference the serialize API rather than the backup API.

2. **`PostgreSQLAdapter.json_extract` used the wrong PostgreSQL JSON operator.**
   - The original returned `f"{column}->'{path}'"`. In PostgreSQL, `->` returns the value as `json`/`jsonb`, while `->>` returns the value as `text`. The repository code uses the extracted value in `WHERE {json_path} = 'premium'`, comparing against a text literal — that comparison requires the text form (`->>`), and using `->` would not match for a JSON string value `"premium"` (it would compare a `json` value to a text literal).
   - The post's own mermaid diagram literally says "Use json_extract vs `->>`", so the code contradicted the surrounding prose.
   - Fix: changed the operator from `->` to `->>` in `PostgreSQLAdapter.json_extract`.

## Review Notes
- The `error.code === 'SQLITE_CONSTRAINT_UNIQUE'` assertion is accurate: better-sqlite3 surfaces extended SQLite result codes on its `SqliteError.code` property, matching SQLite's own naming.
- The Python sqlite3 example relies on `cursor.lastrowid` and `cursor.rowcount`, which behave as the post describes for INSERT/UPDATE/DELETE.
- The Django `if 'test' in sys.argv` pattern for swapping the database to SQLite still works on current Django, though using a dedicated `test_settings.py` is generally cleaner. Left as-is since it is technically correct and the author's chosen style.
- The cross-database SQL in `get_recent_users` (`datetime({now_function}, '-{days} days')`) is hardcoded SQLite syntax inside the repository; the adapter only abstracts the `NOW()` portion. Under PostgreSQL the resulting SQL would not parse (no `datetime()` function). This is an illustrative example of the adapter pattern rather than a complete, portable implementation, and the surrounding prose frames it that way, so it was left as-is — but a future revision could note this caveat or use proper interval syntax per adapter.
- `db.exec('BEGIN')` / `db.exec('ROLLBACK')` is valid in better-sqlite3, though the library also provides a higher-level `db.transaction()` helper that some readers may prefer.
- `db.serialize()` requires better-sqlite3 v11.10.0+ (released 2024). Anyone on an older version would need to upgrade; this is the expected modern API.
