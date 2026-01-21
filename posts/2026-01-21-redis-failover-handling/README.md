# How to Handle Redis Failover in Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Failover, High Availability, Retry Logic, Circuit Breaker, Connection Management, Resilience, Python, Node.js

Description: A comprehensive guide to handling Redis failover in applications. Learn retry strategies, connection management, circuit breakers, and resilience patterns for production deployments.

---

> When Redis fails over from master to replica, your application faces temporary disruption. Proper failover handling means the difference between a seamless transition and cascading failures. This guide covers retry logic, connection management, and resilience patterns.

Well-designed failover handling ensures your application survives Redis topology changes with minimal impact on users.

---

## Understanding Failover Scenarios

### Failover Events

```
Scenario 1: Sentinel Failover
─────────────────────────────────────────────────────────
Time 0s:    Master fails
Time 5s:    Sentinel detects failure (down-after-milliseconds)
Time 10s:   Sentinels agree on ODOWN
Time 15s:   Sentinel elects leader
Time 20s:   Leader promotes replica
Time 25s:   Application detects new master

Scenario 2: Cluster Failover
─────────────────────────────────────────────────────────
Time 0s:    Master fails
Time 5s:    Cluster detects failure (cluster-node-timeout)
Time 10s:   Replica starts failover election
Time 15s:   Replica becomes master
Time 20s:   Cluster updates slot routing

Application Impact:
- Connection errors during failover
- READONLY errors if connected to old master
- Temporary increased latency
- Possible stale reads from replicas
```

### What Your Application Sees

```python
# Connection errors
redis.exceptions.ConnectionError: Error while reading from socket

# Timeout errors
redis.exceptions.TimeoutError: Timeout reading from socket

# READONLY errors (connected to demoted master)
redis.exceptions.ReadOnlyError: READONLY You can't write against a read only replica

# MOVED errors (cluster slot migration)
redis.exceptions.MovedError: MOVED 12345 192.168.1.2:7000
```

---

## Retry Strategies

### Basic Retry with Exponential Backoff

```python
import redis
import time
import random
from functools import wraps

def retry_on_failure(
    max_retries: int = 5,
    base_delay: float = 0.1,
    max_delay: float = 10.0,
    exponential_base: float = 2,
    jitter: bool = True
):
    """
    Decorator for retrying Redis operations with exponential backoff.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_exception = None

            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)

                except (
                    redis.ConnectionError,
                    redis.TimeoutError,
                    redis.ReadOnlyError
                ) as e:
                    last_exception = e

                    if attempt < max_retries - 1:
                        # Calculate delay with exponential backoff
                        delay = min(
                            base_delay * (exponential_base ** attempt),
                            max_delay
                        )

                        # Add jitter to prevent thundering herd
                        if jitter:
                            delay = delay * (0.5 + random.random())

                        print(f"Retry {attempt + 1}/{max_retries} after {delay:.2f}s: {e}")
                        time.sleep(delay)

            raise last_exception

        return wrapper
    return decorator

# Usage
r = redis.Redis(host='localhost', password='password')

@retry_on_failure(max_retries=5)
def set_key(key, value):
    return r.set(key, value)

@retry_on_failure(max_retries=3)
def get_key(key):
    return r.get(key)
```

### Retry with Connection Refresh

