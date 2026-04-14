# Validation Summary: How to Explain Dapr State Management in an Interview

## Status
validated

## Post Type
Interview preparation guide / Technical reference

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr State Management API (HTTP)
- Redis (as state store backend)
- Azure Cosmos DB (mentioned as alternative backend)
- DynamoDB, PostgreSQL (mentioned as alternative backends)

## Sources Consulted
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr State Management overview: https://docs.dapr.io/developing-applications/building-blocks/state-management/
- Dapr State Management how-to guides: https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-get-save-state/
- Dapr Component spec reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/

## Issues Found
1. **Consistency parameter passed as HTTP header instead of query parameter.**
   - **What was wrong:** The Consistency Models section used `-H "consistency: eventual"` and `-H "consistency: strong"` HTTP headers on GET requests.
   - **What was changed:** Replaced with query parameters `?consistency=eventual` and `?consistency=strong` on the URL.
   - **Why:** The Dapr State API accepts consistency as a query parameter on GET requests (e.g., `GET /v1.0/state/<storename>/<key>?consistency=strong`), not as an HTTP header. For save operations, consistency is specified in the request body `options` object, but the blog post's GET examples needed the query parameter form.

## Review Notes
- The `"concurrency": "first-write"` value used in the ETag section is correct. The two valid values are `"first-write"` and `"last-write"`.
- The transaction API format with `"operations"` (plural) as the outer key and `"operation"` (singular) within each item is correct per the Dapr API spec.
- The key prefix format `appid||key` with double pipes is correct.
- The TTL metadata key `ttlInSeconds` is correct, though not all state store backends support TTL.
- The component YAML structure (`apiVersion: dapr.io/v1alpha1`, `kind: Component`, `spec.type: state.redis`, `spec.version: v1`) is correct.
- The bulk get endpoint and request body format `{"keys": [...]}` are correct.
