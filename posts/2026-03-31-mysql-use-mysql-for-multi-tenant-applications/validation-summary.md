# Validation Summary: How to Use MySQL for Multi-Tenant Applications

## Status
validated

## Post Type
Tutorial / Architecture Guide

## Technologies Covered
- MySQL 8.0
- Python (PyMySQL, SQLAlchemy)
- Docker / Docker Compose

## Sources Consulted
- MySQL 8.0 CREATE TABLE reference: https://dev.mysql.com/doc/refman/8.0/en/create-table.html
- MySQL 8.0 CREATE DATABASE reference: https://dev.mysql.com/doc/refman/8.0/en/create-database.html
- MySQL 8.0 DATETIME default values: https://dev.mysql.com/doc/refman/8.0/en/data-type-defaults.html
- MySQL SOURCE command: https://dev.mysql.com/doc/refman/8.0/en/mysql-batch-commands.html
- Official MySQL Docker image documentation: https://hub.docker.com/_/mysql (environment variables section)
- SQLAlchemy MySQL dialect: https://docs.sqlalchemy.org/en/20/dialects/mysql.html
- PyMySQL parameterized queries: https://pymysql.readthedocs.io/en/latest/

## Issues Found
1. **Docker Compose snippet missing required environment variables**: The `mysql:8.0` Docker image requires `MYSQL_ROOT_PASSWORD` (or `MYSQL_ALLOW_EMPTY_PASSWORD` / `MYSQL_RANDOM_ROOT_PASSWORD`) to start. The original snippet only had `MYSQL_DATABASE` and `MYSQL_PASSWORD`, which would cause the container to fail on startup. Additionally, `MYSQL_PASSWORD` only takes effect when `MYSQL_USER` is also set. Fixed by adding `MYSQL_ROOT_PASSWORD` and `MYSQL_USER` to the environment variables.

## Review Notes
- The f-string interpolation in `get_db_for_tenant` (`f"mysql+pymysql://...tenant_{tenant_slug}"`) could be a connection string injection vector if `tenant_slug` is not validated. This is acceptable for a conceptual example but worth noting for production use.
- MySQL does not have native Row-Level Security (unlike PostgreSQL). The post correctly qualifies this as "in the application layer," which is accurate terminology for the pattern being described.
- The ~100-500 tenants/server estimate for the separate schema strategy is a reasonable rough guideline, as MySQL performance degrades with very large numbers of schemas due to file descriptor and metadata overhead.
