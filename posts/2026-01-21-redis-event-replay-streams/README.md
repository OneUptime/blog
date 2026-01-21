# How to Handle Event Replay with Redis Streams

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Event Replay, Redis Streams, Event Sourcing, State Reconstruction, Reprocessing

Description: A comprehensive guide to implementing event replay with Redis Streams for rebuilding state from event history, reprocessing events, and recovering from failures.

---

Event replay is a powerful capability that allows you to rebuild state, fix bugs in event handlers, and create new projections from historical events. Redis Streams provide efficient primitives for storing and replaying events.

## Why Event Replay?

Event replay enables several critical capabilities:

- **State reconstruction**: Rebuild aggregates or projections from events
- **Bug fixes**: Reprocess events after fixing handler bugs
- **New projections**: Create new read models from existing events
- **Debugging**: Understand system behavior by replaying sequences
- **Disaster recovery**: Restore system state from event history

## Basic Event Replay

Replay events from Redis Streams:

```python
import redis
import json
import time
from typing import Dict, Any, List, Callable, Optional, Generator
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class ReplayEvent:
    stream_id: str
    event_id: str
    event_type: str
    data: Dict[str, Any]
    timestamp: float
    metadata: Dict[str, Any]

class EventReplayer:
    def __init__(self, redis_client: redis.Redis, stream_key: str):
        self.redis = redis_client
        self.stream_key = stream_key

    def replay_all(self, handler: Callable[[ReplayEvent], None],
                   batch_size: int = 100) -> int:
        """Replay all events from the stream."""
        return self.replay_from("0-0", handler, batch_size)

    def replay_from(self, start_id: str,
                    handler: Callable[[ReplayEvent], None],
                    batch_size: int = 100) -> int:
        """Replay events from a specific stream ID."""
        count = 0
        current_id = start_id

        while True:
            # Read batch of events
            entries = self.redis.xrange(
                self.stream_key,
                min=f"({current_id}" if current_id != "0-0" else "-",
                max="+",
                count=batch_size
            )

            if not entries:
                break

            for stream_id, data in entries:
                event = self._decode_event(stream_id, data)
                handler(event)
                count += 1
                current_id = event.stream_id

            logger.info(f"Replayed {count} events")

        return count

    def replay_range(self, start_id: str, end_id: str,
                     handler: Callable[[ReplayEvent], None]) -> int:
        """Replay events within a specific range."""
        count = 0

        entries = self.redis.xrange(
            self.stream_key,
            min=start_id,
            max=end_id
        )

        for stream_id, data in entries:
            event = self._decode_event(stream_id, data)
            handler(event)
            count += 1

        return count

    def replay_by_time(self, start_time: float, end_time: float,
                       handler: Callable[[ReplayEvent], None]) -> int:
        """Replay events within a time range."""
        # Convert timestamps to stream IDs
        start_id = f"{int(start_time * 1000)}-0"
        end_id = f"{int(end_time * 1000)}-9999999999"

        return self.replay_range(start_id, end_id, handler)

    def stream_events(self, start_id: str = "0-0",
                      batch_size: int = 100) -> Generator[ReplayEvent, None, None]:
        """Stream events as a generator."""
        current_id = start_id

        while True:
            entries = self.redis.xrange(
                self.stream_key,
                min=f"({current_id}" if current_id != "0-0" else "-",
                max="+",
                count=batch_size
            )

            if not entries:
                break

            for stream_id, data in entries:
                event = self._decode_event(stream_id, data)
                yield event
                current_id = event.stream_id

    def _decode_event(self, stream_id: bytes, data: Dict) -> ReplayEvent:
        """Decode event from Redis data."""
        if isinstance(stream_id, bytes):
            stream_id = stream_id.decode()

        decoded = {
            k.decode() if isinstance(k, bytes) else k:
            v.decode() if isinstance(v, bytes) else v
            for k, v in data.items()
        }

        return ReplayEvent(
            stream_id=stream_id,
            event_id=decoded.get("event_id", stream_id),
            event_type=decoded.get("event_type", "unknown"),
            data=json.loads(decoded.get("data", "{}")),
            timestamp=float(decoded.get("timestamp", 0)),
            metadata=json.loads(decoded.get("metadata", "{}"))
        )

# Usage
r = redis.Redis()
replayer = EventReplayer(r, "events:orders")

def process_event(event: ReplayEvent):
    print(f"Processing: {event.event_type} at {event.stream_id}")

# Replay all events
count = replayer.replay_all(process_event)
print(f"Replayed {count} events")

# Replay from specific point
count = replayer.replay_from("1642345678901-0", process_event)

# Replay time range
yesterday = time.time() - 86400
count = replayer.replay_by_time(yesterday, time.time(), process_event)
```

