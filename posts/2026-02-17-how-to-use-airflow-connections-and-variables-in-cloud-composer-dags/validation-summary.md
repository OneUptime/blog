# Validation Summary: How to Use Airflow Connections and Variables in Cloud Composer DAGs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Composer
- Apache Airflow Connections
- Apache Airflow Variables
- Apache Airflow CLI through `gcloud composer environments run`
- Airflow provider operators for PostgreSQL, HTTP, BigQuery, Google Cloud, and Slack
- Google Secret Manager

## Sources Consulted
- Google Cloud Composer: Manage Airflow connections: https://docs.cloud.google.com/composer/docs/composer-3/manage-airflow-connections
- Google Cloud Composer: Configure Secret Manager for your environment: https://docs.cloud.google.com/composer/docs/composer-2/configure-secret-manager
- Google Cloud Composer: Override Airflow configuration options: https://cloud.google.com/composer/docs/composer-3/override-airflow-configurations
- Google Cloud SDK: `gcloud composer environments run`: https://cloud.google.com/sdk/gcloud/reference/composer/environments/run
- Google Cloud SDK: `gcloud topic escaping`: https://docs.cloud.google.com/sdk/gcloud/reference/topic/escaping
- Apache Airflow CLI and environment variables reference: https://airflow.apache.org/docs/apache-airflow/stable/cli-and-env-variables-ref.html
- Apache Airflow Variables documentation: https://airflow.apache.org/docs/apache-airflow/2.2.3/concepts/variables.html
- Apache Airflow Dynamic DAG Generation: https://airflow.apache.org/docs/apache-airflow/stable/howto/dynamic-dag-generation.html
- Apache Airflow Common SQL operators: https://airflow.apache.org/docs/apache-airflow-providers-common-sql/stable/operators.html
- Apache Airflow PostgreSQL provider operators: https://airflow.apache.org/docs/apache-airflow-providers-postgres/6.1.3/operators.html
- Apache Airflow HTTP provider connection and operator documentation: https://airflow.apache.org/docs/apache-airflow-providers-http/stable/connections/http.html and https://airflow.apache.org/docs/apache-airflow-providers-http/stable/_api/airflow/providers/http/operators/http/index.html
- Apache Airflow Google provider connection and BigQuery operator documentation: https://airflow.apache.org/docs/apache-airflow-providers-google/stable/connections/gcp.html and https://airflow.apache.org/docs/apache-airflow-providers-google/stable/_api/airflow/providers/google/cloud/operators/bigquery/index.html
- Apache Airflow Slack Incoming Webhook connection documentation: https://airflow.apache.org/docs/apache-airflow-providers-slack/stable/connections/slack-incoming-webhook.html

## Issues Found
- The DAG example used `PostgresOperator`, which has been removed from the current PostgreSQL provider after deprecation. Replaced it with `SQLExecuteQueryOperator` and changed `postgres_conn_id` to `conn_id`.
- The DAG example used `SimpleHttpOperator`, while the current HTTP provider documents `HttpOperator`. Updated the import and task class name.
- The DAG example used the older `schedule_interval` argument. Updated it to `schedule`, matching current Airflow examples.
- The Google Cloud connection example used older provider-prefixed extra keys. Updated the JSON extras to the current `project` and `key_path` fields.
- The Slack webhook URI used a generic HTTPS URI. Updated it to the Slack provider's `slackwebhook` URI format with a URL-encoded webhook token path.
- The Secret Manager backend configuration command passed JSON with commas to a dictionary-type `gcloud` flag without an alternate delimiter. Updated the command to use `^:^` delimiter syntax and included `sep` explicitly.

## Review Notes
- The remaining `gcloud composer environments run` examples match the documented Cloud Composer pattern for invoking Airflow CLI subcommands. The local environment did not have `gcloud` installed, so command verification was performed against official Google Cloud and Apache Airflow documentation.
