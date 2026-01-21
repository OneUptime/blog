# How to Use Redis Sorted Sets for Time-Based Expiration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sorted Sets, TTL, Data Structures, Time-Based Expiration, ZRANGEBYSCORE

Description: A comprehensive guide to implementing custom time-based expiration patterns using Redis sorted sets, including sliding windows, scheduled cleanup, and advanced TTL patterns beyond standard key expiration.

---

While Redis provides built-in key expiration with TTL, sorted sets offer more sophisticated time-based data management. Using timestamps as scores, you can implement sliding windows, scheduled deletions, time-range queries, and complex expiration patterns that standard TTL cannot achieve.

## Why Use Sorted Sets for Time-Based Expiration?

Standard Redis TTL has limitations:

- Keys expire entirely - you cannot expire individual elements
- No bulk expiration by time range
- Cannot query items by expiration time
- No sliding window patterns

Sorted sets with timestamp scores provide:

- Element-level expiration within a single key
- Range queries by time (ZRANGEBYSCORE)
- Bulk removal of expired items
- Sliding window implementations
- Custom expiration logic

## Basic Pattern: Timestamp as Score

The fundamental pattern uses Unix timestamps as scores:

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

class TimeSortedSet:
    def __init__(self, key, redis_client):
        self.key = key
        self.redis = redis_client

    def add(self, member, expires_at=None, ttl_seconds=None):
        """Add member with expiration timestamp as score"""
        if expires_at:
            score = expires_at
        elif ttl_seconds:
            score = time.time() + ttl_seconds
        else:
            score = time.time() + 3600  # Default 1 hour

        self.redis.zadd(self.key, {member: score})

    def get_active(self):
        """Get all non-expired members"""
        now = time.time()
        return self.redis.zrangebyscore(self.key, now, '+inf')

    def get_expired(self):
        """Get all expired members"""
        now = time.time()
        return self.redis.zrangebyscore(self.key, '-inf', now)

    def remove_expired(self):
        """Remove all expired members"""
        now = time.time()
        removed = self.redis.zremrangebyscore(self.key, '-inf', now)
        return removed

    def get_expiring_soon(self, within_seconds=300):
        """Get members expiring within specified seconds"""
        now = time.time()
        future = now + within_seconds
        return self.redis.zrangebyscore(self.key, now, future)

# Usage
sessions = TimeSortedSet('user:sessions', r)

# Add sessions with 30-minute TTL
sessions.add('session:abc123', ttl_seconds=1800)
sessions.add('session:def456', ttl_seconds=1800)

# Get active sessions
active = sessions.get_active()
print(f"Active sessions: {active}")

# Clean up expired sessions
removed = sessions.remove_expired()
print(f"Removed {removed} expired sessions")
```

## Implementing Sliding Windows

Sliding windows are useful for rate limiting, analytics, and recent activity tracking:

```python
import redis
import time
import json

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

class SlidingWindow:
    def __init__(self, key, window_seconds, redis_client):
        self.key = key
        self.window_seconds = window_seconds
        self.redis = redis_client

    def add(self, value):
        """Add value to sliding window"""
        now = time.time()
        # Use timestamp as both score and part of member to ensure uniqueness
        member = f"{now}:{value}"

        pipe = self.redis.pipeline()
        # Add new member
        pipe.zadd(self.key, {member: now})
        # Remove items outside window
        cutoff = now - self.window_seconds
        pipe.zremrangebyscore(self.key, '-inf', cutoff)
        pipe.execute()

    def count(self):
        """Count items in current window"""
        now = time.time()
        cutoff = now - self.window_seconds
        return self.redis.zcount(self.key, cutoff, now)

    def get_items(self):
        """Get all items in current window"""
        now = time.time()
        cutoff = now - self.window_seconds
        items = self.redis.zrangebyscore(self.key, cutoff, now)
        # Extract values from "timestamp:value" format
        return [item.split(':', 1)[1] for item in items]

