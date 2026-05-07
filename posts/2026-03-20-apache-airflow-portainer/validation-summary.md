# Validation Summary: How to Deploy Apache Airflow via Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Airflow
- Portainer
- Docker Engine
- Docker Compose
- PostgreSQL
- Redis
- Python

## Sources Consulted
- Apache Airflow 2.9.1 Docker Compose quick-start: https://airflow.apache.org/docs/apache-airflow/2.9.1/howto/docker-compose/index.html
- Apache Airflow 2.9.1 official `docker-compose.yaml`: https://airflow.apache.org/docs/apache-airflow/2.9.1/docker-compose.yaml
- Apache Airflow current Docker Compose quick-start: https://airflow.apache.org/docs/apache-airflow/stable/howto/docker-compose/index.html
- Apache Airflow health checks: https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/logging-monitoring/check-health.html
- Apache Airflow Docker image entrypoint behavior: https://airflow.apache.org/docs/docker-stack/entrypoint.html
- Portainer stack creation docs: https://docs.portainer.io/user/docker/stacks/add?fallback=true
- Docker Compose startup ordering: https://docs.docker.com/compose/how-tos/startup-order/
- Docker Compose service reference (`container_name`): https://docs.docker.com/reference/compose-file/services/
- Docker Compose `version` field reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Swarm stack deploy reference: https://docs.docker.com/engine/swarm/stack-deploy/

## Issues Found
- The post treated the Airflow Docker Compose deployment as generally production-ready. I corrected the conclusion because Airflow's official docs describe this compose setup as a quick-start for learning and evaluation, not a production deployment.
- The prerequisites did not distinguish Docker Standalone from Docker Swarm. I corrected this because the compose file relies on Compose features such as `depends_on` conditions that do not map cleanly to Swarm stack deployment.
- The prerequisite `Docker Compose v2` was too broad. I updated it to `Docker Compose v2.14.0+` to match Airflow's documented minimum for this quick-start.
- The environment preparation step told readers to write `/opt/airflow/.env`, which is not how Portainer's Web Editor flow supplies variables. I changed the instructions to set `AIRFLOW_UID` as a Portainer stack environment variable.
- The compose snippet used the obsolete top-level `version` field. I removed it to align with the current Compose specification.
- The scheduler healthcheck targeted `http://localhost:8974/health` but the compose environment did not enable the scheduler health check server. I added `AIRFLOW__SCHEDULER__ENABLE_HEALTH_CHECK: "true"`.
- The API auth backend value did not match the official Airflow compose example. I updated it to include both `basic_auth` and `session`.
- The webserver, scheduler, and worker could start before `airflow-init` completed. I added `depends_on` entries with `service_completed_successfully` for `airflow-init` to avoid that startup race.
- The compose file omitted `airflow-triggerer`, which the official CeleryExecutor quick-start includes for deferrable tasks. I added the missing service and its healthcheck.
- The init service used a manual `airflow users create` command. I replaced it with the official entrypoint environment variables (`_AIRFLOW_DB_MIGRATE`, `_AIRFLOW_WWW_USER_CREATE`, and related settings) so initialization is idempotent and safer on redeploy.
- The compose file set explicit `container_name` values, which prevents Docker Compose from scaling a service beyond one container. I removed those so the worker scaling guidance can actually work.
- The DAG discovery sentence referenced `/dags`, but this stack mounts DAGs into `/opt/airflow/dags`. I corrected the path.
- The scaling section incorrectly implied a Portainer-style replica control for this standalone Compose stack. I rewrote it to use a local `docker compose up --scale` redeploy and carried `AIRFLOW_UID` into that command.

## Review Notes
- The post is now technically correct for the pinned `apache/airflow:2.9.3` setup.
- Airflow's current stable documentation is newer than the pinned version and uses a different service layout in the 3.x quick-start (`airflow-api-server` and `airflow-dag-processor`). The article remains valid because it is explicitly pinned to Airflow 2.9.3.
- The corrected compose snippet was sanity-checked with `docker compose config`.
