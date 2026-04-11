# How to Use Redis JSON with Spring Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Spring Boot, RedisJSON, Java, Document Store

Description: Store, query, and update JSON documents in Redis using the RedisJSON module with Spring Boot and the Jedis or redis-om-spring client.

---

RedisJSON extends Redis with a native JSON data type that supports atomic partial updates and JSONPath queries without deserialising the entire document. Spring Boot applications can use it via Jedis or the higher-level `redis-om-spring` library.

## Option 1: Jedis with RedisJSON

### Add Dependency

```xml
<dependency>
    <groupId>redis.clients</groupId>
    <artifactId>jedis</artifactId>
    <version>5.1.0</version>
</dependency>
```

### Configure Jedis

```java
@Bean
public UnifiedJedis jedis() {
    return new JedisPooled("localhost", 6379);
}
```

### Store and Retrieve JSON Documents

```java
@Service
public class ProductJsonService {

    private final UnifiedJedis jedis;

    public ProductJsonService(UnifiedJedis jedis) {
        this.jedis = jedis;
    }

    public void save(String productId, String jsonPayload) {
        jedis.jsonSet("product:" + productId, Path2.ROOT_PATH, jsonPayload);
    }

    public Object get(String productId) {
        return jedis.jsonGet("product:" + productId);
    }

    public Object getField(String productId, String path) {
        return jedis.jsonGet("product:" + productId, new Path2(path));
    }

    public void updatePrice(String productId, double price) {
        jedis.jsonSet("product:" + productId, new Path2("$.price"), price);
    }

    public void delete(String productId) {
        jedis.jsonDel("product:" + productId);
    }
}
```

## Option 2: redis-om-spring (Higher Level)

### Add Dependency

```xml
<dependency>
    <groupId>com.redis.om</groupId>
    <artifactId>redis-om-spring</artifactId>
    <version>0.9.0</version>
</dependency>
```

### Annotate Your Entity

```java
import com.redis.om.spring.annotations.*;
import org.springframework.data.annotation.Id;

@Document
public class Product {

    @Id
    private String id;

    @Indexed
    private String name;

    @Indexed
    private String category;

    @Indexed
    private double price;

    private int stock;

    // getters and setters
}
```

### Use the Repository

```java
import com.redis.om.spring.repository.RedisDocumentRepository;

public interface ProductRepository extends RedisDocumentRepository<Product, String> {
    List<Product> findByCategory(String category);
    List<Product> findByPriceLessThan(double maxPrice);
}
```

### Enable in Spring Boot

```java
@SpringBootApplication
@EnableRedisDocumentRepositories(basePackages = "com.example")
public class Application {}
```

## Inspect JSON in Redis CLI

```bash
redis-cli json.get product:1
redis-cli json.get product:1 $.price
redis-cli json.numincrby product:1 $.stock -1
```

## Summary

RedisJSON enables native JSON storage with atomic partial updates and JSONPath queries, removing the need to load-modify-save entire documents. Jedis provides direct access to JSON commands, while redis-om-spring adds a Spring Data-style repository layer with secondary indexes backed by RediSearch. Both approaches integrate naturally into existing Spring Boot applications.
