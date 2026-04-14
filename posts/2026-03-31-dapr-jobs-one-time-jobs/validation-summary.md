# Validation Summary: How to Create One-Time Jobs with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Jobs API (alpha)
- Dapr Python SDK (`dapr-ext-grpc`)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Flask (Python web framework for job handler)
- Protocol Buffers (`google.protobuf.any_pb2`, `wrappers_pb2`)

## Sources Consulted
- Dapr Jobs API reference: https://docs.dapr.io/reference/api/jobs_api/
- Dapr Jobs overview: https://docs.dapr.io/developing-applications/building-blocks/jobs/jobs-overview/
- Dapr how-to guide for jobs: https://docs.dapr.io/developing-applications/building-blocks/jobs/howto-schedule-and-handle-activated-jobs/
- Dapr Python SDK source (`dapr/clients/grpc/client.py`) for method signatures
- Dapr Go SDK source (`client/jobs.go`) for `Job` struct field types
- Go `time.ParseDuration` documentation for supported duration units

## Issues Found

1. **Python SDK method names incorrect**: The post used `d.schedule_job(name=..., due_time=..., data=...)` and `d.delete_job(name=...)`. The correct methods are `d.schedule_job_alpha1(job)` (takes a `Job` object) and `d.delete_job_alpha1(name=...)`. Fixed the `schedule_one_time_job` helper to construct a `Job` object with proper protobuf `Any` data, and updated imports accordingly.

2. **Python SDK data parameter type wrong**: The post passed a plain `dict` as the `data` argument. The SDK expects a `google.protobuf.any_pb2.Any` object. Fixed by constructing a `StringValue`, packing it into a `ProtobufAny`, and passing that to the `Job`.

3. **Go SDK `DueTime` field type wrong**: The `Job` struct in the Go SDK defines `DueTime` as `*string` (pointer to string), not `string`. The post assigned `DueTime: dueTime` which would not compile. Fixed to `DueTime: &dueTime`.

4. **Go SDK unused import**: The `"time"` package was imported but never used, which causes a compile error in Go. Removed the unused import.

5. **"7d" duration format misleading**: The post listed `"7d"` as a valid duration with a parenthetical caveat. Go's `time.ParseDuration` does not support `"d"` as a unit (only `ns`, `us`, `ms`, `s`, `m`, `h`). Replaced with a comment clearly stating `"7d"` is invalid and to use `"168h"` instead.

## Review Notes
- The Jobs API is currently in alpha (`v1.0-alpha1`). Method names in both Python and Go SDKs include the `Alpha1` suffix, reflecting this status. When the API graduates to stable, these method names and the HTTP API version prefix will likely change.
- The HTTP API curl example uses protobuf JSON representation (`@type` + base64 `value`) in the `data` field. While this works via gRPC-JSON transcoding, the official HTTP API docs show simpler plain JSON data. The protobuf approach is consistent with the handler code in the post, so it was left as-is.
- The `tomorrow_2am` scheduling example works correctly but has a subtle edge case: if the current UTC time is already past 2:00 AM, `replace(hour=2) + timedelta(days=1)` correctly targets the next day. If before 2:00 AM, it targets later today plus one day (i.e., tomorrow). This is technically correct for the stated goal of "tomorrow at 2am."
