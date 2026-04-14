# Validation Summary: How to Delete a Scheduled Job in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr Jobs API (alpha)
- Dapr Python SDK (`dapr-ext-grpc`)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- HTTP/REST API (curl)
- Python
- Go

## Sources Consulted
- Dapr Jobs API reference: https://docs.dapr.io/reference/api/jobs_api/
- Dapr Jobs building block overview: https://docs.dapr.io/developing-applications/building-blocks/jobs/
- Dapr Python SDK source (dapr/python-sdk on GitHub) — `client.py`, `_jobs.py`, and `examples/jobs/job_management.py`
- Dapr Go SDK source (dapr/go-sdk on GitHub) — `client/jobs.go`

## Issues Found

1. **Incorrect HTTP status code for non-existent job**: The post claimed deleting a non-existent job returns `404`. The Dapr Jobs API documentation only lists `204`, `400`, and `500` as response codes for DELETE. A non-existent job returns `500`, not `404`. Fixed the claim to state `500`.

2. **Wrong Python SDK method name (`delete_job`)**: The post used `d.delete_job(name=name)` throughout. The correct method in the Dapr Python SDK is `d.delete_job_alpha1(name)` — the Jobs API is in alpha, so all SDK methods carry the `_alpha1` suffix. Also, the method takes `name` as a positional argument, not a keyword argument. Fixed all four occurrences.

3. **Wrong Python SDK method and signature for scheduling (`schedule_job`)**: The "Replace a Recurring Job" example used `d.schedule_job(name=..., schedule=..., data={...})`, which does not exist. The correct method is `d.schedule_job_alpha1(job=Job(...), overwrite=True)`, which takes a `Job` object rather than separate keyword arguments. Rewrote the example.

4. **Incorrect data encoding format**: The post passed job data as a plain Python dict with `@type` and base64-encoded `value` keys. The Python SDK expects a `google.protobuf.any_pb2.Any` (GrpcAny) object with `.value` set to raw bytes. No base64 encoding or `@type` wrapper is needed. Fixed the data encoding.

5. **Unnecessary delete-then-recreate pattern**: The post recommended deleting a job and recreating it to update the schedule. The Dapr SDK supports an `overwrite=True` parameter on `schedule_job_alpha1`, which atomically replaces the job without the brief gap where the job doesn't exist. Updated the section to use the `overwrite` approach instead.

6. **Incorrect "404" string check in exception handling**: The error handling checked for `"404" in str(e)`, but since Dapr returns `500` (not `404`) for non-existent jobs, this check would never match. Removed the `"404"` check, keeping only the `"not found"` string check.

## Review Notes
- The Jobs API is currently in alpha (`v1.0-alpha1`). Method names and API paths will likely change when the API reaches stable. The post should be updated when that happens.
- The Go SDK example is correct and uses `DeleteJobAlpha1` properly.
- The "Checking If a Job Exists Before Deleting" section uses the HTTP API directly via `requests.get`, which works correctly. However, this introduces a TOCTOU race condition — the job could be deleted between the check and the delete call. The try/except pattern from the main delete example is more robust.
- The `Job` import path may vary between SDK versions. The example uses `from dapr.clients.grpc._helpers import Job`; users should verify against their installed SDK version.
