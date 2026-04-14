# Validation Summary: How to Share State Between Multiple Dapr Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (state management building block)
- Dapr State API (HTTP endpoints)
- Dapr Python SDK (`dapr.clients.DaprClient`)
- Redis (as example state store backend)
- Kubernetes Component YAML

## Sources Consulted
- [How-To: Share state between applications | Dapr Docs](https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-share-state/)
- [State management overview | Dapr Docs](https://docs.dapr.io/developing-applications/building-blocks/state-management/state-management-overview/)
- [State management API reference | Dapr Docs](https://docs.dapr.io/reference/api/state_api/)
- [How-To: Save and get state | Dapr Docs](https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-get-save-state/)
- [How-To: Scope components to one or more applications | Dapr Docs](https://docs.dapr.io/operations/components/component-scopes/)
- [Component spec | Dapr Docs](https://docs.dapr.io/reference/resource-specs/component-schema/)
- [Getting started with the Dapr client Python SDK | Dapr Docs](https://docs.dapr.io/developing-applications/sdks/python/python-client/)

## Issues Found
1. **Scopes field placement in Component YAML (Scoping section):** The `scopes` field was incorrectly nested under `spec` in the YAML snippet. In Dapr's Component schema, `scopes` is a root-level field at the same indentation level as `spec` and `metadata`, not a child of `spec`. Incorrect placement would cause the scoping to be silently ignored, meaning all applications would have access to the shared state store. Fixed by moving `scopes` to the root level of the Component resource.

## Review Notes
- **Approach 2 (manual prefixed key access):** Constructing full prefixed keys like `orderservice||order-123` to read another app's state is technically possible but is not an officially documented or recommended pattern in Dapr docs. The recommended approaches are `keyPrefix: none` or `keyPrefix: name`. The post does frame this as just one option and notes it's for read-only access, which is reasonable, but readers should be aware this is not a first-class supported pattern.
- **keyPrefix options:** The post only covers `keyPrefix: none`. Dapr also supports `keyPrefix: name` (uses the component name as prefix) which can be another useful sharing strategy. This is not an error but could be a useful addition in a future update.
- All HTTP API endpoints (`/v1.0/state/{storeName}` for POST, `/v1.0/state/{storeName}/{key}` for GET) are correct.
- The Python SDK usage (`DaprClient`, `save_state`, `get_state` with `.data` attribute) is correct.
- The ETag concurrency options (`"concurrency": "first-write"`, `"consistency": "strong"`) are correct.
- The default key prefix separator `||` (double pipe) is correct.
