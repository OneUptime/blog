# Validation Summary: How to Monitor Datastream Replication Lag and Throughput Metrics

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Datastream
- Cloud Monitoring dashboards and alerting policies
- Google Cloud CLI
- Terraform Google provider
- Monitoring Query Language (MQL)
- BigQuery SQL
- MySQL binary logs
- PostgreSQL replication slots

## Sources Consulted
- Google Cloud Datastream monitoring documentation: https://docs.cloud.google.com/datastream/docs/monitor-a-stream
- Google Cloud Datastream best practices: https://docs.cloud.google.com/datastream/docs/best-practices-general
- Google Cloud Monitoring metrics list for Datastream metrics: https://cloud.google.com/monitoring/api/metrics_gcp_d_h
- Google Cloud CLI documentation for `gcloud monitoring dashboards create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/dashboards/create
- Google Cloud CLI documentation for `gcloud alpha monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/alpha/monitoring/policies/create
- Google Cloud Monitoring MQL deprecation notice: https://docs.cloud.google.com/stackdriver/docs/deprecations/mql
- Google Cloud Monitoring distribution metric alignment documentation: https://docs.cloud.google.com/monitoring/api/v3/distribution-metrics
- Terraform `google_monitoring_alert_policy` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_alert_policy
- Google Cloud Datastream BigQuery destination documentation: https://cloud.google.com/datastream/docs/destination-bigquery
- Google Cloud Datastream events and streams documentation: https://docs.cloud.google.com/datastream/docs/events-and-streams
- MySQL 8.4 documentation for `SHOW MASTER STATUS`: https://dev.mysql.com/doc/mysql/en/show-master-status.html
- PostgreSQL documentation for `pg_replication_slots`: https://www.postgresql.org/docs/current/view-pg-replication-slots.html

## Issues Found
- The Datastream total latency metric used the incorrect singular type `datastream.googleapis.com/stream/total_latency`. Changed it to the documented distribution metric `datastream.googleapis.com/stream/total_latencies`.
- The freshness metric used the incorrect type `datastream.googleapis.com/stream/data_freshness`. Changed it to the documented metric `datastream.googleapis.com/stream/freshness` and corrected the explanation to match Datastream's source-read freshness definition.
- The `gcloud alpha monitoring policies create` example used unsupported threshold-specific flags. Replaced them with the documented `--if`, `--duration`, and `--aggregation` flags.
- The alert examples used `ALIGN_MAX` on the Datastream total latency distribution metric. Changed this to `ALIGN_PERCENTILE_99`, which is valid for distribution-valued metrics.
- The Terraform throughput alert was described as a zero-throughput alert, but `condition_absent` checks for missing time series data. Updated the wording to "missing throughput data" to match the condition behavior.
- The MQL latency query used the wrong metric name and an outdated framing. Updated it to query `stream/freshness` with a numeric mean aligner and noted that MQL is no longer Google's recommended language for new dashboards and alerts.
- The BigQuery lag queries treated `datastream_metadata.source_timestamp` as a TIMESTAMP, but Datastream stores it as an integer epoch timestamp. Wrapped it with `TIMESTAMP_MILLIS(...)`.
- The MySQL source monitoring snippet used `SHOW MASTER STATUS`, which is no longer supported in MySQL 8.4. Replaced it with `SHOW BINARY LOG STATUS`.

## Review Notes
The guide is technically relevant and salvageable. The MQL examples remain usable for ad-hoc Metrics Explorer investigation, but future revisions should prefer PromQL for new dashboards and alerting examples because Google no longer recommends MQL for new Cloud Monitoring work.
