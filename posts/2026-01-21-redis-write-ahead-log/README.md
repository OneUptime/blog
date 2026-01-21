# How to Implement Redis as a Write-Ahead Log

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Write-Ahead Log, WAL, Event Sourcing, Durability, Recovery, Streams

Description: A comprehensive guide to implementing Redis as a write-ahead log for event sourcing, crash recovery, and durable event replay patterns.

---

A Write-Ahead Log (WAL) records changes before they are applied to the primary data store, enabling crash recovery and event replay. Redis Streams and Lists provide excellent primitives for implementing WAL patterns.

## Why Use Redis as a WAL?

Redis offers unique advantages for WAL implementations:

- **Low latency**: Sub-millisecond writes for high-throughput systems
- **Built-in persistence**: AOF provides durable storage
- **Consumer groups**: Native support for distributed log consumption
- **Automatic trimming**: Control log size with MAXLEN
- **Rich data model**: Store structured events with multiple fields

## Pattern 1: Basic WAL with Redis Lists

Simple WAL using Redis Lists for sequential writes:

```python
import redis
import json
import time
import uuid
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, asdict
from enum import Enum

class EventType(Enum):
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"

@dataclass
class WALEntry:
    event_id: str
    event_type: str
    entity_type: str
    entity_id: str
    data: Dict[str, Any]
    timestamp: float

    def to_json(self) -> str:
        return json.dumps(asdict(self))

    @classmethod
    def from_json(cls, json_str: str) -> 'WALEntry':
        data = json.loads(json_str)
        return cls(**data)

class RedisWAL:
    def __init__(self, redis_client: redis.Redis, wal_key: str = "wal:events"):
        self.redis = redis_client
        self.wal_key = wal_key
        self.checkpoint_key = f"{wal_key}:checkpoint"

    def append(self, event_type: EventType, entity_type: str,
               entity_id: str, data: Dict[str, Any]) -> str:
        """Append an entry to the WAL."""
        entry = WALEntry(
            event_id=str(uuid.uuid4()),
            event_type=event_type.value,
            entity_type=entity_type,
            entity_id=entity_id,
            data=data,
            timestamp=time.time()
        )

        # Append to WAL
        self.redis.rpush(self.wal_key, entry.to_json())

        return entry.event_id

    def read_from_checkpoint(self) -> List[WALEntry]:
        """Read all entries since the last checkpoint."""
        checkpoint = self.redis.get(self.checkpoint_key)
        start_index = int(checkpoint) if checkpoint else 0

        entries = self.redis.lrange(self.wal_key, start_index, -1)

        return [
            WALEntry.from_json(entry.decode() if isinstance(entry, bytes) else entry)
            for entry in entries
        ]

    def update_checkpoint(self, position: int):
        """Update the checkpoint position."""
        self.redis.set(self.checkpoint_key, position)

    def get_wal_length(self) -> int:
        """Get current WAL length."""
        return self.redis.llen(self.wal_key)

    def truncate_before_checkpoint(self):
        """Remove entries before the checkpoint."""
        checkpoint = self.redis.get(self.checkpoint_key)
        if checkpoint:
            checkpoint = int(checkpoint)
            if checkpoint > 0:
                self.redis.ltrim(self.wal_key, checkpoint, -1)
                self.redis.set(self.checkpoint_key, 0)

# Usage example
def process_with_wal():
    r = redis.Redis()
    wal = RedisWAL(r)

    # Write operations go to WAL first
    event_id = wal.append(
        EventType.CREATE,
        "user",
        "123",
        {"name": "John", "email": "john@example.com"}
    )

    print(f"Logged event: {event_id}")

    # On recovery, replay from checkpoint
    entries = wal.read_from_checkpoint()
    for entry in entries:
        print(f"Replay: {entry.event_type} {entry.entity_type}:{entry.entity_id}")
```

## Pattern 2: WAL with Redis Streams

Redis Streams provide better WAL semantics with consumer groups:

