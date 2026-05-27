# Validation Summary: How to Troubleshoot Missing Logs in Cloud Logging Sinks and Destinations

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud Logging
- Cloud Logging sinks and Log Router
- Cloud Logging query language
- Cloud Monitoring metrics
- Cloud Storage
- BigQuery
- Pub/Sub
- Google Cloud CLI

## Sources Consulted
- Google Cloud Logging routing overview: https://cloud.google.com/logging/docs/routing/overview
- Google Cloud Logging route logs to supported destinations: https://cloud.google.com/logging/docs/export/configure_export_v2
- Google Cloud Logging REST LogSink reference: https://cloud.google.com/logging/docs/reference/v2/rest/v2/sinks
- Google Cloud Logging access control: https://cloud.google.com/logging/docs/access-control
- Google Cloud Logging routed logs to Cloud Storage: https://cloud.google.com/logging/docs/export/storage
- Google Cloud Logging routed logs to BigQuery: https://cloud.google.com/logging/docs/export/bigquery
- Google Cloud Logging monitoring metrics: https://cloud.google.com/logging/docs/alerting/monitoring-logs
- Google Cloud SDK gcloud logging sinks list reference: https://cloud.google.com/sdk/gcloud/reference/logging/sinks/list
- Google Cloud SDK gcloud storage buckets add-iam-policy-binding reference: https://cloud.google.com/sdk/gcloud/reference/storage/buckets/add-iam-policy-binding
- BigQuery bq command-line tool reference: https://cloud.google.com/bigquery/docs/reference/bq-cli-reference
- BigQuery access control with IAM: https://cloud.google.com/bigquery/docs/control-access-to-resources-iam

## Issues Found
- The post said every sink has a writer identity. Updated this to note that sinks writing to a Cloud Logging bucket in the same project do not require a writer identity.
- The writer identity example used an outdated-looking service account format. Updated it to match the current documented `service-...@gcp-sa-logging.iam.gserviceaccount.com` format.
- The Cloud Logging bucket permission guidance said no additional permissions were needed for another Cloud Logging bucket. Updated it to require `roles/logging.bucketWriter` for a log bucket in a different project, while preserving the same-project exception.
- The BigQuery IAM example used `bq add-iam-policy-binding` on a dataset, but the bq reference says that command does not support datasets. Replaced it with the documented `gcloud projects add-iam-policy-binding` approach for granting the sink writer identity `roles/bigquery.dataEditor` on the destination project.
- The exclusion-filter explanation incorrectly said `_Default` exclusions apply globally before custom sinks. Updated it to reflect that project-level sinks evaluate independently and that only intercepting aggregated sinks can affect routing to child-resource sinks.
- The Cloud Storage latency guidance understated first-delivery delay. Updated it to match the official Cloud Logging guidance that routed logs are saved in hourly batches and first entries can take 2-3 hours to appear.
- The BigQuery latency guidance was adjusted to match the official statement that logs are typically visible within one minute, with several minutes possible when a new table is created.
- The Cloud Monitoring example used BSD `date -v`, which fails in common Linux and Cloud Shell environments. Replaced it with GNU `date -d '1 hour ago'`.
- The organization/folder-level sink wording implied all organization-level sinks intercept logs. Updated it to specify intercepting aggregated sinks.
- The ingestion-check step described a metrics check while using `gcloud logging read`. Updated the wording to describe sampling recent Cloud Logging entries instead.

## Review Notes
The post is technically relevant and valid after the corrections. The local environment did not have `gcloud` or `bq` installed, so command validation relied on official Google Cloud CLI and product documentation rather than local `--help` output.
