# Validation Summary: How to Set Up a Machine Learning Pipeline with Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer stacks
- Docker Compose / container networking
- Apache Airflow 2.8
- Airflow Docker provider / `DockerOperator`
- MLflow tracking server
- MinIO object storage
- PostgreSQL
- Python
- Mermaid

## Sources Consulted
- Portainer Documentation: Add a new stack — https://docs.portainer.io/sts/user/docker/stacks/add
- Apache Airflow Docker provider API: `DockerOperator` — https://airflow.apache.org/docs/apache-airflow-providers-docker/stable/_api/airflow/providers/docker/operators/docker/index.html
- Apache Airflow Documentation: Running Airflow in Docker — https://airflow.apache.org/docs/apache-airflow/2.4.3/howto/docker-compose/index.html
- Apache Airflow Documentation: Setting up the database — https://airflow.apache.org/docs/apache-airflow/2.9.3/installation/setting-up-the-database.html
- Apache Airflow Documentation: Webserver authentication / `airflow users create` — https://airflow.apache.org/docs/apache-airflow/2.6.3/security/webserver.html
- Apache Airflow DAG API reference — https://airflow.apache.org/docs/apache-airflow/2.5.1/_api/airflow/models/dag/index.html
- MLflow Tracking Server documentation — https://mlflow.org/docs/latest/self-hosting/architecture/tracking-server/
- MLflow CLI reference — https://mlflow.org/docs/latest/api_reference/cli.html
- MLflow artifact store documentation for S3-compatible storage / MinIO — https://mlflow.org/docs/2.21.3/tracking/artifacts-stores
- MinIO Client documentation: `mc alias set` — https://min.io/docs/minio/linux/reference/minio-mc/mc-alias-set.html
- MinIO Client documentation: `mc mb` — https://docs.min.io/community/minio-object-store/reference/minio-mc/mc-mb.html
- PostgreSQL Docker Official Image documentation — https://hub.docker.com/_/postgres

## Issues Found
- The original Airflow DAG imported `DockerOperator` from `airflow.operators.docker_operator`, which is the legacy import path. I updated it to `airflow.providers.docker.operators.docker` to match current Airflow 2.x provider documentation.
- The DAG used `schedule_interval`, which Airflow deprecated in favor of `schedule` starting in Airflow 2.4. I updated the example to use `schedule="@daily"`.
- The `DockerOperator` tasks were missing the settings needed for this stack layout to work reliably. I added `network_mode="ml-pipeline"` so task containers can resolve the stack service names and `mount_tmp_dir=False` to avoid host-path mount issues when Airflow runs inside a container.
- The stack mounted the Docker socket nowhere, so `DockerOperator` would not be able to launch sibling containers from the scheduler container. I added `/var/run/docker.sock:/var/run/docker.sock` to `airflow-scheduler`.
- The stack did not initialize the Airflow metadata database or create a UI user. I added an `airflow-init` service that runs `airflow db migrate` and `airflow users create`, and updated the UI access note to reflect the generated login.
- The Airflow services used an invalid placeholder Fernet key and only set it on the webserver. I changed the configuration to use the same valid Fernet key across the Airflow services shown in the stack.
- The post relied on `DockerOperator` without ensuring the Docker provider package was present. I added `_PIP_ADDITIONAL_REQUIREMENTS=apache-airflow-providers-docker==3.12.0`, which is compatible with Airflow 2.8.x.
- The MLflow command used `--artifact-root`, which is not the correct tracking-server flag. I changed it to `--artifacts-destination` with `--serve-artifacts`, matching the current MLflow tracking-server documentation for proxied artifact storage.
- The MinIO bucket required by MLflow (`s3://ml-artifacts`) was never created. I added a `minio-create-bucket` service using the official `mc alias set` and `mc mb --ignore-existing` commands.
- The PostgreSQL service referenced `/docker-entrypoint-initdb.d/init.sql` but the article did not provide the SQL needed to create the `airflow` and `mlflow` databases/users. I added the missing `init.sql` snippet.
- The article described and diagrammed a model-serving stage, but no serving component or deployment step existed in the stack or DAG. I removed those unsupported serving references so the article matches the implementation it actually provides.

## Review Notes
- Airflow `2.8.1` and MLflow `2.11.0` are older pinned releases as of 2026-04-29, but the corrected examples are accurate for the versions shown in the post.
- The post still uses floating `latest` tags for `minio/minio` and `minio/mc`; that is technically valid but less reproducible than pinning exact image tags.
- The PostgreSQL init script mounted into `/docker-entrypoint-initdb.d` only runs when the database volume is initialized from empty state, which matches the behavior documented for the official Postgres image.