```python
import redis
from redis.sentinel import Sentinel

class ResilientRedisClient:
    """Redis client with automatic retry and connection refresh"""

    def __init__(self, sentinel_hosts, master_name, password=None):
        self.sentinel = Sentinel(
            sentinel_hosts,
            socket_timeout=0.5,
            password=password
        )
        self.master_name = master_name
        self.password = password
        self._master = None
        self._refresh_connection()

    def _refresh_connection(self):
        """Get fresh connection to current master"""
        self._master = self.sentinel.master_for(
            self.master_name,
            socket_timeout=0.5,
            password=self.password
        )

    def execute_with_retry(self, command, *args, max_retries=5, **kwargs):
        """Execute command with retry and connection refresh"""
        last_exception = None

        for attempt in range(max_retries):
            try:
                return getattr(self._master, command)(*args, **kwargs)

            except redis.ReadOnlyError:
                # Connected to old master that became replica
                print("READONLY error - refreshing connection")
                self._refresh_connection()

            except redis.ConnectionError as e:
                # Connection lost - refresh and retry
                print(f"Connection error - refreshing: {e}")
                self._refresh_connection()
                last_exception = e

            except redis.TimeoutError as e:
                # Timeout - may indicate failover in progress
                print(f"Timeout - retrying: {e}")
                last_exception = e

            # Exponential backoff
            if attempt < max_retries - 1:
                time.sleep(min(0.1 * (2 ** attempt), 5))

        raise last_exception or redis.ConnectionError("Max retries exceeded")

    def set(self, key, value, **kwargs):
        return self.execute_with_retry('set', key, value, **kwargs)

    def get(self, key):
        return self.execute_with_retry('get', key)

    def delete(self, *keys):
        return self.execute_with_retry('delete', *keys)

# Usage
client = ResilientRedisClient(
    sentinel_hosts=[
        ('sentinel1', 26379),
        ('sentinel2', 26379),
        ('sentinel3', 26379)
    ],
    master_name='mymaster',
    password='password'
)

client.set('key', 'value')
value = client.get('key')
```

---

## Circuit Breaker Pattern

### Implementation

```python
import time
from enum import Enum
from threading import Lock

class CircuitState(Enum):
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, reject requests
    HALF_OPEN = "half_open"  # Testing if recovered

class CircuitBreaker:
    """
    Circuit breaker for Redis operations.
    Prevents cascading failures by failing fast when Redis is unhealthy.
    """

    def __init__(
        self,
        failure_threshold: int = 5,
        success_threshold: int = 3,
        timeout: float = 30.0
    ):
        self.failure_threshold = failure_threshold
        self.success_threshold = success_threshold
        self.timeout = timeout

        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time = None
        self.lock = Lock()

    def can_execute(self) -> bool:
        """Check if request should be allowed"""
        with self.lock:
            if self.state == CircuitState.CLOSED:
                return True

            if self.state == CircuitState.OPEN:
                # Check if timeout has passed
                if time.time() - self.last_failure_time >= self.timeout:
                    self.state = CircuitState.HALF_OPEN
                    return True
                return False

            # HALF_OPEN - allow request to test
            return True

    def record_success(self):
        """Record successful request"""
        with self.lock:
            if self.state == CircuitState.HALF_OPEN:
                self.success_count += 1
                if self.success_count >= self.success_threshold:
                    self._reset()

            self.failure_count = 0

    def record_failure(self):
        """Record failed request"""
        with self.lock:
            self.failure_count += 1
            self.last_failure_time = time.time()

            if self.state == CircuitState.HALF_OPEN:
                self._trip()

            elif self.failure_count >= self.failure_threshold:
                self._trip()

    def _trip(self):
        """Trip circuit to OPEN state"""
        self.state = CircuitState.OPEN
        self.success_count = 0

    def _reset(self):
        """Reset circuit to CLOSED state"""
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0

class CircuitBreakerError(Exception):
    """Raised when circuit is open"""
    pass

class ResilientRedisWithCircuitBreaker:
    """Redis client with circuit breaker protection"""

    def __init__(self, redis_client):
        self.redis = redis_client
        self.circuit = CircuitBreaker(
            failure_threshold=5,
            success_threshold=3,
            timeout=30.0
        )

    def execute(self, command, *args, **kwargs):
        """Execute Redis command with circuit breaker"""
        if not self.circuit.can_execute():
            raise CircuitBreakerError("Circuit is open - Redis unavailable")

        try:
            result = getattr(self.redis, command)(*args, **kwargs)
            self.circuit.record_success()
            return result

        except (redis.ConnectionError, redis.TimeoutError) as e:
            self.circuit.record_failure()
            raise

    def set(self, key, value, **kwargs):
        return self.execute('set', key, value, **kwargs)

    def get(self, key):
        return self.execute('get', key)

# Usage
r = redis.Redis(host='localhost', password='password')
client = ResilientRedisWithCircuitBreaker(r)

try:
    client.set('key', 'value')
except CircuitBreakerError:
    # Circuit is open - use fallback
    print("Redis unavailable, using fallback")
except redis.RedisError:
    # Redis error - circuit breaker will track this
    print("Redis error")
```

