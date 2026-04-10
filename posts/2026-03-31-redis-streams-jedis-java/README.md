# How to Use Redis Streams with Jedis in Java

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Java, Jedis, Stream, Consumer Group

Description: Learn how to produce and consume Redis Streams in Java using Jedis, including consumer groups for scalable, fault-tolerant message processing.

---

Redis Streams provide a persistent message log with consumer group support. Unlike Pub/Sub, messages are durable and can be replayed. This guide covers producing and consuming streams with Jedis in Java.

## Producing Messages (XADD)

```java
import redis.clients.jedis.JedisPooled;
import redis.clients.jedis.StreamEntryID;
import redis.clients.jedis.params.XAddParams;

JedisPooled jedis = new JedisPooled("localhost", 6379);

Map<String, String> fields = new HashMap<>();
fields.put("orderId", "ORD-001");
fields.put("userId", "42");
fields.put("amount", "99.99");
fields.put("status", "pending");

StreamEntryID id = jedis.xadd("orders", XAddParams.xAddParams(), fields);
System.out.println("Added entry: " + id);
```

For auto-generated IDs:

```java
StreamEntryID id = jedis.xadd("orders", StreamEntryID.NEW_ENTRY, fields);
```

## Reading the Stream (XREAD)

```java
import redis.clients.jedis.params.XReadParams;
import redis.clients.jedis.resps.StreamEntry;

Map<String, StreamEntryID> streamOffsets = new HashMap<>();
streamOffsets.put("orders", StreamEntryID.XREAD_NEW_ENTRY); // read new messages

List<Map.Entry<String, List<StreamEntry>>> result = jedis.xread(
    XReadParams.xReadParams().count(10).block(5000),
    streamOffsets
);

if (result != null) {
    for (Map.Entry<String, List<StreamEntry>> streamResult : result) {
        for (StreamEntry entry : streamResult.getValue()) {
            System.out.println("ID: " + entry.getID());
            System.out.println("Fields: " + entry.getFields());
        }
    }
}
```

## Creating a Consumer Group

```java
try {
    jedis.xgroupCreate("orders", "processors", StreamEntryID.XGROUP_LAST_ENTRY, true);
    System.out.println("Consumer group created");
} catch (Exception e) {
    if (!e.getMessage().contains("BUSYGROUP")) throw new RuntimeException(e);
    System.out.println("Consumer group already exists");
}
```

## Reading as a Consumer Group Member

```java
import redis.clients.jedis.params.XReadGroupParams;

Map<String, StreamEntryID> groupOffsets = new HashMap<>();
groupOffsets.put("orders", StreamEntryID.XREADGROUP_UNDELIVERED_ENTRY); // ">" = undelivered

List<Map.Entry<String, List<StreamEntry>>> messages = jedis.xreadGroup(
    "processors",
    "worker-1",
    XReadGroupParams.xReadGroupParams().count(5).block(3000),
    groupOffsets
);

if (messages != null) {
    for (Map.Entry<String, List<StreamEntry>> stream : messages) {
        for (StreamEntry entry : stream.getValue()) {
            System.out.println("Processing: " + entry.getFields());

            // Acknowledge after processing
            jedis.xack("orders", "processors", entry.getID());
        }
    }
}
```

## Checking Pending Messages

```java
import redis.clients.jedis.resps.StreamPendingSummary;

StreamPendingSummary pending = jedis.xpending("orders", "processors");
System.out.println("Pending messages: " + pending.getTotal());
System.out.println("Min ID: " + pending.getMinId());
System.out.println("Max ID: " + pending.getMaxId());
```

## Claiming Stale Messages

```java
import redis.clients.jedis.params.XAutoClaimParams;

Map.Entry<StreamEntryID, List<StreamEntry>> claimed = jedis.xautoclaim(
    "orders",
    "processors",
    "worker-1",
    60000,                    // idle time threshold in ms
    new StreamEntryID(),      // start from beginning ("0-0")
    XAutoClaimParams.xAutoClaimParams().count(10)
);

for (StreamEntry entry : claimed.getValue()) {
    System.out.println("Reclaimed: " + entry.getID());
    jedis.xack("orders", "processors", entry.getID());
}
```

## Trimming the Stream

```java
// Keep last 10,000 entries
jedis.xtrim("orders", 10000, false);
```

## Summary

Redis Streams with Jedis provide durable, ordered message processing in Java. Use `xadd` to produce entries and `xreadGroup` to consume with consumer groups, ensuring at-least-once delivery. After processing each message, call `xack` to remove it from the Pending Entry List. Stale unacknowledged messages can be reclaimed with `xautoclaim`, enabling fault-tolerant processing across worker restarts.
