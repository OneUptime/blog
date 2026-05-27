# Validation Summary: How to Monitor BigQuery Slot Utilization with INFORMATION_SCHEMA.JOBS

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud BigQuery
- BigQuery INFORMATION_SCHEMA.JOBS
- BigQuery INFORMATION_SCHEMA.JOBS_TIMELINE
- BigQuery slots and reservations
- GoogleSQL
- Cloud Monitoring

## Sources Consulted
- Google Cloud BigQuery documentation: INFORMATION_SCHEMA.JOBS view, https://cloud.google.com/bigquery/docs/information-schema-jobs
- Google Cloud BigQuery documentation: INFORMATION_SCHEMA.JOBS_TIMELINE view, https://cloud.google.com/bigquery/docs/information-schema-jobs-timeline
- Google Cloud BigQuery documentation: Create custom query quotas, https://cloud.google.com/bigquery/docs/custom-quotas
- Google Cloud BigQuery documentation: Workload management using reservations, https://cloud.google.com/bigquery/docs/reservations-workload-management

## Issues Found
- The post described INFORMATION_SCHEMA.JOBS as containing one row per completed job. The official documentation describes it as near real-time metadata for all jobs in the current project, so this was changed to one row per job.
- The hourly JOBS_TIMELINE query filtered `state = 'DONE'`. Because JOBS_TIMELINE rows represent one-second periods and include currently running and completed jobs, filtering only `DONE` rows can undercount execution periods. The filter was removed.
- Queries that aggregate query jobs did not exclude parent `SCRIPT` statement rows. Google Cloud documentation recommends excluding `SCRIPT` statement types when summarizing query jobs to avoid double counting child jobs, so the examples now filter out `SCRIPT` statement rows.
- The slot contention section inferred contention from high slot milliseconds relative to wall-clock duration, which actually measures average parallelism rather than direct contention. The example now uses `period_estimated_runnable_units`, the documented JOBS_TIMELINE field for runnable work that could be scheduled if more slots were available.
- The minute-by-minute query labeled `COUNT(DISTINCT job_id)` as concurrent jobs. This is really jobs seen during the minute, so the alias and comment were corrected.
- The automated monitoring query calculated `peak_slots` as the maximum single job's `period_slot_ms` in a second, not the peak total concurrent slot usage across jobs. The query now aggregates per second before calculating the peak.
- The post recommended custom quotas to limit per-user slot consumption. BigQuery custom query quotas limit bytes processed for on-demand pricing, not slot consumption. The recommendation was revised to mention custom query quotas for on-demand bytes processed and reservation assignments for isolating capacity-based workloads.

## Review Notes
The SQL examples use regional INFORMATION_SCHEMA qualifiers and current BigQuery fields. For large production monitoring queries, adding partition-friendly filters such as `job_creation_time` or `DATE(period_start)` can reduce bytes processed, as suggested in the BigQuery documentation.