## Projection Rebuilding

Rebuild read models from event history:

```python
import redis
import json
from typing import Dict, Any, List, Callable, Optional
import logging

logger = logging.getLogger(__name__)

class ProjectionRebuilder:
    def __init__(self, redis_client: redis.Redis, stream_key: str):
        self.redis = redis_client
        self.stream_key = stream_key
        self._handlers: Dict[str, Callable] = {}

    def on_event(self, event_type: str):
        """Decorator to register event handler for projection."""
        def decorator(func: Callable):
            self._handlers[event_type] = func
            return func
        return decorator

    def rebuild(self, projection_name: str,
                clear_existing: bool = True) -> Dict[str, int]:
        """Rebuild a projection from events."""
        stats = {
            "total_events": 0,
            "processed_events": 0,
            "skipped_events": 0,
            "errors": 0
        }

        if clear_existing:
            self._clear_projection(projection_name)

        logger.info(f"Rebuilding projection: {projection_name}")

        replayer = EventReplayer(self.redis, self.stream_key)

        def process_event(event: ReplayEvent):
            stats["total_events"] += 1

            handler = self._handlers.get(event.event_type)
            if not handler:
                stats["skipped_events"] += 1
                return

            try:
                handler(event.data, projection_name)
                stats["processed_events"] += 1
            except Exception as e:
                stats["errors"] += 1
                logger.error(f"Error processing {event.event_type}: {e}")

        replayer.replay_all(process_event)

        # Store rebuild metadata
        self.redis.hset(f"projection:{projection_name}:meta", mapping={
            "rebuilt_at": time.time(),
            "total_events": stats["total_events"],
            "processed_events": stats["processed_events"]
        })

        logger.info(f"Projection rebuilt: {stats}")
        return stats

    def _clear_projection(self, projection_name: str):
        """Clear existing projection data."""
        pattern = f"projection:{projection_name}:*"
        cursor = 0

        while True:
            cursor, keys = self.redis.scan(cursor=cursor, match=pattern)
            if keys:
                self.redis.delete(*keys)
            if cursor == 0:
                break

# Example: Order Summary Projection
r = redis.Redis()
rebuilder = ProjectionRebuilder(r, "events:orders")

@rebuilder.on_event("OrderCreated")
def handle_order_created(data: Dict, projection: str):
    order_id = data["order_id"]
    r.hset(f"projection:{projection}:order:{order_id}", mapping={
        "order_id": order_id,
        "customer_id": data["customer_id"],
        "total": data["total"],
        "status": "created"
    })

    # Update customer order count
    r.hincrby(f"projection:{projection}:customer:{data['customer_id']}", "order_count", 1)
    r.hincrbyfloat(f"projection:{projection}:customer:{data['customer_id']}", "total_spent", data["total"])

@rebuilder.on_event("OrderShipped")
def handle_order_shipped(data: Dict, projection: str):
    order_id = data["order_id"]
    r.hset(f"projection:{projection}:order:{order_id}", "status", "shipped")

@rebuilder.on_event("OrderCancelled")
def handle_order_cancelled(data: Dict, projection: str):
    order_id = data["order_id"]
    r.hset(f"projection:{projection}:order:{order_id}", "status", "cancelled")

# Rebuild projection
stats = rebuilder.rebuild("order_summary")
```

