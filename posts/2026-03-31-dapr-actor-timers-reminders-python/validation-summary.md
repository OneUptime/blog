# Validation Summary: How to Implement Actor Timers and Reminders in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Python SDK (`dapr`, `dapr-ext-fastapi`)
- Dapr Actor model (timers, reminders, state management)
- Python
- FastAPI
- Uvicorn

## Sources Consulted
- Dapr Python SDK source code — `dapr/actor/runtime/actor.py` (register_timer, register_reminder, unregister_timer, unregister_reminder signatures): https://github.com/dapr/python-sdk/blob/master/dapr/actor/runtime/actor.py
- Dapr Python SDK source code — `dapr/actor/__init__.py` (module exports: Actor, Remindable, ActorInterface, actormethod): https://github.com/dapr/python-sdk/blob/master/dapr/actor/__init__.py
- Dapr Python SDK source code — `dapr/actor/runtime/remindable.py` (Remindable.receive_reminder signature): https://github.com/dapr/python-sdk/blob/master/dapr/actor/runtime/remindable.py
- Dapr Python SDK source code — `dapr/actor/runtime/_timer_data.py` (TIMER_CALLBACK type definition, callback.__name__ usage): https://github.com/dapr/python-sdk/blob/master/dapr/actor/runtime/_timer_data.py
- Dapr Python SDK demo actor example (register_timer usage with method reference): https://github.com/dapr/python-sdk/blob/master/examples/demo_actor/demo_actor/demo_actor.py
- Dapr Python SDK FastAPI extension — `dapr/ext/fastapi/actor.py` (DaprActor class, register_actor method): https://github.com/dapr/python-sdk/blob/master/ext/dapr-ext-fastapi/dapr/ext/fastapi/actor.py

## Issues Found
- **`register_timer` callback passed as string instead of callable**: The blog passed `"track_usage"` (a string) as the timer callback parameter. The Dapr Python SDK defines `TIMER_CALLBACK = Callable[[Any], Awaitable[None]]` and internally calls `callback.__name__` to extract the method name. Passing a string would cause `AttributeError: 'str' object has no attribute '__name__'` at runtime. Fixed by changing `"track_usage"` to `self.track_usage` and updating the inline comment from "callback method name" to "callback method".

## Review Notes
- The `@app.on_event("startup")` pattern used in the "Hosting the Actor" section is deprecated in newer FastAPI versions (0.93+) in favor of the lifespan context manager. It still works but may be removed in a future FastAPI release.
- The `receive_reminder` method in the blog omits the optional `ttl: Optional[timedelta] = None` parameter present in the SDK's `Remindable` abstract class. This is acceptable since Python allows omitting parameters with defaults when overriding, and the Dapr runtime will supply the default.
- The `register_reminder` method has additional optional parameters (`ttl`, `failure_policy`) not shown in the blog. This is fine for a tutorial — showing only the essential parameters keeps the example focused.
