# Validation Summary: How to Build Dapr Actors with Python SDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Python SDK (`dapr`, `dapr-ext-fastapi`)
- Dapr Actor model (virtual actors)
- Python
- FastAPI
- Uvicorn

## Sources Consulted
- Dapr Python SDK source code on GitHub (`dapr/python-sdk`, `main` branch): https://github.com/dapr/python-sdk
  - `dapr/actor/__init__.py` — verified actor imports (`ActorInterface`, `actormethod`, `Actor`, `ActorProxy`, `ActorId`)
  - `dapr/actor/runtime/state_manager.py` — verified `try_get_state`, `get_state`, `set_state`, `save_state` APIs
  - `dapr/actor/runtime/context.py` — verified `ActorRuntimeContext` class
  - `dapr/actor/runtime/config.py` — verified `ActorRuntimeConfig`, `ActorTypeConfig` classes
  - `dapr/actor/runtime/runtime.py` — verified `ActorRuntime.set_actor_config`
  - `dapr/clients/grpc/client.py` — confirmed `invoke_actor` does NOT exist on `DaprClient`
  - `ext/dapr-ext-fastapi/dapr/ext/fastapi/__init__.py` — verified `DaprActor` class
- Dapr Python SDK demo examples on GitHub (actor demo)
- Dapr official documentation: https://docs.dapr.io/developing-applications/sdks/python/

## Issues Found

### 1. Critical: Incorrect actor client invocation API (lines 117–138)
- **What was wrong:** The "Invoking the Actor from a Client" section used `DaprClient.invoke_actor()` which does not exist in the Dapr Python SDK. Additionally, the code used `await` inside a synchronous `with DaprClient()` context manager block, which is invalid.
- **What was changed:** Replaced the entire client code block with the correct `ActorProxy`-based approach: `ActorProxy.create()` to create a proxy, then `proxy.invoke_method()` to call actor methods. Updated imports from `dapr.clients.DaprClient` to `dapr.actor.ActorProxy` and `dapr.actor.ActorId`.
- **Why:** The Dapr Python SDK uses the `ActorProxy` pattern for invoking actors from clients, not direct method calls on `DaprClient`. This is confirmed by the official SDK source code and demo examples.

## Review Notes
- The `save_state()` calls in the `increment()` and `reset()` methods are technically redundant — the Dapr actor runtime automatically saves state after each actor method invocation via `_on_post_actor_method_internal()`. The explicit calls are harmless (state just gets saved twice) but could mislead readers into thinking state won't persist without them. Left as-is since it's not incorrect, just unnecessary.
- The `@app.on_event("startup")` pattern used for registering actors is deprecated in newer versions of FastAPI in favor of `lifespan` context managers. It still works but may warrant updating in the future.
