# Validation Summary: How to Get Job Details Using Dapr Jobs API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Jobs API (v1.0-alpha1)
- Dapr Scheduler service
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Dapr Python SDK (`dapr`)
- Dapr State API
- Dapr CLI

## Sources Consulted
- Dapr Jobs API reference documentation (`dapr/docs` repo, `daprdocs/content/en/reference/api/jobs_api.md`)
- Dapr runtime source code (`dapr/dapr/pkg/api/http/jobs.go`, `dapr/dapr/pkg/api/universal/jobs.go`)
- Dapr Go SDK source code (`dapr/go-sdk/client/jobs.go`) — Job struct definition with pointer types
- Dapr Python SDK source code (`dapr/python-sdk/dapr/clients/grpc/client.py`) — synchronous DaprClient
- Dapr Python SDK Job dataclass (`dapr/python-sdk/dapr/clients/grpc/_jobs.py`)
- Dapr CLI source code (`dapr/cli/cmd/status.go`) — `-k` flag verification
- Dapr scheduler error handling (`dapr/dapr/pkg/api/errors/scheduler.go`)

## Issues Found

1. **`data` field used protobuf Any wrapper in HTTP API examples**: The job creation and GET response examples wrapped `data` with `@type: "type.googleapis.com/google.protobuf.StringValue"`. This is a gRPC/protobuf concept; the HTTP API accepts plain JSON values for `data`. Changed to `"data": "generate-report"` in both the POST request and GET response examples.

2. **Go SDK pointer field access**: The `Job` struct in the Go SDK defines `Schedule` as `*string` and `Repeats` as `*uint32`. The blog accessed them directly (`job.Schedule`, `job.Repeats`), which would print pointer addresses. Changed to `*job.Schedule` and `*job.Repeats` to properly dereference the pointer values.

3. **Python SDK incorrectly used async/await**: The standard `DaprClient` imported from `dapr.clients` is synchronous. The blog used `async def`, `await`, and `asyncio.run()`, which would fail at runtime. Removed async/await and `asyncio` import, making it a plain synchronous function call matching the synchronous SDK API.

4. **Incorrect HTTP status code for nonexistent jobs**: The blog claimed the API returns `404 Not Found` for nonexistent jobs. The Dapr Jobs API actually returns `500 Internal Server Error` for this case, as confirmed by the official docs and the scheduler error handler in the Dapr runtime. Corrected to `500 Internal Server Error`.

## Review Notes
- The Jobs API is still in alpha (`v1.0-alpha1`), so the API surface may change in future Dapr releases.
- The Go SDK example should ideally include nil checks before dereferencing `Schedule` and `Repeats` pointers, since they are optional fields. However, for a basic tutorial this is acceptable.
- The Python SDK also offers an async client at `dapr.aio.clients.DaprClient` which would support the `await` pattern. The blog could mention this as an alternative, but using the synchronous client is the simpler and more common approach.
- The `Job` response may include additional fields (`dueTime`, `ttl`, `failurePolicy`) if they were set during creation. The blog's simplified response is fine for tutorial purposes.