---

## Connection Management

### Connection Pool Configuration

```python
import redis

# Configure connection pool for resilience
pool = redis.ConnectionPool(
    host='localhost',
    port=6379,
    password='password',

    # Pool settings
    max_connections=50,

    # Timeout settings
    socket_timeout=5.0,           # Read/write timeout
    socket_connect_timeout=2.0,   # Connection timeout

    # Retry settings
    retry_on_timeout=True,
    retry_on_error=[redis.ConnectionError, redis.TimeoutError],

    # Health check
    health_check_interval=30      # Check connection health every 30s
)

r = redis.Redis(connection_pool=pool)
```

### Sentinel Connection Management

```python
from redis.sentinel import Sentinel, SentinelConnectionPool

# Configure Sentinel with resilience settings
sentinel = Sentinel(
    [
        ('sentinel1', 26379),
        ('sentinel2', 26379),
        ('sentinel3', 26379)
    ],
    socket_timeout=0.5,
    password='sentinel_password'
)

# Create connection pool for master
master_pool = SentinelConnectionPool(
    'mymaster',
    sentinel,
    password='redis_password',
    max_connections=50,
    socket_timeout=5.0,
    socket_connect_timeout=2.0
)

r = redis.Redis(connection_pool=master_pool)
```

### Node.js Connection Management

```javascript
const Redis = require('ioredis');

// Sentinel configuration with retry
const redis = new Redis({
    sentinels: [
        { host: 'sentinel1', port: 26379 },
        { host: 'sentinel2', port: 26379 },
        { host: 'sentinel3', port: 26379 }
    ],
    name: 'mymaster',
    password: 'password',

    // Retry strategy
    retryStrategy(times) {
        if (times > 10) {
            return null; // Stop retrying
        }
        const delay = Math.min(times * 100, 3000);
        return delay;
    },

    // Reconnect on certain errors
    reconnectOnError(err) {
        const targetErrors = ['READONLY', 'ECONNRESET', 'ENOTFOUND'];
        return targetErrors.some(e => err.message.includes(e));
    },

    // Timeouts
    connectTimeout: 10000,
    commandTimeout: 5000,

    // Lazy connect
    lazyConnect: true,

    // Max retries per request
    maxRetriesPerRequest: 3
});

// Event handlers
redis.on('connect', () => {
    console.log('Connected to Redis');
});

redis.on('error', (err) => {
    console.error('Redis error:', err);
});

redis.on('+switch-master', (data) => {
    console.log('Master switched:', data);
});

redis.on('reconnecting', (delay) => {
    console.log(`Reconnecting in ${delay}ms`);
});
```

---

## Handling Specific Failover Scenarios

### READONLY Error Recovery