## Selective Event Replay

Replay only specific event types or entities:

```python
import redis
import json
from typing import Dict, Any, List, Callable, Optional, Set
import logging

logger = logging.getLogger(__name__)

class SelectiveReplayer:
    def __init__(self, redis_client: redis.Redis, stream_key: str):
        self.redis = redis_client
        self.stream_key = stream_key

    def replay_event_types(self, event_types: Set[str],
                           handler: Callable[[ReplayEvent], None],
                           batch_size: int = 100) -> int:
        """Replay only specific event types."""
        count = 0
        current_id = "0-0"

        while True:
            entries = self.redis.xrange(
                self.stream_key,
                min=f"({current_id}" if current_id != "0-0" else "-",
                max="+",
                count=batch_size
            )

            if not entries:
                break

            for stream_id, data in entries:
                event = self._decode_event(stream_id, data)
                current_id = event.stream_id

                if event.event_type in event_types:
                    handler(event)
                    count += 1

        return count

    def replay_for_entity(self, entity_type: str, entity_id: str,
                          handler: Callable[[ReplayEvent], None]) -> int:
        """Replay events for a specific entity."""
        # If using per-entity streams
        entity_stream = f"events:{entity_type}:{entity_id}"

        if self.redis.exists(entity_stream):
            replayer = EventReplayer(self.redis, entity_stream)
            return replayer.replay_all(handler)

        # Otherwise filter from main stream
        count = 0

        for event in EventReplayer(self.redis, self.stream_key).stream_events():
            event_entity_type = event.data.get("aggregate_type") or event.metadata.get("entity_type")
            event_entity_id = event.data.get("aggregate_id") or event.data.get(f"{entity_type}_id")

            if event_entity_type == entity_type and event_entity_id == entity_id:
                handler(event)
                count += 1

        return count

    def replay_with_filter(self, filter_func: Callable[[ReplayEvent], bool],
                           handler: Callable[[ReplayEvent], None],
                           batch_size: int = 100) -> int:
        """Replay events matching custom filter."""
        count = 0

        for event in EventReplayer(self.redis, self.stream_key).stream_events(batch_size=batch_size):
            if filter_func(event):
                handler(event)
                count += 1

        return count

    def _decode_event(self, stream_id: bytes, data: Dict) -> ReplayEvent:
        if isinstance(stream_id, bytes):
            stream_id = stream_id.decode()

        decoded = {
            k.decode() if isinstance(k, bytes) else k:
            v.decode() if isinstance(v, bytes) else v
            for k, v in data.items()
        }

        return ReplayEvent(
            stream_id=stream_id,
            event_id=decoded.get("event_id", stream_id),
            event_type=decoded.get("event_type", "unknown"),
            data=json.loads(decoded.get("data", "{}")),
            timestamp=float(decoded.get("timestamp", 0)),
            metadata=json.loads(decoded.get("metadata", "{}"))
        )

# Usage
selective = SelectiveReplayer(r, "events:all")

# Replay only order events
count = selective.replay_event_types(
    {"OrderCreated", "OrderUpdated", "OrderCancelled"},
    lambda e: print(f"Order event: {e.event_type}")
)

# Replay for specific customer
count = selective.replay_for_entity(
    "customer", "cust_123",
    lambda e: print(f"Customer event: {e.event_type}")
)

# Replay with custom filter
count = selective.replay_with_filter(
    lambda e: e.data.get("total", 0) > 1000,
    lambda e: print(f"High-value event: {e}")
)
```

## Checkpoint-Based Replay

Resume replay from checkpoints:

