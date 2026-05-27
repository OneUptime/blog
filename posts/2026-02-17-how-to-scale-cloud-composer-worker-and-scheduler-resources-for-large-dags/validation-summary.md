# Validation Summary: How to Scale Cloud Composer Worker and Scheduler Resources for Large DAGs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Composer
- Apache Airflow
- Google Cloud CLI
- Cloud Monitoring
- Python DAG authoring

## Sources Consulted
- Google Cloud Composer environment scaling documentation: https://docs.cloud.google.com/composer/docs/composer-2/scale-environments
- Google Cloud Composer Airflow configuration override documentation: https://docs.cloud.google.com/composer/docs/composer-3/override-airflow-configurations
- Google Cloud Composer database retention documentation: https://docs.cloud.google.com/composer/docs/composer-3/configure-db-retention
- Google Cloud Composer monitoring documentation: https://docs.cloud.google.com/composer/docs/composer-2/monitor-environments
- Google Cloud SDK `gcloud composer environments update` reference: https://docs.cloud.google.com/sdk/gcloud/reference/composer/environments/update
- Google Cloud SDK `gcloud composer environments run` reference: https://docs.cloud.google.com/sdk/gcloud/reference/composer/environments/run
- Google Cloud SDK `gcloud monitoring policies create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud Monitoring alert policy JSON samples: https://docs.cloud.google.com/monitoring/alerts/policies-in-json
- Apache Airflow 2.10.5 configuration reference: https://airflow.apache.org/docs/apache-airflow/2.10.5/configurations-ref.html
- Apache Airflow 2.10.5 CLI reference: https://airflow.apache.org/docs/apache-airflow/2.10.5/cli-and-env-variables-ref.html
- Apache Airflow best practices for top-level DAG code: https://airflow.apache.org/docs/apache-airflow/stable/best-practices.html

## Issues Found
- The automatic metadata cleanup example used `core-store_dag_code=False`, which is not a current Airflow 2.10 configuration option and does not configure Composer automatic database cleanup. Replaced it with the Cloud Composer 3 `--airflow-database-retention-days=60` command.
- The Cloud Monitoring alert policy JSON omitted `combiner`, which official alert-policy JSON examples include for condition combination. Added `"combiner": "OR"` to the policy.

## Review Notes
The remaining Cloud Composer scaling flags, Airflow configuration override key format, Airflow CLI commands, queue-length metric, scheduler heartbeat metric, and DAG parsing best-practice guidance align with current official documentation. The post mainly targets Cloud Composer environments running Airflow 2.x; Cloud Composer 3 also exposes separate DAG processor workload scaling flags, which could be covered in a future expansion.
