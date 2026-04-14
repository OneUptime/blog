# Validation Summary: How to Use the Dapr Jobs API Reference

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- Dapr Jobs API (HTTP REST)
- Dapr Scheduler service
- Dapr Python SDK (`dapr-client`)
- Python / Flask
- cURL

## Sources Consulted
- Dapr Jobs API Reference: https://docs.dapr.io/reference/api/jobs_api/
- Dapr Jobs Overview: https://docs.dapr.io/developing-applications/building-blocks/jobs/jobs-overview/
- Dapr How-to: Schedule and Handle Triggered Jobs: https://docs.dapr.io/developing-applications/building-blocks/jobs/howto-schedule-and-handle-triggered-jobs/
- Dapr Python SDK source (Job class): https://github.com/dapr/python-sdk/blob/master/dapr/clients/grpc/_jobs.py
- Dapr Python SDK examples: https://github.com/dapr/python-sdk/tree/master/examples/jobs

## Issues Found

### 1. Cron expressions used 5-field standard format instead of Dapr's 6-field systemd format
Dapr uses systemd timer-style cron expressions which include a leading seconds field (6 fields total), not the standard 5-field cron format. Fixed:
- `0 9 * * MON-FRI` -> `0 0 9 * * MON-FRI`
- `0 */6 * * *` -> `0 0 */6 * * *`
- `0 2 * * SUN` (in Python SDK example) -> `0 0 2 * * SUN`

### 2. Data field used unnecessary protobuf `@type` wrapper in HTTP API examples
The blog wrapped the `data` field in a `google.protobuf.StringValue` type envelope (`"@type": "type.googleapis.com/google.protobuf.StringValue"`). The official Dapr Jobs HTTP API documentation shows that the `data` field accepts plain JSON values (strings, numbers, objects) without a protobuf wrapper. Fixed all four occurrences (create scheduled job, create one-shot job, GET response, repeats example) to use plain JSON strings.

### 3. Python SDK example used incorrect method name and calling convention
The blog called `client.schedule_job(name=..., schedule=..., data=..., ttl=...)` with keyword arguments. The actual Dapr Python SDK method is `client.schedule_job_alpha1(job)` which takes a `Job` object. Fixed to:
- Import `Job` from `dapr.clients.grpc._jobs`
- Create a `Job` instance with the scheduling parameters
- Call `client.schedule_job_alpha1(job)`

## Review Notes
- The Jobs API is currently in alpha (`v1.0-alpha1`), as correctly indicated by the URL paths. The Python SDK methods also carry the `_alpha1` suffix. This API may change in future Dapr releases.
- The `@daily`, `@hourly`, and `@every` shorthand schedule formats are correct and well-documented.
- The Flask callback handler at `/job/{jobName}` is correct for HTTP-based apps. For gRPC-based apps, the Dapr Python SDK provides a `@app.job_event()` decorator instead.
- The description mentions "list operations" but the post does not include a List endpoint. The official Dapr Jobs API reference also does not document a List endpoint, so this is not an error in the post's technical content, but the description is slightly misleading.
- The `failure_policy` field (supporting `constant` and `drop` policies) is available in the API but not covered in the post. This is not an error, just an optional field the post chose not to cover.
