# Validation Summary: How to Use SQLite with Flask

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flask (web framework)
- Flask-SQLAlchemy (ORM extension)
- Flask-Migrate / Alembic (schema migrations)
- SQLAlchemy (ORM core, 1.4 / 2.0 style APIs)
- SQLite (database, including WAL mode and PRAGMA configuration)
- werkzeug.security (password hashing)
- Python sqlite3 module (backup API)
- pytest (test fixtures)

## Sources Consulted
- Flask-SQLAlchemy documentation: https://flask-sqlalchemy.palletsprojects.com/
- SQLAlchemy 2.0 documentation: https://docs.sqlalchemy.org/en/20/
- Flask-Migrate documentation: https://flask-migrate.readthedocs.io/
- Alembic documentation: https://alembic.sqlalchemy.org/
- SQLite PRAGMA reference: https://www.sqlite.org/pragma.html
- SQLite WAL mode docs: https://www.sqlite.org/wal.html
- Python sqlite3 module (Connection.backup): https://docs.python.org/3/library/sqlite3.html
- Werkzeug security utilities: https://werkzeug.palletsprojects.com/en/latest/utils/#module-werkzeug.security
- Flask application factory pattern: https://flask.palletsprojects.com/en/latest/patterns/appfactories/

## Issues Found
No technical issues found. Verification highlights:
- `SQLALCHEMY_DATABASE_URI = 'sqlite:///...'` and `'sqlite:///:memory:'` URI syntax is correct.
- `SQLALCHEMY_TRACK_MODIFICATIONS = False` is the correct setting name and recommendation.
- `db.session.execute(text("..."), {params})` with `result.mappings()` matches the SQLAlchemy 2.0 API.
- `Result.mappings()` yields `RowMapping` objects which can be converted with `dict(row)` — correct.
- `db.or_()`, `Column.ilike()`, `Column.in_(subquery)`, `query.outerjoin()`, `func.count()` are all valid SQLAlchemy.
- `joinedload` and `subqueryload` imports from `sqlalchemy.orm` are correct, and the guidance (joinedload for many-to-one, subqueryload for one-to-many) matches official recommendations.
- `db.relationship('User', backref=db.backref('posts', lazy='dynamic'))` is valid syntax.
- Flask-Migrate CLI commands (`flask db init/migrate/upgrade/downgrade`) and Alembic migration script structure (`op.add_column`, `op.execute`, `op.drop_column`, revision identifiers) are correct.
- PRAGMA statements (`foreign_keys=ON`, `journal_mode=WAL`, negative `cache_size` for kibibytes) are accurate per the SQLite docs.
- `werkzeug.security.generate_password_hash` import path is correct.
- `sqlite3.Connection.backup()` API is correctly used (available in Python 3.7+).
- `@event.listens_for(Engine, "connect")` global engine event hook is a valid pattern for applying per-connection pragmas.
- `db.session.query(...).distinct().subquery()` and `.in_(subquery)` usage is correct.
- The `Post.query.filter_by(...).update({...})` bulk update method is correctly used inside a transaction with rollback handling.

## Review Notes
- `datetime.utcnow` is deprecated in Python 3.12+ in favor of `datetime.now(timezone.utc)`, but the code still functions and is the most common pattern in existing Flask/SQLAlchemy tutorials.
- `Model.query.paginate(...)` and `Model.query.get_or_404(...)` are legacy Flask-SQLAlchemy 2.x style. Flask-SQLAlchemy 3.x recommends `db.paginate(query)` and `db.get_or_404(Model, id)`, but the legacy `Query.paginate` / `Query.get_or_404` APIs are still supported.
- `lazy='dynamic'` returns a legacy `Query` object in SQLAlchemy 2.0; the newer `write_only` collection class is the going-forward recommendation, but `dynamic` continues to work.
- The in-memory SQLite test pattern (`sqlite:///:memory:`) can hit a known caveat: each new connection opens a fresh in-memory DB. For tests that share data across connections, `StaticPool` with `connect_args={'check_same_thread': False}` is sometimes needed. The pattern shown will work for typical single-thread/single-context test cases.
- `flask run` requires `FLASK_APP=run:app` (or equivalent) since the entry point is `run.py`. The post relies on Flask's auto-discovery; setting the environment variable explicitly would be more robust but is not strictly required.
- `op.add_column(..., sa.Column('published', sa.Boolean(), default=False))` uses a Python-side default; the post correctly follows up with `op.execute("UPDATE posts SET published = 1")` to backfill existing rows, which is the right approach since Python-side defaults are not applied by DDL.