```python
class ReadOnlyErrorHandler:
    """Handle READONLY errors during failover"""

    def __init__(self, sentinel_hosts, master_name, password):
        self.sentinel = Sentinel(sentinel_hosts, password=password)
        self.master_name = master_name
        self.password = password
        self._connection = None
        self._last_refresh = 0
        self.refresh_interval = 1.0  # Minimum seconds between refreshes

    def get_master(self):
        """Get current master connection"""
        if self._connection is None:
            self._refresh_master()
        return self._connection

    def _refresh_master(self):
        """Refresh master connection from Sentinel"""
        now = time.time()
        if now - self._last_refresh < self.refresh_interval:
            time.sleep(self.refresh_interval - (now - self._last_refresh))

        self._connection = self.sentinel.master_for(
            self.master_name,
            password=self.password
        )
        self._last_refresh = time.time()

    def execute(self, command, *args, **kwargs):
        """Execute with READONLY recovery"""
        max_retries = 5

        for attempt in range(max_retries):
            try:
                conn = self.get_master()
                return getattr(conn, command)(*args, **kwargs)

            except redis.ReadOnlyError:
                print(f"READONLY error - master changed, refreshing...")
                self._refresh_master()

            except redis.ConnectionError as e:
                print(f"Connection error: {e}")
                self._refresh_master()

            # Backoff
            time.sleep(0.1 * (2 ** attempt))

        raise redis.ConnectionError("Failed after max retries")
```

### Cluster MOVED/ASK Handling

```python
from redis.cluster import RedisCluster

# RedisCluster handles MOVED/ASK automatically
rc = RedisCluster(
    host='cluster-node',
    password='password',
    cluster_error_retry_attempts=3,  # Retry on cluster errors
    retry_on_timeout=True
)

# For more control, handle manually
from redis.cluster import ClusterDownError, MovedError, AskError

def execute_with_cluster_awareness(rc, command, *args, **kwargs):
    """Execute with cluster-aware error handling"""
    max_retries = 5

    for attempt in range(max_retries):
        try:
            return getattr(rc, command)(*args, **kwargs)

        except ClusterDownError:
            # Cluster is down - wait and retry
            print("Cluster down, waiting...")
            time.sleep(2)

        except MovedError as e:
            # Key moved to different node - refresh slots
            print(f"MOVED to {e.host}:{e.port}")
            rc.reinitialize_steps()  # Refresh slot mapping

        except AskError as e:
            # Slot migrating - retry will follow redirect
            print(f"ASK redirect to {e.host}:{e.port}")

    raise redis.ClusterError("Failed after max retries")
```

---

## Graceful Degradation

### Fallback to Local Cache

```python
from cachetools import TTLCache
import redis

class RedisWithLocalFallback:
    """Redis client with local cache fallback"""

    def __init__(self, redis_client, local_cache_size=1000, local_ttl=60):
        self.redis = redis_client
        self.local_cache = TTLCache(maxsize=local_cache_size, ttl=local_ttl)
        self.redis_available = True

    def get(self, key, fallback=None):
        """Get with local cache fallback"""
        # Try Redis first
        if self.redis_available:
            try:
                value = self.redis.get(key)
                if value:
                    self.local_cache[key] = value
                return value
            except redis.RedisError:
                self.redis_available = False

        # Fallback to local cache
        if key in self.local_cache:
            return self.local_cache[key]

        return fallback

    def set(self, key, value, ex=None):
        """Set with local cache update"""
        self.local_cache[key] = value

        if self.redis_available:
            try:
                return self.redis.set(key, value, ex=ex)
            except redis.RedisError:
                self.redis_available = False
                return False

        return False

    def check_redis_health(self):
        """Periodically check if Redis is back"""
        if not self.redis_available:
            try:
                self.redis.ping()
                self.redis_available = True
                print("Redis recovered")
            except redis.RedisError:
                pass
```

### Queue Requests During Failover

