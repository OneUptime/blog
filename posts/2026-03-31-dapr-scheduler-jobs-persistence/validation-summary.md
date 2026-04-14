# Validation Summary: How to Configure Dapr Scheduler Jobs Persistence in Self-Hosted Mode

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (v1.14+)
- Dapr Scheduler service (embedded etcd)
- Dapr Jobs API (v1.0-alpha1)
- Python (requests, Flask)
- Bash / CLI

## Sources Consulted
- Dapr Scheduler source code (`cmd/scheduler/options/options.go`) — confirmed CLI flags and defaults
- Dapr Jobs API source code (`pkg/api/http/jobs.go`) — confirmed endpoint version (v1.0-alpha1)
- Dapr HTTP channel source code (`pkg/channel/http/http_channel.go`) — confirmed job callback route `/job/{jobName}`
- Dapr CLI reference for `dapr run` — confirmed `--scheduler-host-address` flag
- Dapr v1.14.0 release notes — confirmed Jobs API / Scheduler introduction version

## Issues Found

### 1. Incorrect scheduler flag: `--data-dir` → `--etcd-data-dir`
**What was wrong:** The post used `--data-dir` as the flag to configure the scheduler's persistent storage directory. The correct flag is `--etcd-data-dir`.
**What was changed:** Replaced all occurrences of `--data-dir` with `--etcd-data-dir` (Steps 2, 6, and Summary).

### 2. Incorrect claim: "self-hosted mode defaults to an in-memory store"
**What was wrong:** The post stated that in self-hosted mode, the scheduler defaults to an in-memory store. In reality, the scheduler uses an embedded etcd instance by default in both Kubernetes and self-hosted mode, with a default data directory of `./data` (relative to the working directory). The data is persistent by default, but the relative path can be unreliable.
**What was changed:** Updated the Overview and Step 1 to correctly explain that embedded etcd is used by default with a `./data` directory, and that the value of this tutorial is configuring an explicit, absolute path for reliability.

### 3. Unnecessary protobuf `@type` wrapper in job payload
**What was wrong:** The job scheduling payload included `"@type": "type.googleapis.com/google.protobuf.StringValue"` in the `data` field. This protobuf type annotation is an internal detail and is not needed when using the HTTP API — plain JSON works directly.
**What was changed:** Removed the `@type` field from the job payload in Step 4.

### 4. Misleading prerequisite about etcd
**What was wrong:** Prerequisites listed "`etcd` or embedded storage configured" which implies manual setup is required. Embedded etcd is included with Dapr by default.
**What was changed:** Updated to "Embedded etcd (included with Dapr by default)".

## Review Notes
- The Jobs API endpoint `v1.0-alpha1/jobs/{name}` is correct — it remains in alpha status. This should be updated if/when the API is promoted to stable.
- The scheduler default port of 50006 is confirmed correct.
- The `--scheduler-host-address` flag for `dapr run` is confirmed valid.
- The `@every 5m` schedule format is confirmed correct.
- The job callback route `/job/{jobName}` via POST is confirmed correct.
- The `kill $(pgrep -f scheduler)` command in Step 6 could be dangerous as it may match other processes with "scheduler" in the name, but this is a minor concern in a dev environment.
