# Validation Summary: How to Monitor Dapr Scheduled Job Execution

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr Scheduler (Jobs API)
- Prometheus (metrics scraping and alerting)
- Grafana (visualization)
- Python Dapr SDK (`dapr-client`)
- Dapr State Store API
- OpenTelemetry (distributed tracing via Dapr Configuration CRD)
- PromQL

## Sources Consulted
- Dapr source code: `pkg/scheduler/monitoring/metrics.go` in dapr/dapr GitHub repository — authoritative list of scheduler metrics
- Dapr Python SDK source code: dapr/python-sdk GitHub repository — verified `DaprClient`, context manager support, and `save_state` API
- Dapr Configuration CRD source: `pkg/apis/configuration/v1alpha1/types.go` in dapr/dapr — verified tracing spec field names (`otel`, `endpointAddress`, `isSecure`, `protocol`)
- Python 3.12 release notes — `datetime.utcnow()` deprecation

## Issues Found

### 1. Fabricated metric: `dapr_runtime_job_handler_duration_milliseconds`
**What was wrong:** This metric does not exist in Dapr. The prefix `dapr_runtime_` is incorrect for scheduler metrics, and no "job handler duration" metric is defined.
**What was changed:** Replaced with `dapr_scheduler_trigger_latency`, which is the real histogram metric that measures the time it takes to trigger a job from the scheduler service (in milliseconds).
**Why:** The real metrics are defined in `pkg/scheduler/monitoring/metrics.go` and all use the `dapr_scheduler_` prefix.

### 2. Fabricated metric: `dapr_scheduler_last_trigger_timestamp`
**What was wrong:** This metric does not exist in Dapr. There is no timestamp gauge for scheduler triggers. The alert rule using `time() - dapr_scheduler_last_trigger_timestamp{job_name="daily-report"} > 90000` would not work.
**What was changed:** Rewrote the alert to use `increase(dapr_scheduler_jobs_triggered_total{type="job"}[25h]) == 0`, which detects when no jobs have been triggered over a 25-hour window using the real counter metric. Updated the label from the non-existent `job_name` to the actual `type` label. Updated the annotation summary accordingly.
**Why:** The real scheduler metrics use a `type` label (values: job, actor, unknown), not a `job_name` label. Counter-based detection with `increase()` is the correct approach when no timestamp gauge exists.

### 3. Deprecated `datetime.utcnow()` usage
**What was wrong:** `datetime.utcnow()` has been deprecated since Python 3.12 because it returns a naive datetime without timezone info, which is error-prone.
**What was changed:** Replaced both occurrences with `datetime.now(timezone.utc)` and added `timezone` to the import from `datetime`.
**Why:** The replacement returns a timezone-aware datetime and is the officially recommended approach per Python 3.12+ documentation.

## Review Notes
- The Dapr scheduler metrics are labeled by `type` (job/actor/unknown), not by individual job name. This means Prometheus-based alerting can only detect when *all* jobs of a given type stop firing, not when a specific named job stops. The post's alerting section now reflects this limitation. For per-job monitoring, the application-level tracking approach described in the post (state store execution history) is the correct strategy.
- The complete set of real Dapr scheduler metrics is: `dapr_scheduler_sidecars_connected` (gauge), `dapr_scheduler_jobs_created_total` (counter), `dapr_scheduler_jobs_triggered_total` (counter), `dapr_scheduler_jobs_failed_total` (counter), `dapr_scheduler_jobs_undelivered_total` (counter), and `dapr_scheduler_trigger_latency` (histogram).
- The Python code examples use `execute_job_logic()` and `record_job_failure()` as placeholder functions that are not defined — this is acceptable for a guide that focuses on the monitoring pattern.
- The Dapr Configuration CRD for tracing is fully correct including `apiVersion`, field names, and structure.
