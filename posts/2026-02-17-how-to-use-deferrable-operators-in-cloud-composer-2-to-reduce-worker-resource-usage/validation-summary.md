# Validation Summary: Use Deferrable Operators in Cloud Composer 2 to Reduce Worker Resource Usage

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Composer 2
- Apache Airflow deferrable operators and triggers
- Airflow triggerer
- Google Cloud SDK `gcloud composer`
- Apache Airflow Google provider operators for BigQuery, GCS, Dataflow, and Dataproc
- Python custom Airflow operators and triggers

## Sources Consulted
- Cloud Composer 2 deferrable operators documentation: https://docs.cloud.google.com/composer/docs/composer-2/use-deferrable-operators
- Cloud Composer 2 triggerer troubleshooting documentation: https://docs.cloud.google.com/composer/docs/composer-2/troubleshooting-triggerer
- Cloud Composer 2 monitoring dashboard documentation: https://cloud.google.com/composer/docs/composer-2/use-monitoring-dashboard
- Cloud Composer Airflow CLI access documentation: https://cloud.google.com/composer/docs/composer-2/access-airflow-cli
- Google Cloud SDK `gcloud composer environments update` reference: https://docs.cloud.google.com/sdk/gcloud/reference/composer/environments/update
- Google Cloud SDK `gcloud composer environments run` reference: https://cloud.google.com/sdk/gcloud/reference/composer/environments/run
- Apache Airflow 2.10.5 deferrable operators and triggers documentation: https://airflow.apache.org/docs/apache-airflow/2.10.5/authoring-and-scheduling/deferring.html
- Apache Airflow 2.10.5 CLI reference: https://airflow.apache.org/docs/apache-airflow/2.10.5/cli-and-env-variables-ref.html
- Apache Airflow 2.10.5 task states documentation: https://airflow.apache.org/docs/apache-airflow/2.10.5/core-concepts/tasks.html
- Apache Airflow Google provider BigQuery operator documentation: https://airflow.apache.org/docs/apache-airflow-providers-google/stable/operators/cloud/bigquery.html
- Apache Airflow Google provider API references for BigQuery, GCS sensors, Dataflow, and Dataproc operators: https://airflow.apache.org/docs/apache-airflow-providers-google/stable/

## Issues Found
- The post said the Cloud Composer 2 triggerer runs automatically when deferrable tasks exist. Official Cloud Composer documentation says deferrable operators require at least one configured triggerer instance. Updated the wording accordingly.
- The BigQuery check queried `my-project.analytics.daily_events`, but the preceding job wrote to the sharded table `daily_events${{ ds_nodash }}`. Updated the check query to read the same table.
- The custom trigger example placed trigger code under `plugins/`, but Cloud Composer 2 documentation says `dags/` and `/plugins` are not synchronized to the triggerer. Updated the text and path comment to say custom triggers should be installed as a PyPI package.
- The monitoring section described viewing triggerer logs but used `airflow tasks list --all`, which is not the documented Airflow 2 CLI form and does not view triggerer logs. Replaced it with documented `dags list-runs` and `tasks states-for-dag-run` commands.
- The monitoring DAG filtered on `TaskInstance.execution_date`, which is deprecated in modern Airflow 2 usage. Updated the example to count task instances in `TaskInstanceState.DEFERRED`.

## Review Notes
The `deferrable=True` examples for BigQuery, GCS sensors, Dataflow Flex Templates, and Dataproc match the current Google provider convention. The examples still assume compatible Composer 2 and Airflow versions, installed dependencies such as `aiohttp` and `requests` for the custom operator package, and valid GCP project, bucket, dataset, table, and cluster names.
