# Validation Summary: How to Use Dapr SDK for Python to Build Microservices

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Python
- Dapr Python SDK (`dapr-client`, `dapr-ext-fastapi`)
- FastAPI
- Redis (as state store and pub/sub broker)
- gRPC
- Dapr Actors

## Sources Consulted
- Dapr Python SDK source code (GitHub: dapr/python-sdk) — async client at `dapr/aio/clients/grpc/client.py`, sync client at `dapr/clients/grpc/client.py`
- Dapr Python SDK `dapr/clients/grpc/_request.py` — `TransactionalStateOperation` and `TransactionOperationType` definitions
- Dapr Python SDK `dapr/clients/grpc/_state.py` — `StateItem` definition
- Dapr Python SDK `dapr/clients/grpc/_response.py` — `TopicEventResponse`, `InvokeMethodResponse`, `StateResponse`, `GetSecretResponse`
- Dapr Python SDK `dapr/ext/fastapi/app.py` — `DaprApp` and subscribe decorator
- Dapr Python SDK `dapr/actor/__init__.py` — `ActorProxy`, `ActorId` exports
- Dapr official documentation: https://docs.dapr.io/developing-applications/sdks/python/

## Issues Found

### 1. Async DaprClient imported from wrong module
- **What was wrong:** The async code examples imported `DaprClient` from `dapr.clients`, which is the synchronous client. The async client lives in `dapr.aio.clients`.
- **What was changed:** Updated `from dapr.clients import DaprClient` to `from dapr.aio.clients import DaprClient` in all async code blocks (Steps 1, 3, 4, and 5).
- **Why:** Using the sync `DaprClient` with `async with` and `await` would fail at runtime because the sync client only implements `__enter__`/`__exit__`, not `__aenter__`/`__aexit__`.

### 2. Incorrect gRPC-only communication claim
- **What was wrong:** The overview stated the SDK "communicates with the sidecar over gRPC" without qualification.
- **What was changed:** Updated to "communicates with the sidecar over gRPC for most operations, with service invocation defaulting to HTTP."
- **Why:** The Dapr Python SDK uses HTTP (not gRPC) for service invocation by default. This can be overridden via the `DAPR_API_METHOD_INVOCATION_PROTOCOL` environment variable.

### 3. TransactionalStateOperation and TransactionOperationType imported from wrong module
- **What was wrong:** Both were imported from `dapr.clients.grpc._state`, but they are defined in `dapr.clients.grpc._request`.
- **What was changed:** Updated the import to `from dapr.clients.grpc._request import TransactionalStateOperation, TransactionOperationType`.
- **Why:** The import would raise an `ImportError` at runtime.

### 4. TransactionalStateOperation constructor API incorrect
- **What was wrong:** The code used `item=StateItem(key=..., value=...)` as a constructor parameter. The actual constructor takes `key` and `data` directly, not a wrapped `StateItem`.
- **What was changed:** Replaced `TransactionalStateOperation(operation_type=..., item=StateItem(key=..., value=...))` with `TransactionalStateOperation(key=..., data=..., operation_type=...)`.
- **Why:** The `item` parameter does not exist on `TransactionalStateOperation`. The correct parameters are `key`, `data`, `etag`, `operation_type`, and `metadata`.

## Review Notes
- The `OrderActorInterface` in Step 5 is defined as a plain class. In production code, actor interfaces should inherit from `dapr.actor.runtime.actor_interface.ActorInterface`. However, since the example uses `proxy.invoke_method()` directly (bypassing interface dispatch), this works as shown.
- The `publish_event` call correctly uses `data_content_type` as a keyword argument, which is important since the 4th positional parameter is actually `publish_metadata`.
- The Dapr component YAML files use the correct `dapr.io/v1alpha1` API version and standard Redis component configuration.
- The synchronous client section correctly demonstrates the sync context manager pattern with `from dapr.clients import DaprClient`.
