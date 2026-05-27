# Validation Summary: How to Monitor BigQuery BI Engine Cache Hit Rates and Acceleration Status

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud BigQuery
- BigQuery BI Engine
- BigQuery INFORMATION_SCHEMA
- Cloud Monitoring
- Google Cloud CLI
- BigQuery Reservations API
- SQL
- Bash

## Sources Consulted
- BigQuery BI Engine monitoring documentation: https://cloud.google.com/bigquery/docs/bi-engine-monitor
- BigQuery INFORMATION_SCHEMA JOBS view: https://cloud.google.com/bigquery/docs/information-schema-jobs
- BigQuery INFORMATION_SCHEMA BI_CAPACITIES view: https://cloud.google.com/bigquery/docs/information-schema-bi-capacities
- BigQuery Job REST reference for BiEngineStatistics: https://cloud.google.com/bigquery/docs/reference/rest/v2/Job
- BigQuery Reservations API BiReservation reference: https://cloud.google.com/bigquery/docs/reference/reservations/rest/v1/BiReservation
- BigQuery BI Engine capacity documentation: https://cloud.google.com/bigquery/docs/bi-engine-reserve-capacity
- Cloud Monitoring Google Cloud metrics reference for bigquerybiengine metrics: https://cloud.google.com/monitoring/api/metrics_gcp_a_b
- Google Cloud CLI reference for logging metrics create: https://cloud.google.com/sdk/gcloud/reference/logging/metrics/create
- Google Cloud CLI reference for monitoring policies create: https://cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- BigQuery audit logs overview: https://cloud.google.com/bigquery/docs/reference/auditlogs/

## Issues Found
- The post described three BI Engine acceleration modes and queried `bi_engine_statistics.bi_engine_mode`. Current BI Engine monitoring documentation describes four `acceleration_mode` values: `BI_ENGINE_DISABLED`, `PARTIAL_INPUT`, `FULL_INPUT`, and `FULL_QUERY`. Updated the explanation and SQL examples to use `bi_engine_statistics.acceleration_mode`.
- The post used `FULL`, `PARTIAL`, and `DISABLED` in aggregation queries. Updated those checks to the current `FULL_QUERY`, `FULL_INPUT`, `PARTIAL_INPUT`, and `BI_ENGINE_DISABLED` values.
- The post labeled BI Engine acceleration percentages as cache hit rates, which can be confused with BigQuery's separate query result cache `cache_hit` field. Updated the description and section heading to refer to acceleration rates, and clarified the distinction.
- The memory utilization query summed `total_bytes_processed`, which does not measure BI Engine reservation utilization. Replaced it with a `BI_CAPACITIES` query for reservation size and pointed utilization monitoring to the official `bigquerybiengine.googleapis.com/reservation/used_bytes` and `reservation/total_bytes` Cloud Monitoring metrics.
- The reservation API example claimed to show utilization, but the `BiReservation` resource contains reservation configuration such as `size` and `preferredTables`, not utilization. Updated the wording.
- The Cloud Monitoring alert command used non-current `gcloud monitoring policies create` flags and an inaccurate BigQuery log filter path. Replaced it with a current `gcloud monitoring policies create` example using `--if` and `--duration` against the built-in BI Engine reservation usage metric.
- The scheduled-query percentage calculation could divide by zero if no BI Engine jobs matched the one-hour window. Updated it to use `SAFE_DIVIDE`.

## Review Notes
The post is now technically aligned with current Google Cloud documentation. The remaining 80% acceleration target is a practical heuristic rather than an official Google Cloud threshold.
