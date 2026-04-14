# Validation Summary: How to Use Dapr Secrets with Environment Variables

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Secrets API (`secretstores.local.env` component)
- Dapr Go SDK (`github.com/dapr/go-sdk`)
- Dapr Python SDK (`dapr-client`)
- Dapr JavaScript/TypeScript SDK (`@dapr/dapr`)
- Docker Compose
- Kubernetes (Deployments, Secrets, Dapr sidecar injection)

## Sources Consulted
- Dapr secret store component spec for `secretstores.local.env`: https://docs.dapr.io/reference/components-reference/supported-secret-stores/envvar-secret-store/
- Dapr Secrets API reference: https://docs.dapr.io/reference/api/secrets_api/
- Dapr Go SDK source and docs: https://github.com/dapr/go-sdk
- Dapr Python SDK source (`dapr.clients.DaprClient`): https://github.com/dapr/python-sdk
- Dapr JavaScript SDK source (`@dapr/dapr`): https://github.com/dapr/js-sdk
- Dapr Kubernetes sidecar injection annotations: https://docs.dapr.io/reference/arguments-annotations-overview/
- Kubernetes Deployment API (`apps/v1`): https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/deployment-v1/

## Issues Found

### 1. Python SDK code incorrectly used async/await (Fixed)
**What was wrong:** The Python example used `async with DaprClient() as client:`, `await client.get_secret(...)`, and `asyncio.run(main())`. However, `DaprClient` from `dapr.clients` is a synchronous client. It implements `__enter__`/`__exit__` (not `__aenter__`/`__aexit__`), and its methods (`get_secret`, `get_bulk_secret`) are synchronous.
**What was changed:** Replaced `async with` with `with`, removed all `await` keywords, changed `async def main()` to `def main()`, removed the `import asyncio` and `asyncio.run(main())` call, replaced with direct `main()` call.
**Why:** The code as written would fail at runtime. The synchronous `DaprClient` does not support the async context manager protocol. The async client is a separate class at `dapr.aio.clients.DaprClient`.

### 2. Kubernetes Deployment YAML missing required `spec.selector` field (Fixed)
**What was wrong:** The `apps/v1` Deployment was missing the required `spec.selector` field and corresponding `metadata.labels` on the pod template.
**What was changed:** Added `spec.selector.matchLabels` with `app: my-service` and matching `metadata.labels` on the pod template.
**Why:** `spec.selector` is a required field in `apps/v1` Deployments. Applying this YAML would be rejected by the Kubernetes API server.

### 3. Kubernetes section incorrectly claimed env vars are injected into both app and sidecar (Fixed)
**What was wrong:** The text said "Inject Kubernetes secrets as environment variables into the pod (both app container and daprd sidecar)" but the YAML only had `envFrom` on the app container. In Kubernetes, `envFrom` is scoped to the container it's defined on. The Dapr sidecar injector creates a separate daprd container that does NOT inherit `envFrom` from the app container. Since `secretstores.local.env` runs inside the daprd process, the env vars must be available to the sidecar.
**What was changed:** Updated the text to accurately describe the mechanism. Added the `dapr.io/env` annotation to pass env vars to the Dapr sidecar, which is the supported method for injecting env vars into the sidecar container.
**Why:** Without the env vars on the daprd sidecar, the `secretstores.local.env` component would return empty results. The `dapr.io/env` annotation is the Dapr-native mechanism for this purpose.

## Review Notes
- The Dapr CLI flag `--components-path` and the daprd flag `-components-path` were renamed to `--resources-path` / `-resources-path` in Dapr 1.11+. The old flags still work but are deprecated. The post does not specify a Dapr version, so this is not an error but may warrant updating in the future.
- The Docker Compose `version: "3.8"` key is deprecated in modern Docker Compose (v2+) but still functional and not an error.
- The Kubernetes section's `dapr.io/env` annotation requires hardcoded values rather than referencing Kubernetes Secret objects. For production Kubernetes environments, using the `secretstores.kubernetes` component (which reads directly from the Kubernetes Secrets API) is generally preferred over `secretstores.local.env`. This is a design consideration rather than a technical error.
- The Go, TypeScript, and HTTP API examples are all correct and use current SDK APIs.