```python
import redis
import json
import time
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class StreamWALEntry:
    stream_id: str
    event_type: str
    entity_type: str
    entity_id: str
    data: Dict[str, Any]
    timestamp: str

class StreamWAL:
    def __init__(self, redis_client: redis.Redis, stream_name: str = "wal:stream"):
        self.redis = redis_client
        self.stream_name = stream_name
        self.max_len = 1000000  # Maximum WAL entries

    def append(self, event_type: str, entity_type: str,
               entity_id: str, data: Dict[str, Any]) -> str:
        """Append entry to WAL stream and return stream ID."""
        entry = {
            "event_type": event_type,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "data": json.dumps(data),
            "timestamp": str(time.time())
        }

        # XADD with MAXLEN for automatic trimming
        stream_id = self.redis.xadd(
            self.stream_name,
            entry,
            maxlen=self.max_len,
            approximate=True
        )

        return stream_id.decode() if isinstance(stream_id, bytes) else stream_id

    def read_range(self, start_id: str = "-", end_id: str = "+",
                   count: int = 1000) -> List[StreamWALEntry]:
        """Read entries from WAL within ID range."""
        entries = self.redis.xrange(
            self.stream_name,
            min=start_id,
            max=end_id,
            count=count
        )

        result = []
        for stream_id, data in entries:
            if isinstance(stream_id, bytes):
                stream_id = stream_id.decode()

            decoded_data = {
                k.decode() if isinstance(k, bytes) else k:
                v.decode() if isinstance(v, bytes) else v
                for k, v in data.items()
            }

            result.append(StreamWALEntry(
                stream_id=stream_id,
                event_type=decoded_data["event_type"],
                entity_type=decoded_data["entity_type"],
                entity_id=decoded_data["entity_id"],
                data=json.loads(decoded_data["data"]),
                timestamp=decoded_data["timestamp"]
            ))

        return result

    def read_from_id(self, last_id: str = "0-0",
                     count: int = 1000) -> List[StreamWALEntry]:
        """Read entries after a specific ID."""
        return self.read_range(f"({last_id}", "+", count)

    def get_last_id(self) -> Optional[str]:
        """Get the ID of the last entry."""
        info = self.redis.xinfo_stream(self.stream_name)
        last_entry = info.get('last-entry')
        if last_entry:
            return last_entry[0].decode() if isinstance(last_entry[0], bytes) else last_entry[0]
        return None

    def trim_before(self, min_id: str):
        """Trim entries before the specified ID."""
        self.redis.xtrim(self.stream_name, minid=min_id)
```

## Pattern 3: Durable WAL with Consumer Groups

Use consumer groups for reliable WAL processing:

