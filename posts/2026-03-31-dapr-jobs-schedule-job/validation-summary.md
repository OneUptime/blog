# Validation Summary: How to Schedule a Job Using Dapr Jobs API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Jobs API (alpha1)
- Dapr Scheduler service
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- Dapr Python SDK (`dapr.clients`)
- Python Flask (for job trigger handler)
- Cron expressions and interval scheduling

## Sources Consulted
- Dapr Jobs API Reference: https://docs.dapr.io/reference/api/jobs_api/
- Dapr Jobs Overview: https://docs.dapr.io/developing-applications/building-blocks/jobs/jobs-overview/
- Dapr Go SDK source — `client/jobs.go` (Job struct, NewJob constructor, ScheduleJobAlpha1): https://github.com/dapr/go-sdk/blob/main/client/jobs.go
- Dapr Go SDK examples — `examples/jobs/main.go`: https://github.com/dapr/go-sdk/blob/main/examples/jobs/main.go
- Dapr Python SDK source — `dapr/clients/grpc/client.py` (schedule_job_alpha1 method): https://github.com/dapr/python-sdk/blob/master/dapr/clients/grpc/client.py
- Dapr Python SDK source — `dapr/clients/grpc/_jobs.py` (Job class definition): https://github.com/dapr/python-sdk/blob/master/dapr/clients/grpc/_jobs.py

## Issues Found

### 1. HTTP API `data` field format (HIGH)
**Was:** `"data": {"type": "text/plain", "value": "eyJyZXBvcnRUeXBlIjogInNhbGVzIn0="}` with a comment about base64-encoded JSON.
**Fixed to:** `"data": {"reportType": "sales"}` with a note that data accepts any JSON-serializable value.
**Why:** The Dapr Jobs API reference specifies that `data` is "A JSON serialized value or object" — plain JSON, not wrapped with a `type`/`value` content-type structure. The base64 encoding was unnecessary for the HTTP API.

### 2. Go SDK — unused imports causing compilation failure (HIGH)
**Was:** Imported `"time"` and `commonv1 "github.com/dapr/go-sdk/dapr/proto/common/v1"` which were never used.
**Fixed:** Removed both unused imports.
**Why:** Go does not compile with unused imports. These would cause a build error.

### 3. Go SDK — incorrect Job construction pattern (HIGH)
**Was:** Used struct literal `&dapr.Job{Name: jobName, Schedule: schedule, Data: ...}`.
**Fixed to:** Used `daprc.NewJob(jobName, daprc.WithJobSchedule(schedule), daprc.WithJobData(...))`.
**Why:** The `Job.Schedule` field is `*string`, so assigning a `string` value directly would fail to compile. The official SDK uses a functional options pattern with `NewJob()` and `WithJob*` option functions, which handles the pointer conversion internally.

### 4. Python SDK — wrong method name (HIGH)
**Was:** `d.schedule_job(name=name, schedule=schedule, data=...)`.
**Fixed to:** `d.schedule_job_alpha1(job)`.
**Why:** The Jobs API is alpha; the Python SDK method is `schedule_job_alpha1()`, not `schedule_job()`. Confirmed in SDK source code.

### 5. Python SDK — wrong method signature and data type (HIGH)
**Was:** Called with individual keyword arguments (`name`, `schedule`, `data` as a dict with `@type` protobuf annotation).
**Fixed to:** Constructs a `Job` object with `GrpcAny` data, then passes it to `schedule_job_alpha1(job)`.
**Why:** The method accepts a `Job` object (from `dapr.clients.grpc._jobs`), not individual parameters. The `data` field must be `google.protobuf.any_pb2.Any` (GrpcAny), not a plain dict.

### 6. Python SDK — nonexistent import (MEDIUM)
**Was:** `from dapr.clients.grpc._request import JobScheduleRequest`.
**Fixed:** Removed this import; replaced with `from dapr.clients.grpc._jobs import Job` and `from google.protobuf.any_pb2 import Any as GrpcAny`.
**Why:** `JobScheduleRequest` does not exist in the Dapr Python SDK. The correct class is `Job` from `dapr.clients.grpc._jobs`.

### 7. GET response — fictitious `status` field (MEDIUM)
**Was:** Response included `"status": "SCHEDULED"`.
**Fixed:** Removed `status` field; added `repeats` field to match documented response format.
**Why:** The Dapr Jobs API GET response returns `name`, `schedule`, `repeats`, and `data`. There is no `status` field per the API reference.

### 8. Job trigger handler — incorrect data decoding (MEDIUM)
**Was:** Used `base64.b64decode(raw.get("data", {}).get("value", "e30="))` to decode nested base64-wrapped data.
**Fixed to:** Direct `request.get_json()` access to the job data payload.
**Why:** With the corrected data format (plain JSON), the trigger handler receives the data directly without base64 encoding or nested `data.value` wrapping.

## Review Notes
- The Jobs API is currently alpha (`v1.0-alpha1`). The API path, SDK method names (with `Alpha1` suffix), and behavior may change in future Dapr releases when the API reaches stable status.
- The post correctly identifies Dapr 1.14 as the minimum version. The Python SDK may require Dapr 1.15+ for full Jobs support.
- The cron expression format in the "Common Schedule Formats" section uses 5-field standard cron. Dapr also supports an optional 6-field format with seconds as the first field. The 5-field format shown is valid.
- The `@weekly` and `@monthly` special strings are documented in the robfig/cron library that Dapr uses, and are valid.
