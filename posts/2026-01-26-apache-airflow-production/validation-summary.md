# Validation Summary: How to Set Up Apache Airflow for Production

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Apache Airflow
- Airflow CeleryExecutor and KubernetesExecutor
- Docker Compose
- PostgreSQL
- Redis
- Celery
- nginx reverse proxy
- Prometheus, Alertmanager, and StatsD exporter
- Python DAG authoring

## Sources Consulted
- Apache Airflow 2.8.1 Docker Compose guide: https://airflow.apache.org/docs/apache-airflow/2.8.1/howto/docker-compose/index.html
- Apache Airflow 2.8.1 official Docker Compose file: https://airflow.apache.org/docs/apache-airflow/2.8.1/docker-compose.yaml
- Apache Airflow 2.8.1 configuration reference: https://airflow.apache.org/docs/apache-airflow/2.8.1/configurations-ref.html
- Apache Airflow 2.8.1 health check documentation: https://airflow.apache.org/docs/apache-airflow/2.8.1/administration-and-deployment/logging-monitoring/check-health.html
- Apache Airflow 2.8.1 metrics documentation: https://airflow.apache.org/docs/apache-airflow/2.8.1/administration-and-deployment/logging-monitoring/metrics.html
- Apache Airflow stable Docker Compose file for current-version comparison: https://airflow.apache.org/docs/apache-airflow/stable/docker-compose.yaml
- Apache Airflow stable CLI documentation for `airflow db clean`: https://airflow.apache.org/docs/apache-airflow/stable/howto/usage-cli.html
- Apache Airflow Airflow 3 upgrade documentation: https://airflow.apache.org/docs/apache-airflow/stable/installation/upgrading_to_airflow3.html

## Issues Found
- The Docker Compose example pinned Airflow 2.8.1 without noting that this is not the current supported production line as of June 14, 2026. Added a caveat that the example targets the shown Airflow 2.x image and that new production deployments should use a currently supported release and matching official Compose service names and health checks.
- The reverse-proxy example did not enable Airflow proxy handling and claimed WebSocket support for log streaming. Added `AIRFLOW__WEBSERVER__ENABLE_PROXY_FIX`, secure cookie settings, and changed the nginx comment/configuration to describe forwarded headers for links, redirects, and log fetching.
- The API authentication setting only enabled basic auth. Updated it to include both `basic_auth` and `session`, matching the official Airflow 2.8.1 Docker Compose pattern.
- The DAG example used `context['execution_date']`, which is the older name for Airflow's logical date. Updated the code to use `context['logical_date']`.
- The DAG example used task-level `sla`, which is removed in Airflow 3 and should not be presented as current production guidance. Removed the `sla` argument while keeping the existing `execution_timeout` behavior.
- The Prometheus alert example referenced non-existent `airflow_ti_failures` and `airflow_ti_successes` metrics. Added a StatsD exporter mapping for `airflow.ti.finish.*.*.*` and changed the alert expression to use the mapped `airflow_ti_finish_total` series by state.
- The metrics mapping referenced `airflow.scheduler.tasks.running`, which is not listed in the Airflow 2.8.1 metrics reference. Replaced it with `airflow.executor.running_tasks`.
- The DAG parse error alert used `airflow_dag_processing_import_errors` without a corresponding StatsD mapping. Added a mapping for `airflow.dag_processing.import_errors`.

## Review Notes
The post remains Airflow 2-oriented because the included Docker Compose topology uses the Airflow 2 webserver model. Airflow 3 uses different current service names and APIs, including `api-server`, API v2, and Deadline Alerts instead of SLAs. A future broader update should migrate the guide fully to Airflow 3.x rather than only carrying a compatibility caveat.
