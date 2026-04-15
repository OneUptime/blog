# Validation Summary: How to Implement Database per Service Pattern with Dapr

## Status
validated

## Post Type
Tutorial / Architecture Guide

## Technologies Covered
- Dapr (state management, component scoping, service invocation)
- Dapr Python SDK (`dapr-python-sdk`)
- Dapr Go SDK (`dapr/go-sdk`)
- Redis (as a state store backend)
- PostgreSQL (as a state store backend)
- MongoDB (as a state store backend)
- Kubernetes (deployment context, secrets)

## Sources Consulted
- Dapr Component schema reference: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr State management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr component scoping documentation: https://docs.dapr.io/operations/components/component-scopes/
- Dapr component secrets documentation: https://docs.dapr.io/operations/components/component-secrets/
- Dapr error codes reference: https://docs.dapr.io/developing-applications/error-codes/error-codes-reference/
- Dapr Redis state store metadata definition (components-contrib source)
- Dapr Python SDK source code (`dapr/clients/grpc/client.py`, `InvokeMethodResponse` class)
- Dapr Go SDK `GetState` method signature
- GitHub issue dapr/dapr#2693 (confusing error message for scoped state store access)
- GitHub issue dapr/dapr#8124 (silent failure on out-of-scope component access)

## Issues Found
1. **Incorrect expected error code for scope violation** (line 158): The post claimed that accessing a state store scoped to another service would return `403 Forbidden`. This is incorrect. Dapr component scoping works by simply not loading the component for sidecars not in the `scopes` list. The component is invisible to the unauthorized sidecar, so the error returned is `400 Bad Request` with error code `ERR_STATE_STORE_NOT_FOUND` — not a permissions/forbidden error. A `403 Forbidden` would only occur if Dapr API access control policies (a separate mechanism configured via the `Configuration` resource) were in use. Fixed the comment to reflect the correct error: `400 Bad Request with ERR_STATE_STORE_NOT_FOUND`.

## Review Notes
- The `kubectl exec -c daprd` commands may not work in practice because the `daprio/daprd` sidecar container image is minimal and may not include `curl`. Since all containers in a pod share the same network namespace, executing from the application container (or omitting `-c daprd`) may be more practical. This is a usability concern, not a technical error in the command syntax.
- The Python code omits `import json` while using `json.dumps()` and `json.loads()`. This is a standard blog convention (showing only relevant imports) and not an error.
- The `InvokeMethodResponse` object in the Python SDK also provides a `.json()` convenience method that could replace `json.loads(result.data)`, but the current code is functionally correct.
- The `auth.secretStore: kubernetes` in the order-statestore YAML is unnecessary since no `secretKeyRef` is used in that component's metadata, but it is not incorrect.
- All YAML structures correctly place `auth` and `scopes` as top-level fields per the Dapr Component CRD schema.
- All metadata field names (`redisHost`, `redisDB`, `connectionString`, `host`, `databaseName`) are verified as valid for their respective state store components.
