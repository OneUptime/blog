# Validation Summary: How to Save and Get State in Dapr with HTTP API

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr State Management HTTP API
- REST / HTTP (curl)
- Key-value state stores
- ETags and optimistic concurrency control

## Sources Consulted
- Dapr State Management API Reference: https://docs.dapr.io/reference/api/state_api/
- Dapr How-To: Save and Get State: https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-get-save-state/
- Dapr protobuf definitions (common.proto, dapr.proto): https://github.com/dapr/dapr/tree/master/dapr/proto
- Dapr docs source (v1.14): https://github.com/dapr/docs

## Issues Found

1. **GET nonexistent key returns 204, not 200**: The post stated "Getting a nonexistent key returns `200 OK` with an empty body, not a 404." Per the official Dapr API reference, a GET for a nonexistent key returns `204 No Content`, not `200 OK`. Fixed the note and the error responses table.

2. **Bulk get response field name was `"data"` instead of `"value"`**: The bulk get response JSON example used `"data"` as the field name for the state value. The official Dapr API reference documents the field as `"value"`. Fixed the JSON example and surrounding text.

3. **Error responses table had misleading 404 row**: The table listed `404` as a status code with the description "Key not found returns empty body with 200, not 404." This was confusing because (a) 404 is not actually returned by the state API, and (b) the actual behavior is 204, not 200. Removed the 404 row and corrected the 204 row to reflect that it is also returned for key-not-found on GET requests.

## Review Notes
- The API endpoints, HTTP methods, request body formats, save/delete response codes, ETag header usage, concurrency/consistency options, TTL metadata format, and transaction operation structure are all accurate.
- The `If-Match` header usage for delete with ETag is correct.
- The mermaid sequence diagram accurately represents the state operations flow.
- The shell script for extracting ETags is functional but fragile (relies on specific header formatting); this is acceptable for a tutorial context.
- Not all state stores support transactions; the post does not mention this caveat but it is a minor omission for a general HTTP API reference.
