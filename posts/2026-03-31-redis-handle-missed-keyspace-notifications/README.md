# How to Handle Missed Keyspace Notifications in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Keyspace Notification, Reliability, Event

Description: Handle missed Redis keyspace notifications caused by subscriber downtime or network issues using reconciliation jobs and versioned state patterns.

---

Redis keyspace notifications are at-most-once: if your subscriber is down or a network partition occurs, events are permanently lost. This guide covers patterns to detect and recover from missed notifications.

## Why Notifications Get Missed

1. **Subscriber restart** - during the restart window, all events are dropped
2. **Network partition** - the Pub/Sub connection drops silently
3. **Redis restart** - Pub/Sub state is not persisted; subscriptions are lost
4. **Slow consumer** - the subscriber's buffer fills; new messages may be dropped

## Detecting Connection Loss

Most client libraries do not re-subscribe automatically after a disconnect. Add health checking:

```python
import redis
import time
import threading

class ReliableSubscriber:
    def __init__(self, redis_client, channels, handler):
        self.r = redis_client
        self.channels = channels
        self.handler = handler
        self.running = True

    def start(self):
        thread = threading.Thread(target=self._run, daemon=True)
        thread.start()

    def _run(self):
        while self.running:
            try:
                pubsub = self.r.pubsub()
                for channel in self.channels:
                    pubsub.subscribe(channel)

                # listen() blocks; connection errors break out to the except clause
                for message in pubsub.listen():
                    if message["type"] == "message":
                        self.handler(message)
            except (redis.ConnectionError, redis.TimeoutError) as e:
                print(f"Subscriber lost connection: {e}. Reconnecting in 2s...")
                time.sleep(2)
                self._reconcile()  # catch up on missed events

    def _reconcile(self):
        """Override this to scan for state changes while disconnected."""
        pass
```

## Pattern 1 - Version Counter per Key

Store a version number alongside each value. On reconnect, scan for keys whose version is newer than your last-seen version:

```python
def write_with_version(r, key, value):
    version = r.incr("version:global")
    pipe = r.pipeline()
    pipe.set(key, value)
    pipe.set(f"version:{key}", version)
    pipe.execute()
    return version

def reconcile_since(r, last_known_version):
    """Scan all version keys and process those newer than checkpoint."""
    missed = []
    cursor = 0
    while True:
        cursor, keys = r.scan(cursor, match="version:*", count=200)
        for vk in keys:
            if vk == "version:global":
                continue
            v = int(r.get(vk) or 0)
            if v > last_known_version:
                original_key = vk[len("version:"):]
                missed.append((original_key, v))
        if cursor == 0:
            break
    return sorted(missed, key=lambda x: x[1])
```

## Pattern 2 - Bounded Event Log

Maintain a capped list of recent events in Redis itself:

```python
EVENT_LOG = "events:recent"
EVENT_LOG_MAX = 5000

def log_event(r, key, operation):
    import time
    entry = f"{int(time.time())}:{operation}:{key}"
    pipe = r.pipeline()
    pipe.lpush(EVENT_LOG, entry)
    pipe.ltrim(EVENT_LOG, 0, EVENT_LOG_MAX - 1)
    pipe.execute()

def catchup_from_log(r, last_processed_ts):
    """Read the event log and reprocess events newer than checkpoint."""
    entries = r.lrange(EVENT_LOG, 0, -1)
    missed = []
    for entry in reversed(entries):  # oldest first
        ts, op, key = entry.split(":", 2)
        if int(ts) > last_processed_ts:
            missed.append({"ts": int(ts), "op": op, "key": key})
    return missed
```

## Pattern 3 - Periodic Full Reconciliation

For cache invalidation use cases, periodically compare Redis state to the downstream cache:

```python
import schedule

def full_reconcile(r, local_cache):
    cursor = 0
    redis_keys = set()
    while True:
        cursor, keys = r.scan(cursor, match="product:*", count=500)
        redis_keys.update(keys)
        if cursor == 0:
            break

    stale_local = set(local_cache.keys()) - redis_keys
    for key in stale_local:
        del local_cache[key]
        print(f"Reconciled: removed stale key {key}")

schedule.every(60).seconds.do(full_reconcile, r=r, local_cache=local_cache)
```

## Checkpointing Last-Processed Event

Store the last successfully processed event timestamp or version to narrow reconciliation scans:

```python
CHECKPOINT_KEY = "subscriber:checkpoint"

def save_checkpoint(r, version):
    r.set(CHECKPOINT_KEY, version)

def load_checkpoint(r):
    v = r.get(CHECKPOINT_KEY)
    return int(v) if v else 0
```

## Summary

Missed Redis keyspace notifications are inevitable for long-running subscribers. Combine auto-reconnect logic with at least one recovery strategy: version counters for precise change tracking, a capped event log for replay, or periodic full reconciliation for cache correctness. Always checkpoint the last-processed state so reconciliation only scans the window of missed events.
