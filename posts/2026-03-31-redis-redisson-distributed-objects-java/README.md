# How to Use Redisson Distributed Objects in Java

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Java, Redisson

Description: Learn how to use Redisson distributed objects like RBucket, RAtomicLong, and RMap to share state across JVM instances using Redis.

---

Redisson wraps Redis data types as Java objects, making distributed state feel like working with local variables. The most commonly used distributed objects are `RBucket`, `RAtomicLong`, `RAtomicDouble`, and `RMap`.

## RBucket - Generic Object Holder

`RBucket` stores any serializable Java object:

```java
RBucket<User> bucket = client.getBucket("user:42");
bucket.set(new User("Alice", 30), Duration.ofMinutes(30));

User user = bucket.get();
System.out.println(user.getName()); // Alice

// Conditional set (only if key does not exist)
boolean created = bucket.setIfAbsent(new User("Bob", 25));
```

## RAtomicLong - Distributed Counter

```java
RAtomicLong counter = client.getAtomicLong("page:views");
counter.set(0);

long current = counter.incrementAndGet(); // 1
long updated = counter.addAndGet(5);      // 6

// Compare and set
boolean swapped = counter.compareAndSet(6, 10);
System.out.println(counter.get()); // 10
```

## RAtomicDouble - Floating Point Counter

```java
RAtomicDouble score = client.getAtomicDouble("player:score");
score.set(0.0);
score.addAndGet(1.5);
System.out.println(score.get()); // 1.5
```

## RMap - Distributed Map

`RMap` implements `java.util.concurrent.ConcurrentMap` and syncs with Redis hashes:

```java
RMap<String, String> settings = client.getMap("app:settings");
settings.put("theme", "dark");
settings.put("language", "en");

String theme = settings.get("theme");
settings.putIfAbsent("timezone", "UTC");

// Bulk fetch
Map<String, String> all = settings.readAllMap();
all.forEach((k, v) -> System.out.println(k + "=" + v));
```

## RBuckets - Batch Operations

For reading or writing multiple keys at once:

```java
RBuckets buckets = client.getBuckets();

// Set multiple keys
Map<String, Object> data = new HashMap<>();
data.put("config:host", "localhost");
data.put("config:port", "8080");
buckets.set(data);

// Get multiple keys
Map<String, Object> values = buckets.get("config:host", "config:port");
```

## TTL Management

All distributed objects support expiration:

```java
RBucket<String> token = client.getBucket("session:token:abc");
token.set("jwt-value", Duration.ofHours(1));

long ttl = token.remainTimeToLive(); // milliseconds
token.expire(Instant.now().plusSeconds(3600));
```

## Summary

Redisson distributed objects - `RBucket`, `RAtomicLong`, `RAtomicDouble`, and `RMap` - provide type-safe, Java-idiomatic access to Redis data. They handle serialization automatically and support TTL, conditional operations, and batch reads. Using these objects lets multiple JVM instances share and coordinate state without writing raw Redis commands.
