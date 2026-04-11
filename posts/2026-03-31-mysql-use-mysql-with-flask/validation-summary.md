# Validation Summary: How to Use MySQL with Flask

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Flask
- MySQL
- Flask-SQLAlchemy
- Flask-Migrate
- PyMySQL

## Sources Consulted
- Flask-SQLAlchemy documentation: https://flask-sqlalchemy.readthedocs.io/
- Flask-Migrate documentation: https://flask-migrate.readthedocs.io/
- SQLAlchemy Engine Configuration: https://docs.sqlalchemy.org/en/20/core/engines.html
- Python datetime documentation: https://docs.python.org/3/library/datetime.html#datetime.datetime.utcnow
- PyMySQL documentation: https://pymysql.readthedocs.io/

## Issues Found
1. **Deprecated `datetime.utcnow` usage**: The model used `default=datetime.utcnow` which has been deprecated since Python 3.12 (released October 2023). Changed to `default=lambda: datetime.now(timezone.utc)` with an added `timezone` import from `datetime`. This avoids the `DeprecationWarning` and is the recommended approach per the official Python docs.

## Review Notes
- The `abort` import in the route examples is unused but not harmful; left as-is since it's not a technical error.
- `Product.query` (legacy query interface) is still functional in Flask-SQLAlchemy 3.x but the docs now recommend `db.session.execute(db.select(Product))`. This is not a deprecation, just a style preference — left unchanged.
- The `to_dict()` method omits `created_at`, which is a design choice, not an error.
