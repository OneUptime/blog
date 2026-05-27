# Validation Summary: How to Set Up Alerting for Failed DAGs in Cloud Composer with Cloud Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Composer / Managed Service for Apache Airflow
- Google Cloud Monitoring alerting policies and notification channels
- Terraform Google provider
- Apache Airflow DAG callbacks and scheduling
- Google Cloud Pub/Sub Python client
- gcloud CLI

## Sources Consulted
- Cloud Composer monitoring metrics documentation: https://docs.cloud.google.com/composer/docs/composer-3/monitor-environments
- Cloud Composer key metrics and Terraform alert examples: https://docs.cloud.google.com/composer/docs/composer-3/monitor-key-metrics
- Google Cloud Monitoring metric list for Composer metrics: https://docs.cloud.google.com/monitoring/api/metrics_gcp_c
- Google Cloud Monitoring monitored resource descriptors: https://docs.cloud.google.com/monitoring/api/resources
- Google Cloud Monitoring filter syntax: https://docs.cloud.google.com/monitoring/api/v3/filters
- Terraform `google_monitoring_alert_policy` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_alert_policy
- Google Cloud SDK `gcloud beta monitoring channels create` reference: https://cloud.google.com/sdk/gcloud/reference/beta/monitoring/channels/create
- Apache Airflow callback documentation: https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/logging-monitoring/callbacks.html
- Apache Airflow DAG API documentation for `schedule`: https://airflow.apache.org/docs/apache-airflow/2.10.3/_api/airflow/models/dag/index.html
- Apache Airflow templates/context reference for `logical_date`: https://airflow.apache.org/docs/apache-airflow/stable/templates-ref.html
- Google Cloud Pub/Sub Python publishing documentation: https://docs.cloud.google.com/pubsub/docs/publisher

## Issues Found
- The Terraform alert filters for DAG run and task run metrics used `resource.type = "cloud_composer_environment"`. Cloud Composer workflow metrics are associated with the `cloud_composer_workflow` monitored resource. Updated the DAG and task alert filters to use `cloud_composer_workflow`.
- The high-priority DAG filter used `metric.labels.workflow_name`. `workflow_name` is a resource label on the `cloud_composer_workflow` monitored resource. Updated the text and Terraform filter to use `resource.labels.workflow_name`.
- The environment health section implied the `environment/healthy` metric covers scheduler and database health directly. Google documents this as Composer deployment health and recommends separate component metrics for deeper coverage. Reworded the explanation and alert documentation.
- The environment health alert used `ALIGN_MEAN` and described the metric as numeric 1/0. The metric is a Boolean GAUGE. Updated the aligner to `ALIGN_FRACTION_TRUE` and corrected the comment.
- The Airflow callback example claimed to send a Pub/Sub notification but only returned a Python dictionary and included unused imports. Updated it to use `google.cloud.pubsub_v1.PublisherClient`, publish JSON bytes to a topic, and wait for the publish future.
- The Airflow examples used the deprecated `schedule_interval` DAG argument. Updated them to the current `schedule` argument.
- The callback example used `execution_date`; current Airflow documentation presents `logical_date` as the context value. Updated the example to use `logical_date`.

## Review Notes
The Terraform snippets reference notification channel resources such as `google_monitoring_notification_channel.slack` and `pagerduty` without defining them in the post. That is acceptable for a focused alert-policy guide, but a future post could add complete channel resource examples.
