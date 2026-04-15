# Validation Summary: How to Use Dapr Actors with Python SDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Python SDK (`dapr`, `dapr-ext-fastapi`)
- Python asyncio
- FastAPI (for actor hosting)
- Virtual Actor pattern

## Sources Consulted
- Dapr Python SDK source code (dapr/python-sdk on GitHub) — `dapr/actor/__init__.py`, `dapr/actor/runtime/config.py`, `dapr/actor/runtime/runtime.py`, `dapr/actor/client/proxy.py`, `dapr/ext/grpc/app.py`, `dapr/ext/fastapi/actor.py`
- Dapr Python SDK official demo_actor example (`examples/demo_actor/`)
- Dapr official documentation — https://docs.dapr.io/developing-applications/sdks/python/
- PyPI package listings for `dapr`, `dapr-ext-fastapi`, `dapr-ext-grpc`

## Issues Found

### Issue 1: Incorrect installation packages
- **What was wrong:** The installation command was `pip install dapr dapr-ext-grpc flask`. The `dapr-ext-grpc` package does not support actors — it only handles service invocation, pub/sub, and bindings. Actors require HTTP endpoints for Dapr's actor runtime callbacks (`/dapr/config`, `/actors/{type}/{id}/method/{method}`, etc.).
- **What was changed:** Updated to `pip install dapr dapr-ext-fastapi uvicorn`, which installs the correct FastAPI-based extension for actor hosting along with the ASGI server needed to run it.
- **Why:** The Dapr Python SDK's official actor examples use `dapr-ext-fastapi`. The gRPC extension has zero actor support in its source code.

### Issue 2: Actor service hosting used gRPC App instead of FastAPI DaprActor
- **What was wrong:** The `main.py` section used `from dapr.ext.grpc import App` and `app.run(50051)` to host the actor service. The gRPC `App` class cannot serve actor HTTP endpoints, so this code would not work — Dapr's sidecar would be unable to communicate with the actor runtime.
- **What was changed:** Rewrote `main.py` to use `FastAPI` with `DaprActor` from `dapr.ext.fastapi`. Actor registration now happens in a FastAPI startup event via `actor.register_actor(CartActor)`. Added a `dapr run` command showing how to start the service with uvicorn.
- **Why:** Actors in Dapr require an HTTP server that exposes specific endpoints. The `DaprActor` extension for FastAPI automatically sets up these routes. This matches the official `demo_actor` example in the Dapr Python SDK repository.

## Review Notes
- The `save_state()` calls in the actor implementation are technically redundant — the Dapr actor runtime automatically calls `save_state()` after each actor method invocation in `_on_post_actor_method_internal()`. However, explicit calls are not harmful and make the state persistence behavior more visible to readers, so they were left as-is.
- The `ActorTypeConfig` is used without an `actor_type` parameter, which means it applies as a global default configuration. This is a valid usage pattern.
- The proxy client correctly uses the `actormethod(name=...)` names (e.g., `proxy.AddItem()`) rather than the Python method names (e.g., `proxy.add_item()`), which matches how the Dapr actor dispatch system resolves method calls.
- All other code — actor interface definition, actor implementation, state management API usage, actor client proxy creation — was verified correct against the SDK source code.
