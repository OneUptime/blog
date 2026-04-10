# Redis vs Hazelcast for Distributed Caching

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Hazelcast, Distributed Cache, Comparison, In-Memory, Java

Description: Compare Redis and Hazelcast for distributed caching - covering data structures, Java integration, JCache support, and when each fits your architecture.

---

Redis and Hazelcast are both popular in-memory distributed caching solutions, but they have different heritage and design goals. Redis was born as a general-purpose in-memory data store; Hazelcast was built as an embedded Java-first distributed computing platform. Understanding their differences helps you pick the right tool for your stack.

## Redis as a Distributed Cache

Redis is a standalone server accessed over the network. Clients connect via TCP and issue commands:

```java
// Java with Jedis
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;

JedisPool pool = new JedisPool("localhost", 6379);

try (Jedis jedis = pool.getResource()) {
    jedis.setex("user:42:profile", 300, serializedProfile);
    String cached = jedis.get("user:42:profile");
}
```

Spring Boot auto-configuration with `spring-boot-starter-data-redis`:

```java
@Cacheable(value = "products", key = "#id")
public Product getProduct(Long id) {
    return productRepository.findById(id).orElseThrow();
}
```

```yaml
spring:
  data:
    redis:
      host: localhost
      port: 6379
  cache:
    type: redis
    redis:
      time-to-live: 600000  # 10 minutes
```

## Hazelcast as a Distributed Cache

Hazelcast can run embedded inside your JVM or as a separate cluster. The embedded model means no network hop for cache reads:

```java
// Embedded Hazelcast
HazelcastInstance hz = Hazelcast.newHazelcastInstance();
IMap<String, Product> cache = hz.getMap("products");

cache.put("product:42", product, 10, TimeUnit.MINUTES);
Product p = cache.get("product:42");
```

Hazelcast supports JCache (JSR-107):

```java
CachingProvider provider = Caching.getCachingProvider();
CacheManager manager = provider.getCacheManager();

MutableConfiguration<String, Product> config =
    new MutableConfiguration<String, Product>()
        .setExpiryPolicyFactory(
            CreatedExpiryPolicy.factoryOf(new Duration(MINUTES, 10)));

Cache<String, Product> cache = manager.createCache("products", config);
cache.put("product:42", product);
```

## Key Differences

| Feature | Redis | Hazelcast |
|---------|-------|-----------|
| Deployment | External server | Embedded or standalone |
| Primary language | Language-agnostic | Java-first |
| Network hop | Always (TCP) | Optional (embedded) |
| Data partitioning | Hash slots (Cluster) | Automatic partition map |
| Near-cache | Client-side (read-through) | Built-in near-cache |
| Distributed locking | Redlock / SET NX | FencedLock (CP subsystem) |
| JCache (JSR-107) | Via add-on libs | Native |
| WAN replication | Manual or Redis Cloud | Built-in WAN replication |
| Ops complexity | Low | Medium |

## Distributed Locking Comparison

Redis Redlock:

```python
import redlock

dlm = redlock.Redlock([{"host": "localhost", "port": 6379}])
lock = dlm.lock("resource:payment:42", 10000)
if lock:
    try:
        process_payment()
    finally:
        dlm.unlock(lock)
```

Hazelcast ILock:

```java
FencedLock lock = hz.getCPSubsystem().getLock("payment-42");
lock.lock();
try {
    processPayment();
} finally {
    lock.unlock();
}
```

## When to Use Redis

- Your stack is polyglot (Node.js, Python, Go, Java all connecting to the same cache).
- You want a lightweight standalone server with minimal JVM overhead.
- You need Redis-specific features: Streams, Pub/Sub, Sorted Sets, Lua scripting.

## When to Use Hazelcast

- Your application is predominantly Java and you want in-process caching.
- You need JCache compliance for portable cache annotations.
- You want near-cache to reduce network calls for hot keys.

## Summary

Redis is the better choice for polyglot environments and general-purpose caching where a lightweight external server makes sense. Hazelcast excels in Java-centric architectures where embedded in-process caching eliminates network latency and JCache compliance is required. If your team is not exclusively Java, Redis's wider ecosystem and simpler operations tip the balance decisively.
