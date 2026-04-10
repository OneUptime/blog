# How to Configure Spring Boot Redis Connection Pool

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Spring Boot, Connection Pool, Lettuce, Java

Description: Configure Lettuce connection pooling in Spring Boot to handle high-throughput Redis workloads and prevent connection exhaustion under load.

---

Spring Boot uses Lettuce as the default Redis client, which multiplexes commands over a small number of connections. For workloads that block the event loop (e.g., blocking pops or transactions), connection pooling prevents contention and connection exhaustion.

## Add Dependencies

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
<!-- Required for Lettuce connection pooling -->
<dependency>
    <groupId>org.apache.commons</groupId>
    <artifactId>commons-pool2</artifactId>
</dependency>
```

## application.yml Configuration

```yaml
spring:
  data:
    redis:
      host: localhost
      port: 6379
      password: ""
      lettuce:
        pool:
          enabled: true
          max-active: 20       # max connections
          max-idle: 10         # max idle connections
          min-idle: 5          # min idle connections
          max-wait: 2000ms     # wait time before exception
        shutdown-timeout: 100ms
      connect-timeout: 2000ms
      timeout: 1000ms
```

## Java-Based Pool Configuration

For fine-grained control, configure the pool programmatically:

```java
@Configuration
public class RedisConfig {

    @Bean
    public LettuceConnectionFactory redisConnectionFactory() {
        GenericObjectPoolConfig<Object> poolConfig = new GenericObjectPoolConfig<>();
        poolConfig.setMaxTotal(20);
        poolConfig.setMaxIdle(10);
        poolConfig.setMinIdle(5);
        poolConfig.setMaxWait(Duration.ofMillis(2000));
        poolConfig.setTestOnBorrow(true);
        poolConfig.setTestWhileIdle(true);

        LettucePoolingClientConfiguration clientConfig =
            LettucePoolingClientConfiguration.builder()
                .poolConfig(poolConfig)
                .commandTimeout(Duration.ofMillis(1000))
                .build();

        RedisStandaloneConfiguration serverConfig =
            new RedisStandaloneConfiguration("localhost", 6379);

        return new LettuceConnectionFactory(serverConfig, clientConfig);
    }
}
```

## Jedis Pool (Alternative)

If you prefer Jedis over Lettuce:

```xml
<dependency>
    <groupId>redis.clients</groupId>
    <artifactId>jedis</artifactId>
</dependency>
```

```yaml
spring:
  data:
    redis:
      client-type: jedis
      jedis:
        pool:
          max-active: 20
          max-idle: 10
          min-idle: 5
          max-wait: 2000ms
```

## Monitor Pool Health

Expose pool metrics via Actuator:

```yaml
management:
  endpoints:
    web:
      exposure:
        include: metrics, health
```

```bash
curl http://localhost:8080/actuator/metrics/lettuce.command.completion
```

## Tune for High Throughput

```yaml
spring:
  data:
    redis:
      lettuce:
        pool:
          max-active: 50
          max-wait: 500ms
        shutdown-timeout: 200ms
```

Set `max-active` based on your expected concurrency. Start at 20 and profile under load before increasing.

## Summary

Lettuce connection pooling in Spring Boot prevents connection exhaustion for high-concurrency Redis workloads. Adding `commons-pool2` and configuring `max-active`, `max-idle`, and `max-wait` through `application.yml` or a custom `LettuceConnectionFactory` bean gives precise control over pool behaviour. Monitor pool metrics via Actuator to detect saturation before it causes latency spikes.