# Usage: Track page views in last 5 minutes
page_views = SlidingWindow('pageviews:homepage', 300, r)

# Record page views
page_views.add('user:123')
page_views.add('user:456')
page_views.add('user:789')

# Get count in window
count = page_views.count()
print(f"Page views in last 5 minutes: {count}")
```

## Rate Limiting with Sorted Sets

Implement precise rate limiting with sorted sets:

```python
import redis
import time

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

class SortedSetRateLimiter:
    def __init__(self, redis_client):
        self.redis = redis_client

    def is_allowed(self, key, limit, window_seconds):
        """
        Check if action is allowed under rate limit.

        Returns (allowed: bool, remaining: int, retry_after: float)
        """
        now = time.time()
        window_start = now - window_seconds

        # Use pipeline for atomic operations
        pipe = self.redis.pipeline()
        # Remove old entries
        pipe.zremrangebyscore(key, '-inf', window_start)
        # Count current entries
        pipe.zcard(key)
        # Get oldest entry timestamp
        pipe.zrange(key, 0, 0, withscores=True)
        results = pipe.execute()

        current_count = results[1]
        oldest_entry = results[2]

        if current_count < limit:
            # Allowed - add this request
            self.redis.zadd(key, {f"{now}:{id(now)}": now})
            self.redis.expire(key, window_seconds)
            return True, limit - current_count - 1, 0

        # Rate limited
        if oldest_entry:
            retry_after = (oldest_entry[0][1] + window_seconds) - now
        else:
            retry_after = window_seconds

        return False, 0, retry_after

    def get_usage(self, key, window_seconds):
        """Get current usage stats"""
        now = time.time()
        window_start = now - window_seconds
        count = self.redis.zcount(key, window_start, now)
        return count

# Usage
limiter = SortedSetRateLimiter(r)

# 100 requests per minute limit
for i in range(105):
    allowed, remaining, retry_after = limiter.is_allowed(
        'rate:user:123:api',
        limit=100,
        window_seconds=60
    )

    if allowed:
        print(f"Request {i+1}: Allowed, {remaining} remaining")
    else:
        print(f"Request {i+1}: Rate limited, retry after {retry_after:.2f}s")
        break
```

## Scheduled Job Queue

Use sorted sets to implement a delayed job queue:

```python
import redis
import time
import json
import uuid
from threading import Thread

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

class ScheduledQueue:
    def __init__(self, name, redis_client):
        self.scheduled_key = f"scheduled:{name}"
        self.processing_key = f"processing:{name}"
        self.redis = redis_client

    def schedule(self, job_data, execute_at=None, delay_seconds=None):
        """Schedule a job for future execution"""
        job_id = str(uuid.uuid4())

        if execute_at:
            score = execute_at
        elif delay_seconds:
            score = time.time() + delay_seconds
        else:
            score = time.time()  # Execute immediately

        job = {
            'id': job_id,
            'data': job_data,
            'scheduled_at': time.time(),
            'execute_at': score
        }

        self.redis.zadd(self.scheduled_key, {json.dumps(job): score})
        return job_id

    def get_ready_jobs(self, batch_size=10):
        """Get jobs that are ready to execute"""
        now = time.time()

        # Atomically move ready jobs to processing
        lua_script = """
        local scheduled_key = KEYS[1]
        local processing_key = KEYS[2]
        local now = tonumber(ARGV[1])
        local batch_size = tonumber(ARGV[2])

        local jobs = redis.call('ZRANGEBYSCORE', scheduled_key, '-inf', now, 'LIMIT', 0, batch_size)

        if #jobs > 0 then
            for i, job in ipairs(jobs) do
                redis.call('ZREM', scheduled_key, job)
                redis.call('ZADD', processing_key, now, job)
            end
        end

        return jobs
        """

        jobs = self.redis.eval(
            lua_script,
            2,
            self.scheduled_key,
            self.processing_key,
            now,
            batch_size
        )

        return [json.loads(job) for job in jobs]

    def complete(self, job):
        """Mark job as complete"""
        self.redis.zrem(self.processing_key, json.dumps(job))

    def get_pending_count(self):
        """Get count of jobs waiting to be executed"""
        now = time.time()
        return self.redis.zcount(self.scheduled_key, now, '+inf')

    def get_ready_count(self):
        """Get count of jobs ready to execute"""
        now = time.time()
        return self.redis.zcount(self.scheduled_key, '-inf', now)

