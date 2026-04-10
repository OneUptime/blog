# How to Configure Spring Session with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Spring Boot, Session, Java, Security

Description: Store HTTP sessions in Redis with Spring Session to enable session sharing across multiple Spring Boot instances behind a load balancer.

---

When multiple instances of a Spring Boot app run behind a load balancer, in-memory sessions break because each request can land on a different instance. Spring Session with Redis stores sessions centrally so any instance can serve any request.

## Add Dependencies

```xml
<dependency>
    <groupId>org.springframework.session</groupId>
    <artifactId>spring-session-data-redis</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

## Configure Session Storage

```yaml
# application.yml
spring:
  session:
    redis:
      namespace: myapp:sessions
      flush-mode: on-save
  data:
    redis:
      host: localhost
      port: 6379
```

No additional Java configuration is required - Spring Boot auto-configures `RedisSessionRepository` when `spring-session-data-redis` is on the classpath. The session store type is automatically detected from the classpath dependency.

## Customise Session Timeout

```java
@Configuration
@EnableRedisHttpSession(maxInactiveIntervalInSeconds = 1800)
public class SessionConfig {
    // 30-minute session timeout
}
```

Or in `application.yml`:

```yaml
spring:
  session:
    timeout: 30m
```

## Store and Read Session Attributes

```java
@RestController
public class SessionController {

    @PostMapping("/login")
    public ResponseEntity<String> login(HttpSession session, @RequestParam String username) {
        session.setAttribute("user", username);
        session.setAttribute("loginTime", System.currentTimeMillis());
        return ResponseEntity.ok("Logged in: " + session.getId());
    }

    @GetMapping("/me")
    public ResponseEntity<String> me(HttpSession session) {
        String user = (String) session.getAttribute("user");
        if (user == null) {
            return ResponseEntity.status(401).body("Not authenticated");
        }
        return ResponseEntity.ok("Hello, " + user);
    }

    @PostMapping("/logout")
    public ResponseEntity<String> logout(HttpSession session) {
        session.invalidate();
        return ResponseEntity.ok("Logged out");
    }
}
```

## Inspect Sessions in Redis

```bash
redis-cli keys "myapp:sessions:sessions:*"
redis-cli hgetall "myapp:sessions:sessions:abc123..."
```

Spring Session stores each session as a hash with fields for attributes, creation time, and last access time.

## Enable HTTPS and Secure Cookies

```yaml
server:
  servlet:
    session:
      cookie:
        secure: true
        http-only: true
        same-site: strict
```

## Summary

Spring Session with Redis centralises HTTP sessions in under five minutes of configuration. All instances share the same session store, making horizontal scaling transparent to users. TTL-based expiry in Redis handles session cleanup automatically, and the Redis hash structure makes session inspection straightforward during debugging.
