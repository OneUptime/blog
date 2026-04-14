# Validation Summary: How to Use Dapr Distributed Lock for Database Migrations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime) — distributed lock building block
- Dapr Python SDK (`dapr` package)
- Redis (as lock store backend)
- Kubernetes (Deployments, Init Containers, Jobs)
- Python

## Sources Consulted
- Dapr distributed lock how-to guide: https://docs.dapr.io/developing-applications/building-blocks/distributed-lock/howto-use-distributed-lock/
- Dapr Redis lock component reference: https://docs.dapr.io/reference/components-reference/supported-locks/redis-lock/
- Dapr Python SDK source (`dapr/clients/grpc/client.py`): https://github.com/dapr/python-sdk
- Dapr annotations reference (native sidecar support): https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Kubernetes Job documentation: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-job/

## Issues Found

### 1. Init Container section incorrectly assumed Dapr sidecar availability
**What was wrong:** The original text stated that running migrations in an init container "combined with the Dapr lock, migrations are guaranteed to complete before the app starts." This is incorrect because the Dapr sidecar is injected as a regular container, not an init container. Kubernetes runs all init containers before starting regular containers, so the Dapr sidecar is not available when the init container executes.

**What was changed:** Rewrote the section to explain the limitation and added the `dapr.io/enable-native-sidecar: "true"` annotation (requires Kubernetes 1.28+) to the YAML example. This annotation causes Dapr to inject its sidecar as a Kubernetes native sidecar container, which starts before subsequent init containers.

### 2. Kubernetes Job section missing Dapr sidecar shutdown
**What was wrong:** The Job example did not include a call to the Dapr shutdown API (`POST /v1.0/shutdown`). Without this, the Dapr sidecar continues running after the migration container exits, causing the Job pod to hang indefinitely in a `NotReady` state.

**What was changed:** Added a `shutdown_dapr()` function that calls `http://localhost:3500/v1.0/shutdown` and instructions to call it after migrations complete.

### 3. Kubernetes Job restartPolicy was incorrect
**What was wrong:** The Job YAML used `restartPolicy: OnFailure`. When the Dapr sidecar is shut down via the shutdown API, Kubernetes would restart the pod with `OnFailure` policy. The Dapr documentation recommends using `restartPolicy: Never` for Jobs.

**What was changed:** Changed `restartPolicy` from `OnFailure` to `Never`.

## Review Notes
- The Dapr distributed lock API is currently in **alpha** status (API path `/v1.0-alpha1/lock`). The Python SDK emits a `UserWarning` about this. The blog does not mention the alpha status, which readers should be aware of since the API may change in future Dapr releases.
- The "Locking Per Migration Version" code example does not use `try/finally` to release the lock, unlike the main example. If `apply_migration()` raises an exception, the lock would not be released (it would only expire after the timeout). This is a minor code quality issue, not a factual error.
- The `DaprClient` context manager usage (`with DaprClient() as client:`) is correct and is the recommended pattern.
- All Redis lock component YAML (type `lock.redis`, metadata field `redisHost`, apiVersion `dapr.io/v1alpha1`) verified as correct against official documentation.