# Usage
queue = ScheduledQueue('emails', r)

# Schedule email to be sent in 1 hour
job_id = queue.schedule(
    {'to': 'user@example.com', 'subject': 'Reminder'},
    delay_seconds=3600
)
print(f"Scheduled job: {job_id}")

# Schedule email for specific time
from datetime import datetime, timedelta
send_time = (datetime.now() + timedelta(days=1)).timestamp()
job_id = queue.schedule(
    {'to': 'user@example.com', 'subject': 'Daily Report'},
    execute_at=send_time
)

# Worker loop to process jobs
def worker():
    queue = ScheduledQueue('emails', r)
    while True:
        jobs = queue.get_ready_jobs(batch_size=5)
        for job in jobs:
            print(f"Processing: {job['data']}")
            # Process the job...
            queue.complete(job)
        time.sleep(1)  # Poll interval
```

## Session Management with Inactivity Timeout

Implement sessions that expire after period of inactivity:

```python
import redis
import time
import json

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

class SessionManager:
    def __init__(self, inactivity_timeout=1800, redis_client=None):
        self.timeout = inactivity_timeout  # 30 minutes default
        self.sessions_key = 'sessions:active'
        self.redis = redis_client or r

    def create_session(self, session_id, user_data):
        """Create a new session"""
        now = time.time()
        expires_at = now + self.timeout

        # Store session data
        session_data = {
            'user': user_data,
            'created_at': now,
            'last_activity': now
        }
        self.redis.hset(f'session:{session_id}', mapping={
            'data': json.dumps(session_data)
        })

        # Add to sorted set for expiration tracking
        self.redis.zadd(self.sessions_key, {session_id: expires_at})

    def touch(self, session_id):
        """Update session activity timestamp"""
        now = time.time()
        expires_at = now + self.timeout

        # Check if session exists
        if not self.redis.exists(f'session:{session_id}'):
            return False

        # Update expiration in sorted set
        self.redis.zadd(self.sessions_key, {session_id: expires_at})

        # Update last activity in session data
        data = self.redis.hget(f'session:{session_id}', 'data')
        if data:
            session_data = json.loads(data)
            session_data['last_activity'] = now
            self.redis.hset(f'session:{session_id}', 'data', json.dumps(session_data))

        return True

    def get_session(self, session_id):
        """Get session if not expired"""
        now = time.time()

        # Check expiration
        score = self.redis.zscore(self.sessions_key, session_id)
        if score is None or score < now:
            return None

        # Get session data
        data = self.redis.hget(f'session:{session_id}', 'data')
        if data:
            return json.loads(data)
        return None

    def cleanup_expired(self):
        """Remove expired sessions"""
        now = time.time()

        # Get expired session IDs
        expired = self.redis.zrangebyscore(self.sessions_key, '-inf', now)

        if expired:
            pipe = self.redis.pipeline()
            # Remove from sorted set
            pipe.zremrangebyscore(self.sessions_key, '-inf', now)
            # Delete session data
            for session_id in expired:
                pipe.delete(f'session:{session_id}')
            pipe.execute()

        return len(expired)

    def get_active_count(self):
        """Get count of active sessions"""
        now = time.time()
        return self.redis.zcount(self.sessions_key, now, '+inf')

    def get_expiring_soon(self, within_seconds=300):
        """Get sessions expiring within specified time"""
        now = time.time()
        return self.redis.zrangebyscore(
            self.sessions_key,
            now,
            now + within_seconds
        )

