# Validation Summary: How to Use Dapr Python SDK with Async/Await

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar and Python SDK)
- Python asyncio
- FastAPI
- aiohttp
- uvicorn

## Sources Consulted
- Dapr Python SDK source and API reference (https://docs.dapr.io/developing-applications/sdks/python/)
- Dapr State Management HTTP API (https://docs.dapr.io/reference/api/state_api/)
- Dapr Pub/Sub HTTP API (https://docs.dapr.io/reference/api/pubsub_api/)
- Python asyncio documentation (https://docs.python.org/3/library/asyncio-eventloop.html)
- Python 3.10+ deprecation notes for `asyncio.get_event_loop()` (https://docs.python.org/3/library/asyncio-eventloop.html#asyncio.get_event_loop)

## Issues Found
1. **`asyncio.get_event_loop()` deprecated in Python 3.10+**: The post used `asyncio.get_event_loop()` inside coroutines in three places (async_get_state, async_save_state, async_publish). Since Python 3.10, `get_event_loop()` emits a DeprecationWarning when no event loop is running, and within a coroutine the correct API is `asyncio.get_running_loop()` (available since Python 3.7). Replaced all three occurrences with `asyncio.get_running_loop()`. Also updated the prose description on line 24 to match.

## Review Notes
- The Dapr Python SDK provides a native async client at `dapr.aio.clients.DaprClient` which could be used instead of wrapping the synchronous client in `run_in_executor`. The thread-executor approach shown in the post is valid and functional, but readers looking for maximum async performance should be aware the native async client exists.
- All Dapr API parameter names (`store_name`, `key`, `pubsub_name`, `topic_name`, `data`, `data_content_type`) are correct for the current SDK.
- The Dapr HTTP API endpoint format `v1.0/state/{store}/{key}` is correct.
- The `dapr run` CLI syntax and flags are correct.
