# How to Use Redis Cluster with Lettuce in Java

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Java, Lettuce, Cluster, Scalability

Description: Learn how to connect to a Redis Cluster from Java using Lettuce, handle slot redirections, and configure cluster-aware operations and topology refresh.

---

Redis Cluster shards data across multiple nodes using hash slots. Lettuce has built-in cluster support that handles `MOVED` and `ASK` redirections automatically and can refresh the cluster topology dynamically.

## Maven Dependency

```xml
<dependency>
  <groupId>io.lettuce</groupId>
  <artifactId>lettuce-core</artifactId>
  <version>6.3.2.RELEASE</version>
</dependency>
```

## Basic Cluster Connection

```java
import io.lettuce.core.cluster.RedisClusterClient;
import io.lettuce.core.cluster.api.StatefulRedisClusterConnection;
import io.lettuce.core.cluster.api.sync.RedisAdvancedClusterCommands;

RedisClusterClient clusterClient = RedisClusterClient.create(List.of(
    RedisURI.create("redis://node1:6379"),
    RedisURI.create("redis://node2:6379"),
    RedisURI.create("redis://node3:6379")
));

StatefulRedisClusterConnection<String, String> connection = clusterClient.connect();
RedisAdvancedClusterCommands<String, String> commands = connection.sync();

commands.set("user:1", "Alice");
String value = commands.get("user:1");
System.out.println(value); // Alice
```

You only need to provide a subset of nodes - Lettuce discovers the full topology automatically.

## Async Cluster API

```java
import io.lettuce.core.cluster.api.async.RedisAdvancedClusterAsyncCommands;

RedisAdvancedClusterAsyncCommands<String, String> async = connection.async();

async.set("product:42", "Keyboard")
    .thenCompose(ok -> async.get("product:42"))
    .thenAccept(System.out::println);
```

## Reactive Cluster API

```java
import io.lettuce.core.cluster.api.reactive.RedisAdvancedClusterReactiveCommands;

RedisAdvancedClusterReactiveCommands<String, String> reactive = connection.reactive();

reactive.set("order:1", "pending")
    .then(reactive.get("order:1"))
    .subscribe(System.out::println);
```

## Topology Refresh

Configure automatic topology refresh so Lettuce detects node additions and removals:

```java
import io.lettuce.core.cluster.ClusterClientOptions;
import io.lettuce.core.cluster.ClusterTopologyRefreshOptions;
import java.time.Duration;

ClusterTopologyRefreshOptions refreshOptions = ClusterTopologyRefreshOptions.builder()
    .enablePeriodicRefresh(Duration.ofMinutes(1))
    .enableAllAdaptiveRefreshTriggers()
    .build();

ClusterClientOptions options = ClusterClientOptions.builder()
    .topologyRefreshOptions(refreshOptions)
    .build();

clusterClient.setOptions(options);
```

## Hash Tags (Multi-Key Operations)

Redis Cluster routes keys by hash slot. Multi-key commands (`MSET`, `MGET`) only work if all keys are in the same slot. Use hash tags `{}` to force co-location:

```java
// These keys will be in the same slot because {user:1} is the hash tag
commands.set("{user:1}:name", "Alice");
commands.set("{user:1}:email", "alice@example.com");

// This MGET works because both keys share the same slot
List<KeyValue<String, String>> values = commands.mget("{user:1}:name", "{user:1}:email");
```

## Executing Commands on All Masters

```java
// Run DBSIZE on each master node
Map<String, Long> dbSizes = new HashMap<>();
commands.masters().commands().dbsize()
    .asMap().forEach((node, size) -> {
        dbSizes.put(node.getNodeId(), size);
    });
```

## Shutdown

```java
connection.close();
clusterClient.shutdown();
```

## Summary

Lettuce's Redis Cluster client handles `MOVED` and `ASK` redirections transparently, discovers cluster topology from a seed list of nodes, and supports sync, async, and reactive APIs. Enable periodic topology refresh to detect cluster changes automatically. For multi-key operations, use hash tags `{}` to pin related keys to the same hash slot and ensure commands execute on a single node.
