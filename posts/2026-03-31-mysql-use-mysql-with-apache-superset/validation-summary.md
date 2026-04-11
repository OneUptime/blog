# Validation Summary: How to Use MySQL with Apache Superset

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- Apache Superset
- SQLAlchemy
- Python (`mysqlclient`, `pymysql`)
- Jinja templating (Superset SQL Lab)

## Sources Consulted
- SQLAlchemy MySQL dialect documentation: https://docs.sqlalchemy.org/en/20/dialects/mysql.html
- Apache Superset documentation on database connections: https://superset.apache.org/docs/configuration/databases
- `mysqlclient` PyPI page (dialect is `mysql+mysqldb://`): https://pypi.org/project/mysqlclient/
- `pymysql` PyPI page (dialect is `mysql+pymysql://`): https://pypi.org/project/PyMySQL/
- `mysql-connector-python` PyPI page (dialect is `mysql+mysqlconnector://`): https://pypi.org/project/mysql-connector-python/
- MySQL documentation for CREATE USER and GRANT syntax: https://dev.mysql.com/doc/refman/8.0/en/create-user.html
- Apache Superset Jinja templating documentation: https://superset.apache.org/docs/configuration/sql-templating

## Issues Found
1. **Incorrect SQLAlchemy dialect for `mysqlclient` driver**: The first SQLAlchemy URI example used `mysql+mysqlconnector://`, which is the dialect for the `mysql-connector-python` package. However, the prerequisites only install `mysqlclient` or `pymysql`. The `mysqlclient` package uses the `mysql+mysqldb://` dialect. A user following the prerequisites and then using the `mysql+mysqlconnector://` URI would get a `ModuleNotFoundError` because the `mysqlconnector` dialect requires `mysql-connector-python`, which was never installed. Changed `mysql+mysqlconnector://` to `mysql+mysqldb://` to match the `mysqlclient` driver listed in prerequisites.

## Review Notes
- Superset's Jinja templating requires `ENABLE_TEMPLATE_PROCESSING = True` in `superset_config.py`. The post doesn't mention this, but since it's a brief tutorial rather than a comprehensive setup guide, this is acceptable as-is. Users unfamiliar with this setting may need to consult Superset docs to enable templating.
- The `engine_params` JSON structure in the "Extra" field is correct for Superset's database configuration advanced tab.
- The row-level security section correctly references `current_username()` as a valid Superset Jinja context function for RLS filters.
- All MySQL SQL syntax (CREATE USER, GRANT, DATE_FORMAT, DATE_SUB, ALTER TABLE ADD INDEX) is correct.
