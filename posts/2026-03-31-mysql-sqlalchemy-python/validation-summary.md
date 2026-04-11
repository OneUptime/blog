# Validation Summary: How to Use MySQL with SQLAlchemy in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- Python
- SQLAlchemy (ORM and Core)
- mysql-connector-python (MySQL driver)

## Sources Consulted
- SQLAlchemy 2.0 documentation — Engine Configuration: https://docs.sqlalchemy.org/en/20/core/engines.html
- SQLAlchemy 2.0 documentation — ORM Session Basics: https://docs.sqlalchemy.org/en/20/orm/session_basics.html
- SQLAlchemy 2.0 documentation — ORM Declarative Mapping: https://docs.sqlalchemy.org/en/20/orm/mapping_styles.html
- SQLAlchemy 2.0 documentation — Column Elements and Expressions (or_, and_): https://docs.sqlalchemy.org/en/20/core/sqlelement.html
- SQLAlchemy 2.0 documentation — Relationship Loading Techniques: https://docs.sqlalchemy.org/en/20/orm/queryguide/relationships.html
- SQLAlchemy 2.0 documentation — select() API: https://docs.sqlalchemy.org/en/20/core/selectable.html
- mysql-connector-python documentation: https://dev.mysql.com/doc/connector-python/en/

## Issues Found
1. **Invalid import `like` (line 160):** The code had `from sqlalchemy import or_, and_, like`. There is no standalone `like` function in SQLAlchemy's public API — `like` is a method on column objects (e.g., `User.name.like(...)`). This import would raise an `ImportError` at runtime. Fixed by removing `like` from the import statement, changing it to `from sqlalchemy import or_, and_`.

## Review Notes
- `Numeric` is imported in the "Defining Models" section but never used. This is not a runtime error, just an unused import.
- `and_` is imported in the "Querying with Filters" section but not used in that snippet. It is a valid SQLAlchemy import and commonly used alongside `or_`, so it is reasonable to keep for educational purposes.
- The post uses `declarative_base()` which is considered legacy in SQLAlchemy 2.0 (a deprecation warning is emitted). The modern approach is `class Base(DeclarativeBase): pass`. Since the function still works and the post already includes a "SQLAlchemy 2.0 Style" section for queries, this is a minor modernization opportunity rather than an error.
- Functions like `get_user` and `list_admins` return ORM objects from within the session context manager. After the session closes, these objects become detached. Their already-loaded column attributes remain accessible, but accessing unloaded lazy relationships (e.g., `user.posts`) outside the session would raise a `DetachedInstanceError`. The `create_user` function correctly handles this with `expunge`, but the read functions rely on the implicit behavior, which is a common pattern but worth noting.
