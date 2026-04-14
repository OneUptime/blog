# Validation Summary: How to Handle Triggered Jobs in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Scheduler building block / Jobs API)
- Python (Flask)
- Go (net/http)

## Sources Consulted
- Dapr Jobs API reference documentation (https://docs.dapr.io/reference/api/jobs_api/)
- Dapr Scheduler building block overview (https://docs.dapr.io/developing-applications/building-blocks/jobs/)
- Dapr v1.14.3 release notes (fix for HTTP job trigger body format)
- Dapr runtime source code (`pkg/channel/http/http_channel.go` — `constructJobRequest` function)
- Dapr Java SDK examples for job handler endpoint patterns

## Issues Found

### 1. Outdated base64 data decoding (Critical)
**What was wrong:** The `decode_job_data` function performed base64 decoding of `body["data"]["value"]`, which reflected pre-v1.14.3 Dapr behavior. Since Dapr v1.14.3, the HTTP job trigger sends the job data as plain JSON directly in the request body — no base64 encoding, no `data.value` wrapper.

**What was changed:** Removed the `decode_job_data` function entirely and replaced all usages with `request.get_json() or {}` to read the plain JSON body directly. Also removed the now-unnecessary `base64` and `json` imports from the first code example.

### 2. Job name incorrectly read from request body (Critical)
**What was wrong:** The "Accessing Job Metadata" section used `body.get("name")` to extract the job name from the HTTP request body. For HTTP callbacks, the job name is only conveyed through the URL path (`/job/{job-name}`), not in the body. The `name` field exists in the gRPC `JobEventRequest` protobuf, but the HTTP channel does not include it in the body.

**What was changed:** Updated the section to use a Flask URL path parameter (`<job_name>`) to extract the job name, and updated the explanatory text to clarify that the name comes from the URL path.

### 3. Go handler used undefined `decodeJobData` function (Minor)
**What was wrong:** The Go example called `decodeJobData(payload)` which implied the same incorrect base64 decoding pattern and referenced an undefined function.

**What was changed:** Simplified the Go handler to decode the JSON body directly into `jobData` without an intermediate `decodeJobData` step.

### 4. Unused `timedelta` import (Minor)
**What was wrong:** The idempotency section imported `timedelta` from `datetime` but never used it.

**What was changed:** Removed the unused `timedelta` import.

## Review Notes
- The claim "Any other status code causes Dapr to retry the trigger" is a simplification. The actual behavior depends on the configured `failure_policy`: the default retries 3 times with 1s interval (constant backoff). A `drop` policy can be configured to skip retries entirely. This simplification is acceptable for a tutorial-level post.
- The Go example uses port 6000, which is not a Dapr convention or default — it is an arbitrary application port. This is fine but readers should understand it must match the `--app-port` flag passed to the Dapr sidecar.
- The in-memory `processed_jobs` dict in the idempotency section will not persist across restarts or scale across multiple instances. This is acknowledged implicitly as a simple example, but production use would require a shared store (e.g., Redis, database).
