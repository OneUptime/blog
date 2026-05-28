# Validation Summary: How to Detect Insider Threat Patterns Using Google Cloud Audit Logs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Audit Logs
- Google Security Operations / Chronicle SIEM
- YARA-L 2.0 detection rules
- Cloud Logging log sinks
- Pub/Sub
- Terraform Google provider
- BigQuery SQL
- Python

## Sources Consulted
- Google Security Operations: Ingest Google Cloud data to Google Security Operations - https://cloud.google.com/chronicle/docs/ingestion/default-parsers/ingest-gcp-logs
- Google Security Operations: YARA-L 2.0 syntax overview - https://cloud.google.com/chronicle/docs/detection/yara-l-2-0-syntax
- Google Security Operations: Events section syntax - https://cloud.google.com/chronicle/docs/yara-l/events-syntax
- Google Security Operations: Condition section syntax - https://cloud.google.com/chronicle/docs/yara-l/condition-syntax
- Google Security Operations: Functions, including timestamp.get_hour - https://cloud.google.com/chronicle/docs/yara-l/functions
- Google Security Operations: Composite detection rules - https://cloud.google.com/chronicle/docs/yara-l/composite-detection-rules
- Google Security Operations: UDM field list - https://cloud.google.com/chronicle/docs/reference/udm-field-list
- Cloud Logging: Route logs to supported destinations - https://cloud.google.com/logging/docs/export/configure_export_v2
- Terraform Google provider: google_logging_organization_sink - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/logging_organization_sink
- Terraform Google provider: google_pubsub_subscription - https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_subscription

## Issues Found
- The Cloud Logging sink filter used `logName` substring matches for audit log names. Changed it to the documented `log_id("cloudaudit.googleapis.com/...")` form for Admin Activity, Data Access, System Event, and Policy Denied audit logs.
- The Terraform Pub/Sub export example did not grant the logging sink writer identity permission to publish to the destination topic. Added `unique_writer_identity = true` and a `google_pubsub_topic_iam_member` with `roles/pubsub.publisher`.
- The Pub/Sub subscription referenced the topic name rather than the Terraform topic ID. Updated it to `google_pubsub_topic.chronicle_ingest.id`, matching the provider's documented examples.
- The ingestion section implied that the Pub/Sub pipeline was the single simplest Google Cloud integration path. Adjusted the wording to distinguish direct Google SecOps ingestion from a Pub/Sub-based export feed.
- The service account key detection rule used inconsistent placeholder naming. Standardized the actor placeholder to `$user` so the downstream composite rule can correlate on a common match variable.
- The after-hours YARA-L rule referenced a non-existent `.hours` timestamp subfield. Replaced it with `timestamp.get_hour($event.metadata.event_timestamp.seconds, "UTC")`.
- The composite YARA-L rule treated detections as UDM events with `metadata.event_type = "DETECTION"` and `security_result.rule_name`. Rewrote it to use the documented composite detection fields under `$detection.detection.detection.*` and to read the common `user` detection field.
- The Python response playbook called helper functions that were not defined and imported unused Google Cloud modules. Removed the unused imports and added minimal placeholder helper functions so the example is internally consistent.

## Review Notes
The YARA-L examples remain illustrative and should still be tested against the exact Google Cloud Audit Logs parser output in the target Google SecOps tenant, because UDM field population for IAM policy deltas can vary by service and method. The BigQuery dashboard query assumes a custom detections export table with the shown column names.