```python
import redis
import json
import time
import threading
from typing import Dict, Any, List, Callable, Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class WALConsumerConfig:
    group_name: str
    consumer_name: str
    batch_size: int = 100
    block_ms: int = 5000
    max_retries: int = 3

class DurableWAL:
    def __init__(self, redis_client: redis.Redis, stream_name: str = "wal:durable"):
        self.redis = redis_client
        self.stream_name = stream_name
        self.checkpoint_hash = f"{stream_name}:checkpoints"

    def initialize_consumer_group(self, group_name: str, start_id: str = "0"):
        """Create consumer group if not exists."""
        try:
            self.redis.xgroup_create(
                self.stream_name,
                group_name,
                id=start_id,
                mkstream=True
            )
            logger.info(f"Created consumer group: {group_name}")
        except redis.ResponseError as e:
            if "BUSYGROUP" not in str(e):
                raise

    def append(self, event_type: str, entity_type: str,
               entity_id: str, data: Dict[str, Any],
               idempotency_key: Optional[str] = None) -> str:
        """Append to WAL with optional idempotency."""
        if idempotency_key:
            # Check for duplicate
            existing = self.redis.get(f"wal:idempotency:{idempotency_key}")
            if existing:
                return existing.decode()

        entry = {
            "event_type": event_type,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "data": json.dumps(data),
            "timestamp": str(time.time())
        }

        if idempotency_key:
            entry["idempotency_key"] = idempotency_key

        stream_id = self.redis.xadd(self.stream_name, entry, maxlen=1000000)
        stream_id = stream_id.decode() if isinstance(stream_id, bytes) else stream_id

        if idempotency_key:
            # Store idempotency key with TTL
            self.redis.setex(
                f"wal:idempotency:{idempotency_key}",
                86400,  # 24 hours
                stream_id
            )

        return stream_id

    def consume(self, config: WALConsumerConfig,
                processor: Callable[[Dict], bool]) -> None:
        """Consume WAL entries with acknowledgment."""
        self.initialize_consumer_group(config.group_name)

        while True:
            try:
                # Read new messages
                messages = self.redis.xreadgroup(
                    config.group_name,
                    config.consumer_name,
                    {self.stream_name: ">"},
                    count=config.batch_size,
                    block=config.block_ms
                )

                if not messages:
                    continue

                for stream, entries in messages:
                    for entry_id, data in entries:
                        entry_id = entry_id.decode() if isinstance(entry_id, bytes) else entry_id

                        decoded = {
                            k.decode() if isinstance(k, bytes) else k:
                            v.decode() if isinstance(v, bytes) else v
                            for k, v in data.items()
                        }
                        decoded["data"] = json.loads(decoded["data"])
                        decoded["_id"] = entry_id

                        try:
                            if processor(decoded):
                                # Acknowledge successful processing
                                self.redis.xack(
                                    self.stream_name,
                                    config.group_name,
                                    entry_id
                                )
                                logger.debug(f"Processed and acked: {entry_id}")
                            else:
                                logger.warning(f"Processor returned False for: {entry_id}")
                        except Exception as e:
                            logger.error(f"Error processing {entry_id}: {e}")

            except redis.RedisError as e:
                logger.error(f"Redis error: {e}")
                time.sleep(1)

    def recover_pending(self, config: WALConsumerConfig,
                       processor: Callable[[Dict], bool],
                       idle_time_ms: int = 60000) -> int:
        """Recover and reprocess pending (unacknowledged) messages."""
        recovered = 0

        while True:
            # Claim pending messages that have been idle
            pending = self.redis.xpending_range(
                self.stream_name,
                config.group_name,
                min="-",
                max="+",
                count=config.batch_size
            )

            if not pending:
                break

            for entry in pending:
                entry_id = entry["message_id"]
                if isinstance(entry_id, bytes):
                    entry_id = entry_id.decode()

                idle_time = entry.get("time_since_delivered", 0)

                if idle_time < idle_time_ms:
                    continue

                # Claim the message
                claimed = self.redis.xclaim(
                    self.stream_name,
                    config.group_name,
                    config.consumer_name,
                    min_idle_time=idle_time_ms,
                    message_ids=[entry_id]
                )

                for claimed_id, data in claimed:
                    claimed_id = claimed_id.decode() if isinstance(claimed_id, bytes) else claimed_id

                    decoded = {
                        k.decode() if isinstance(k, bytes) else k:
                        v.decode() if isinstance(v, bytes) else v
                        for k, v in data.items()
                    }
                    decoded["data"] = json.loads(decoded["data"])
                    decoded["_id"] = claimed_id

                    try:
                        if processor(decoded):
                            self.redis.xack(
                                self.stream_name,
                                config.group_name,
                                claimed_id
                            )
                            recovered += 1
                    except Exception as e:
                        logger.error(f"Error recovering {claimed_id}: {e}")

        return recovered

    def save_checkpoint(self, consumer_name: str, last_id: str):
        """Save consumer checkpoint."""
        self.redis.hset(self.checkpoint_hash, consumer_name, last_id)

    def get_checkpoint(self, consumer_name: str) -> Optional[str]:
        """Get consumer checkpoint."""
        checkpoint = self.redis.hget(self.checkpoint_hash, consumer_name)
        if checkpoint:
            return checkpoint.decode() if isinstance(checkpoint, bytes) else checkpoint
        return None
```

## Pattern 4: Event Sourcing with WAL

Implement event sourcing using Redis WAL:

