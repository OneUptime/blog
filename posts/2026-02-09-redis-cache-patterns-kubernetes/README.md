# How to Implement Read-Through and Write-Through Cache Patterns with Redis on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Kubernetes, Caching

Description: Learn how to implement read-through and write-through caching patterns using Redis on Kubernetes to improve application performance and reduce database load with automatic cache population.

---

Caching strategies make the difference between responsive applications and database bottlenecks. Read-through and write-through patterns provide automatic cache management, eliminating manual cache invalidation logic scattered throughout application code. This guide demonstrates implementing these patterns with Redis on Kubernetes, building a robust caching layer that transparently handles cache misses and updates.

## Understanding Cache-Aside vs Cache-Through Patterns

Cache-aside requires applications to explicitly manage cache operations. When reading, the app checks Redis, and on miss, loads from the database and populates the cache. This creates repetitive code and inconsistent caching logic across services.

Read-through and write-through patterns centralize caching logic in a middleware layer. Read-through automatically loads data from the database on cache miss and populates Redis. Write-through writes to both Redis and the database simultaneously, keeping them synchronized. This approach reduces application complexity while ensuring cache consistency.

## Deploying Redis on Kubernetes

Start with a Redis deployment optimized for caching:

```yaml
# redis-cache.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis-cache
  namespace: cache-system
spec:
  replicas: 3
  selector:
    matchLabels:
      app: redis-cache
  template:
    metadata:
      labels:
        app: redis-cache
    spec:
      containers:
        - name: redis
          image: redis:7.2-alpine
          ports:
            - containerPort: 6379
          command:
            - redis-server
          args:
            - --maxmemory
            - 2gb
            - --maxmemory-policy
            - allkeys-lru  # Evict least recently used keys
            - --save
            - ""  # Disable persistence for pure cache
            - --appendonly
            - "no"
            - --tcp-backlog
            - "511"
            - --timeout
            - "300"
            - --tcp-keepalive
            - "300"
          resources:
            requests:
              cpu: 500m
              memory: 2Gi
            limits:
              cpu: 1000m
              memory: 3Gi
          livenessProbe:
            tcpSocket:
              port: 6379
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            exec:
              command:
                - redis-cli
                - ping
            initialDelaySeconds: 5
            periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: redis-cache
  namespace: cache-system
spec:
  selector:
    app: redis-cache
  ports:
    - port: 6379
      targetPort: 6379
  type: ClusterIP
```

Deploy Redis:

```bash
kubectl create namespace cache-system
kubectl apply -f redis-cache.yaml
```

## Implementing Read-Through Cache Middleware

Create middleware that automatically handles cache misses:

```python
# cache_middleware.py
import redis
import json
import hashlib
from typing import Callable, Any, Optional
from functools import wraps

class ReadThroughCache:
    def __init__(self, redis_host: str, redis_port: int = 6379):
        self.redis_client = redis.Redis(
            host=redis_host,
            port=redis_port,
            decode_responses=True
        )
        self.default_ttl = 3600  # 1 hour

    def cache_key(self, func_name: str, *args, **kwargs) -> str:
        """Generate deterministic cache key from function and arguments"""
        key_data = f"{func_name}:{args}:{sorted(kwargs.items())}"
        return f"cache:{hashlib.sha256(key_data.encode()).hexdigest()}"

    def read_through(self, ttl: Optional[int] = None):
        """
        Decorator for read-through caching
        On cache miss, executes function and caches result
        """
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            def wrapper(*args, **kwargs) -> Any:
                # Generate cache key
                cache_key = self.cache_key(func.__name__, *args, **kwargs)

                # Try to get from cache
                cached_value = self.redis_client.get(cache_key)

                if cached_value is not None:
                    print(f"Cache HIT for {func.__name__}")
                    return json.loads(cached_value)

                # Cache miss - execute function
                print(f"Cache MISS for {func.__name__}, loading from source")
                result = func(*args, **kwargs)

                # Populate cache with TTL
                ttl_seconds = ttl or self.default_ttl
                self.redis_client.setex(
                    cache_key,
                    ttl_seconds,
                    json.dumps(result)
                )

                return result

            return wrapper
        return decorator

    def invalidate(self, func_name: str, *args, **kwargs):
        """Manually invalidate cache entry"""
        cache_key = self.cache_key(func_name, *args, **kwargs)
        self.redis_client.delete(cache_key)

# Usage example with database access
from sqlalchemy import create_engine, text

cache = ReadThroughCache(redis_host='redis-cache.cache-system.svc.cluster.local')

@cache.read_through(ttl=600)  # Cache for 10 minutes
def get_user(user_id: int) -> dict:
    """Fetch user from database (expensive operation)"""
    engine = create_engine('postgresql://user:pass@db:5432/myapp')

    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT id, email, name FROM users WHERE id = :id"),
            {"id": user_id}
        )
        row = result.fetchone()

        if row is None:
            return None

        return {
            'id': row[0],
            'email': row[1],
            'name': row[2]
        }

# First call hits database
user = get_user(123)  # Cache MISS, loads from database

# Subsequent calls use cache
user = get_user(123)  # Cache HIT, returns immediately
```

