# Validation Summary: How to Run Apache Superset in Docker for Data Visualization

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache Superset
- Docker
- Docker Compose
- PostgreSQL
- Redis
- Celery
- SQLAlchemy database URIs
- Superset CLI

## Sources Consulted
- Apache Superset Docker Compose documentation: https://superset.apache.org/admin-docs/installation/docker-compose/
- Apache Superset configuration documentation: https://superset.apache.org/admin-docs/configuration/configuring-superset/
- Apache Superset alerts and reports documentation: https://superset.apache.org/admin-docs/configuration/alerts-reports/
- Apache Superset database connection documentation: https://superset.apache.org/user-docs/databases/
- Apache Superset ClickHouse driver documentation: https://superset.apache.org/docs/databases/supported/clickhouse/
- Apache Superset dashboard API documentation: https://superset.apache.org/docs/api/dashboards/
- Apache Superset CLI source for import/export commands: https://github.com/apache/superset/blob/master/superset/cli/importexport.py
- Apache Superset CLI source for database URI command: https://github.com/apache/superset/blob/master/superset/cli/update.py
- Apache Superset Docker configuration source: https://github.com/apache/superset/blob/master/docker/pythonpath_dev/superset_config.py
- Apache Superset default configuration source: https://github.com/apache/superset/blob/master/superset/config.py

## Issues Found
- The post said Docker was recommended for both development and production. Superset's official Docker Compose documentation says the stock Compose setup is not production-ready and is intended primarily for local use. Updated the wording to describe Docker Compose as the fastest local path and note that production needs a hardened deployment.
- The custom Compose example omitted `DATABASE_DIALECT`, which the Superset Docker config uses to construct the metadata database URI from `DATABASE_*` variables. Added `DATABASE_DIALECT: postgresql`.
- The custom Compose startup sequence started all services before running `superset-init`, which could also start the init service during `docker compose up`. Added an `init` profile to the init service and changed the startup commands to start PostgreSQL/Redis, run initialization, then start the web and worker services.
- The custom `CeleryConfig` replaced Superset's default Celery config but omitted task imports and the reports scheduler beat schedule needed for async SQL Lab work and scheduled reports. Added the documented imports and `reports.scheduler` / `reports.prune_log` beat schedule.
- The config mount example only mounted `superset_config.py` into the web service. Superset workers need the same configuration. Updated the snippet to apply the mount and `SUPERSET_CONFIG_PATH` in the shared Compose anchor.
- The scheduled reports section implied Celery worker and beat were sufficient by themselves. Superset's docs also require alert/report configuration and a headless browser in the worker image for screenshots. Updated the sentence to include those prerequisites.
- The dashboard import command omitted the required `--username` / `-u` option for the current Superset CLI. Added `-u admin`.

## Review Notes
The post is technically valid after the corrections. The Docker Compose examples remain illustrative and should still be treated as a starting point rather than a complete production deployment.
