# Validation Summary: How to Deploy Apache Superset via Portainer

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Apache Superset
- Portainer
- Docker Compose / Portainer Stacks
- PostgreSQL
- Redis
- Celery
- Python `superset_config.py`

## Sources Consulted
- Superset 4.0.2 Docker Compose example: https://raw.githubusercontent.com/apache/superset/4.0.2/docker-compose-non-dev.yml
- Superset 4.0.2 Docker environment example: https://raw.githubusercontent.com/apache/superset/4.0.2/docker/.env-non-dev
- Superset 4.0.2 Docker helper scripts: https://raw.githubusercontent.com/apache/superset/4.0.2/docker/docker-init.sh and https://raw.githubusercontent.com/apache/superset/4.0.2/docker/docker-bootstrap.sh
- Superset 4.0.2 bundled Docker config example: https://raw.githubusercontent.com/apache/superset/4.0.2/docker/pythonpath_dev/superset_config.py
- Superset 4.0.2 core config: https://raw.githubusercontent.com/apache/superset/4.0.2/superset/config.py
- Superset configuration documentation: https://superset.apache.org/admin-docs/configuration/configuring-superset/
- Superset feature flags documentation: https://superset.apache.org/admin-docs/configuration/feature-flags/
- Superset database connection documentation: https://superset.apache.org/user-docs/databases/
- Superset “Creating Your First Dashboard” user guide: https://superset.apache.org/user-docs/using-superset/creating-your-first-dashboard
- Superset SQL templating documentation (virtual datasets / SQL Lab): https://superset.apache.org/admin-docs/configuration/sql-templating/
- Superset Oracle driver documentation: https://superset.apache.org/user-docs/databases/supported/oracle/
- Official Superset Docker image tag: https://hub.docker.com/v2/repositories/apache/superset/tags/4.0.2

## Issues Found
1. **The stack relied on environment variables that the stock Superset 4.0.2 image does not read by itself.** The original compose snippet set `SECRET_KEY`, `SQLALCHEMY_DATABASE_URI`, and `REDIS_URL` directly in the container environment, but Superset 4.0.2 expects `SUPERSET_SECRET_KEY` for the secret key and otherwise reads runtime settings from `superset_config.py`. I updated the stack to generate `/app/pythonpath/superset_config.py` at container startup so the metadata database URI, Celery settings, Redis-backed result cache, and cache configuration are actually applied.
2. **The original stack reused Docker concepts from Superset’s repo without the required mounted files.** Superset’s official 4.0.2 Compose setup uses helper scripts and config files from a mounted `./docker` directory, but a Portainer Web Editor stack does not provide those files automatically. I changed the stack to use commands that work with the stock image alone while still separating initialization into a dedicated `superset-init` service.
3. **The async-query explanation conflated two different features.** The post described `GLOBAL_ASYNC_QUERIES` as the mechanism for large query execution in general, but the stack’s Celery worker already covers SQL Lab async execution. I updated Step 10 so it accurately describes `GLOBAL_ASYNC_QUERIES` as the optional 4.0.2 feature for dashboards and Explore, while the main stack handles SQL Lab async through Celery and Redis-backed results.
4. **The driver installation guidance was partially outdated.** The post used the older Oracle package name `cx_Oracle`. I updated the examples to use `oracledb`, which is the current Superset-documented Oracle driver, and kept the temporary container install clearly marked as non-persistent.
5. **A few UI/workflow instructions were inaccurate.** I corrected the database connection menu path to `Settings → Data: Database Connections`, clarified that virtual datasets come from SQL Lab rather than the basic dataset picker, and changed the chart action from `Update Chart` to `Run`, matching the current Superset user docs.

## Review Notes
- Superset’s official docs explicitly say Docker Compose is not supported for production environments. This post remains technically useful as a self-hosted Portainer stack guide, but readers should treat it as a pragmatic single-host deployment pattern rather than an officially supported production architecture.
- Superset 4.0.2’s published image still bundled commonly used drivers such as PostgreSQL and MySQL. Newer Superset Docker guidance has become stricter about image contents and custom driver layering, so readers should not assume the same behavior for later versions without rechecking the official docs for that release.
- The guide is version-pinned to Superset `4.0.2`. Newer Superset releases may differ in UI labels, Docker defaults, and feature-flag behavior.