Deploy this middleware as a library or sidecar container.

## Implementing Write-Through Cache Pattern

Write-through ensures cache and database stay synchronized:

```python
# write_through_cache.py
import redis
import json
from typing import Any, Callable
from sqlalchemy import create_engine, text

class WriteThroughCache:
    def __init__(self, redis_host: str, db_url: str):
        self.redis_client = redis.Redis(
            host=redis_host,
            port=6379,
            decode_responses=True
        )
        self.engine = create_engine(db_url)

    def write_through(self, cache_key_func: Callable):
        """
        Decorator for write-through caching
        Writes to both database and cache atomically
        """
        def decorator(func: Callable) -> Callable:
            def wrapper(*args, **kwargs) -> Any:
                # Execute database write
                result = func(*args, **kwargs)

                # Generate cache key from result
                cache_key = cache_key_func(result)

                # Write to cache with TTL
                self.redis_client.setex(
                    cache_key,
                    3600,
                    json.dumps(result)
                )

                return result

            return wrapper
        return decorator

    def update_user(self, user_id: int, email: str, name: str) -> dict:
        """Update user in database and cache"""
        with self.engine.connect() as conn:
            # Start transaction
            trans = conn.begin()

            try:
                # Update database
                conn.execute(
                    text("""
                        UPDATE users
                        SET email = :email, name = :name
                        WHERE id = :id
                    """),
                    {"id": user_id, "email": email, "name": name}
                )

                # Fetch updated record
                result = conn.execute(
                    text("SELECT id, email, name FROM users WHERE id = :id"),
                    {"id": user_id}
                )
                row = result.fetchone()
                user_data = {
                    'id': row[0],
                    'email': row[1],
                    'name': row[2]
                }

                # Commit database transaction
                trans.commit()

                # Update cache (write-through)
                cache_key = f"cache:user:{user_id}"
                self.redis_client.setex(
                    cache_key,
                    3600,
                    json.dumps(user_data)
                )

                return user_data

            except Exception as e:
                trans.rollback()
                # On failure, invalidate cache to maintain consistency
                cache_key = f"cache:user:{user_id}"
                self.redis_client.delete(cache_key)
                raise

# Usage
cache = WriteThroughCache(
    redis_host='redis-cache.cache-system.svc.cluster.local',
    db_url='postgresql://user:pass@db:5432/myapp'
)

updated_user = cache.update_user(
    user_id=123,
    email='newemail@example.com',
    name='Updated Name'
)
```

This ensures writes always update both systems, preventing stale cache data.

## Building a Cache Proxy Service

Deploy a dedicated service implementing cache patterns:

```python
# cache_proxy_service.py
from flask import Flask, request, jsonify
from read_through_cache import ReadThroughCache
from write_through_cache import WriteThroughCache
import os

app = Flask(__name__)

# Initialize caches
redis_host = os.getenv('REDIS_HOST', 'redis-cache.cache-system.svc.cluster.local')
db_url = os.getenv('DATABASE_URL')

read_cache = ReadThroughCache(redis_host=redis_host)
write_cache = WriteThroughCache(redis_host=redis_host, db_url=db_url)

@app.route('/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    """Read-through cache endpoint"""
    @read_cache.read_through(ttl=600)
    def fetch_user(uid):
        # Database fetch logic
        return {"id": uid, "email": "user@example.com", "name": "User"}

    user = fetch_user(user_id)
    return jsonify(user)

@app.route('/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    """Write-through cache endpoint"""
    data = request.json
    updated = write_cache.update_user(
        user_id=user_id,
        email=data['email'],
        name=data['name']
    )
    return jsonify(updated)

@app.route('/cache/invalidate', methods=['POST'])
def invalidate_cache():
    """Manual cache invalidation"""
    data = request.json
    pattern = data.get('pattern', '*')

    # Scan and delete matching keys
    cursor = 0
    deleted = 0
    while True:
        cursor, keys = read_cache.redis_client.scan(
            cursor=cursor,
            match=f"cache:{pattern}",
            count=100
        )
        if keys:
            read_cache.redis_client.delete(*keys)
            deleted += len(keys)
        if cursor == 0:
            break

    return jsonify({"deleted": deleted})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

Deploy the cache proxy:

```yaml
# cache-proxy.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cache-proxy
  namespace: cache-system
