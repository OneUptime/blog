# Validation Summary: How to Calculate and Optimize Cloud Logging Costs by Analyzing Ingestion Volume

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Logging
- Google Cloud Monitoring
- Google Cloud CLI
- Cloud Logging sinks and exclusion filters
- VPC Flow Logs
- Cloud Load Balancing logging
- Cloud Storage log export destinations
- Python
- Bash, curl, and jq

## Sources Consulted
- Google Cloud Observability pricing: https://cloud.google.com/products/observability/pricing
- Cloud Logging system-defined log-based metrics: https://docs.cloud.google.com/logging/docs/alerting/monitoring-logs
- Cloud Monitoring API projects.timeSeries.list: https://cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.timeSeries/list
- Cloud Logging query language: https://docs.cloud.google.com/logging/docs/view/logging-query-language
- gcloud logging sinks update reference: https://docs.cloud.google.com/sdk/gcloud/reference/logging/sinks/update
- gcloud logging sinks create reference: https://docs.cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- gcloud logging read reference: https://docs.cloud.google.com/sdk/gcloud/reference/logging/read
- gcloud monitoring policies create reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- gcloud compute networks subnets update reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/update
- gcloud compute backend-services update reference: https://docs.cloud.google.com/sdk/gcloud/reference/compute/backend-services/update
- Cloud Storage default storage class documentation: https://docs.cloud.google.com/storage/docs/changing-default-storage-class

## Issues Found
- The pricing section used outdated "ingestion" terminology and omitted the current distinction between Cloud Logging storage, retention, Log Analytics charges, and vended network logs. Updated the section to match current pricing documentation.
- The `_Required` bucket description was incomplete and said it was not charged for ingestion. Updated it to describe storage and retention correctly and note other required audit logs.
- The Monitoring command used `gcloud monitoring time-series list`, BSD-only `date -v`, incorrect labels, and only read the newest point instead of summing the period. Replaced it with a Monitoring API `timeSeries.list` call that uses GNU `date`, the documented `billing/bytes_ingested` metric, and sums returned points by `resource_type`.
- The `gcloud logging read` example claimed "last 24 hours" but used a fixed timestamp. Changed it to compute the timestamp dynamically.
- The log-name example was described as ingestion by log name even though it counts entries. Reworded it as a rough entry-count breakdown.
- The Metrics Explorer recommendation said to group `billing/bytes_ingested` by `log`, but that metric exposes `resource_type`. Corrected the grouping guidance.
- Load balancer and VPC Flow Logs descriptions implied all requests or connections are always logged. Updated them to reflect logging enablement and sampling behavior.
- The Python estimator did not distinguish the 50 GiB free tier for non-vended logs. Updated comments to clarify the assumption.
- The health-check exclusion filter mixed `AND` and `OR` without grouping and used exact request URL matching for paths. Changed it to a single regex path match constrained to load balancer logs.
- The exclusion-filter explanation said logs were dropped before ingestion. Updated it to match sink exclusion behavior: matching entries are not routed to the sink destination and are not stored in that bucket.
- The alerting-policy command used obsolete or invalid flag names. Replaced them with current `--if`, `--duration`, and `--aggregation` flags.

## Review Notes
The local environment did not have `gcloud` installed, so Google Cloud CLI command validation was performed against the official Google Cloud SDK reference pages. The examples still require a configured project, permissions for Logging and Monitoring, and pagination handling for very large Monitoring API result sets.