# Usage
sm = SessionManager(inactivity_timeout=1800)  # 30 minutes

# Create session
sm.create_session('sess_abc123', {'user_id': 1, 'name': 'John'})

# User activity - extends session
sm.touch('sess_abc123')

# Get session
session = sm.get_session('sess_abc123')
print(f"Session: {session}")

# Cleanup job (run periodically)
removed = sm.cleanup_expired()
print(f"Cleaned up {removed} expired sessions")
```

## Time-Series Data with Automatic Rollup

Store time-series data with automatic old data removal:

```python
import redis
import time
from datetime import datetime

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

class TimeSeriesWithExpiration:
    def __init__(self, name, retention_seconds, redis_client):
        self.key = f"timeseries:{name}"
        self.retention = retention_seconds
        self.redis = redis_client

    def add(self, value, timestamp=None):
        """Add a data point"""
        ts = timestamp or time.time()
        member = f"{ts}:{value}"

        pipe = self.redis.pipeline()
        pipe.zadd(self.key, {member: ts})

        # Remove old data beyond retention period
        cutoff = ts - self.retention
        pipe.zremrangebyscore(self.key, '-inf', cutoff)

        pipe.execute()

    def get_range(self, start_time, end_time):
        """Get data points in time range"""
        items = self.redis.zrangebyscore(
            self.key,
            start_time,
            end_time,
            withscores=True
        )
        return [(float(item[0].split(':')[1]), item[1]) for item in items]

    def get_recent(self, seconds):
        """Get data points from last N seconds"""
        now = time.time()
        return self.get_range(now - seconds, now)

    def aggregate(self, start_time, end_time, func='avg'):
        """Aggregate values in time range"""
        items = self.get_range(start_time, end_time)

        if not items:
            return None

        values = [item[0] for item in items]

        if func == 'avg':
            return sum(values) / len(values)
        elif func == 'sum':
            return sum(values)
        elif func == 'min':
            return min(values)
        elif func == 'max':
            return max(values)
        elif func == 'count':
            return len(values)

    def downsample(self, bucket_seconds, aggregation='avg'):
        """
        Downsample data into time buckets.
        Useful for creating rollups for older data.
        """
        now = time.time()
        cutoff = now - self.retention

        items = self.redis.zrangebyscore(
            self.key,
            cutoff,
            now,
            withscores=True
        )

        if not items:
            return []

        # Group by bucket
        buckets = {}
        for item, score in items:
            bucket_start = int(score / bucket_seconds) * bucket_seconds
            value = float(item.split(':')[1])

            if bucket_start not in buckets:
                buckets[bucket_start] = []
            buckets[bucket_start].append(value)

        # Aggregate each bucket
        result = []
        for bucket_start, values in sorted(buckets.items()):
            if aggregation == 'avg':
                agg_value = sum(values) / len(values)
            elif aggregation == 'sum':
                agg_value = sum(values)
            elif aggregation == 'max':
                agg_value = max(values)
            elif aggregation == 'min':
                agg_value = min(values)
            else:
                agg_value = sum(values) / len(values)

            result.append({
                'timestamp': bucket_start,
                'value': agg_value,
                'count': len(values)
            })

        return result

# Usage
metrics = TimeSeriesWithExpiration(
    'cpu_usage',
    retention_seconds=86400,  # Keep 24 hours of data
    redis_client=r
)

# Add metrics
metrics.add(45.5)
metrics.add(52.3)
metrics.add(48.7)

# Get last hour
recent = metrics.get_recent(3600)
print(f"Recent data points: {len(recent)}")

# Get average
avg = metrics.aggregate(time.time() - 3600, time.time(), 'avg')
print(f"Average CPU usage: {avg}")

