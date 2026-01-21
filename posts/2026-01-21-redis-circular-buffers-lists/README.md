# How to Implement Circular Buffers with Redis Lists

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Lists, Circular Buffer, Ring Buffer, Data Structures, Logging, Recent Activity

Description: A comprehensive guide to implementing circular buffers (ring buffers) using Redis lists, perfect for fixed-size logs, recent activity feeds, and bounded queues with automatic old item removal.

---

A circular buffer (or ring buffer) is a fixed-size data structure that overwrites old data when full. Redis lists combined with LTRIM provide an elegant way to implement circular buffers, ideal for recent activity tracking, fixed-size logs, and bounded message queues.

## Understanding Circular Buffers

A circular buffer maintains a fixed maximum size by automatically removing oldest items when new items are added beyond capacity. This is useful for:

- Recent activity feeds (last N actions)
- Fixed-size log buffers
- Sliding window of events
- Bounded message queues
- Real-time data streams with limited history

## Basic Circular Buffer Implementation

```python
import redis
import time
import json

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

class CircularBuffer:
    def __init__(self, key, max_size, redis_client):
        self.key = key
        self.max_size = max_size
        self.redis = redis_client

    def push(self, item):
        """Add item to buffer, removing oldest if at capacity"""
        pipe = self.redis.pipeline()
        # Add to left (newest)
        pipe.lpush(self.key, item)
        # Trim to max size (keeps indices 0 to max_size-1)
        pipe.ltrim(self.key, 0, self.max_size - 1)
        pipe.execute()

    def push_many(self, items):
        """Add multiple items efficiently"""
        if not items:
            return

        pipe = self.redis.pipeline()
        # Add all items (newest first)
        pipe.lpush(self.key, *reversed(items))
        # Trim to max size
        pipe.ltrim(self.key, 0, self.max_size - 1)
        pipe.execute()

    def get_all(self):
        """Get all items (newest first)"""
        return self.redis.lrange(self.key, 0, -1)

    def get_recent(self, count):
        """Get most recent N items"""
        return self.redis.lrange(self.key, 0, count - 1)

    def get_oldest(self, count):
        """Get oldest N items"""
        return self.redis.lrange(self.key, -count, -1)

    def size(self):
        """Get current buffer size"""
        return self.redis.llen(self.key)

    def clear(self):
        """Clear the buffer"""
        self.redis.delete(self.key)

# Usage
buffer = CircularBuffer('logs:app', max_size=1000, redis_client=r)

# Add log entries
buffer.push('2024-01-15 10:00:00 INFO Application started')
buffer.push('2024-01-15 10:00:01 DEBUG Processing request')
buffer.push('2024-01-15 10:00:02 INFO Request completed')

# Get recent logs
recent = buffer.get_recent(10)
for log in recent:
    print(log)

print(f"Buffer size: {buffer.size()}")
```

## Recent Activity Feed

Track user activity with a fixed-size history:

```python
import redis
import time
import json
from datetime import datetime

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

class ActivityFeed:
    def __init__(self, user_id, max_activities=100, redis_client=None):
        self.key = f"activity:{user_id}"
        self.max_size = max_activities
        self.redis = redis_client or r

    def record(self, action, details=None):
        """Record a user activity"""
        activity = {
            'action': action,
            'details': details or {},
            'timestamp': time.time(),
            'datetime': datetime.now().isoformat()
        }

        pipe = self.redis.pipeline()
        pipe.lpush(self.key, json.dumps(activity))
        pipe.ltrim(self.key, 0, self.max_size - 1)
        # Optional: set expiration on the whole feed
        pipe.expire(self.key, 86400 * 30)  # 30 days
        pipe.execute()

    def get_recent(self, count=20):
        """Get recent activities"""
        items = self.redis.lrange(self.key, 0, count - 1)
        return [json.loads(item) for item in items]

    def get_by_action(self, action, count=10):
        """Get recent activities of a specific type"""
        all_activities = self.get_recent(self.max_size)
        matching = [a for a in all_activities if a['action'] == action]
        return matching[:count]

    def get_since(self, timestamp):
        """Get activities since a timestamp"""
        all_activities = self.get_recent(self.max_size)
        return [a for a in all_activities if a['timestamp'] > timestamp]

    def summarize(self):
        """Get activity summary by action type"""
        all_activities = self.get_recent(self.max_size)
        summary = {}
        for activity in all_activities:
            action = activity['action']
            summary[action] = summary.get(action, 0) + 1
        return summary

# Usage
feed = ActivityFeed('user:12345')

# Record various activities
feed.record('login', {'ip': '192.168.1.1', 'device': 'Chrome/Windows'})
feed.record('view_page', {'page': '/dashboard'})
feed.record('create_post', {'post_id': 'abc123', 'title': 'My Post'})
feed.record('logout')

# Get recent activity
recent = feed.get_recent(10)
for activity in recent:
    print(f"{activity['datetime']}: {activity['action']}")

# Get activity summary
summary = feed.summarize()
print(f"Activity summary: {summary}")
```

