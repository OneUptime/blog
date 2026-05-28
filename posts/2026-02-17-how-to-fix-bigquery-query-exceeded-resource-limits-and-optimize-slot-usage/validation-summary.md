# Validation Summary: How to Fix BigQuery Query Exceeded Resource Limits and Optimize Slot Usage

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud BigQuery
- BigQuery slots and reservations
- BigQuery INFORMATION_SCHEMA views
- GoogleSQL
- bq command-line tool

## Sources Consulted
- BigQuery slots documentation: https://cloud.google.com/bigquery/docs/slots
- BigQuery quotas and limits: https://cloud.google.com/bigquery/quotas
- BigQuery query troubleshooting: https://cloud.google.com/bigquery/docs/troubleshoot-queries
- BigQuery query plan and timeline documentation: https://cloud.google.com/bigquery/docs/query-plan-explanation
- BigQuery INFORMATION_SCHEMA JOBS view: https://cloud.google.com/bigquery/docs/information-schema-jobs
- BigQuery INFORMATION_SCHEMA JOBS_TIMELINE view: https://cloud.google.com/bigquery/docs/information-schema-jobs-timeline
- BigQuery partitioned tables documentation: https://cloud.google.com/bigquery/docs/partitioned-tables
- BigQuery query performance best practices: https://cloud.google.com/bigquery/docs/best-practices-performance-compute
- BigQuery approximate aggregate functions reference: https://cloud.google.com/bigquery/docs/reference/standard-sql/aggregate_functions
- bq command-line tool reference: https://cloud.google.com/bigquery/docs/reference/bq-cli-reference
- BigQuery reservation assignment documentation: https://cloud.google.com/bigquery/docs/reservations-assignments
- BigQuery reservation management documentation: https://cloud.google.com/bigquery/docs/reservations-tasks

## Issues Found
- The opening explanation described resource limit errors only as slot availability problems. BigQuery documentation distinguishes CPU-per-data, memory, shuffle, planning complexity, and slot-related resource failures, so the wording was broadened.
- The first INFORMATION_SCHEMA query selected `period_start` from `JOBS_BY_PROJECT`, where that column does not exist. It now uses `JOBS_TIMELINE_BY_PROJECT` with `period_slot_ms`.
- The first `bq query` command needed shell-safe quoting after adding `job_type = 'QUERY'`. It now uses a double-quoted query string with escaped BigQuery table backticks.
- The partition pruning example used `BETWEEN '2024-01-01' AND '2024-12-31'`, which can exclude most of December 31 for timestamp columns. It now uses a half-open range ending before `2025-01-01`.
- The reservation creation command used `--reservation_id` for `bq mk --reservation`. The documented create command takes the reservation name as an argument, and current reservation creation supports an edition flag, so the command was corrected.
- The monitoring query named `MAX(period_slot_ms) / 1000` as `peak_slot_seconds`. Because each timeline period is one second, the expression represents peak slots for a period, so it was renamed to `peak_slots`.

## Review Notes
The remaining examples are illustrative and assume matching schemas, locations, permissions, and partitioning choices. The local environment did not have the `bq` CLI installed, so CLI verification was performed against official Google Cloud documentation rather than local `--help` output.