```python
import queue
import threading

class BufferedRedisClient:
    """Buffer writes during failover, replay when recovered"""

    def __init__(self, redis_client):
        self.redis = redis_client
        self.write_buffer = queue.Queue()
        self.redis_healthy = True
        self._start_health_checker()
        self._start_buffer_flusher()

    def _start_health_checker(self):
        """Background thread to check Redis health"""
        def check():
            while True:
                try:
                    self.redis.ping()
                    self.redis_healthy = True
                except redis.RedisError:
                    self.redis_healthy = False
                time.sleep(1)

        threading.Thread(target=check, daemon=True).start()

    def _start_buffer_flusher(self):
        """Background thread to flush buffered writes"""
        def flush():
            while True:
                if self.redis_healthy and not self.write_buffer.empty():
                    try:
                        cmd, args, kwargs = self.write_buffer.get_nowait()
                        getattr(self.redis, cmd)(*args, **kwargs)
                    except queue.Empty:
                        pass
                    except redis.RedisError:
                        # Re-queue on failure
                        self.write_buffer.put((cmd, args, kwargs))
                else:
                    time.sleep(0.1)

        threading.Thread(target=flush, daemon=True).start()

    def set(self, key, value, **kwargs):
        """Set with buffering"""
        if self.redis_healthy:
            try:
                return self.redis.set(key, value, **kwargs)
            except redis.RedisError:
                pass

        # Buffer for later
        self.write_buffer.put(('set', (key, value), kwargs))
        return True  # Optimistic return

    def get(self, key):
        """Get - no buffering for reads"""
        if self.redis_healthy:
            try:
                return self.redis.get(key)
            except redis.RedisError:
                pass
        return None
```

---

## Monitoring Failover

```python
from prometheus_client import Counter, Gauge, Histogram

# Metrics
redis_operations = Counter(
    'redis_operations_total',
    'Redis operations',
    ['operation', 'result']
)

redis_failover_events = Counter(
    'redis_failover_events_total',
    'Failover events detected'
)

redis_connection_state = Gauge(
    'redis_connection_state',
    'Connection state (1=connected, 0=disconnected)'
)

retry_count = Histogram(
    'redis_retry_count',
    'Number of retries per operation',
    buckets=[0, 1, 2, 3, 4, 5]
)

class MonitoredRedisClient:
    """Redis client with failover monitoring"""

    def __init__(self, redis_client):
        self.redis = redis_client
        self.connected = True

    def execute(self, command, *args, **kwargs):
        retries = 0

        while retries < 5:
            try:
                result = getattr(self.redis, command)(*args, **kwargs)

                redis_operations.labels(operation=command, result='success').inc()
                redis_connection_state.set(1)
                self.connected = True

                retry_count.observe(retries)
                return result

            except redis.ReadOnlyError:
                redis_failover_events.inc()
                retries += 1

            except redis.ConnectionError:
                redis_connection_state.set(0)
                self.connected = False
                retries += 1

        redis_operations.labels(operation=command, result='failure').inc()
        raise redis.ConnectionError("Max retries exceeded")
```

---

## Best Practices

### 1. Use Appropriate Timeouts

```python
# Short timeouts for fast-fail
socket_timeout=1.0       # 1 second for operations
socket_connect_timeout=0.5  # 500ms for connection

# Allow more time during suspected failover
# Implement adaptive timeouts
```

### 2. Always Use Connection Pools

```python
# Don't create connections per request
pool = redis.ConnectionPool(max_connections=50)
r = redis.Redis(connection_pool=pool)
```

### 3. Handle All Error Types

```python
try:
    r.set('key', 'value')
except redis.ConnectionError:
    # Network/connection issues
except redis.TimeoutError:
    # Operation timeout
except redis.ReadOnlyError:
    # Connected to replica (failover in progress)
except redis.ResponseError:
    # Redis error response
```

---

## Conclusion

Proper failover handling ensures application resilience:

- **Retry with backoff**: Handle transient failures
- **Circuit breaker**: Prevent cascading failures
- **Connection refresh**: Reconnect to new master
- **Graceful degradation**: Fallback when Redis is unavailable

Key takeaways:
- Use Sentinel-aware clients for automatic master discovery
- Implement exponential backoff with jitter
- Add circuit breakers for protection
- Monitor failover events and retry rates

---

*Need to monitor your Redis failover events? [OneUptime](https://oneuptime.com) provides comprehensive Redis monitoring with automatic failover detection, connection health tracking, and retry rate alerts.*