# Downsample to hourly buckets
hourly = metrics.downsample(3600, 'avg')
for bucket in hourly:
    dt = datetime.fromtimestamp(bucket['timestamp'])
    print(f"{dt}: {bucket['value']:.2f} (from {bucket['count']} samples)")
```

## Efficient Cleanup Strategies

### Background Cleanup Job

```python
import redis
import time
from threading import Thread

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

class ExpirationManager:
    def __init__(self, redis_client, cleanup_interval=60):
        self.redis = redis_client
        self.cleanup_interval = cleanup_interval
        self.registered_keys = set()
        self.running = False

    def register(self, key):
        """Register a sorted set for automatic cleanup"""
        self.registered_keys.add(key)

    def start(self):
        """Start background cleanup thread"""
        self.running = True
        thread = Thread(target=self._cleanup_loop, daemon=True)
        thread.start()

    def stop(self):
        """Stop background cleanup"""
        self.running = False

    def _cleanup_loop(self):
        while self.running:
            self._cleanup_all()
            time.sleep(self.cleanup_interval)

    def _cleanup_all(self):
        """Clean up all registered keys"""
        now = time.time()
        total_removed = 0

        for key in self.registered_keys:
            removed = self.redis.zremrangebyscore(key, '-inf', now)
            total_removed += removed

        if total_removed > 0:
            print(f"Cleanup: removed {total_removed} expired items")

# Usage
manager = ExpirationManager(r, cleanup_interval=30)
manager.register('sessions:active')
manager.register('rate_limits:*')
manager.start()
```

### Lazy Cleanup on Access

```python
def get_with_cleanup(redis_client, key, batch_size=100):
    """
    Get active items with lazy cleanup of expired ones.
    Cleans up a batch of expired items on each access.
    """
    now = time.time()

    pipe = redis_client.pipeline()
    # Remove a batch of expired items
    pipe.zremrangebyscore(key, '-inf', now)
    # Get active items
    pipe.zrangebyscore(key, now, '+inf')
    results = pipe.execute()

    return results[1]  # Return active items
```

## Best Practices

1. **Use Lua Scripts for Atomicity** - When multiple operations must be atomic
2. **Set Key Expiration** - Add overall key TTL as a safety net
3. **Batch Cleanup** - Remove expired items in batches to avoid blocking
4. **Monitor Memory** - Sorted sets consume memory; clean up regularly
5. **Use Unique Members** - Include timestamps in members to avoid collisions

```python
# Example: Combining best practices
def add_with_best_practices(redis_client, key, value, ttl_seconds):
    lua_script = """
    local key = KEYS[1]
    local value = ARGV[1]
    local expires_at = tonumber(ARGV[2])
    local key_ttl = tonumber(ARGV[3])
    local now = tonumber(ARGV[4])

    -- Add with expiration timestamp as score
    redis.call('ZADD', key, expires_at, now .. ':' .. value)

    -- Clean up some expired items (lazy cleanup)
    redis.call('ZREMRANGEBYSCORE', key, '-inf', now)

    -- Ensure key has overall TTL (safety net)
    redis.call('EXPIRE', key, key_ttl)

    return 1
    """
    now = time.time()
    expires_at = now + ttl_seconds
    key_ttl = ttl_seconds * 2  # Key lives longer than individual items

    redis_client.eval(lua_script, 1, key, value, expires_at, key_ttl, now)
```

## Conclusion

Redis sorted sets provide powerful time-based data management capabilities that go far beyond simple TTL expiration. By using timestamps as scores, you can implement:

- Sliding window analytics and rate limiting
- Scheduled job queues with precise execution times
- Session management with inactivity timeouts
- Time-series data with automatic retention
- Custom expiration patterns for complex use cases

The key is to combine sorted set operations (ZADD, ZRANGEBYSCORE, ZREMRANGEBYSCORE) with proper cleanup strategies to maintain efficient memory usage while providing flexible time-based access patterns.
