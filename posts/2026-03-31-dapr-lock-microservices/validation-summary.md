# Validation Summary: How to Use Dapr Distributed Lock with Microservices

## Status
validated

## Post Type
Tutorial / Architecture Guide

## Technologies Covered
- Dapr distributed lock building block (lock API, alpha)
- Redis as lock store backend (`lock.redis` component)
- Python (async code examples)
- Kubernetes (pod environment variables, deployment configuration)
- Dapr component scoping

## Sources Consulted
- Dapr Distributed Lock overview: https://docs.dapr.io/developing-applications/building-blocks/distributed-lock/
- Dapr Distributed Lock API reference: https://docs.dapr.io/reference/api/distributed_lock_api/
- Dapr Redis Lock component reference: https://docs.dapr.io/reference/components-reference/supported-lock/redis/
- Dapr Python SDK source (`try_lock`/`unlock` methods)
- Dapr component scoping documentation: https://docs.dapr.io/operations/components/component-scopes/
- Kubernetes downward API documentation (for pod name/namespace env vars)

## Issues Found

1. **Missing `expiryInSeconds` parameter in lock acquire calls**: The Dapr lock API requires `expiryInSeconds` as a mandatory parameter when acquiring a lock. This is critical for preventing deadlocks -- if a service crashes while holding a lock, the lock auto-expires after the specified duration. Both Python code examples (`order-service` and `inventory-service`) called `acquire_lock` without this parameter. Fixed by adding a `LOCK_EXPIRY_SECONDS = 30` constant and passing it as the fourth argument to `acquire_lock` in both examples.

2. **Incorrect code fence language for ASCII diagram**: The architecture overview diagram used ` ```json ` but the content is plain ASCII text, not JSON. Changed to ` ```text `.

3. **Incorrect code fence language for naming convention template**: The `{domain}-{entity-type}-{entity-id}` template used ` ```json ` but is plain text. Changed to ` ```text `.

## Review Notes
- The Dapr distributed lock API is still in **alpha** status (API path is `v1.0-alpha1`). The post does not mention this, which readers should be aware of as the API may change in future Dapr releases.
- The Python code uses `acquire_lock`/`release_lock` as wrapper functions rather than the actual Dapr Python SDK method names (`try_lock`/`unlock`). This is acceptable as pseudocode for illustrative purposes, but readers implementing this will need to map to the actual SDK methods.
- The component YAML, scoping placement, Redis metadata fields, and Kubernetes deployment patterns are all technically correct.
- The `scopes` field is correctly placed at the root level of the component YAML (sibling to `spec`), which matches Dapr documentation.
