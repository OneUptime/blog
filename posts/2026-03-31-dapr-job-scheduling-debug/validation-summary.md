# Validation Summary: How to Debug Dapr Job Scheduling Issues

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr Jobs API (alpha)
- Dapr Scheduler service
- Kubernetes (kubectl)
- Dapr distributed tracing (Zipkin)
- Node.js / Express (callback handler example)
- Python croniter (cron validation)

## Sources Consulted
- Dapr Jobs API Reference: https://docs.dapr.io/reference/api/jobs_api/
- Dapr Jobs Overview: https://docs.dapr.io/developing-applications/building-blocks/jobs/jobs-overview/
- Dapr How-To: Schedule and Handle Triggered Jobs: https://docs.dapr.io/developing-applications/building-blocks/jobs/howto-schedule-and-handle-triggered-jobs/
- Dapr Configuration Overview (tracing): https://docs.dapr.io/operations/configuration/configuration-overview/

## Issues Found

1. **Protobuf Any type format in REST data field**: The curl example used `@type` and `value` fields in the `data` object (protobuf Any format), which is only used in gRPC/SDK contexts. The REST/HTTP API accepts plain JSON for the `data` field. Changed to a simple JSON object `{"message": "test"}`.

2. **5-field cron expression instead of 6-field**: Dapr uses a 6-field cron format with seconds as the first field (`seconds minutes hours day-of-month month day-of-week`). The example `0 */2 * * *` (5-field) was corrected to `0 0 */2 * * *` (6-field). Added a comment clarifying the field order.

3. **ISO 8601 timestamp in `schedule` field**: One-time job execution uses the `dueTime` field, not the `schedule` field. The `schedule` field is for recurring patterns only. Updated the comment to clarify that `dueTime` should be used for one-time scheduling with ISO 8601 timestamps.

4. **GET response includes "last trigger time"**: The Dapr Jobs GET API response returns `name`, `schedule`, `repeats`, and `data` — there is no `lastTriggerTime` field. Changed "last trigger time" to "repeats" in the description.

5. **Scheduler pod name**: The StatefulSet for the Dapr scheduler is named `dapr-scheduler-server`, so pods are `dapr-scheduler-server-0`, not `dapr-scheduler-0`. Fixed the kubectl exec command.

6. **Python croniter validation expression**: Updated the croniter example to use a 6-field cron expression to match Dapr's format.

## Review Notes
- The Jobs API is still in alpha (`v1.0-alpha1`). This should be noted as subject to change in future Dapr releases.
- The tracing configuration YAML is correct for Dapr with Zipkin.
- The callback handler pattern (`POST /job/{name}`) is correct per documentation.
- The JavaScript callback handler example is syntactically correct and follows the expected pattern.
- The `@every` and `@daily` schedule shorthand formats are correctly documented.
