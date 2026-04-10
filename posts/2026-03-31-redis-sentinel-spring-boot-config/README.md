# How to Configure Redis Sentinel in Spring Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Spring Boot, Sentinel, High Availability, Java

Description: Configure Redis Sentinel in Spring Boot with Lettuce to get automatic primary failover without changing application code when a Redis node goes down.

---

Redis Sentinel monitors Redis nodes and promotes a replica to primary automatically when the primary fails. Spring Boot with Lettuce understands the Sentinel protocol, so your application reconnects to the new primary without a restart.

## Sentinel Setup Overview

A minimum Sentinel deployment needs:
- 1 Redis primary
- 2+ Redis replicas
- 3+ Sentinel processes (for quorum)

## application.yml Configuration

```yaml
spring:
  data:
    redis:
      sentinel:
        master: mymaster
        nodes:
          - sentinel-1:26379
          - sentinel-2:26380
          - sentinel-3:26381
        password: sentinel-password   # if sentinel requires auth
      password: redis-password         # primary/replica auth
      lettuce:
        shutdown-timeout: 100ms
```

`master` must match the name used in your `sentinel.conf` (`sentinel monitor mymaster ...`).

## Java Configuration with Read-From-Replica

```java
@Configuration
public class SentinelConfig {

    @Bean
    public LettuceConnectionFactory redisConnectionFactory() {
        RedisSentinelConfiguration sentinelConfig =
            new RedisSentinelConfiguration("mymaster",
                Set.of("sentinel-1:26379", "sentinel-2:26380", "sentinel-3:26381"));
        sentinelConfig.setPassword("redis-password");
        sentinelConfig.setSentinelPassword("sentinel-password");

        LettuceClientConfiguration clientConfig = LettuceClientConfiguration.builder()
            .readFrom(ReadFrom.REPLICA_PREFERRED)
            .build();

        return new LettuceConnectionFactory(sentinelConfig, clientConfig);
    }
}
```

## Use Redis Normally

No changes are needed in service code. Lettuce handles connection routing transparently:

```java
@Service
public class CacheService {

    private final StringRedisTemplate template;

    public CacheService(StringRedisTemplate template) {
        this.template = template;
    }

    public void set(String key, String value) {
        template.opsForValue().set(key, value, Duration.ofMinutes(5));
    }

    public String get(String key) {
        return template.opsForValue().get(key);
    }
}
```

## Test Failover

```bash
# Trigger a manual failover
redis-cli -h sentinel-1 -p 26379 sentinel failover mymaster

# Watch Sentinel log
redis-cli -h sentinel-1 -p 26379 sentinel masters
```

After failover, Lettuce automatically discovers the new primary via Sentinel and reconnects without any application restart.

## Monitor Sentinel Health

```bash
# Check which node is primary
redis-cli -h sentinel-1 -p 26379 sentinel get-master-addr-by-name mymaster

# List all monitored masters
redis-cli -h sentinel-1 -p 26379 sentinel masters

# Check replica status
redis-cli -h sentinel-1 -p 26379 sentinel replicas mymaster
```

## Handle Connection Errors Gracefully

```java
@Bean
public RedisCacheManager cacheManager(RedisConnectionFactory factory) {
    RedisCacheConfiguration config = RedisCacheConfiguration.defaultCacheConfig()
        .entryTtl(Duration.ofMinutes(10));
    return RedisCacheManager.builder(factory)
        .cacheDefaults(config)
        .build();
}
```

Wrap cache calls in a try-catch and fall back to the database during transient Sentinel failovers:

```java
try {
    return cacheService.get(key);
} catch (RedisConnectionFailureException ex) {
    return database.findById(key);
}
```

## Summary

Spring Boot with Lettuce connects to Redis Sentinel by listing Sentinel node addresses in `application.yml`. Lettuce queries Sentinel to discover the current primary and automatically reconnects after failovers, providing transparent high availability. Setting `ReadFrom.REPLICA_PREFERRED` distributes read traffic and reduces load on the primary during normal operation.