## Fixed-Size Log Buffer

Implement a structured log buffer with filtering:

```python
import redis
import time
import json
import traceback
from enum import Enum

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

class LogLevel(str, Enum):
    DEBUG = 'DEBUG'
    INFO = 'INFO'
    WARNING = 'WARNING'
    ERROR = 'ERROR'
    CRITICAL = 'CRITICAL'

class LogBuffer:
    LEVEL_PRIORITY = {
        LogLevel.DEBUG: 0,
        LogLevel.INFO: 1,
        LogLevel.WARNING: 2,
        LogLevel.ERROR: 3,
        LogLevel.CRITICAL: 4
    }

    def __init__(self, name, max_entries=10000, redis_client=None):
        self.key = f"logs:{name}"
        self.max_entries = max_entries
        self.redis = redis_client or r

    def log(self, level, message, extra=None):
        """Add a log entry"""
        entry = {
            'level': level.value if isinstance(level, LogLevel) else level,
            'message': message,
            'timestamp': time.time(),
            'extra': extra or {}
        }

        pipe = self.redis.pipeline()
        pipe.lpush(self.key, json.dumps(entry))
        pipe.ltrim(self.key, 0, self.max_entries - 1)
        pipe.execute()

    def debug(self, message, **extra):
        self.log(LogLevel.DEBUG, message, extra)

    def info(self, message, **extra):
        self.log(LogLevel.INFO, message, extra)

    def warning(self, message, **extra):
        self.log(LogLevel.WARNING, message, extra)

    def error(self, message, exception=None, **extra):
        if exception:
            extra['exception'] = str(exception)
            extra['traceback'] = traceback.format_exc()
        self.log(LogLevel.ERROR, message, extra)

    def critical(self, message, **extra):
        self.log(LogLevel.CRITICAL, message, extra)

    def get_logs(self, count=100, min_level=None):
        """Get logs, optionally filtered by minimum level"""
        entries = self.redis.lrange(self.key, 0, count - 1)
        logs = [json.loads(e) for e in entries]

        if min_level:
            min_priority = self.LEVEL_PRIORITY.get(
                LogLevel(min_level) if isinstance(min_level, str) else min_level,
                0
            )
            logs = [
                log for log in logs
                if self.LEVEL_PRIORITY.get(LogLevel(log['level']), 0) >= min_priority
            ]

        return logs

    def get_errors(self, count=50):
        """Get only error and critical logs"""
        return self.get_logs(count=self.max_entries, min_level=LogLevel.ERROR)[:count]

    def search(self, query, count=100):
        """Search logs by message content"""
        all_logs = self.get_logs(self.max_entries)
        matching = [
            log for log in all_logs
            if query.lower() in log['message'].lower()
        ]
        return matching[:count]

    def tail(self, count=20):
        """Get most recent logs (like tail -f)"""
        return self.get_logs(count)

    def stats(self):
        """Get log statistics"""
        all_logs = self.get_logs(self.max_entries)
        stats = {level.value: 0 for level in LogLevel}

        for log in all_logs:
            level = log['level']
            stats[level] = stats.get(level, 0) + 1

        stats['total'] = len(all_logs)
        return stats

# Usage
logger = LogBuffer('myapp')

# Log messages
logger.info('Application started', version='1.0.0')
logger.debug('Loading configuration')
logger.info('Connected to database', host='localhost')

try:
    raise ValueError("Something went wrong")
except Exception as e:
    logger.error('Failed to process request', exception=e, request_id='abc123')

# Get recent logs
print("Recent logs:")
for log in logger.tail(5):
    print(f"[{log['level']}] {log['message']}")

# Get errors only
print("\nErrors:")
for log in logger.get_errors():
    print(f"{log['message']}: {log['extra'].get('exception', 'N/A')}")

# Get statistics
print(f"\nStats: {logger.stats()}")
```

## Event Stream Buffer

Buffer events for real-time processing with overflow handling:

