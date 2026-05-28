# Validation Summary: How to Choose Between Cloud Logging and Third-Party Log Management Tools on GCP

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud Logging
- Google Cloud Monitoring
- Google Kubernetes Engine
- Cloud Run functions
- Cloud Run
- BigQuery
- Pub/Sub
- Cloud Storage
- Google Cloud CLI
- BigQuery bq CLI
- Python Cloud Logging client
- Fluentd
- Elasticsearch

## Sources Consulted
- Google Cloud Logging documentation: https://cloud.google.com/logging/docs/
- Google Cloud Logging routing overview: https://cloud.google.com/logging/docs/routing/overview
- Google Cloud Logging route logs to supported destinations: https://cloud.google.com/logging/docs/export/configure_export_v2
- Google Cloud SDK `gcloud logging sinks create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- Google Cloud Observability pricing: https://cloud.google.com/products/observability/pricing
- Google Cloud Logging Python client direct usage: https://docs.cloud.google.com/python/docs/reference/logging/latest/direct-lib-usage
- Google Cloud Logging Python `Client` reference: https://docs.cloud.google.com/python/docs/reference/logging/latest/google.cloud.logging_v2.client.Client
- GKE logs overview: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/about-logs
- Cloud Run logging documentation: https://docs.cloud.google.com/run/docs/logging
- Cloud Run functions logging documentation: https://cloud.google.com/functions/docs/monitoring/logging
- BigQuery bq CLI reference: https://cloud.google.com/bigquery/docs/reference/bq-cli-reference
- Fluentd Elasticsearch output plugin documentation: https://docs.fluentd.org/output/elasticsearch
- Google Cloud fluent-plugin-google-cloud repository: https://github.com/GoogleCloudPlatform/fluent-plugin-google-cloud

## Issues Found
- The post used `my_project` as a GCP project ID placeholder in CLI examples. GCP project IDs cannot contain underscores, so this was changed to `my-project`.
- The BigQuery sink example created the sink but did not grant the sink writer identity permission to write to the destination project. Added commands to read `writerIdentity` and grant `roles/bigquery.dataEditor`, matching Cloud Logging routing requirements.
- The post said managed service logging required "no agent to install" while using GKE as an example. GKE deploys a managed per-node logging agent, so the wording was narrowed to "no agent for you to install" for those managed services.
- The feature list claimed automatic log collection from all GCP services. This was narrowed to "many GCP services" to avoid overstating the behavior across every Google Cloud product and log type.
- The cross-cloud section said Cloud Logging only covers the GCP side. Cloud Logging can ingest AWS and hybrid/on-premises logs with additional setup, so the wording was corrected to say non-GCP visibility needs additional ingestion setup.
- The Fluentd example used two consecutive `<match **>` blocks, which would not fan out records to both outputs because Fluentd routes events to the first matching output. Replaced it with an `@type copy` output containing separate Cloud Logging and Elasticsearch stores.
- The Fluentd example described the snippet as the default GKE behavior. GKE uses a managed logging agent by default, so the comment was changed to describe it as a custom Fluentd configuration.
- Removed the Elasticsearch `type_name _doc` setting from the example because mapping types are obsolete for modern Elasticsearch deployments.

## Review Notes
The post is technically valid after the fixes. Pricing values for Cloud Logging storage, the first 50 GiB per project per month free allotment, and 30-day default retention were current in the Google Cloud Observability pricing documentation checked on 2026-05-28. Third-party pricing remains intentionally approximate because it varies by vendor and plan.