```python
import redis
import json
import time
from typing import Dict, Any, List, Optional, Type
from dataclasses import dataclass, field
from abc import ABC, abstractmethod
import logging

logger = logging.getLogger(__name__)

@dataclass
class Event:
    event_id: str
    aggregate_id: str
    aggregate_type: str
    event_type: str
    data: Dict[str, Any]
    timestamp: float
    version: int

class Aggregate(ABC):
    def __init__(self, aggregate_id: str):
        self.id = aggregate_id
        self.version = 0
        self._changes: List[Event] = []

    @abstractmethod
    def apply(self, event: Event):
        """Apply event to aggregate state."""
        pass

    def load_from_history(self, events: List[Event]):
        """Rebuild aggregate state from event history."""
        for event in events:
            self.apply(event)
            self.version = event.version

class UserAggregate(Aggregate):
    def __init__(self, user_id: str):
        super().__init__(user_id)
        self.name: Optional[str] = None
        self.email: Optional[str] = None
        self.active: bool = True

    def apply(self, event: Event):
        if event.event_type == "UserCreated":
            self.name = event.data["name"]
            self.email = event.data["email"]
        elif event.event_type == "UserUpdated":
            if "name" in event.data:
                self.name = event.data["name"]
            if "email" in event.data:
                self.email = event.data["email"]
        elif event.event_type == "UserDeactivated":
            self.active = False

class EventStore:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    def _stream_key(self, aggregate_type: str, aggregate_id: str) -> str:
        return f"events:{aggregate_type}:{aggregate_id}"

    def append_events(self, aggregate_type: str, aggregate_id: str,
                      events: List[Event], expected_version: int) -> bool:
        """Append events with optimistic concurrency control."""
        stream_key = self._stream_key(aggregate_type, aggregate_id)
        version_key = f"version:{aggregate_type}:{aggregate_id}"

        # Use transaction for optimistic locking
        pipe = self.redis.pipeline(True)

        try:
            # Watch version key for changes
            pipe.watch(version_key)

            current_version = self.redis.get(version_key)
            current_version = int(current_version) if current_version else 0

            if current_version != expected_version:
                pipe.unwatch()
                raise ConcurrencyError(
                    f"Expected version {expected_version}, but found {current_version}"
                )

            pipe.multi()

            for event in events:
                entry = {
                    "event_id": event.event_id,
                    "event_type": event.event_type,
                    "data": json.dumps(event.data),
                    "timestamp": str(event.timestamp),
                    "version": str(event.version)
                }
                pipe.xadd(stream_key, entry)

            # Update version
            new_version = expected_version + len(events)
            pipe.set(version_key, new_version)

            pipe.execute()
            return True

        except redis.WatchError:
            raise ConcurrencyError("Concurrent modification detected")

    def load_events(self, aggregate_type: str,
                    aggregate_id: str) -> List[Event]:
        """Load all events for an aggregate."""
        stream_key = self._stream_key(aggregate_type, aggregate_id)
        entries = self.redis.xrange(stream_key, "-", "+")

        events = []
        for entry_id, data in entries:
            decoded = {
                k.decode() if isinstance(k, bytes) else k:
                v.decode() if isinstance(v, bytes) else v
                for k, v in data.items()
            }

            events.append(Event(
                event_id=decoded["event_id"],
                aggregate_id=aggregate_id,
                aggregate_type=aggregate_type,
                event_type=decoded["event_type"],
                data=json.loads(decoded["data"]),
                timestamp=float(decoded["timestamp"]),
                version=int(decoded["version"])
            ))

        return events

    def load_events_from_version(self, aggregate_type: str, aggregate_id: str,
                                  from_version: int) -> List[Event]:
        """Load events starting from a specific version."""
        all_events = self.load_events(aggregate_type, aggregate_id)
        return [e for e in all_events if e.version > from_version]

class ConcurrencyError(Exception):
    pass

# Repository pattern
class UserRepository:
    def __init__(self, event_store: EventStore):
        self.event_store = event_store

    def get(self, user_id: str) -> Optional[UserAggregate]:
        """Load user aggregate from event store."""
        events = self.event_store.load_events("User", user_id)

        if not events:
            return None

        user = UserAggregate(user_id)
        user.load_from_history(events)

        return user

    def save(self, user: UserAggregate, events: List[Event]) -> bool:
        """Save new events for user aggregate."""
        return self.event_store.append_events(
            "User",
            user.id,
            events,
            user.version
        )

# Usage
import uuid

def create_user(repo: UserRepository, name: str, email: str) -> str:
    user_id = str(uuid.uuid4())
    user = UserAggregate(user_id)

    event = Event(
        event_id=str(uuid.uuid4()),
        aggregate_id=user_id,
        aggregate_type="User",
        event_type="UserCreated",
        data={"name": name, "email": email},
        timestamp=time.time(),
        version=1
    )

    repo.save(user, [event])
    return user_id
```

## Pattern 5: WAL for Crash Recovery

Implement crash recovery using WAL:

