# Validation Summary: How to Use Dapr Jobs API for Scheduled Tasks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (v1.14+) Jobs API
- Dapr Scheduler Service
- Cron expressions
- Node.js / Express
- Python / Flask
- Go (net/http with Go 1.22+ routing)
- Kubernetes (for scheduler service verification)

## Sources Consulted
- Dapr Jobs overview: https://docs.dapr.io/developing-applications/building-blocks/jobs/jobs-overview/
- Dapr Jobs how-to guide: https://docs.dapr.io/developing-applications/building-blocks/jobs/howto-schedule-and-handle-triggered-jobs/
- Dapr Jobs API reference: https://docs.dapr.io/reference/api/jobs_api/
- Dapr v1.14 release notes (confirming Jobs API introduction version)

## Issues Found

1. **HTTP method was PUT instead of POST**: All three `curl` examples used `PUT` to schedule jobs, but the official Dapr Jobs API reference specifies `POST` as the correct method. Changed all three to `POST`.

2. **Incorrect Dapr version prerequisite**: The prerequisites section stated "Dapr v1.13 or later" but the Jobs API was introduced in Dapr v1.14. Changed to "Dapr v1.14 or later".

3. **Inaccurate alpha/stable description**: The introduction described the Jobs API as "alpha/stable in Dapr 1.14+" which is misleading. The Jobs API is currently in alpha. Changed to "alpha in Dapr 1.14+".

4. **One-shot job example included a schedule field**: The "One-Shot Job (Runs Once)" example included both `"schedule": "@every 1m"` and `"dueTime"`. Having a `schedule` field makes the job recurring, contradicting the "runs once" label. Removed the `schedule` field so the job only uses `dueTime`, making it a true one-shot job.

5. **Ambiguous `repeats: 0` usage**: The recurring job example used `"repeats": 0`. The official docs state that omitting `repeats` causes the job to run indefinitely, but do not explicitly document the behavior of `repeats: 0`. Removed the `repeats` field from the recurring job example to match documented behavior for indefinite repetition.

6. **Fabricated `lastRunTime` field in GET response**: The example GET response included a `lastRunTime` field that does not appear in the official API reference documentation. Removed this field from the example response.

7. **Scheduler service kubectl label**: Changed `app=dapr-scheduler-server` to `app=dapr-scheduler` to match the documented Dapr control plane service name.

## Review Notes
- The Go callback example uses `r.PathValue("jobName")` and method-based routing (`mux.HandleFunc("POST /job/{jobName}", ...)`), which requires Go 1.22+. This is correct but worth noting for readers on older Go versions.
- The `data` field in the curl examples uses plain JSON objects. The official docs show examples with JSON-serialized strings and simple values. Both forms should work since the docs describe `data` as "a JSON serialized value or object," but readers should be aware the exact serialization may matter depending on how the callback handler deserializes the data.
- The Jobs API is currently in alpha. Readers should be advised that the API surface may change in future Dapr releases.
