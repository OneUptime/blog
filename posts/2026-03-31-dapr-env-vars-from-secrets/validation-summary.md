# Validation Summary: How to Use Environment Variables from Secrets in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (secret store API, Configuration resource, sidecar architecture)
- Kubernetes (Secrets, Deployments, pod specs)
- Python (Dapr Python SDK, stdlib urllib/json)
- HashiCorp Vault (referenced as example secret store)

## Sources Consulted
- Dapr Secrets API reference: https://docs.dapr.io/reference/api/secrets_api/
- Dapr Python SDK `get_secret` source: https://github.com/dapr/python-sdk/blob/main/dapr/clients/grpc/client.py
- Dapr secret scoping documentation: https://docs.dapr.io/operations/configuration/secret-scope/
- Dapr Configuration spec: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr sidecar architecture and lifecycle: https://docs.dapr.io/concepts/dapr-services/sidecar/
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found

### Issue 1: Init Container Pattern Does Not Work with Dapr (Method 3)
**What was wrong:** The original Method 3 used a Kubernetes init container to call the Dapr sidecar at `localhost:3500` to fetch secrets. This is fundamentally broken because the Dapr sidecar (daprd) is injected as a regular container, and init containers run to completion *before* any regular containers start. Therefore, `localhost:3500` is unreachable during init container execution. Additionally, the `dapr/dapr:latest` image is the Dapr runtime image and does not include `curl`.

**What was changed:** Replaced the init container pattern with a startup script pattern. The new example runs in the main container, waits for the Dapr sidecar to become healthy via the `/v1.0/healthz` endpoint, and then fetches secrets via the Dapr HTTP secrets API before starting the application. The section heading was updated from "Init Container Pattern" to "Startup Script Pattern", and the Summary section was updated accordingly.

**Why:** The Dapr sidecar lifecycle is a well-documented constraint. Init containers cannot communicate with Dapr because the sidecar hasn't started yet. The startup script pattern is the correct approach for pre-application secret loading with Dapr.

## Review Notes
- Method 1 (Native Kubernetes Secret Injection) is standard Kubernetes functionality and is not Dapr-specific. It's correctly presented as a complementary approach.
- Method 2 (Dapr Python SDK) uses the correct API: `DaprClient.get_secret(store_name, key)` returns a `GetSecretResponse` with a `.secret` property of type `Dict[str, str]`.
- The secret scoping Configuration resource uses the correct schema (`dapr.io/v1alpha1`) and field names (`storeName`, `defaultAccess`, `allowedSecrets`).
- Kubernetes 1.28+ introduced native sidecar containers (`restartPolicy: Always` in init containers) which could eventually enable a true init-container-based approach with Dapr, but this requires specific Kubernetes versions and Dapr configuration not covered here.
