# Validation Summary: How to Deploy Apache Airflow via Portainer - Deploy

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- Apache Airflow 2.9.3
- Portainer
- Docker / Docker Compose
- PostgreSQL 16 (Alpine)
- Python (cryptography / Fernet)
- Airflow LocalExecutor
- Apache Airflow CLI

## Sources Consulted
- Apache Airflow 2.9.3 official documentation: https://airflow.apache.org/docs/apache-airflow/2.9.3/
- Apache Airflow CLI reference (2.9.3): https://airflow.apache.org/docs/apache-airflow/2.9.3/cli-and-env-variables-ref.html
- Apache Airflow Configuration Reference: https://airflow.apache.org/docs/apache-airflow/2.9.3/configurations-ref.html
- Apache Airflow Docker image documentation: https://airflow.apache.org/docs/docker-stack/index.html
- Docker Compose reference (YAML anchors, healthchecks, depends_on): https://docs.docker.com/compose/
- PostgreSQL Docker official image: https://hub.docker.com/_/postgres
- cryptography library Fernet documentation: https://cryptography.io/en/latest/fernet/

## Issues Found
- **Invalid CLI command `airflow tasks logs`**: The original post included `docker exec airflow_scheduler airflow tasks logs hello_world say_hello <execution_date>` to view task logs. This is not a valid Airflow CLI subcommand in Airflow 2.9.x. The valid `tasks` subcommands are `clear`, `failed-deps`, `list`, `render`, `run`, `state`, `states-for-dag-run`, and `test`. Replaced it with `docker exec airflow_scheduler ls /opt/airflow/logs/dag_id=hello_world/` which lists the actual on-disk task logs that Airflow writes to the mounted `airflow_logs` volume (Airflow 2.x stores logs under `dag_id=<id>/run_id=<run_id>/task_id=<id>/`).

## Review Notes
- The configuration variable `AIRFLOW__DATABASE__SQL_ALCHEMY_CONN` is correct for Airflow 2.3+ (it was moved from `AIRFLOW__CORE__SQL_ALCHEMY_CONN`).
- `airflow db migrate` is the correct modern command (replaced `airflow db init` as the recommended form starting around Airflow 2.7).
- The `schedule="@daily"` parameter in the DAG example is the correct modern parameter (replacing `schedule_interval` in Airflow 2.4+).
- The webserver `/health` endpoint used in the healthcheck is valid in Airflow 2.x. Note that Airflow 3.0 replaces `webserver` with `api-server`, but since this guide uses 2.9.3, `webserver` is correct.
- Best-practice caveat (not corrected since not strictly wrong): the `airflow-init` service uses `restart: on-failure`, which means if `airflow users create` is invoked when the admin user already exists, the command will error and the container will keep restarting. In production, the official Airflow compose example handles this with a one-shot init or by checking for existing users first. The current setup will still work on first deploy.
- Best-practice caveat: the webserver/scheduler services depend only on Postgres being healthy, not on `airflow-init` completing. They may produce errors at first start before the DB is migrated. Using `depends_on` with `service_completed_successfully` for `airflow-init` would be more robust, but this isn't strictly an error.
- The Fernet key generation command using `cryptography.fernet.Fernet.generate_key()` is correct and produces a base64-encoded 32-byte key suitable for `AIRFLOW__CORE__FERNET_KEY`.
