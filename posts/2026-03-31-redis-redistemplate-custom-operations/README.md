# How to Use RedisTemplate for Custom Operations in Spring Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Spring Boot, RedisTemplate, Java, Cache

Description: Use RedisTemplate in Spring Boot for custom Redis operations including hashes, sorted sets, and Lua scripts beyond what auto-configuration provides.

---

Spring Boot auto-configures a `StringRedisTemplate` for simple string key-value work, but custom serialisation, Lua scripts, and complex data structures require a manually configured `RedisTemplate`.

## Add Dependency

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

## Configure a Custom RedisTemplate

```java
@Configuration
public class RedisConfig {

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory factory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);

        // Use String serialiser for keys
        template.setKeySerializer(new StringRedisSerializer());
        template.setHashKeySerializer(new StringRedisSerializer());

        // Use JSON serialiser for values
        Jackson2JsonRedisSerializer<Object> jsonSerializer =
            new Jackson2JsonRedisSerializer<>(Object.class);
        template.setValueSerializer(jsonSerializer);
        template.setHashValueSerializer(jsonSerializer);

        template.afterPropertiesSet();
        return template;
    }
}
```

## Value Operations

```java
@Service
public class UserCacheService {

    private final ValueOperations<String, Object> valueOps;
    private final RedisTemplate<String, Object> template;

    public UserCacheService(RedisTemplate<String, Object> template) {
        this.template = template;
        this.valueOps = template.opsForValue();
    }

    public void cache(String key, Object value, Duration ttl) {
        valueOps.set(key, value, ttl);
    }

    public Object get(String key) {
        return valueOps.get(key);
    }
}
```

## Hash Operations

```java
public void saveUserFields(String userId, Map<String, Object> fields) {
    template.opsForHash().putAll("user:" + userId, fields);
    template.expire("user:" + userId, Duration.ofHours(1));
}

public Object getUserField(String userId, String field) {
    return template.opsForHash().get("user:" + userId, field);
}
```

## Sorted Set Operations

```java
public void addToLeaderboard(String player, double score) {
    template.opsForZSet().add("leaderboard", player, score);
}

public Set<Object> getTopPlayers(int n) {
    return template.opsForZSet().reverseRange("leaderboard", 0, n - 1);
}
```

## Execute a Lua Script

```java
private static final DefaultRedisScript<Long> INCR_LIMIT_SCRIPT;

static {
    INCR_LIMIT_SCRIPT = new DefaultRedisScript<>();
    INCR_LIMIT_SCRIPT.setScriptText(
        "local v = redis.call('INCR', KEYS[1])\n" +
        "if v == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end\n" +
        "return v"
    );
    INCR_LIMIT_SCRIPT.setResultType(Long.class);
}

public Long incrementWithExpiry(String key, int ttlSeconds) {
    return template.execute(INCR_LIMIT_SCRIPT,
        List.of(key),
        ttlSeconds);
}
```

## Pipeline Multiple Commands

```java
template.executePipelined((RedisCallback<Object>) conn -> {
    conn.set("a".getBytes(), "1".getBytes());
    conn.set("b".getBytes(), "2".getBytes());
    conn.set("c".getBytes(), "3".getBytes());
    return null;
});
```

## Summary

`RedisTemplate` unlocks the full Redis command set in Spring Boot. Configuring JSON serialisers avoids raw byte issues and makes stored values human-readable. Operations interfaces (`opsForValue`, `opsForHash`, `opsForZSet`) provide type-safe access to different Redis data structures, while Lua script execution and pipelining support advanced atomic and batch patterns.