spec:
  replicas: 3
  selector:
    matchLabels:
      app: cache-proxy
  template:
    metadata:
      labels:
        app: cache-proxy
    spec:
      containers:
        - name: proxy
          image: your-registry/cache-proxy:latest
          ports:
            - containerPort: 8080
          env:
            - name: REDIS_HOST
              value: redis-cache.cache-system.svc.cluster.local
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: url
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
---
apiVersion: v1
kind: Service
metadata:
  name: cache-proxy
  namespace: cache-system
spec:
  selector:
    app: cache-proxy
  ports:
    - port: 8080
      targetPort: 8080
```

Applications call this proxy instead of directly accessing the database.

## Monitoring Cache Performance

Track cache hit rates and performance:

```python
# Add metrics to cache middleware
from prometheus_client import Counter, Histogram, Gauge

cache_hits = Counter('cache_hits_total', 'Total cache hits')
cache_misses = Counter('cache_misses_total', 'Total cache misses')
cache_operation_duration = Histogram(
    'cache_operation_duration_seconds',
    'Cache operation duration'
)

class MonitoredReadThroughCache(ReadThroughCache):
    def read_through(self, ttl=None):
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                with cache_operation_duration.time():
                    cache_key = self.cache_key(func.__name__, *args, **kwargs)
                    cached_value = self.redis_client.get(cache_key)

                    if cached_value is not None:
                        cache_hits.inc()
                        return json.loads(cached_value)

                    cache_misses.inc()
                    result = func(*args, **kwargs)

                    ttl_seconds = ttl or self.default_ttl
                    self.redis_client.setex(cache_key, ttl_seconds, json.dumps(result))

                    return result

            return wrapper
        return decorator
```

Visualize metrics in Grafana:

```promql
# Cache hit ratio
rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))

# P99 cache operation latency
histogram_quantile(0.99, rate(cache_operation_duration_seconds_bucket[5m]))
```

## Handling Cache Stampede

Prevent thundering herd during cache expiration:

```python
import time
import threading

class StampedeProtectedCache(ReadThroughCache):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._locks = {}
        self._locks_lock = threading.Lock()

    def read_through(self, ttl=None):
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                cache_key = self.cache_key(func.__name__, *args, **kwargs)

                # Try cache first
                cached_value = self.redis_client.get(cache_key)
                if cached_value is not None:
                    return json.loads(cached_value)

                # Acquire per-key lock
                with self._locks_lock:
                    if cache_key not in self._locks:
                        self._locks[cache_key] = threading.Lock()
                    key_lock = self._locks[cache_key]

                # Only one thread loads data
                with key_lock:
                    # Double-check cache (another thread might have loaded)
                    cached_value = self.redis_client.get(cache_key)
                    if cached_value is not None:
                        return json.loads(cached_value)

                    # Load from source
                    result = func(*args, **kwargs)

                    # Populate cache
                    ttl_seconds = ttl or self.default_ttl
                    self.redis_client.setex(
                        cache_key,
                        ttl_seconds,
                        json.dumps(result)
                    )

                    return result

            return wrapper
        return decorator
```

This ensures only one thread loads data on cache miss, preventing database overload.

## Conclusion

Read-through and write-through cache patterns eliminate manual cache management complexity while ensuring consistency between Redis and your database. By centralizing caching logic in middleware or a dedicated proxy service, you create a clean separation of concerns where application code focuses on business logic rather than cache manipulation.

The key to successful implementation is choosing appropriate TTLs based on data volatility and implementing proper monitoring to track cache performance. Combined with stampede protection and proper error handling, these patterns provide a robust caching layer that improves application performance while reducing database load by 70-90% in typical scenarios.
