# Validation Summary: How to Deploy Apache Superset for Data Visualization on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Apache Superset
- Python virtual environments and pip
- PostgreSQL
- Redis
- Celery
- Gunicorn
- systemd
- Nginx
- SQLAlchemy database connection strings
- ClickHouse Connect, psycopg2, and mysqlclient database drivers

## Sources Consulted
- Apache Superset PyPI installation documentation: https://superset.apache.org/admin-docs/installation/pypi
- Apache Superset configuration documentation: https://superset.apache.org/admin-docs/configuration/configuring-superset/
- Apache Superset async queries with Celery documentation: https://superset.apache.org/admin-docs/configuration/async-queries-celery/
- Apache Superset caching documentation: https://superset.apache.org/docs/configuration/cache/
- Apache Superset ClickHouse database documentation: https://superset.apache.org/docs/databases/supported/clickhouse
- Apache Superset package metadata on PyPI: https://pypi.org/project/apache-superset/
- Red Hat Enterprise Linux 9 Python documentation: https://docs.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html-single/installing_and_using_dynamic_programming_languages
- Red Hat Enterprise Linux 9 PostgreSQL documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/configuring_and_using_database_servers/red_hat_enterprise_linux-9-configuring_and_using_database_servers-en-us.pdf
- ClickHouse Connect package documentation: https://pypi.org/project/clickhouse-connect/

## Issues Found
- The prerequisites and commands used RHEL 9's default `python3`, which is Python 3.9. Current `apache-superset` package metadata requires Python 3.10 or later, so the guide now uses Python 3.11 packages and `python3.11 -m venv`.
- The PostgreSQL driver install used `psycopg2-binary`. Superset's official metadata database documentation lists `psycopg2`, so the guide now installs `psycopg2`.
- The Celery configuration was incomplete for Superset async SQL Lab queries. Added the documented Celery imports and a Redis `RESULTS_BACKEND`.
- The Celery worker command omitted the documented fair scheduling optimization. Added `-O fair`.
- The guide set `SESSION_COOKIE_SECURE = True` while only configuring HTTP in Nginx, which would prevent browser sessions over the documented URL. Changed the sample to `False` with a note to enable it after HTTPS is configured.
- The reverse-proxy configuration did not enable Superset's proxy header handling. Added `ENABLE_PROXY_FIX = True`.
- The Superset CLI setup did not export `FLASK_APP=superset`, which the official PyPI installation guide lists with the initialization environment. Added it to the shell setup, initialization command, and troubleshooting command.

## Review Notes
The native PyPI deployment path is still more operationally hands-on than Docker or Kubernetes, which the Superset documentation describes as more complete deployment paths for larger production environments. The guide is technically valid for a single-host RHEL deployment, but future production hardening should include HTTPS, secret management, metadata database backups, and restricted database credentials.
