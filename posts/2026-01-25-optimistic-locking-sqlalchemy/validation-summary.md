# Validation Summary: How to Implement Optimistic Locking in SQLAlchemy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- SQLAlchemy ORM
- SQLAlchemy version counters / optimistic locking
- SQLite testing
- PostgreSQL concurrency concepts

## Sources Consulted
- SQLAlchemy ORM Versioning documentation: https://docs.sqlalchemy.org/en/21/orm/versioning.html
- SQLAlchemy ORM Exceptions documentation: https://docs.sqlalchemy.org/en/21/orm/exceptions.html
- SQLAlchemy Legacy Query API documentation: https://docs.sqlalchemy.org/en/21/orm/queryguide/query.html
- SQLAlchemy SQLite dialect threading and pooling documentation: https://docs.sqlalchemy.org/en/21/dialects/sqlite.html
- SQLAlchemy Declarative mapper configuration documentation: https://docs.sqlalchemy.org/en/latest/orm/declarative_config.html
- SQLAlchemy Declarative mixins documentation: https://docs.sqlalchemy.org/en/latest/orm/declarative_mixins.html

## Issues Found
- The model example imported `StaleDataError` from `sqlalchemy.exc`, but SQLAlchemy documents it under `sqlalchemy.orm.exc`. Removed the unused import from the model snippet and corrected repository/timestamp examples to import from `sqlalchemy.orm.exc`.
- The versioned mixin used a `before_update` event to increment the integer version column while also configuring `version_id_col`. SQLAlchemy's default integer version generator already increments the version during flush, so the event listener could double-increment the version. Removed the listener and let SQLAlchemy manage the integer counter.
- The `Account`, `Product`, and `Document` examples referenced inherited mixin columns directly inside subclass `__mapper_args__`, which does not work reliably in Python class-body name resolution. Moved mapper configuration into each mixin using `declared_attr`.
- Several snippets had unused imports or missing imports. Removed unused imports and added missing `Callable`, `datetime`, `time`, `Session`, and `StaleDataError` imports where needed.
- The timestamp example said `updated_at` was automatically set by SQLAlchemy without clarifying the mechanism. Updated the comment to state that the version generator sets it.
- The test fixture used `sqlite:///:memory:` with multiple threads. SQLAlchemy documents that in-memory SQLite databases are per connection by default, so other threads may see different databases. Changed the fixture to use a file-backed temporary SQLite database.
- The test code used `session.query(Account).get(...)`, which SQLAlchemy marks as legacy in 2.0. Replaced it with `session.get(Account, account_id)`.
- The concurrency test only asserted that some exception occurred. Tightened it to assert that one thread raises `StaleDataError`.
- The introductory explanation said conflicts are checked at commit time. SQLAlchemy performs version checks during ORM flush; commit usually triggers a flush. Updated the wording to be precise.

## Review Notes
The post is technically relevant and valid after fixes. The examples still use SQLAlchemy's classic `Column`/`declarative_base()` style, which remains supported, but future modernization could convert them to SQLAlchemy 2.x typed `Mapped[...]` and `mapped_column()` syntax.