```python
import redis
import time
import json
from threading import Thread, Event

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

class EventStreamBuffer:
    def __init__(self, stream_name, max_events=10000, redis_client=None):
        self.key = f"events:{stream_name}"
        self.overflow_key = f"events:{stream_name}:overflow"
        self.max_events = max_events
        self.redis = redis_client or r
        self.overflow_count = 0

    def publish(self, event_type, data):
        """Publish an event to the buffer"""
        event = {
            'type': event_type,
            'data': data,
            'timestamp': time.time(),
            'id': f"{time.time()}-{id(data)}"
        }

        # Track overflow
        current_size = self.redis.llen(self.key)

        pipe = self.redis.pipeline()
        pipe.lpush(self.key, json.dumps(event))
        pipe.ltrim(self.key, 0, self.max_events - 1)

        if current_size >= self.max_events:
            pipe.incr(self.overflow_key)

        pipe.execute()

        return event['id']

    def consume(self, count=100, timeout=0):
        """
        Consume events from the buffer.
        Returns events in chronological order (oldest first).
        """
        if timeout > 0:
            # Blocking pop for real-time consumption
            result = self.redis.brpop(self.key, timeout=timeout)
            if result:
                return [json.loads(result[1])]
            return []

        # Non-blocking batch consumption
        events = []
        for _ in range(count):
            event = self.redis.rpop(self.key)
            if event:
                events.append(json.loads(event))
            else:
                break
        return events

    def peek(self, count=10):
        """Peek at events without removing them"""
        # Get from tail (oldest)
        events = self.redis.lrange(self.key, -count, -1)
        return [json.loads(e) for e in events]

    def get_overflow_count(self):
        """Get number of events dropped due to overflow"""
        count = self.redis.get(self.overflow_key)
        return int(count) if count else 0

    def reset_overflow_counter(self):
        """Reset overflow counter"""
        self.redis.delete(self.overflow_key)

    def size(self):
        """Get current buffer size"""
        return self.redis.llen(self.key)

class EventConsumer:
    """Consumer that processes events from buffer"""

    def __init__(self, buffer, handler, batch_size=100):
        self.buffer = buffer
        self.handler = handler
        self.batch_size = batch_size
        self.stop_event = Event()
        self.processed = 0

    def start(self):
        """Start consuming events"""
        self.stop_event.clear()
        thread = Thread(target=self._consume_loop)
        thread.start()
        return thread

    def stop(self):
        """Stop consuming"""
        self.stop_event.set()

    def _consume_loop(self):
        while not self.stop_event.is_set():
            events = self.buffer.consume(
                count=self.batch_size,
                timeout=1
            )

            for event in events:
                try:
                    self.handler(event)
                    self.processed += 1
                except Exception as e:
                    print(f"Error processing event: {e}")

# Usage
buffer = EventStreamBuffer('clicks', max_events=5000)

# Publish events
buffer.publish('click', {'user_id': 123, 'element': 'button_submit'})
buffer.publish('click', {'user_id': 456, 'element': 'link_home'})
buffer.publish('pageview', {'user_id': 123, 'page': '/dashboard'})

# Consumer
def handle_event(event):
    print(f"Processing: {event['type']} - {event['data']}")

consumer = EventConsumer(buffer, handle_event)
# consumer.start()

# Check buffer stats
print(f"Buffer size: {buffer.size()}")
print(f"Overflow count: {buffer.get_overflow_count()}")
```

## Multi-Channel Chat History

Implement chat history with per-channel circular buffers:

```python
import redis
import time
import json

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

class ChatHistory:
    def __init__(self, max_messages=500, redis_client=None):
        self.max_messages = max_messages
        self.redis = redis_client or r

    def _channel_key(self, channel_id):
        return f"chat:{channel_id}:messages"

    def send_message(self, channel_id, user_id, message, message_type='text'):
        """Send a message to a channel"""
        msg = {
            'id': f"{int(time.time() * 1000)}-{user_id}",
            'user_id': user_id,
            'message': message,
            'type': message_type,
            'timestamp': time.time()
        }

        key = self._channel_key(channel_id)

        pipe = self.redis.pipeline()
        pipe.lpush(key, json.dumps(msg))
        pipe.ltrim(key, 0, self.max_messages - 1)
        pipe.execute()

        return msg['id']

    def get_history(self, channel_id, count=50, before_id=None):
        """Get message history"""
        key = self._channel_key(channel_id)
        messages = self.redis.lrange(key, 0, -1)
        messages = [json.loads(m) for m in messages]

        if before_id:
            # Find position and return messages after that
            for i, msg in enumerate(messages):
                if msg['id'] == before_id:
                    messages = messages[i + 1:]
                    break

        return messages[:count]

    def get_recent(self, channel_id, count=20):
        """Get most recent messages"""
        key = self._channel_key(channel_id)
        messages = self.redis.lrange(key, 0, count - 1)
        return [json.loads(m) for m in messages]

    def search_messages(self, channel_id, query, count=20):
        """Search messages in a channel"""
        key = self._channel_key(channel_id)
        all_messages = self.redis.lrange(key, 0, -1)
        messages = [json.loads(m) for m in all_messages]

        matching = [
            m for m in messages
            if query.lower() in m['message'].lower()
        ]
        return matching[:count]

    def delete_message(self, channel_id, message_id):
        """
        Mark message as deleted (soft delete).
        Note: True deletion from list middle is O(N).
        """
        key = self._channel_key(channel_id)
        messages = self.redis.lrange(key, 0, -1)

        for i, msg_str in enumerate(messages):
            msg = json.loads(msg_str)
            if msg['id'] == message_id:
                msg['deleted'] = True
                msg['message'] = '[deleted]'
                self.redis.lset(key, i, json.dumps(msg))
                return True
        return False

    def get_message_count(self, channel_id):
        """Get number of messages in channel"""
        return self.redis.llen(self._channel_key(channel_id))

# Usage
chat = ChatHistory(max_messages=500)

# Send messages
chat.send_message('general', 'user1', 'Hello everyone!')
chat.send_message('general', 'user2', 'Hi there!')
chat.send_message('general', 'user1', 'How are you?')

# Get recent history
history = chat.get_recent('general', count=10)
for msg in history:
    print(f"[{msg['user_id']}]: {msg['message']}")

# Search
results = chat.search_messages('general', 'hello')
print(f"Found {len(results)} messages matching 'hello'")
```

