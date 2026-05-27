# Validation Summary: How to Troubleshoot DAGs Stuck in Queued State in Cloud Composer

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud Composer
- Apache Airflow
- CeleryExecutor and Airflow workers
- Google Cloud CLI
- Google Kubernetes Engine
- Cloud Logging
- Cloud Monitoring

## Sources Consulted
- Google Cloud SDK: `gcloud composer environments run` reference: https://cloud.google.com/sdk/gcloud/reference/composer/environments/run
- Cloud Composer 2: Access Airflow CLI: https://cloud.google.com/composer/docs/composer-2/access-airflow-cli
- Cloud Composer 2: Environment architecture: https://cloud.google.com/composer/docs/composer-2/environment-architecture
- Cloud Composer 2: Environment scaling: https://cloud.google.com/composer/docs/composer-2/environment-scaling
- Cloud Composer 2: Scale environments: https://cloud.google.com/composer/docs/composer-2/scale-environments
- Cloud Composer: Blocked and limited Airflow configuration options: https://cloud.google.com/composer/docs/concepts/airflow-configurations
- Cloud Composer: Monitor environments with Cloud Monitoring: https://cloud.google.com/composer/docs/how-to/managing/monitoring-environments
- Apache Airflow: Configuration reference: https://airflow.apache.org/docs/apache-airflow/stable/configurations-ref.html
- Apache Airflow: Pools documentation: https://airflow.apache.org/docs/apache-airflow/2.11.0/administration-and-deployment/pools.html
- Apache Airflow providers Celery CLI reference: https://airflow.apache.org/docs/apache-airflow-providers-celery/stable/cli-ref.html
- Cloud Monitoring: Alerting policy JSON samples: https://cloud.google.com/monitoring/alerts/policies-in-json
- Cloud Monitoring: `gcloud monitoring policies create` reference: https://cloud.google.com/sdk/gcloud/reference/monitoring/policies/create

## Issues Found
- Replaced `celery inspect active` and `celery inspect ping` with `celery list-workers`. Recent Airflow Celery CLI documentation exposes worker visibility through `airflow celery list-workers`; `inspect active` and `inspect ping` are not current documented Airflow CLI subcommands.
- Clarified that Cloud Composer manages the Celery broker instead of stating that users directly use Redis or RabbitMQ in Composer. Composer exposes broker-related behavior and metrics, but the broker is part of the managed Composer infrastructure.
- Removed the suggestion to use `gcloud composer environments restart-web-server` as a fix for broker or worker issues. That command restarts only the Airflow web server, not workers or the managed broker.
- Corrected the GKE cluster credential snippet. `config.gkeCluster` returns a full resource path, so the cluster ID must be extracted before using `gcloud container clusters get-credentials`.
- Changed the worker pod check to search all namespaces for `airflow-worker` pods instead of assuming the `composer-user-workloads` namespace. That namespace is for user workload pods in Composer 2/3, not a reliable namespace for Airflow worker pods.
- Added the required `combiner` field to the Cloud Monitoring alert policy JSON.
- Qualified the queued-to-running explanation as applying to Celery-backed tasks, because Cloud Composer and Airflow can involve executor-specific queue behavior.

## Review Notes
The guide is technically relevant and broadly accurate after the corrections. Some commands still depend on the Composer image and Airflow version, so future maintenance should re-check the supported Airflow CLI subcommands when Composer images move to newer Airflow/provider versions.
