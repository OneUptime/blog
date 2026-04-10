# How to Implement Redlock in Java

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Redlock, Java, Distributed Lock, Concurrency

Description: Learn how to implement the Redlock distributed locking algorithm in Java using Redisson or a custom implementation with Jedis across multiple Redis nodes.

---

Java applications can implement Redlock using the Redisson library, which provides a battle-tested `RLock` implementation, or by building a custom implementation with Jedis. This guide covers both approaches.

## Option 1: Redisson (Recommended)

Redisson is the most popular Redis Java client with built-in Redlock support.

### Add Dependency

```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.redisson</groupId>
    <artifactId>redisson</artifactId>
    <version>3.27.0</version>
</dependency>
```

### Configure Redisson with Multiple Nodes

```java
import org.redisson.Redisson;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;
import org.redisson.config.Config;

public class RedlockConfig {
    // Create a client for a single independent Redis node
    public static RedissonClient createClient(String address) {
        Config config = new Config();
        config.useSingleServer()
            .setAddress(address);
        return Redisson.create(config);
    }
}
```

Redlock requires independent Redis instances (not a cluster). Create a separate `RedissonClient` for each node and combine them with `RedissonMultiLock`:

```java
import org.redisson.RedissonMultiLock;
import org.redisson.api.RLock;
import org.redisson.api.RedissonClient;

// Create clients for each independent Redis node
RedissonClient client1 = RedlockConfig.createClient("redis://redis1:6379");
RedissonClient client2 = RedlockConfig.createClient("redis://redis2:6379");
RedissonClient client3 = RedlockConfig.createClient("redis://redis3:6379");

RLock lock1 = client1.getLock("order:lock:42");
RLock lock2 = client2.getLock("order:lock:42");
RLock lock3 = client3.getLock("order:lock:42");

// Create a distributed lock across all nodes
RedissonMultiLock multiLock = new RedissonMultiLock(lock1, lock2, lock3);
```

### Acquire and Release the Lock

```java
import java.util.concurrent.TimeUnit;

public class OrderService {
    private final RedissonMultiLock multiLock;

    public OrderService(RedissonMultiLock multiLock) {
        this.multiLock = multiLock;
    }

    public void processOrder(long orderId) throws InterruptedException {
        boolean acquired = multiLock.tryLock(
            10,    // waitTime - max time to wait for the lock
            30,    // leaseTime - how long to hold the lock
            TimeUnit.SECONDS
        );

        if (!acquired) {
            throw new RuntimeException("Could not acquire lock for order " + orderId);
        }

        try {
            // Critical section
            performOrderProcessing(orderId);
        } finally {
            multiLock.unlock();
        }
    }

    private void performOrderProcessing(long orderId) {
        System.out.println("Processing order: " + orderId);
        // Business logic here
    }
}
```

## Option 2: Custom Jedis Implementation

For teams that prefer lower-level control:

```java
import redis.clients.jedis.Jedis;
import redis.clients.jedis.params.SetParams;

import java.util.UUID;
import java.util.List;
import java.util.ArrayList;

public class RedlockImpl {
    private final List<Jedis> nodes;
    private final int quorum;

    private static final String RELEASE_SCRIPT =
        "if redis.call('get', KEYS[1]) == ARGV[1] then " +
        "    return redis.call('del', KEYS[1]) " +
        "else " +
        "    return 0 " +
        "end";

    public RedlockImpl(List<Jedis> nodes) {
        this.nodes = nodes;
        this.quorum = nodes.size() / 2 + 1;
    }

    public String acquire(String resource, int ttlMs) {
        String token = UUID.randomUUID().toString();
        int acquired = 0;
        long start = System.currentTimeMillis();

        for (Jedis node : nodes) {
            try {
                String result = node.set(resource, token,
                    SetParams.setParams().nx().px(ttlMs));
                if ("OK".equals(result)) acquired++;
            } catch (Exception e) {
                // Node unavailable - continue
            }
        }

        long elapsed = System.currentTimeMillis() - start;
        long validityTime = ttlMs - elapsed - clockDrift(ttlMs);

        if (acquired >= quorum && validityTime > 0) {
            return token;
        }

        // Failed - release any acquired locks
        release(resource, token);
        return null;
    }

    public void release(String resource, String token) {
        for (Jedis node : nodes) {
            try {
                node.eval(RELEASE_SCRIPT, 1, resource, token);
            } catch (Exception e) {
                // Best effort release
            }
        }
    }

    private long clockDrift(int ttlMs) {
        return (long)(ttlMs * 0.01) + 2;
    }
}
```

### Using the Custom Implementation

```java
List<Jedis> nodes = List.of(
    new Jedis("redis1", 6379),
    new Jedis("redis2", 6379),
    new Jedis("redis3", 6379)
);

RedlockImpl redlock = new RedlockImpl(nodes);
String token = redlock.acquire("inventory:item:99", 30000);

if (token != null) {
    try {
        decrementInventory(99);
    } finally {
        redlock.release("inventory:item:99", token);
    }
} else {
    System.out.println("Lock not acquired, retry later");
}
```

## Summary

For Java, Redisson is the recommended Redlock implementation as it handles quorum logic, clock drift, and lock renewal internally. Use `RedissonMultiLock` with independent Redis clients (not a cluster) and always release the lock in a `finally` block. For custom implementations, ensure the release uses a Lua script that checks the token value to prevent accidental unlocking by expired lock holders.
