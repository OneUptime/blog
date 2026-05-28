# Validation Summary: How to Choose Between Cloud Composer and Cloud Workflows

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Composer
- Apache Airflow
- Google Cloud Workflows
- Google Cloud Eventarc
- Google Cloud Scheduler
- Google BigQuery
- Google Cloud Dataflow
- Google Cloud Storage
- Secret Manager
- gcloud CLI
- YAML
- Python

## Sources Consulted
- Cloud Composer overview: https://docs.cloud.google.com/composer/docs/composer-3/composer-overview
- Cloud Composer environment architecture: https://docs.cloud.google.com/composer/docs/composer-3/environment-architecture
- Cloud Composer pricing: https://cloud.google.com/composer/pricing
- Apache Airflow DAG API documentation: https://airflow.apache.org/docs/apache-airflow/2.10.5/_modules/airflow/models/dag.html
- Workflows syntax overview: https://docs.cloud.google.com/workflows/docs/reference/syntax
- Workflows conditions syntax: https://cloud.google.com/workflows/docs/reference/syntax/conditions
- Workflows retry syntax: https://docs.cloud.google.com/workflows/docs/reference/syntax/retrying
- Workflows quotas and limits: https://docs.cloud.google.com/workflows/quotas
- Workflows pricing: https://cloud.google.com/workflows/pricing
- Schedule Workflows using Cloud Scheduler: https://docs.cloud.google.com/workflows/docs/schedule-workflow
- Trigger Workflows with Eventarc: https://docs.cloud.google.com/workflows/docs/trigger-workflow-eventarc
- Eventarc trigger gcloud reference: https://docs.cloud.google.com/sdk/gcloud/reference/eventarc/triggers/create
- Trigger Workflows with Cloud Storage events: https://docs.cloud.google.com/eventarc/standard/docs/workflows/quickstart-storage

## Issues Found
- The Airflow DAG example used `schedule_interval`, which is deprecated in Airflow 2.4 and later. Changed it to `schedule='@daily'`.
- The Workflows BigQuery example only waited for the load job to reach `DONE`, did not check `status.errorResult`, and sent a success notification immediately after submitting the transform job. Added failure checks and polling for both the load and transform jobs before notification.
- The Workflows YAML snippets had unquoted expressions containing string literals with colons, which can break YAML parsing. Quoted the affected `raise` expressions.
- The Workflows pricing text described internal steps as about `$0.000025` per step. Corrected this to about `$0.00001` per internal step and `$0.000025` per external step after the free tier.

## Review Notes
The Cloud Composer cost examples are approximate and can vary significantly by Composer version, region, environment size, resilience settings, and workload. The Eventarc command flags match the current gcloud reference, but the bucket, workflow, location, and service account must be configured with the required IAM roles for a real deployment.
