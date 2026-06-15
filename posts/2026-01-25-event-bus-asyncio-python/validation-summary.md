# Validation Summary: How to Build an Event Bus with asyncio in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- asyncio
- dataclasses
- typing
- FastAPI lifespan events
- Publish-subscribe and event bus patterns

## Sources Consulted
- Python asyncio tasks documentation: https://docs.python.org/3/library/asyncio-task.html
- Python asyncio synchronization primitives documentation: https://docs.python.org/3/library/asyncio-sync.html
- Python asyncio queues documentation: https://docs.python.org/3/library/asyncio-queue.html
- Python dataclasses documentation: https://docs.python.org/3/library/dataclasses.html
- Python heapq documentation: https://docs.python.org/3/library/heapq.html
- FastAPI lifespan events documentation: https://fastapi.tiangolo.com/advanced/events/

## Issues Found
- The basic event bus described `asyncio.Lock` as thread-safe. Updated the comment to clarify that it coordinates access between asyncio tasks, matching the Python documentation that asyncio locks are not thread-safe.
- `publish_sync()` was described as publishing from synchronous code, but `asyncio.create_task()` requires a running event loop in the current thread. Updated the docstring to state that it schedules publishing from code already running inside the event loop.
- `unsubscribe()` could raise `ValueError` when asked to remove a handler that was not subscribed. Added a membership check before removing the handler.
- `publish()` read the handler list without coordinating with concurrent subscription changes. Updated it to copy the current handler list while holding the lock before dispatching.
- Several separated code snippets were missing imports required by the named files, including `Event`, `asyncio`, `logging`, event classes, and `uuid`. Added the missing imports.
- The startup example included a sleep with a comment saying handlers needed time to complete, but `publish()` already awaits handlers through `asyncio.gather()`. Replaced the misleading comment.
- The dead-letter retry loop retried directly from the same list that failed deliveries could append to again. Changed it to retry a snapshot and leave newly failed deliveries in the queue for a later retry call.
- The priority queue example used a hand-rolled list and lock, including sleeping while holding the lock, and claimed a later critical event would definitely run first even though workers were already started. Replaced it with `asyncio.PriorityQueue` and queued both events before starting workers so the priority-order claim is accurate.

## Review Notes
The examples are suitable for an in-process event bus. For production systems, the post correctly notes that cross-process delivery needs an external broker such as Redis Pub/Sub or RabbitMQ. The retry/dead-letter example still tracks failed events rather than failed event-handler pairs, so handlers should remain idempotent if that example is expanded in the future.