```python
import redis
import json
import time
from typing import Dict, Any, Callable, Optional
import logging

logger = logging.getLogger(__name__)

class CheckpointedReplayer:
    def __init__(self, redis_client: redis.Redis, stream_key: str,
                 consumer_name: str):
        self.redis = redis_client
        self.stream_key = stream_key
        self.consumer_name = consumer_name
        self._checkpoint_key = f"replay:checkpoint:{consumer_name}"

    def get_checkpoint(self) -> Optional[str]:
        """Get last processed stream ID."""
        checkpoint = self.redis.get(self._checkpoint_key)
        if checkpoint:
            return checkpoint.decode()
        return None

    def save_checkpoint(self, stream_id: str):
        """Save checkpoint."""
        self.redis.set(self._checkpoint_key, stream_id)

    def clear_checkpoint(self):
        """Clear checkpoint to replay from beginning."""
        self.redis.delete(self._checkpoint_key)

    def replay_with_checkpoint(self, handler: Callable[[ReplayEvent], None],
                               batch_size: int = 100,
                               checkpoint_interval: int = 1000) -> int:
        """Replay events with automatic checkpointing."""
        start_id = self.get_checkpoint() or "0-0"
        count = 0
        last_checkpoint = 0

        logger.info(f"Starting replay from checkpoint: {start_id}")

        for event in EventReplayer(self.redis, self.stream_key).stream_events(
            start_id=start_id, batch_size=batch_size
        ):
            handler(event)
            count += 1

            # Periodic checkpoint
            if count - last_checkpoint >= checkpoint_interval:
                self.save_checkpoint(event.stream_id)
                last_checkpoint = count
                logger.info(f"Checkpoint saved at {event.stream_id}, processed {count}")

        # Final checkpoint
        if count > last_checkpoint:
            self.save_checkpoint(event.stream_id)

        return count

    def replay_resumable(self, handler: Callable[[ReplayEvent], bool],
                         batch_size: int = 100) -> int:
        """Replay with handler that can signal stop."""
        start_id = self.get_checkpoint() or "0-0"
        count = 0

        for event in EventReplayer(self.redis, self.stream_key).stream_events(
            start_id=start_id, batch_size=batch_size
        ):
            should_continue = handler(event)
            count += 1

            self.save_checkpoint(event.stream_id)

            if not should_continue:
                logger.info(f"Replay stopped by handler at {event.stream_id}")
                break

        return count

# Usage
checkpointed = CheckpointedReplayer(r, "events:all", "my-replayer")

# Clear checkpoint to replay from beginning
checkpointed.clear_checkpoint()

# Replay with automatic checkpointing
count = checkpointed.replay_with_checkpoint(
    lambda e: print(f"Processing: {e.event_type}"),
    checkpoint_interval=100
)

# If interrupted, next call resumes from checkpoint
count = checkpointed.replay_with_checkpoint(
    lambda e: print(f"Processing: {e.event_type}")
)
```

## Parallel Event Replay

Speed up replay with parallel processing:

