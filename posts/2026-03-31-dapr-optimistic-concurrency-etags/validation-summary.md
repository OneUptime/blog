# Validation Summary: How to Use Optimistic Concurrency Control with ETags in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr State Management API (HTTP and gRPC)
- Dapr Go SDK
- Dapr Python SDK
- Redis, PostgreSQL, Azure Cosmos DB, DynamoDB, MongoDB (as state store backends)
- Dapr Distributed Lock API

## Sources Consulted
- Dapr State Management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr State Management overview: https://docs.dapr.io/developing-applications/building-blocks/state-management/state-management-overview/
- Dapr Go SDK documentation: https://docs.dapr.io/developing-applications/sdks/go/go-client/
- Dapr Python SDK documentation: https://docs.dapr.io/developing-applications/sdks/python/
- Dapr Python SDK source code (`dapr/clients/grpc/_state.py`) for import paths and enum values
- Dapr state store component source code (Redis, PostgreSQL, Cosmos DB, DynamoDB, MongoDB) for ETag implementation details
- Dapr Distributed Lock API reference: https://docs.dapr.io/reference/api/distributed_lock_api/

## Issues Found

1. **PostgreSQL ETag implementation was outdated**: The post claimed PostgreSQL uses the `xmin` system column for ETags. This was true for the v1 state store component, but the current v2 component uses random UUIDs. Changed to "Random UUID (v2 component)".

2. **MongoDB ETag description was imprecise**: The post described MongoDB's implementation as "Document version field." The actual implementation uses a field named `_etag` containing a random UUID, not a sequential version counter. Changed to "`_etag` field with UUID".

3. **DynamoDB ETag description was slightly imprecise**: The post said "Conditional expression on version attribute." The actual implementation uses random 64-bit hex values as ETags, not sequential versions. Changed "version attribute" to "ETag attribute" for accuracy.

4. **Mermaid sequence diagram was missing a step**: In Service B's GET request flow, the `S->>R: Read` arrow between the Dapr Sidecar and the State Store was missing (it was present for Service A's flow). Added the missing step.

## Review Notes
- The Dapr Distributed Lock API referenced in the OCC vs. pessimistic locking comparison table is currently in alpha status (`v1.0-alpha1`). The blog does not mention this, which is worth noting but not a factual error.
- All HTTP API endpoints, request/response formats, status codes (204 and 409), Go SDK method signatures and field names, and Python SDK imports/methods/enum values were verified as correct.
- The concurrency control explanation and the overall ETag workflow are accurate per Dapr's official documentation.
