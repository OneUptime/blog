# Validation Summary: How to Use the dapr scheduler Command

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr CLI
- Dapr Scheduler service (control plane)
- Dapr Jobs API (HTTP and gRPC)
- Dapr Python SDK
- Kubernetes (StatefulSet, Helm)
- embedded etcd (Scheduler persistence)

## Sources Consulted
- [Dapr Scheduler CLI reference](https://docs.dapr.io/reference/cli/dapr-scheduler/) — verified available subcommands (list, get, delete, delete-all, export, import); confirmed no `run` subcommand exists
- [Dapr Jobs API reference](https://docs.dapr.io/reference/api/jobs_api/) — verified HTTP endpoints (POST/GET/DELETE by name); confirmed no list-all endpoint exists
- [Dapr Scheduler service overview](https://docs.dapr.io/concepts/dapr-services/scheduler/) — verified embedded etcd, StatefulSet deployment, HA behavior
- [How-To: Schedule and handle triggered jobs](https://docs.dapr.io/developing-applications/building-blocks/jobs/howto-schedule-and-handle-triggered-jobs/) — verified `/job/<name>` callback endpoint format
- [Dapr Jobs quickstart](https://docs.dapr.io/getting-started/quickstarts/jobs-quickstart/) — confirmed SDK support status
- [Dapr Python SDK GitHub (grpc/client.py)](https://github.com/dapr/python-sdk/blob/master/dapr/clients/grpc/client.py) — verified method is `schedule_job_alpha1()` taking a `Job` object
- [Dapr Python SDK examples (jobs)](https://github.com/dapr/python-sdk/tree/master/examples/jobs) — verified `Job` class import and constructor usage
- [Dapr CLI init reference](https://docs.dapr.io/reference/cli/dapr-init/) — verified `--set`, `--kubernetes`, `--wait` flags
- [Dapr CLI status reference](https://docs.dapr.io/reference/cli/dapr-status/) — verified `--kubernetes` / `-k` flag
- [Dapr Helm chart values](https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_scheduler/values.yaml) — confirmed no `dapr_scheduler.replicaCount`; HA replicas controlled by `global.ha.replicaCount`
- [Dapr Kubernetes production guidelines](https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/) — verified HA configuration via `global.ha.enabled` and `global.ha.replicaCount`

## Issues Found

### 1. Non-existent CLI command: `dapr scheduler run --port 6060`
**What was wrong:** The post claimed you can start the scheduler locally with `dapr scheduler run --port 6060`. This command does not exist. The `dapr scheduler` subcommands are: `list`, `get`, `delete`, `delete-all`, `export`, and `import`. In self-hosted mode, the scheduler starts automatically as part of `dapr init`.
**What was changed:** Replaced with `dapr init` and an explanation that the scheduler starts automatically alongside other control plane services.

### 2. Incorrect Python SDK method and syntax
**What was wrong:** The post used `client.schedule_job(name=..., schedule=..., data=...)` which does not exist. The actual Python SDK method is `schedule_job_alpha1()`, which takes a `Job` object (imported from `dapr.clients`), not keyword arguments.
**What was changed:** Updated imports to include `Job` from `dapr.clients`, replaced the method call with correct `Job` object construction and `client.schedule_job_alpha1(job=job)` syntax.

### 3. Non-existent list-all jobs HTTP endpoint
**What was wrong:** The post showed `curl http://localhost:3500/v1.0-alpha1/jobs` as a way to list all scheduled jobs. The Dapr Jobs HTTP API does not have a list endpoint. Only individual job operations (POST to create, GET by name, DELETE by name) are supported.
**What was changed:** Replaced the list-all example with a POST example showing how to create a job via the HTTP API, which is the actual first operation a user would perform.

### 4. Incorrect Helm value for scheduler HA configuration
**What was wrong:** The post used `--set dapr_scheduler.replicaCount=3`. The value `dapr_scheduler.replicaCount` does not exist in the Dapr Helm chart. Scheduler HA is configured via `global.ha.enabled=true` and `global.ha.replicaCount=3`.
**What was changed:** Updated to `--set global.ha.enabled=true --set global.ha.replicaCount=3`.

## Review Notes
- The Jobs API is currently in alpha (`v1.0-alpha1`). The endpoint paths and SDK method names (e.g., `schedule_job_alpha1`) may change in future Dapr releases as the API stabilizes. The post should be revisited when the Jobs API reaches stable status.
- The Dapr documentation warns that scaling scheduler replicas up or down with embedded etcd risks data loss. Users requiring dynamic scaling should use an external etcd cluster. The post's section on persistence could benefit from this caveat in a future update.
- The Python SDK Jobs support is relatively new. The post's Python examples should be verified against future SDK releases as the API evolves.
