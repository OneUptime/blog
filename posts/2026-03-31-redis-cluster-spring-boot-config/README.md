# How to Configure Redis Cluster in Spring Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Spring Boot, Cluster, Java, High Availability

Description: Configure Spring Boot to connect to a Redis Cluster with Lettuce, handle redirects, and enable read-from-replica for horizontal read scaling.

---

A Redis Cluster distributes data across multiple shards and provides automatic failover. Spring Boot with Lettuce supports cluster connections natively, but a few settings are needed to handle topology refreshes and read scaling correctly.

## application.yml Configuration

```yaml
spring:
  data:
    redis:
      cluster:
        nodes:
          - redis-node-1:6379
          - redis-node-2:6380
          - redis-node-3:6381
          - redis-node-4:6382
          - redis-node-5:6383
          - redis-node-6:6384
        max-redirects: 3
      lettuce:
        cluster:
          refresh:
            adaptive: true
            period: 30s
```

`adaptive: true` enables topology refresh when Lettuce detects a cluster change, such as a failover.

## Java Configuration for Read-From-Replica

```java
@Configuration
public class RedisClusterConfig {

    @Bean
    public LettuceConnectionFactory redisConnectionFactory() {
        RedisClusterConfiguration clusterConfig = new RedisClusterConfiguration(
            List.of("redis-node-1:6379", "redis-node-2:6380", "redis-node-3:6381")
        );
        clusterConfig.setMaxRedirects(3);

        ClusterTopologyRefreshOptions topologyOptions =
            ClusterTopologyRefreshOptions.builder()
                .enableAdaptiveRefreshTrigger(
                    RefreshTrigger.MOVED_REDIRECT,
                    RefreshTrigger.PERSISTENT_RECONNECTS)
                .adaptiveRefreshTriggersTimeout(Duration.ofSeconds(10))
                .build();

        ClusterClientOptions clientOptions = ClusterClientOptions.builder()
            .topologyRefreshOptions(topologyOptions)
            .build();

        LettuceClientConfiguration clientConfig = LettuceClientConfiguration.builder()
            .readFrom(ReadFrom.REPLICA_PREFERRED)  // reads from replica if available
            .clientOptions(clientOptions)
            .build();

        return new LettuceConnectionFactory(clusterConfig, clientConfig);
    }
}
```

`ReadFrom.REPLICA_PREFERRED` directs read operations to replicas, offloading primaries.

## Use RedisTemplate as Normal

No changes are needed in your services - `RedisTemplate` works identically with cluster and standalone connections.

```java
@Service
public class ProductCache {

    private final StringRedisTemplate template;

    public ProductCache(StringRedisTemplate template) {
        this.template = template;
    }

    public void put(String productId, String json) {
        template.opsForValue().set("product:" + productId, json, Duration.ofMinutes(30));
    }

    public String get(String productId) {
        return template.opsForValue().get("product:" + productId);
    }
}
```

## Important: Cluster Key Constraints

Redis Cluster routes keys based on hash slots. Multi-key operations require all keys to be in the same slot. Use hash tags to force co-location:

```java
// Both keys land in the same slot via {userId} hash tag
template.opsForValue().set("{user:42}:profile", profileJson);
template.opsForValue().set("{user:42}:settings", settingsJson);
```

## Check Cluster Status

```bash
redis-cli -h redis-node-1 -p 6379 cluster info
redis-cli -h redis-node-1 -p 6379 cluster nodes
```

## Summary

Spring Boot connects to Redis Cluster with minimal configuration by listing seed nodes in `application.yml`. Enabling adaptive topology refresh prevents stale routing tables after failovers. Setting `ReadFrom.REPLICA_PREFERRED` distributes read traffic across replicas automatically, and hash tags solve the multi-key limitation for operations that must execute on the same shard.
