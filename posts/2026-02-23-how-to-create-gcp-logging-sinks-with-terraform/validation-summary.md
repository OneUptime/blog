# Validation Summary: How to Create GCP Logging Sinks with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HashiCorp google provider)
- Google Cloud Logging (log sinks, exclusion filters, log buckets, log router)
- Google BigQuery (as a log sink destination)
- Google Cloud Storage (as a log sink destination)
- Google Cloud Pub/Sub (as a log sink destination)
- GCP IAM (writer identity bindings)
- GCP organization/folder hierarchy (org-level and folder-level sinks)

## Sources Consulted
- Google Cloud Logging — Configure and manage sinks: https://cloud.google.com/logging/docs/export/configure_export_v2
- Google Cloud Logging — Log buckets and retention: https://cloud.google.com/logging/docs/buckets
- Google Cloud Logging — LogEntry / HttpRequest reference: https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry
- Google Cloud Logging — Query language: https://cloud.google.com/logging/docs/view/logging-query-language
- Terraform google provider — `google_logging_project_sink`, `google_logging_organization_sink`, `google_logging_folder_sink`, `google_logging_project_exclusion`, `google_logging_project_bucket_config`
- Terraform google provider — `google_bigquery_dataset`, `google_bigquery_dataset_iam_member`
- Terraform google provider — `google_storage_bucket`, `google_storage_bucket_iam_member`
- Terraform google provider — `google_pubsub_topic`, `google_pubsub_subscription`, `google_pubsub_topic_iam_member`
- GCP destination permission requirements for sink writer identities

## Issues Found
- **Incorrect filter operator for `httpRequest.requestUrl`** in the health-check exclusion example. The `requestUrl` field on `HttpRequest` contains the full URL (scheme + host + path + query), e.g. `http://example.com/health`, so `httpRequest.requestUrl="/health"` (equality) would never match. Replaced `=` with the `:` substring/has operator to match URLs whose path contains `/health`. This is consistent with the example already shown in the "Writing Effective Filters" section at the bottom of the post.

## Review Notes
- The Terraform resource schemas, destination format strings (`bigquery.googleapis.com/...`, `storage.googleapis.com/...`, `pubsub.googleapis.com/...`, `logging.googleapis.com/...`), and IAM role names (`roles/bigquery.dataEditor`, `roles/storage.objectCreator`, `roles/pubsub.publisher`) all match current official documentation.
- `google_logging_organization_sink` and `google_logging_folder_sink` do not support a `unique_writer_identity` argument — the writer identity is always unique for non-project sinks. The post correctly omits this argument on both org and folder sink examples.
- `default_table_expiration_ms = 7776000000` correctly equals 90 days.
- `message_retention_duration = "604800s"` correctly equals 7 days.
- The default 30-day / 400-day retention claim is correct for the `_Default` and `_Required` buckets respectively. Strictly speaking, the 400-day fixed retention covers Admin Activity, System Event, and Access Transparency audit logs (all routed to `_Required`), while Data Access audit logs go to `_Default` and follow the 30-day retention. The post's simpler phrasing is acceptable shorthand.
- The conclusion's advice to "always set `unique_writer_identity = true`" applies specifically to `google_logging_project_sink` (where the default is `false`); for org/folder sinks it is implicitly always true.
