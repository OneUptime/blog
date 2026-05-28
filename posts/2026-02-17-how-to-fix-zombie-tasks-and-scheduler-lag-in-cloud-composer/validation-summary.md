# Validation Summary: How to Fix Zombie Tasks and Scheduler Lag in Cloud Composer

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud Composer
- Apache Airflow
- Google Cloud CLI
- Cloud Logging
- Cloud Monitoring
- CeleryExecutor
- Python

## Sources Consulted
- Apache Airflow 2.10.5 task concepts and zombie task behavior: https://airflow.apache.org/docs/apache-airflow/2.10.5/core-concepts/tasks.html
- Apache Airflow 2.10.5 CLI reference for `tasks states-for-dag-run`, `tasks clear`, `dags report`, and `db clean`: https://airflow.apache.org/docs/apache-airflow/2.10.5/cli-and-env-variables-ref.html
- Apache Airflow 2.10.5 configuration reference for zombie detection and DAG parsing settings: https://airflow.apache.org/docs/apache-airflow/2.10.5/configurations-ref.html
- Apache Airflow 3.x task heartbeat timeout documentation: https://airflow.apache.org/docs/apache-airflow/3.0.3/core-concepts/tasks.html
- Google Cloud Composer CLI reference for `gcloud composer environments run`: https://cloud.google.com/sdk/gcloud/reference/composer/environments/run
- Google Cloud Composer Airflow configuration override documentation: https://cloud.google.com/composer/docs/composer-3/override-airflow-configurations
- Google Cloud Composer scaling documentation: https://cloud.google.com/composer/docs/composer-3/scale-environments
- Google Cloud Composer monitoring metrics documentation: https://cloud.google.com/composer/docs/how-to/managing/monitoring-environments
- Google Cloud Monitoring metric type reference for Cloud Composer metrics: https://cloud.google.com/monitoring/api/metrics_gcp_c
- Google Cloud Monitoring alert policy documentation: https://cloud.google.com/monitoring/alerts/policies-in-api

## Issues Found
- Airflow does not have a persistent "zombie" task state. Updated the zombie detection explanation to say the scheduler marks task instances failed or retries them according to retry settings.
- The `tasks states-for-dag-run` example used a bare date. Updated it to use a concrete scheduled DAG run ID format supported by the Airflow CLI.
- The Celery worker inspection commands were missing the argument separator needed by `gcloud composer environments run` for command arguments. Updated the examples and scoped them to Airflow 2.x CeleryExecutor environments.
- The `tasks clear` example described the command as marking tasks failed, but `tasks clear` clears task instance state. Updated the wording and added `-y` so the commands can run non-interactively.
- The maintenance DAG used `schedule_interval` and naive `datetime.utcnow()` calls. Updated the DAG to use `schedule` and Airflow's timezone helper.
- The zombie heartbeat configuration names were Airflow 2.x specific. Added the Airflow 3.x replacement configuration names.
- The scheduler metric names included non-current or incorrect Cloud Composer metric types. Replaced them with `active_schedulers` and `scheduler_heartbeat_count`.
- The alert policy example used the old scheduler heartbeat metric and compared it as a latency value. Updated it to alert on low scheduler heartbeat count and added the required policy combiner and metric alignment.

## Review Notes
The post is primarily written for Airflow 2.x Cloud Composer environments. Some examples, especially direct metadata database access from a DAG, should be revisited before using the same pattern in Airflow 3.x environments.
