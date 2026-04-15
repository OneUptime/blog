# Validation Summary: How to Handle Errors in Dapr Python SDK

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Python SDK (`dapr-client` package)
- Python
- gRPC / `grpcio` Python library
- Flask (for pub/sub subscriber example)

## Sources Consulted
- Dapr Python SDK source code — `DaprGrpcClient.__init__` constructor signature: https://github.com/dapr/python-sdk/blob/master/dapr/clients/grpc/client.py
- Dapr Python SDK source code — `invoke_method` signature (confirms `timeout` parameter): https://github.com/dapr/python-sdk/blob/master/dapr/clients/grpc/client.py
- Dapr Python SDK source code — `dapr/conf/global_settings.py` for `DAPR_API_TOKEN` and `DAPR_API_TIMEOUT_SECONDS` settings
- Dapr Python SDK source code — `dapr/clients/exceptions.py` for `DaprInternalError`
- Dapr Python SDK source code — `TopicEventResponseStatus` enum for pub/sub `SUCCESS`, `RETRY`, `DROP` values
- gRPC Python API reference for `grpc.RpcError`, `grpc.StatusCode` values

## Issues Found

1. **Timeout Configuration section — `DaprClient(timeout=5)` is invalid**: The `DaprClient` (and underlying `DaprGrpcClient`) constructor does not accept a `timeout` parameter. Its constructor accepts `address`, `interceptors`, `max_grpc_message_length`, and `retry_policy`. **Fix**: Changed to `DaprClient()` and moved `timeout=5` to the `invoke_method` call, which does accept a `timeout` parameter.

2. **Timeout Configuration section — misleading `settings.DAPR_API_TOKEN` line**: The comment read "Set global timeout (seconds)" but the code set `settings.DAPR_API_TOKEN = "your-token"`, which configures an API authentication token, not a timeout. This was misleading in the context of a timeout configuration section. **Fix**: Removed the `from dapr.conf import settings` import and the `settings.DAPR_API_TOKEN` line entirely, since the per-call `timeout` parameter on `invoke_method` is the cleaner and more common approach.

3. **Timeout Configuration section — missing `import grpc`**: The except clause referenced `grpc.RpcError` and `grpc.StatusCode.DEADLINE_EXCEEDED` but `grpc` was not imported in the code block. **Fix**: Added `import grpc`.

4. **Structured Error Logging section — missing `DaprClient` import**: The code used `DaprClient()` but did not include `from dapr.clients import DaprClient`. **Fix**: Added the missing import.

## Review Notes
- The pub/sub example returns HTTP 500 with the `RETRY` status. This is redundant (Dapr treats any non-success HTTP status as a retry regardless of the body), but it is not incorrect and serves as a defensive pattern.
- The `DaprInternalError` import uses `from dapr.clients.exceptions import DaprInternalError` which works but the canonical public API path is `from dapr.clients import DaprInternalError`. Not changed since both are valid.
- The retry logic example creates a new `DaprClient` on each attempt. While functional, in production code it would be more efficient to create the client once outside the loop. Not changed since this is a pedagogical example and works correctly as-is.
