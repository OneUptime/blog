# Validation Summary: How to Use Dapr Python SDK with FastAPI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Python
- FastAPI
- dapr-ext-fastapi (Dapr FastAPI extension)
- dapr Python SDK (DaprClient)
- Pydantic
- Uvicorn
- Pub/Sub messaging
- State management
- Service invocation

## Sources Consulted
- Dapr Python SDK GitHub repository: https://github.com/dapr/python-sdk
- dapr-ext-fastapi source code (ext/dapr-ext-fastapi/dapr/ext/fastapi/app.py) for `DaprApp.subscribe` method signature
- DaprClient source code for `save_state`, `get_state`, and `invoke_method` method signatures
- FastAPI official documentation for response handling patterns
- Dapr CLI reference for `dapr run` and `dapr publish` command flags

## Issues Found

### 1. Incorrect parameter name in `@dapr_app.subscribe` decorator
- **What was wrong:** The blog used `pubsub_name="pubsub"` as the parameter in the `@dapr_app.subscribe()` decorator. The `dapr-ext-fastapi` extension's `subscribe` method uses `pubsub` as the parameter name, not `pubsub_name`. The `pubsub_name` parameter belongs to the gRPC extension (`dapr.ext.grpc`), not the FastAPI extension.
- **What was changed:** Changed `pubsub_name="pubsub"` to `pubsub="pubsub"`.
- **Why:** Using the wrong parameter name would cause a `TypeError` at runtime.

### 2. Invalid FastAPI return pattern for 404 response
- **What was wrong:** The blog used `return {"error": "Order not found"}, 404` to return a 404 response. This is a Flask pattern (Flask allows returning `(body, status_code)` tuples). In FastAPI, this would return a 200 response containing a Python tuple, not a 404 error response.
- **What was changed:** Replaced with `from fastapi.responses import JSONResponse` and `return JSONResponse(content={"error": "Order not found"}, status_code=404)`.
- **Why:** The original code would silently return a 200 status with incorrect response body instead of the intended 404 error.

## Review Notes
- The `result.data.decode("utf-8")` pattern in the `get_state` response handling works correctly since `StateResponse.data` returns `bytes`, but using `result.text()` would be more idiomatic for the Dapr Python SDK.
- The pub/sub handler `async def handle_order(event: Order)` receives the request body from the Dapr sidecar. Depending on Dapr configuration, this may be a full CloudEvent envelope rather than just the `Order` data. For production use, handling the CloudEvent wrapper or setting `rawPayload` metadata may be necessary.
- All CLI commands (`dapr run`, `dapr publish`) use correct flags and syntax.
- The `DaprClient` context manager pattern (`with DaprClient() as client:`) is correct and idiomatic.
- The `invoke_method` call uses correct parameter names and the `response.text()` method is valid on `InvokeMethodResponse`.
