# How to Serialize Java Objects for Redis Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Java, Serialization

Description: Learn how to serialize Java objects for Redis using Jackson JSON, Kryo, and Protocol Buffers with Spring Data Redis and Lettuce examples.

---

Redis stores bytes, so Java objects must be serialized before storage. The built-in Java serialization is slow and brittle. This guide covers the practical alternatives used in production Java services.

## Jackson JSON Serialization with Spring Data Redis

The most common approach for Spring Boot applications:

```java
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.data.redis.serializer.Jackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;
import org.springframework.data.redis.core.RedisTemplate;

@Configuration
public class RedisConfig {

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory factory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);

        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.activateDefaultTyping(
            mapper.getPolymorphicTypeValidator(),
            ObjectMapper.DefaultTyping.NON_FINAL
        );
        Jackson2JsonRedisSerializer<Object> serializer =
            new Jackson2JsonRedisSerializer<>(mapper, Object.class);

        template.setValueSerializer(serializer);
        template.setKeySerializer(new StringRedisSerializer());
        template.afterPropertiesSet();
        return template;
    }
}
```

## Store and Retrieve a POJO

```java
@Data
@AllArgsConstructor
@NoArgsConstructor
public class UserProfile {
    private Long userId;
    private String name;
    private Double score;
    private Instant createdAt;
}

// Store
UserProfile profile = new UserProfile(42L, "Alice", 98.5, Instant.now());
redisTemplate.opsForValue().set("user:42", profile, Duration.ofHours(1));

// Retrieve
UserProfile loaded = (UserProfile) redisTemplate.opsForValue().get("user:42");
```

## Using Generic RedisTemplate with Type Safety

```java
@Bean
public RedisTemplate<String, UserProfile> userProfileTemplate(
    RedisConnectionFactory factory
) {
    RedisTemplate<String, UserProfile> template = new RedisTemplate<>();
    template.setConnectionFactory(factory);
    ObjectMapper mapper = new ObjectMapper();
    mapper.registerModule(new JavaTimeModule());
    template.setKeySerializer(new StringRedisSerializer());
    template.setValueSerializer(new Jackson2JsonRedisSerializer<>(mapper, UserProfile.class));
    template.afterPropertiesSet();
    return template;
}
```

## Kryo Serialization (Compact and Fast)

For high-throughput scenarios, Kryo is significantly faster and more compact than JSON:

```java
import com.esotericsoftware.kryo.Kryo;
import com.esotericsoftware.kryo.io.Output;
import com.esotericsoftware.kryo.io.Input;

// Kryo is NOT thread-safe - use a pool
ThreadLocal<Kryo> kryoPool = ThreadLocal.withInitial(() -> {
    Kryo kryo = new Kryo();
    kryo.register(UserProfile.class);
    return kryo;
});

public byte[] serialize(UserProfile profile) {
    Kryo kryo = kryoPool.get();
    ByteArrayOutputStream bos = new ByteArrayOutputStream();
    Output output = new Output(bos);
    kryo.writeObject(output, profile);
    output.close();
    return bos.toByteArray();
}

public UserProfile deserialize(byte[] bytes) {
    Kryo kryo = kryoPool.get();
    Input input = new Input(new ByteArrayInputStream(bytes));
    return kryo.readObject(input, UserProfile.class);
}
```

## Custom RedisSerializer with Jackson

```java
public class JsonRedisSerializer<T> implements RedisSerializer<T> {
    private final ObjectMapper mapper = new ObjectMapper();
    private final Class<T> type;

    public JsonRedisSerializer(Class<T> type) {
        this.type = type;
        mapper.registerModule(new JavaTimeModule());
    }

    @Override
    public byte[] serialize(T value) throws SerializationException {
        if (value == null) return null;
        try {
            return mapper.writeValueAsBytes(value);
        } catch (JsonProcessingException e) {
            throw new SerializationException("Serialization failed", e);
        }
    }

    @Override
    public T deserialize(byte[] bytes) throws SerializationException {
        if (bytes == null) return null;
        try {
            return mapper.readValue(bytes, type);
        } catch (IOException e) {
            throw new SerializationException("Deserialization failed", e);
        }
    }
}
```

## Summary

For Java Redis serialization, Jackson JSON via Spring Data Redis is the standard approach offering good balance of readability and performance. Use Kryo when throughput and payload size matter most, and always avoid Java's built-in serialization due to its poor versioning story and security risks. Register your custom serializers at the RedisTemplate level rather than scattering serialization code throughout your service.
