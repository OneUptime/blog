# Validation Summary: How to Use the Dapr Jobs API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Jobs API (alpha)
- Dapr Scheduler service
- Dapr HTTP API (v1.0-alpha1)
- Dapr .NET SDK (`Dapr.Jobs`)
- Dapr Python SDK (`dapr-ext-grpc`)
- Node.js / Express
- Python / Flask
- C# / .NET

## Sources Consulted
- Dapr Jobs API overview: https://docs.dapr.io/developing-applications/building-blocks/jobs/jobs-overview/
- Dapr Jobs API reference: https://docs.dapr.io/reference/api/jobs_api/
- Dapr Jobs how-to guide: https://docs.dapr.io/developing-applications/building-blocks/jobs/howto-schedule-and-handle-triggered-jobs/
- Dapr .NET SDK Jobs documentation: https://docs.dapr.io/developing-applications/sdks/dotnet/dotnet-jobs/
- Dapr Python SDK Jobs documentation: https://docs.dapr.io/developing-applications/sdks/python/python-jobs/
- Dapr v1.14 release notes (Jobs API introduction)
- Dapr runtime source code (`pkg/api/http/jobs.go`)

## Issues Found

1. **Wrong Dapr version prerequisite**: Post stated "Dapr 1.13 or later" but the Jobs API was introduced in Dapr v1.14. Fixed to "Dapr 1.14 or later".

2. **HTTP payload structure wrapped in `"job"` key**: Both HTTP scheduling examples nested fields under a `"job"` key. The Dapr Jobs HTTP API expects fields (`schedule`, `data`, `dueTime`, `ttl`, `repeats`) at the top level of the JSON body, not inside a wrapper. Removed the `"job"` wrapper from both examples.

3. **First example mismatch (one-time vs recurring)**: The description said "Create a one-time job that fires after a delay" but used `"schedule": "@every 30s"` (a recurring schedule) with a TTL. Changed to use `"dueTime": "30s"` which correctly creates a one-time job that fires once after 30 seconds.

4. **Protobuf Any type wrapping on HTTP data field**: Both HTTP examples used `"@type": "type.googleapis.com/google.protobuf.StringValue"` wrapping for the `data` field. This protobuf Any format is for the gRPC API; the HTTP API accepts plain JSON values directly. Simplified data to plain JSON objects.

5. **`repeats: 0` used to mean indefinite**: The recurring job example set `"repeats": 0` implying indefinite repetition. In the Dapr API, omitting `repeats` entirely means indefinite; `0` would mean zero repetitions. Removed the `repeats` field from the recurring example.

6. **`@once` listed as a schedule format**: The schedule formats table listed `@once` as a valid format. This does not exist in the official Dapr documentation. One-time jobs are created using the `dueTime` field without a `schedule`. Replaced with a `dueTime` entry and added `@hourly` which is a real supported format.

7. **.NET SDK example used wrong classes and APIs**:
   - Used `DaprClient` / `DaprClientBuilder` — the Jobs API uses a separate `DaprJobsClient` class from the `Dapr.Jobs` package.
   - Used `new DaprJobSchedule("...")` — the correct factory method is `DaprJobSchedule.FromExpression("...")`.
   - Used `StringValue` as payload — the API expects `ReadOnlyMemory<byte>` (byte array).
   - Fixed to use `DaprJobsClient` via DI, `DaprJobSchedule.FromExpression()`, and `byte[]` payload serialized with `JsonSerializer`.

8. **Python SDK method names missing `_alpha1` suffix**: The post used `client.schedule_job()`, `client.get_job()`, and `client.delete_job()`. The actual Python SDK methods are `schedule_job_alpha1()`, `get_job_alpha1()`, and `delete_job_alpha1()`. Added the correct suffix.

9. **"Listing and Querying Jobs" section claimed to list all jobs**: The section header said "Get all jobs for the current application" but the endpoint `GET /v1.0-alpha1/jobs/{name}` only retrieves a single job by name. There is no HTTP API to list all jobs. Renamed section to "Getting Job Details" and fixed the description.

10. **GET response had `"job"` wrapper**: The example response wrapped fields under `"job"`. Removed the wrapper and `repeats: 0` field to match the corrected API format.

11. **"Manually triggering" test command was wrong**: `curl -X POST http://localhost:3500/v1.0-alpha1/jobs/daily-report` would attempt to schedule a job (not trigger the callback). Changed to call the app's callback endpoint directly at `http://localhost:3000/job/daily-report`.

12. **Callback handlers parsed nested protobuf data**: The Node.js and Python callback handlers used `JSON.parse(req.body.value)` and `json.loads(body.get('value'))` to unwrap protobuf-style data. Since the data is now plain JSON, simplified to access fields directly from the request body. Also removed unused `json` and `jsonify` imports from the Flask example.

## Review Notes
- The Jobs API is still in alpha (`v1.0-alpha1`). API surface, method names (especially the `_alpha1` suffixes), and behavior may change in future Dapr releases when it reaches stable status.
- The Python SDK import `from dapr.clients.grpc._jobs import Job` references a private module path (`_jobs`). This works but may break if the SDK restructures internals. The `Job` class can also be imported from `dapr.clients` directly.
- The Dapr Jobs cron format supports 6 fields (including seconds) in systemd timer style, which differs from the standard 5-field cron. The examples in the post use 5-field cron which should still work but readers should be aware of the 6-field option.
