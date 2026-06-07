# Validation Summary: How to Build Event-Driven Systems with Python

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python 3 (asyncio)
- `dataclasses` module
- `redis-py` async client (`redis.asyncio`)
- Redis Pub/Sub
- Event sourcing pattern
- Exponential backoff with jitter / dead letter queues

## Sources Consulted
- Python `asyncio` docs — `asyncio.Event`, `asyncio.gather`, `asyncio.run` (https://docs.python.org/3/library/asyncio.html)
- Python `dataclasses` docs — field ordering rules and `kw_only` (https://docs.python.org/3/library/dataclasses.html)
- `redis-py` async client docs and source (https://redis.readthedocs.io/en/stable/examples/asyncio_examples.html)
- `redis.asyncio` module / `from_url` API (https://github.com/redis/redis-py/blob/master/redis/asyncio/utils.py)
- Redis Pub/Sub docs (https://redis.io/docs/latest/develop/interact/pubsub/)

## Issues Found

1. **`redis_events.py` — `await redis.from_url(...)` is invalid.**
   `redis.asyncio.from_url()` is a regular (non-async) function that returns a `Redis` client instance synchronously — the connection is established lazily on the first command. Awaiting it raises `TypeError: object Redis can't be used in 'await' expression`. Removed the `await` and added a brief explanatory comment.

2. **`event_sourcing.py` — Dataclass inheritance bug, code fails at class-definition time.**
   The base `DomainEvent` declared `timestamp: datetime = field(default_factory=datetime.utcnow)` (a field *with* a default), and the subclasses `OrderCreated`, `OrderPaid`, and `OrderShipped` added fields *without* defaults (`user_id`, `items`, `total`, `payment_id`, `amount`, `tracking_number`, `carrier`). Python's dataclass merges fields in MRO order, so this produces `TypeError: non-default argument 'user_id' follows default argument` the moment the module is imported. Fixed by marking `timestamp` as `kw_only=True` (Python 3.10+), which removes it from the positional argument list so subclasses can declare required positional fields freely. All call sites in the post already use keyword arguments, so behavior is unchanged.

## Review Notes

- The code uses `datetime.utcnow()` in two places (`Event.__post_init__` and `DomainEvent.timestamp` default factory, plus inside `RedisEventBus.publish`). `datetime.utcnow()` is deprecated in Python 3.12+ (replace with `datetime.now(timezone.utc)`), but it still functions and only emits a `DeprecationWarning`. Left as-is to avoid stylistic changes beyond the bugs.
- The fix to `event_sourcing.py` requires Python 3.10+ for `kw_only`. This is reasonable in 2026 (3.10 was released October 2021) and matches the post's modern-Python flavor (e.g., `redis.asyncio`).
- The `notification_service()` example creates `listen_task` but never awaits or cancels it before calling `bus.disconnect()`. This is a minor demo-quality concern — in real code the task should be cancelled — but not technically incorrect for an illustrative snippet.
- The basic_event.py example's printed output ordering ("Consumer A" before "Producer") depends on `asyncio.gather` scheduling order; in practice the producer (first arg) is usually scheduled first and would print before sleeping. The shown ordering is plausible but not guaranteed. Left as-is since it's a minor cosmetic detail.
- `self._redis.close()` and `self._pubsub.close()` in `RedisEventBus.disconnect` work in current `redis-py` versions but `aclose()` is the preferred name in 5.x. The deprecated `close()` aliases remain functional.
