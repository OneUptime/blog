# How to Implement Custom Annotations in Spring

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Java, Spring, Annotations, AOP

Description: Learn how to create custom annotations in Spring with AOP for cross-cutting concerns like logging, validation, and security.

---

Custom annotations in Spring provide a powerful way to implement cross-cutting concerns without cluttering your business logic. By combining Java annotations with Spring's Aspect-Oriented Programming (AOP), you can create reusable, declarative solutions for logging, rate limiting, caching, and more.

## Understanding Annotation Basics

Before diving into Spring-specific implementations, let's understand how Java annotations work. An annotation is metadata that provides information about the program but does not directly affect program semantics.

### Creating the Annotation Interface

To create a custom annotation, use the `@interface` keyword along with meta-annotations that define its behavior:

```java
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface Loggable {
    String value() default "";
    boolean includeArgs() default true;
    boolean includeResult() default false;
}
```

The key meta-annotations are:

- `@Retention(RetentionPolicy.RUNTIME)`: Ensures the annotation is available at runtime for reflection
- `@Target(ElementType.METHOD)`: Specifies that this annotation can only be applied to methods

## Implementing AOP Aspects

Spring AOP allows you to define aspects that intercept method calls annotated with your custom annotation. You need to add the Spring AOP dependency:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-aop</artifactId>
</dependency>
```

### Creating the Aspect with @Around Advice

The `@Around` advice gives you complete control over method execution:

```java
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.Arrays;

@Aspect
@Component
public class LoggingAspect {

    @Around("@annotation(loggable)")
    public Object logMethodExecution(ProceedingJoinPoint joinPoint,
                                      Loggable loggable) throws Throwable {
        Logger logger = LoggerFactory.getLogger(joinPoint.getTarget().getClass());
        String methodName = joinPoint.getSignature().getName();

        // Log method entry
        if (loggable.includeArgs()) {
            logger.info("Entering {} with args: {}",
                       methodName, Arrays.toString(joinPoint.getArgs()));
        } else {
            logger.info("Entering {}", methodName);
        }

        long startTime = System.currentTimeMillis();
        Object result = joinPoint.proceed();
        long duration = System.currentTimeMillis() - startTime;

        // Log method exit
        if (loggable.includeResult()) {
            logger.info("Exiting {} ({}ms) with result: {}",
                       methodName, duration, result);
        } else {
            logger.info("Exiting {} ({}ms)", methodName, duration);
        }

        return result;
    }
}
```

## Practical Example: Rate Limiting

Here's a more advanced example implementing rate limiting:

```java
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface RateLimited {
    int requests() default 10;
    int seconds() default 60;
    String key() default "";
}
```

```java
@Aspect
@Component
public class RateLimitingAspect {

    private final Map<String, Deque<Long>> requestTimestamps =
        new ConcurrentHashMap<>();

    @Around("@annotation(rateLimited)")
    public Object enforceRateLimit(ProceedingJoinPoint joinPoint,
                                    RateLimited rateLimited) throws Throwable {
        String key = rateLimited.key().isEmpty()
            ? joinPoint.getSignature().toShortString()
            : rateLimited.key();

        Deque<Long> timestamps = requestTimestamps
            .computeIfAbsent(key, k -> new LinkedBlockingDeque<>());

        long now = System.currentTimeMillis();
        long windowStart = now - (rateLimited.seconds() * 1000L);

        synchronized (timestamps) {
            while (!timestamps.isEmpty() && timestamps.peekFirst() < windowStart) {
                timestamps.pollFirst();
            }

            if (timestamps.size() >= rateLimited.requests()) {
                throw new RateLimitExceededException(
                    "Rate limit exceeded: " + rateLimited.requests() +
                    " requests per " + rateLimited.seconds() + " seconds");
            }

            timestamps.addLast(now);
        }

        return joinPoint.proceed();
    }
}
```

## Practical Example: Simple Caching

Custom annotations can also implement caching logic:

```java
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface SimpleCache {
    long ttlSeconds() default 300;
}
```

```java
@Aspect
@Component
public class SimpleCacheAspect {

    private final Map<String, CacheEntry> cache = new ConcurrentHashMap<>();

    @Around("@annotation(simpleCache)")
    public Object cacheResult(ProceedingJoinPoint joinPoint,
                              SimpleCache simpleCache) throws Throwable {
        String cacheKey = joinPoint.getSignature().toShortString() +
                          Arrays.toString(joinPoint.getArgs());

        CacheEntry entry = cache.get(cacheKey);
        if (entry != null && !entry.isExpired()) {
            return entry.getValue();
        }

        Object result = joinPoint.proceed();
        cache.put(cacheKey, new CacheEntry(result, simpleCache.ttlSeconds()));

        return result;
    }
}
```

## Using Your Custom Annotations

Apply your annotations to any Spring-managed bean method:

```java
@Service
public class UserService {

    @Loggable(includeResult = true)
    @RateLimited(requests = 5, seconds = 60)
    public User findById(Long id) {
        return userRepository.findById(id).orElseThrow();
    }

    @SimpleCache(ttlSeconds = 600)
    public List<User> findAllActive() {
        return userRepository.findByActiveTrue();
    }
}
```

## Best Practices

1. **Keep annotations focused**: Each annotation should handle a single concern
2. **Use meaningful defaults**: Provide sensible default values for annotation attributes
3. **Handle exceptions gracefully**: Ensure your aspects don't swallow or mask exceptions
4. **Consider ordering**: Use `@Order` annotation when multiple aspects apply to the same method
5. **Test thoroughly**: Write unit tests for your aspects using Spring's testing support

Custom annotations with AOP create clean, maintainable code by separating cross-cutting concerns from business logic. This pattern is extensively used in Spring's own codebase and is a valuable tool for any Spring developer.
