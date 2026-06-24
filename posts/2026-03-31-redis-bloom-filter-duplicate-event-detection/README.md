# How to Use Redis Bloom Filters for Duplicate Event Detection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Bloom Filter, Event, Deduplication

Description: Detect and discard duplicate events in real-time event streams using Redis Bloom Filters for memory-efficient exactly-once processing guarantees.

---

Distributed event streams frequently deliver the same event multiple times due to network retries, at-least-once delivery semantics, or producer failures. Redis Bloom Filters provide a fast, memory-efficient way to detect and discard duplicate events before they reach your processing logic.

## Why Bloom Filters for Event Deduplication

- Constant-time (O(1)) membership check regardless of how many events have been seen
- Very low memory footprint - track millions of event IDs in megabytes
- Zero false negatives - a seen event is never processed twice
- Configurable false positive rate to balance memory vs. accuracy

## Setup

```bash
docker run -p 6379:6379 redis/redis-stack-server:latest
pip install redis
```

## Creating the Deduplication Filter

Size the filter based on expected event volume within the dedup window:

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def create_event_dedup_filter(stream_name: str,
                               capacity: int = 10_000_000,
                               error_rate: float = 0.0001):
    # 0.01% false positive rate - approximately 1 in 10,000 new events may be wrongly flagged as a duplicate
    filter_key = f"dedup:{stream_name}"
    try:
        r.execute_command('BF.RESERVE', filter_key, error_rate, capacity)
    except Exception:
        pass  # already exists
    return filter_key

create_event_dedup_filter("order_events")
create_event_dedup_filter("payment_events", capacity=5_000_000)
```

## Core Deduplication Logic

```python
def is_duplicate(stream_name: str, event_id: str) -> bool:
    filter_key = f"dedup:{stream_name}"
    return bool(r.execute_command('BF.EXISTS', filter_key, event_id))

def mark_processed(stream_name: str, event_id: str):
    filter_key = f"dedup:{stream_name}"
    r.execute_command('BF.ADD', filter_key, event_id)

def process_event(stream_name: str, event_id: str,
                   payload: dict, handler_fn) -> dict:
    if is_duplicate(stream_name, event_id):
        return {"status": "duplicate", "event_id": event_id}

    # Mark before processing to prevent race conditions
    mark_processed(stream_name, event_id)

    try:
        result = handler_fn(payload)
        return {"status": "processed", "event_id": event_id,
                "result": result}
    except Exception as e:
        # Note: in case of failure, the event is still marked as seen
        # Use a separate retry queue for failed events
        return {"status": "error", "event_id": event_id, "error": str(e)}
```

## Batch Event Processing

```python
def process_event_batch(stream_name: str, events: list,
                          handler_fn) -> dict:
    event_ids = [e["id"] for e in events]

    # Check all IDs in one round-trip
    filter_key = f"dedup:{stream_name}"
    results = r.execute_command('BF.MEXISTS', filter_key, *event_ids)

    new_events = []
    duplicate_ids = []

    for event, is_dup in zip(events, results):
        if is_dup:
            duplicate_ids.append(event["id"])
        else:
            new_events.append(event)

    # Mark all new events as processed
    if new_events:
        new_ids = [e["id"] for e in new_events]
        r.execute_command('BF.MADD', filter_key, *new_ids)
        for event in new_events:
            handler_fn(event["payload"])

    return {
        "processed": len(new_events),
        "duplicates": len(duplicate_ids),
        "duplicate_ids": duplicate_ids
    }
```

## Time-Windowed Deduplication

For streams where duplicates only arrive within a short window, use a rolling filter:

```python
def create_windowed_filter(stream_name: str, window_hours: int = 24):
    hour = int(time.time() // 3600)
    filter_key = f"dedup:{stream_name}:{hour}"
    try:
        r.execute_command('BF.RESERVE', filter_key, 0.001, 1_000_000)
        r.expire(filter_key, window_hours * 3600 + 3600)
    except Exception:
        pass
    return filter_key

def check_windowed_duplicate(stream_name: str, event_id: str,
                              window_hours: int = 24) -> bool:
    # Check current and previous hour buckets
    current_hour = int(time.time() // 3600)
    for h in range(window_hours):
        filter_key = f"dedup:{stream_name}:{current_hour - h}"
        if r.execute_command('BF.EXISTS', filter_key, event_id):
            return True
    return False
```

## Summary

Redis Bloom Filters provide an efficient solution for event deduplication in distributed systems. Use BF.MEXISTS to batch-check event IDs in a single round-trip, and BF.MADD to mark them as processed atomically. For high-throughput streams, time-windowed filters keep memory bounded by automatically expiring old buckets while maintaining deduplication within the delivery retry window.