```python
import redis
import json
from typing import Dict, Any, Callable, List
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
import multiprocessing
import logging

logger = logging.getLogger(__name__)

class ParallelReplayer:
    def __init__(self, redis_client: redis.Redis, stream_key: str,
                 num_workers: int = 4):
        self.redis = redis_client
        self.stream_key = stream_key
        self.num_workers = num_workers

    def get_stream_ranges(self) -> List[tuple]:
        """Divide stream into ranges for parallel processing."""
        # Get stream info
        info = self.redis.xinfo_stream(self.stream_key)
        first_entry = info.get("first-entry")
        last_entry = info.get("last-entry")
        length = info.get("length", 0)

        if not first_entry or not last_entry:
            return []

        first_id = first_entry[0]
        last_id = last_entry[0]

        if isinstance(first_id, bytes):
            first_id = first_id.decode()
        if isinstance(last_id, bytes):
            last_id = last_id.decode()

        # Parse timestamps from IDs
        first_ts = int(first_id.split("-")[0])
        last_ts = int(last_id.split("-")[0])

        # Create ranges
        range_size = (last_ts - first_ts) // self.num_workers
        ranges = []

        for i in range(self.num_workers):
            start_ts = first_ts + (i * range_size)
            end_ts = first_ts + ((i + 1) * range_size) if i < self.num_workers - 1 else last_ts + 1

            start_id = f"{start_ts}-0" if i == 0 else f"{start_ts}-0"
            end_id = f"{end_ts - 1}-9999999999"

            ranges.append((start_id, end_id))

        return ranges

    def replay_parallel(self, handler: Callable[[ReplayEvent], None]) -> int:
        """Replay events in parallel across workers."""
        ranges = self.get_stream_ranges()

        if not ranges:
            return 0

        total_count = 0

        def process_range(range_tuple):
            start_id, end_id = range_tuple
            count = 0

            # Create new Redis connection for thread
            r = redis.Redis()
            entries = r.xrange(self.stream_key, min=start_id, max=end_id)

            for stream_id, data in entries:
                event = self._decode_event(stream_id, data)
                handler(event)
                count += 1

            return count

        with ThreadPoolExecutor(max_workers=self.num_workers) as executor:
            results = executor.map(process_range, ranges)
            total_count = sum(results)

        return total_count

    def replay_partitioned(self, partition_key: str,
                           handler: Callable[[ReplayEvent], None]) -> int:
        """Replay events partitioned by a key."""
        # Collect events by partition
        partitions: Dict[str, List[ReplayEvent]] = {}

        for event in EventReplayer(self.redis, self.stream_key).stream_events():
            key = event.data.get(partition_key, "default")
            if key not in partitions:
                partitions[key] = []
            partitions[key].append(event)

        # Process partitions in parallel
        def process_partition(events: List[ReplayEvent]):
            for event in events:
                handler(event)
            return len(events)

        total = 0
        with ThreadPoolExecutor(max_workers=self.num_workers) as executor:
            results = executor.map(process_partition, partitions.values())
            total = sum(results)

        return total

    def _decode_event(self, stream_id: bytes, data: Dict) -> ReplayEvent:
        if isinstance(stream_id, bytes):
            stream_id = stream_id.decode()

        decoded = {
            k.decode() if isinstance(k, bytes) else k:
            v.decode() if isinstance(v, bytes) else v
            for k, v in data.items()
        }

        return ReplayEvent(
            stream_id=stream_id,
            event_id=decoded.get("event_id", stream_id),
            event_type=decoded.get("event_type", "unknown"),
            data=json.loads(decoded.get("data", "{}")),
            timestamp=float(decoded.get("timestamp", 0)),
            metadata=json.loads(decoded.get("metadata", "{}"))
        )

# Usage
parallel = ParallelReplayer(r, "events:all", num_workers=4)

# Parallel replay
count = parallel.replay_parallel(lambda e: print(f"Event: {e.event_type}"))

# Partitioned replay by customer
count = parallel.replay_partitioned(
    "customer_id",
    lambda e: print(f"Processing {e.data.get('customer_id')}: {e.event_type}")
)
```

## Event Replay Monitoring

Track replay progress and performance:

