# How to Use Redis as a Cache for Apache Flink

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Apache Flink, Caching, Streaming, Big Data

Description: Integrate Redis as a lookup cache in Apache Flink streaming jobs to enrich events with reference data without hitting your primary database on every record.

---

Apache Flink processes millions of events per second, but enriching each event with database lookups creates a bottleneck. Redis serves as a low-latency lookup cache that Flink operators query to join streaming events with reference data - user profiles, product catalogs, or configuration - at high throughput.

## Architecture

```text
Kafka Topic (raw events)
        |
    Flink Job
        |
    [Map/FlatMap Operator]
        |
   Redis Lookup (cache)
        |
   Enriched Events
        |
  Output Sink (Kafka / JDBC / File)
```

## Populating the Reference Cache in Redis

Pre-load user profiles into Redis Hashes:

```python
import redis
import json

client = redis.Redis(host="redis.internal", port=6379, decode_responses=True)

users = [
    {"id": "1", "name": "Alice", "tier": "premium", "country": "US"},
    {"id": "2", "name": "Bob", "tier": "free", "country": "CA"},
]

for user in users:
    client.hset(f"user:{user['id']}", mapping=user)
    client.expire(f"user:{user['id']}", 3600)  # 1 hour TTL

print("Cache populated")
```

## Flink RichMapFunction with Redis Lookup

Use a `RichMapFunction` to open a Redis connection per task and enrich events:

```java
import org.apache.flink.api.common.functions.RichMapFunction;
import org.apache.flink.configuration.Configuration;
import redis.clients.jedis.Jedis;
import java.util.Map;

public class UserEnrichmentFunction extends RichMapFunction<String, String> {
    private transient Jedis jedis;

    @Override
    public void open(Configuration parameters) {
        jedis = new Jedis("redis.internal", 6379);
        jedis.auth("your-redis-password");
    }

    @Override
    public String map(String event) throws Exception {
        // Parse event JSON (simplified)
        String userId = extractUserId(event);

        Map<String, String> user = jedis.hgetAll("user:" + userId);
        if (user.isEmpty()) {
            return event + ",tier=unknown";
        }
        return event + ",tier=" + user.get("tier") + ",country=" + user.get("country");
    }

    @Override
    public void close() {
        if (jedis != null) {
            jedis.close();
        }
    }

    private String extractUserId(String event) {
        // Simplified extraction
        return event.split(",")[0].split(":")[1];
    }
}
```

## PyFlink with Redis

Using PyFlink:

```python
from pyflink.datastream import StreamExecutionEnvironment
from pyflink.datastream.functions import MapFunction
import redis
import json

class RedisEnrichmentFunction(MapFunction):
    def __init__(self, redis_host, redis_port):
        self.redis_host = redis_host
        self.redis_port = redis_port
        self._client = None

    @property
    def client(self):
        if self._client is None:
            self._client = redis.Redis(
                host=self.redis_host,
                port=self.redis_port,
                decode_responses=True
            )
        return self._client

    def map(self, event):
        data = json.loads(event)
        user_id = data.get("user_id")

        user_data = self.client.hgetall(f"user:{user_id}")
        if user_data:
            data["tier"] = user_data.get("tier", "unknown")
            data["country"] = user_data.get("country", "unknown")

        return json.dumps(data)
```

## Implementing a Local Flink Cache Layer

To avoid one Redis call per event, add a local in-process cache:

```python
import time

class CachedRedisEnrichmentFunction(MapFunction):
    def __init__(self, redis_host, redis_port, local_ttl=60):
        self.redis_host = redis_host
        self.redis_port = redis_port
        self.local_ttl = local_ttl
        self._cache = {}
        self._client = None

    @property
    def client(self):
        if self._client is None:
            self._client = redis.Redis(
                host=self.redis_host,
                port=self.redis_port,
                decode_responses=True
            )
        return self._client

    def get_user(self, user_id: str) -> dict:
        cache_entry = self._cache.get(user_id)
        if cache_entry and time.time() - cache_entry["ts"] < self.local_ttl:
            return cache_entry["data"]

        data = self.client.hgetall(f"user:{user_id}")
        self._cache[user_id] = {"data": data, "ts": time.time()}
        return data

    def map(self, event):
        data = json.loads(event)
        user = self.get_user(str(data["user_id"]))
        data.update(user)
        return json.dumps(data)
```

## Monitoring Redis Cache Hit Rate

```bash
redis-cli INFO stats | grep -E "keyspace_hits|keyspace_misses"
```

Calculate hit rate:

```text
hit_rate = keyspace_hits / (keyspace_hits + keyspace_misses)
```

Aim for > 95% hit rate. If lower, increase TTL or pre-warm the cache more aggressively.

## Summary

Redis serves as a high-performance lookup cache in Flink streaming jobs, enabling fast event enrichment without database bottlenecks. Use `RichMapFunction` (Java) or custom `MapFunction` (Python) to open per-task Redis connections, and add a local in-process cache layer to reduce Redis call volume. Monitor cache hit rates to validate TTL settings keep reference data fresh for your use case.
