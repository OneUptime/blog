# Validation Summary: How to Use MySQL with Django

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0+
- Django 4.x / 5.x
- Python 3.8+
- mysqlclient Python package
- PyMySQL (alternative driver)
- ProxySQL (connection pooling)

## Sources Consulted
- Django official documentation: Databases — MySQL notes (https://docs.djangoproject.com/en/5.0/ref/databases/#mysql-notes)
- Django official documentation: DATABASES setting (https://docs.djangoproject.com/en/5.0/ref/settings/#databases)
- Django official documentation: CONN_MAX_AGE (https://docs.djangoproject.com/en/5.0/ref/settings/#conn-max-age)
- Django official documentation: Raw SQL queries (https://docs.djangoproject.com/en/5.0/topics/db/sql/)
- Django official documentation: transaction.atomic (https://docs.djangoproject.com/en/5.0/topics/db/transactions/)
- mysqlclient PyPI page (https://pypi.org/project/mysqlclient/)
- PyMySQL documentation (https://pymysql.readthedocs.io/)
- MySQL 8.0 Reference Manual: CREATE USER, GRANT syntax (https://dev.mysql.com/doc/refman/8.0/en/)
- PgBouncer official site (https://www.pgbouncer.org/) — confirmed it is PostgreSQL-only
- ProxySQL documentation (https://proxysql.com/documentation/)

## Issues Found
1. **PgBouncer incorrectly recommended for MySQL** (line 127): The post stated "consider using PgBouncer (for connection pooling) or ProxySQL." PgBouncer is a PostgreSQL connection pooler and does not work with MySQL. Removed the PgBouncer reference and kept ProxySQL, which is the correct MySQL connection pooler. Changed to: "consider using ProxySQL for connection pooling."

## Review Notes
- The PyMySQL setup advice recommends placing `pymysql.install_as_MySQLdb()` in `manage.py` and `wsgi.py`. The more common and robust approach is to place it in the Django project's `__init__.py` (e.g., `myproject/__init__.py`), which ensures it runs regardless of entry point (management commands, WSGI, ASGI). The current advice works but is not the canonical recommendation.
- All code examples (model definitions, raw queries, transaction handling, database configuration) are syntactically correct and use current, non-deprecated Django APIs.
- The SQL for creating the database and user is correct for MySQL 8.0+.
- The `STRICT_TRANS_TABLES` sql_mode in the init_command aligns with Django's recommendation for MySQL.
- The `utf8mb4` charset configuration is correct and recommended for full Unicode support.