## Metrics Rolling Window

Track metrics in a rolling time window:

```python
import redis
import time
import json
import statistics

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

class MetricsBuffer:
    def __init__(self, metric_name, max_samples=1000, redis_client=None):
        self.key = f"metrics:{metric_name}"
        self.max_samples = max_samples
        self.redis = redis_client or r

    def record(self, value, tags=None):
        """Record a metric value"""
        sample = {
            'value': value,
            'timestamp': time.time(),
            'tags': tags or {}
        }

        pipe = self.redis.pipeline()
        pipe.lpush(self.key, json.dumps(sample))
        pipe.ltrim(self.key, 0, self.max_samples - 1)
        pipe.execute()

    def get_samples(self, count=None):
        """Get raw samples"""
        limit = count if count else self.max_samples
        samples = self.redis.lrange(self.key, 0, limit - 1)
        return [json.loads(s) for s in samples]

    def get_values(self, count=None):
        """Get just the values"""
        samples = self.get_samples(count)
        return [s['value'] for s in samples]

    def statistics(self, count=None):
        """Calculate statistics over samples"""
        values = self.get_values(count)

        if not values:
            return None

        return {
            'count': len(values),
            'min': min(values),
            'max': max(values),
            'mean': statistics.mean(values),
            'median': statistics.median(values),
            'stdev': statistics.stdev(values) if len(values) > 1 else 0,
            'p95': self._percentile(values, 95),
            'p99': self._percentile(values, 99)
        }

    def _percentile(self, values, percentile):
        """Calculate percentile"""
        sorted_values = sorted(values)
        index = int(len(sorted_values) * percentile / 100)
        return sorted_values[min(index, len(sorted_values) - 1)]

    def rate(self, window_seconds=60):
        """Calculate rate (samples per second) in time window"""
        samples = self.get_samples()
        now = time.time()
        cutoff = now - window_seconds

        recent = [s for s in samples if s['timestamp'] > cutoff]
        if not recent:
            return 0

        return len(recent) / window_seconds

# Usage
latency = MetricsBuffer('api_latency')

# Record latencies
import random
for _ in range(100):
    latency.record(random.uniform(10, 200), tags={'endpoint': '/api/users'})

# Get statistics
stats = latency.statistics()
print(f"Latency stats: {stats}")

# Get rate
rate = latency.rate(60)
print(f"Request rate: {rate:.2f}/s")
```

## Best Practices

### 1. Atomic Push and Trim

Always use pipeline or Lua script to ensure atomicity:

```python
# Good: Atomic operation
pipe = r.pipeline()
pipe.lpush(key, value)
pipe.ltrim(key, 0, max_size - 1)
pipe.execute()

# Better: Lua script for guaranteed atomicity
lua_script = """
redis.call('LPUSH', KEYS[1], ARGV[1])
redis.call('LTRIM', KEYS[1], 0, tonumber(ARGV[2]))
return redis.call('LLEN', KEYS[1])
"""
```

### 2. Set Key Expiration

Add TTL as a safety net:

```python
pipe = r.pipeline()
pipe.lpush(key, value)
pipe.ltrim(key, 0, max_size - 1)
pipe.expire(key, 86400)  # 24 hour expiration
pipe.execute()
```

### 3. Handle Large Buffers Efficiently

For large buffers, use pagination:

```python
def get_paginated(key, page=0, page_size=100):
    start = page * page_size
    end = start + page_size - 1
    return r.lrange(key, start, end)
```

## Conclusion

Redis lists with LTRIM provide an elegant solution for implementing circular buffers. This pattern is useful for:

- Fixed-size activity feeds
- Rolling log buffers
- Event stream processing
- Chat history
- Metrics collection

The key advantages are simplicity, atomic operations, and efficient memory usage since Redis automatically handles the ring buffer behavior with LTRIM. Just remember to always combine LPUSH with LTRIM in atomic operations to maintain buffer integrity.
