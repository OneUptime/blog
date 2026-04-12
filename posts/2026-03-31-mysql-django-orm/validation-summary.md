# Validation Summary: How to Use MySQL with Django ORM

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- Django (Python web framework)
- Django ORM
- mysqlclient (Python MySQL driver)
- mysql-connector-python (alternative Python MySQL driver)

## Sources Consulted
- Django documentation on databases: https://docs.djangoproject.com/en/5.1/ref/databases/#mysql-notes
- Django documentation on settings (DATABASES): https://docs.djangoproject.com/en/5.1/ref/settings/#databases
- Django documentation on models: https://docs.djangoproject.com/en/5.1/topics/db/models/
- Django documentation on making queries: https://docs.djangoproject.com/en/5.1/topics/db/queries/
- Django documentation on raw SQL: https://docs.djangoproject.com/en/5.1/topics/db/sql/
- Django documentation on select_related: https://docs.djangoproject.com/en/5.1/ref/models/querysets/#select-related
- Django documentation on prefetch_related: https://docs.djangoproject.com/en/5.1/ref/models/querysets/#prefetch-related
- mysqlclient PyPI page: https://pypi.org/project/mysqlclient/
- MySQL CREATE USER documentation: https://dev.mysql.com/doc/refman/8.0/en/create-user.html
- MySQL GRANT documentation: https://dev.mysql.com/doc/refman/8.0/en/grant.html

## Issues Found
No technical issues found.

## Review Notes
- The post mentions both `mysqlclient` and `mysql-connector-python` as installation options, but the `settings.py` configuration shown (`django.db.backends.mysql`) only works with `mysqlclient`. If using `mysql-connector-python`, the engine would need to be `mysql.connector.django` instead. This is not technically wrong since the config is correct for the recommended driver, but readers who choose the `mysql-connector-python` option may need to adjust the ENGINE setting.
- `FLUSH PRIVILEGES` after `GRANT` is not strictly necessary in MySQL 8.0+ (grant table changes via `GRANT` are applied automatically), but including it is harmless and ensures compatibility with older MySQL versions.
- The `init_command` setting `STRICT_TRANS_TABLES` is good practice and aligns with Django's recommendation, though it is already part of the default `sql_mode` in MySQL 5.7+.
