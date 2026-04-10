# How to Use Spring Data Redis Repositories

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Spring Boot, Spring Data, Repository, Java

Description: Use Spring Data Redis repositories to map Java objects to Redis hashes and perform CRUD operations with minimal boilerplate code.

---

Spring Data Redis repositories bring the familiar repository abstraction to Redis, letting you store and query Java objects without writing any `RedisTemplate` code by hand.

## Add Dependencies

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

## Configure Redis

```yaml
# application.yml
spring:
  data:
    redis:
      host: localhost
      port: 6379
```

Enable Redis repositories in your main class or configuration:

```java
@SpringBootApplication
@EnableRedisRepositories
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
```

## Define a Redis Entity

```java
import org.springframework.data.annotation.Id;
import org.springframework.data.redis.core.RedisHash;
import org.springframework.data.redis.core.index.Indexed;
import java.io.Serializable;

@RedisHash(value = "User", timeToLive = 3600)
public class User implements Serializable {

    @Id
    private String id;

    @Indexed
    private String email;

    private String name;

    @Indexed
    private int age;

    // getters and setters
}
```

`@RedisHash` maps the class to a Redis hash. `@Indexed` creates a secondary index for querying by field. `timeToLive` sets a TTL in seconds.

## Create the Repository

```java
import org.springframework.data.repository.CrudRepository;

public interface UserRepository extends CrudRepository<User, String> {
    Optional<User> findByEmail(String email);
    List<User> findByAge(int age);
}
```

Spring Data generates query implementations automatically based on method names.

## Use the Repository

```java
@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User createUser(String name, String email, int age) {
        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setAge(age);
        return userRepository.save(user);
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    public void delete(String id) {
        userRepository.deleteById(id);
    }
}
```

## Inspect Keys in Redis

```bash
redis-cli keys "User:*"
redis-cli hgetall "User:abc123"
```

Spring Data stores each entity as a hash at `{keyspace}:{id}` and maintains secondary index sets for `@Indexed` fields.

## Summary

Spring Data Redis repositories provide a clean, annotation-driven way to persist Java objects in Redis without manual serialisation. The `@RedisHash`, `@Indexed`, and `timeToLive` annotations control storage behaviour, while derived query methods on the repository interface handle lookups. This makes Redis feel as familiar as JPA for simple entity storage use cases.
