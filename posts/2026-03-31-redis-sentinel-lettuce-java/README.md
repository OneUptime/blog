# How to Use Redis Sentinel with Lettuce in Java

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Java, Lettuce, Sentinel, High Availability

Description: Learn how to connect to Redis Sentinel from Java using Lettuce to enable automatic failover and high availability in production environments.

---

Redis Sentinel provides high availability by monitoring Redis primary and replica nodes, and automatically promoting a replica to primary when the primary fails. Lettuce has native Sentinel support that handles failover transparently.

## How Sentinel Works

```text
Client --> Sentinel (discovers primary) --> Redis Primary
                |                              |
                +-- monitors --> Redis Replica (promoted on failover)
```

The client connects to Sentinel nodes to discover the current primary. On failover, Lettuce automatically reconnects to the new primary.

## Maven Dependency

```xml
<dependency>
  <groupId>io.lettuce</groupId>
  <artifactId>lettuce-core</artifactId>
  <version>6.3.2.RELEASE</version>
</dependency>
```

## Connecting via Sentinel

```java
import io.lettuce.core.RedisClient;
import io.lettuce.core.RedisURI;
import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.api.sync.RedisCommands;

RedisURI sentinelUri = RedisURI.builder()
    .withSentinel("sentinel1.example.com", 26379)
    .withSentinel("sentinel2.example.com", 26379)
    .withSentinel("sentinel3.example.com", 26379)
    .withSentinelMasterId("mymaster") // name of the master in Sentinel config
    .build();

RedisClient client = RedisClient.create(sentinelUri);
StatefulRedisConnection<String, String> connection = client.connect();
RedisCommands<String, String> commands = connection.sync();

System.out.println(commands.ping()); // PONG
commands.set("key", "value");
```

## Sentinel with Password Authentication

If your Redis primary requires a password:

```java
RedisURI sentinelUri = RedisURI.builder()
    .withSentinel("sentinel1", 26379)
    .withSentinel("sentinel2", 26379)
    .withSentinelMasterId("mymaster")
    .withPassword("redis-password".toCharArray())
    .build();
```

If Sentinels themselves require authentication (Redis 6.2+):

```java
RedisURI sentinelUri = RedisURI.builder()
    .withSentinel("sentinel1", 26379, "sentinel-password")
    .withSentinelMasterId("mymaster")
    .withPassword("redis-password".toCharArray())
    .build();
```

## Read from Replicas

Offload read traffic to replicas using `MasterReplica`:

```java
import io.lettuce.core.ReadFrom;
import io.lettuce.core.codec.StringCodec;
import io.lettuce.core.masterreplica.MasterReplica;
import io.lettuce.core.masterreplica.StatefulRedisMasterReplicaConnection;

StatefulRedisMasterReplicaConnection<String, String> replicaConn =
    MasterReplica.connect(client, StringCodec.UTF8, sentinelUri);

replicaConn.setReadFrom(ReadFrom.REPLICA_PREFERRED);

RedisCommands<String, String> cmds = replicaConn.sync();
String val = cmds.get("key"); // reads from replica if available
```

## Async Sentinel API

```java
import io.lettuce.core.api.async.RedisAsyncCommands;

RedisAsyncCommands<String, String> async = connection.async();

async.set("order:1", "shipped")
    .thenCompose(ok -> async.get("order:1"))
    .thenAccept(v -> System.out.println("Order: " + v));
```

## Listening for Failover Events

Lettuce emits connection events during failover. Attach a listener to react:

```java
import io.lettuce.core.event.connection.ConnectedEvent;

client.getResources().eventBus().get()
    .filter(event -> event instanceof ConnectedEvent)
    .cast(ConnectedEvent.class)
    .subscribe(event ->
        System.out.println("Reconnected to: " + event.remoteAddress())
    );
```

## Verifying Sentinel Discovery

```java
// Ping to confirm connection to the current primary
String pong = commands.ping();
System.out.println(pong); // PONG

// Check role - role() returns a List<Object>, e.g. [master, 0, []]
List<Object> role = commands.role();
System.out.println("Role: " + role.get(0)); // master
```

## Shutdown

```java
connection.close();
client.shutdown();
```

## Summary

Lettuce connects to Redis Sentinel by listing Sentinel node addresses and the master name in a `RedisURI`. It queries Sentinels at startup to discover the current primary and reconnects automatically after a failover. Read scaling is available through `MasterReplica` with `ReadFrom.REPLICA_PREFERRED`, routing reads to replicas while writes always go to the primary.
