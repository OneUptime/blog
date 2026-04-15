# Validation Summary: How to Understand Dapr Error Codes and Error Handling

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Python SDK (`dapr` package)
- Dapr JavaScript SDK (`@dapr/dapr` package)
- HTTP and gRPC error handling
- State store and pub/sub error codes

## Sources Consulted
- Dapr HTTP Error Codes documentation: https://docs.dapr.io/developing-applications/error-codes/http-error-codes/
- Dapr Errors Overview: https://docs.dapr.io/developing-applications/error-codes/errors-overview/
- Dapr State API Reference: https://docs.dapr.io/reference/api/state_api/
- Dapr Service Invocation API Reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr runtime source code (`pkg/api/errors/state.go`, `pkg/api/errors/pubsub.go`, `pkg/api/http/http.go`): https://github.com/dapr/dapr
- Dapr Python SDK source code (`dapr/clients/`, `dapr/clients/exceptions.py`, `dapr/clients/grpc/client.py`): https://github.com/dapr/python-sdk
- Dapr JS SDK source code (`src/implementation/Client/DaprClient.ts`, `src/interfaces/Client/IClientState.ts`): https://github.com/dapr/js-sdk

## Issues Found

### 1. Incorrect HTTP status code for `ERR_STATE_STORE_NOT_FOUND`
- **What was wrong:** The error code table listed HTTP status 500 for `ERR_STATE_STORE_NOT_FOUND`.
- **What was changed:** Corrected to HTTP 400 (Bad Request).
- **Why:** The Dapr source code (`pkg/api/errors/state.go`) returns `http.StatusBadRequest` (400) for this error, not 500.

### 2. Incorrect HTTP status code for `ERR_PUBSUB_NOT_FOUND`
- **What was wrong:** The error code table listed HTTP status 500 for `ERR_PUBSUB_NOT_FOUND`.
- **What was changed:** Corrected to HTTP 404 (Not Found).
- **Why:** The Dapr source code (`pkg/api/errors/pubsub.go`) returns `http.StatusNotFound` (404) for this error, not 500.

### 3. Non-existent error code `ERR_NO_INVOCATION_ALLOWED`
- **What was wrong:** The error code `ERR_NO_INVOCATION_ALLOWED` does not exist in Dapr. The table listed it with HTTP status 403.
- **What was changed:** Replaced with `ERR_DIRECT_INVOKE`, which is the actual error code used when a service invocation is rejected by access policy (returning 403 via gRPC PermissionDenied status).
- **Why:** The Dapr source code uses `ERR_DIRECT_INVOKE` for service invocation errors, with the HTTP status derived from the underlying gRPC status code (PermissionDenied maps to 403).

## Review Notes
- **Python exception handling:** The blog catches `DaprInternalError` in the Python examples. The Dapr Python SDK's gRPC client methods raise `DaprGrpcError` (which extends `grpc.RpcError`), not `DaprInternalError`. In practice, the `except DaprInternalError` blocks may not catch gRPC-level errors. Readers using the default gRPC transport may need to catch `grpc.RpcError` or `DaprGrpcError` instead. This was not changed in the post because the exception class does exist in the SDK and the conceptual pattern is correct, but it may need adjustment depending on the transport used.
- **JavaScript error.message format:** The Dapr JS SDK (HTTP transport) throws errors where `error.message` is a JSON-serialized string (e.g., `'{"error":"Not Found","error_msg":"...","status":404}'`), not plain text. The blog's pattern of `error.message.includes("ERR_...")` will still work since `includes()` searches within the serialized string, but readers should be aware the message is JSON, not a clean error string.
- **Error response structure:** The blog shows the "rich errors" format with the `details` array. Not all Dapr errors include the `details` field — many still use the basic two-field format with just `errorCode` and `message`. The post could note this distinction but it is not technically incorrect as shown.
- **`ERR_STATE_SAVE` status code variability:** The post lists 500 for `ERR_STATE_SAVE`, which is the default. However, this error can also return 400 for invalid requests or 409 for ETag mismatches. The 500 listed is correct as a default but not exhaustive.