```python
import redis
import json
import time
from typing import Dict, Any, Optional, Callable
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class OperationStatus(Enum):
    PENDING = "pending"
    COMMITTED = "committed"
    ROLLED_BACK = "rolled_back"

class RecoverableWAL:
    def __init__(self, redis_client: redis.Redis, wal_prefix: str = "wal"):
        self.redis = redis_client
        self.wal_prefix = wal_prefix
        self.pending_stream = f"{wal_prefix}:pending"
        self.committed_stream = f"{wal_prefix}:committed"

    def begin_operation(self, operation_id: str, operation_type: str,
                        data: Dict[str, Any]) -> str:
        """Begin a new operation by writing to WAL."""
        entry = {
            "operation_id": operation_id,
            "operation_type": operation_type,
            "data": json.dumps(data),
            "status": OperationStatus.PENDING.value,
            "started_at": str(time.time())
        }

        stream_id = self.redis.xadd(self.pending_stream, entry)
        return stream_id.decode() if isinstance(stream_id, bytes) else stream_id

    def commit_operation(self, operation_id: str, stream_id: str):
        """Mark operation as committed."""
        # Move to committed stream
        self.redis.xadd(self.committed_stream, {
            "operation_id": operation_id,
            "stream_id": stream_id,
            "committed_at": str(time.time())
        })

        # Remove from pending
        self.redis.xdel(self.pending_stream, stream_id)

    def rollback_operation(self, operation_id: str, stream_id: str,
                           reason: str = ""):
        """Mark operation as rolled back."""
        # Update status in pending stream or move to separate rollback log
        self.redis.xadd(f"{self.wal_prefix}:rollbacks", {
            "operation_id": operation_id,
            "stream_id": stream_id,
            "reason": reason,
            "rolled_back_at": str(time.time())
        })

        self.redis.xdel(self.pending_stream, stream_id)

    def get_pending_operations(self) -> list:
        """Get all pending operations for recovery."""
        entries = self.redis.xrange(self.pending_stream, "-", "+")
        result = []

        for stream_id, data in entries:
            decoded = {
                k.decode() if isinstance(k, bytes) else k:
                v.decode() if isinstance(v, bytes) else v
                for k, v in data.items()
            }
            decoded["_stream_id"] = stream_id.decode() if isinstance(stream_id, bytes) else stream_id
            decoded["data"] = json.loads(decoded["data"])
            result.append(decoded)

        return result

    def recover(self, replay_handler: Callable[[Dict], bool],
                rollback_handler: Callable[[Dict], None],
                max_age_seconds: float = 3600):
        """Recover pending operations after crash."""
        pending = self.get_pending_operations()
        current_time = time.time()

        for operation in pending:
            started_at = float(operation["started_at"])
            age = current_time - started_at
            stream_id = operation["_stream_id"]
            operation_id = operation["operation_id"]

            if age > max_age_seconds:
                # Too old, rollback
                logger.warning(f"Rolling back stale operation: {operation_id}")
                rollback_handler(operation)
                self.rollback_operation(operation_id, stream_id, "timeout")
            else:
                # Try to replay
                try:
                    if replay_handler(operation):
                        self.commit_operation(operation_id, stream_id)
                        logger.info(f"Recovered operation: {operation_id}")
                    else:
                        rollback_handler(operation)
                        self.rollback_operation(operation_id, stream_id, "replay_failed")
                except Exception as e:
                    logger.error(f"Recovery failed for {operation_id}: {e}")
                    rollback_handler(operation)
                    self.rollback_operation(operation_id, stream_id, str(e))

# Transaction wrapper
class WALTransaction:
    def __init__(self, wal: RecoverableWAL, operation_type: str):
        self.wal = wal
        self.operation_type = operation_type
        self.operation_id: Optional[str] = None
        self.stream_id: Optional[str] = None

    def __enter__(self):
        import uuid
        self.operation_id = str(uuid.uuid4())
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type is not None:
            # Exception occurred - rollback
            if self.stream_id:
                self.wal.rollback_operation(
                    self.operation_id,
                    self.stream_id,
                    str(exc_val)
                )
        return False

    def log(self, data: Dict[str, Any]):
        """Log operation data to WAL."""
        self.stream_id = self.wal.begin_operation(
            self.operation_id,
            self.operation_type,
            data
        )

    def commit(self):
        """Commit the operation."""
        if self.stream_id:
            self.wal.commit_operation(self.operation_id, self.stream_id)

# Usage example
def transfer_funds(wal: RecoverableWAL, from_account: str,
                   to_account: str, amount: float):
    with WALTransaction(wal, "transfer") as txn:
        # Log the intent
        txn.log({
            "from_account": from_account,
            "to_account": to_account,
            "amount": amount
        })

        # Perform actual operations
        # debit(from_account, amount)
        # credit(to_account, amount)

        # If successful, commit
        txn.commit()
```

## Configuring Redis for WAL Durability

Ensure Redis persistence is properly configured:

```bash
# redis.conf settings for WAL durability

# AOF persistence (recommended for WAL)
appendonly yes
appendfsync everysec  # Or 'always' for maximum durability

# RDB snapshots (additional safety)
save 900 1
save 300 10
save 60 10000
```

## Best Practices

1. **Use Streams over Lists** - Streams provide better semantics for WAL with IDs and consumer groups
2. **Enable AOF with appendfsync** - Ensures writes survive Redis restarts
3. **Implement idempotency** - Handle duplicate events during recovery
4. **Set maximum WAL size** - Use MAXLEN to prevent unbounded growth
5. **Monitor WAL lag** - Track pending operations and consumer lag
6. **Test recovery scenarios** - Regularly test crash recovery procedures
7. **Use consumer groups** - For distributed WAL processing with acknowledgments

## Conclusion

Redis provides excellent primitives for implementing write-ahead logs, especially with Redis Streams. The combination of low-latency writes, built-in persistence, and consumer groups makes it suitable for event sourcing and crash recovery patterns. Always configure appropriate persistence settings and test your recovery procedures thoroughly.