```python
import redis
import json
import time
from typing import Dict, Any, Callable
from dataclasses import dataclass, field
import logging

logger = logging.getLogger(__name__)

@dataclass
class ReplayStats:
    name: str
    started_at: float = 0
    completed_at: float = 0
    total_events: int = 0
    processed_events: int = 0
    failed_events: int = 0
    current_stream_id: str = ""
    events_per_second: float = 0
    errors: List[Dict] = field(default_factory=list)

class MonitoredReplayer:
    def __init__(self, redis_client: redis.Redis, stream_key: str,
                 replay_name: str):
        self.redis = redis_client
        self.stream_key = stream_key
        self.replay_name = replay_name
        self._stats_key = f"replay:stats:{replay_name}"
        self._stats = ReplayStats(name=replay_name)

    def replay_monitored(self, handler: Callable[[ReplayEvent], None],
                         batch_size: int = 100,
                         report_interval: int = 10) -> ReplayStats:
        """Replay with monitoring and stats collection."""
        self._stats = ReplayStats(name=self.replay_name)
        self._stats.started_at = time.time()

        last_report = time.time()
        last_count = 0

        def monitored_handler(event: ReplayEvent):
            try:
                handler(event)
                self._stats.processed_events += 1
            except Exception as e:
                self._stats.failed_events += 1
                self._stats.errors.append({
                    "stream_id": event.stream_id,
                    "event_type": event.event_type,
                    "error": str(e)
                })

            self._stats.total_events += 1
            self._stats.current_stream_id = event.stream_id

            # Periodic reporting
            nonlocal last_report, last_count
            now = time.time()
            if now - last_report >= report_interval:
                elapsed = now - last_report
                events_processed = self._stats.total_events - last_count
                self._stats.events_per_second = events_processed / elapsed

                self._save_stats()
                self._log_progress()

                last_report = now
                last_count = self._stats.total_events

        replayer = EventReplayer(self.redis, self.stream_key)
        replayer.replay_all(monitored_handler, batch_size)

        self._stats.completed_at = time.time()
        self._save_stats()
        self._log_final()

        return self._stats

    def _save_stats(self):
        """Save current stats to Redis."""
        stats_dict = {
            "name": self._stats.name,
            "started_at": self._stats.started_at,
            "total_events": self._stats.total_events,
            "processed_events": self._stats.processed_events,
            "failed_events": self._stats.failed_events,
            "current_stream_id": self._stats.current_stream_id,
            "events_per_second": self._stats.events_per_second,
            "updated_at": time.time()
        }

        self.redis.hset(self._stats_key, mapping={
            k: json.dumps(v) if isinstance(v, (dict, list)) else str(v)
            for k, v in stats_dict.items()
        })

    def _log_progress(self):
        """Log replay progress."""
        logger.info(
            f"Replay '{self._stats.name}': "
            f"{self._stats.total_events} events, "
            f"{self._stats.events_per_second:.1f}/s, "
            f"at {self._stats.current_stream_id}"
        )

    def _log_final(self):
        """Log final stats."""
        duration = self._stats.completed_at - self._stats.started_at
        avg_rate = self._stats.total_events / duration if duration > 0 else 0

        logger.info(
            f"Replay '{self._stats.name}' completed: "
            f"{self._stats.processed_events}/{self._stats.total_events} events, "
            f"{self._stats.failed_events} failures, "
            f"{duration:.1f}s, {avg_rate:.1f} events/s"
        )

    def get_stats(self) -> Optional[Dict]:
        """Get current replay stats."""
        data = self.redis.hgetall(self._stats_key)
        if data:
            return {
                k.decode(): v.decode()
                for k, v in data.items()
            }
        return None

# Usage
monitored = MonitoredReplayer(r, "events:all", "rebuild-projections")

stats = monitored.replay_monitored(
    lambda e: process_event(e),
    batch_size=100,
    report_interval=5
)

print(f"Final stats: {stats}")
```

## Best Practices

1. **Use checkpoints** - Enable resumable replay after failures
2. **Monitor progress** - Track replay speed and errors
3. **Implement idempotent handlers** - Same event may be replayed multiple times
4. **Test replay regularly** - Ensure handlers work correctly with historical events
5. **Consider parallelization** - Speed up large replays with multiple workers
6. **Validate results** - Verify projection state after replay
7. **Preserve original timestamps** - Use event timestamp, not replay time

## Conclusion

Event replay is a fundamental capability of event-sourced systems. Redis Streams provide efficient storage and retrieval for implementing replay functionality. Use checkpoints for reliability, monitoring for visibility, and parallelization for performance when rebuilding projections or reprocessing historical events.
