# How to Implement Rate Limiting with Bucket4j in Spring Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Boot, Rate Limiting, Bucket4j, API

Description: Learn how to implement robust rate limiting in Spring Boot applications using Bucket4j. This guide covers the token bucket algorithm, in-memory and distributed configurations, and production-ready patterns.

---

> Rate limiting is one of those things that seems optional until your API gets hammered by a misbehaving client or a sudden traffic spike brings down your entire service. Bucket4j provides a clean, Java-native solution that works well with Spring Boot.

If you are building a public API or even an internal service that other teams consume, rate limiting protects your backend from abuse and ensures fair resource allocation. While API gateways often handle this at the edge, having application-level rate limiting gives you fine-grained control and serves as a safety net.

---

## Why Bucket4j?

Bucket4j is a Java rate limiting library based on the token bucket algorithm. Here is why it stands out:

| Feature | Bucket4j | Guava RateLimiter | Resilience4j |
|---------|----------|-------------------|--------------|
| **Token Bucket** | Yes | Yes | No (different approach) |
| **Distributed Support** | Yes (JCache, Redis, Hazelcast) | No | No |
| **Bandwidth Profiles** | Multiple per bucket | Single | N/A |
| **Spring Integration** | Excellent | Manual | Good |
| **Thread Safety** | Lock-free | Synchronized | Lock-free |

The token bucket algorithm works like this: imagine a bucket that holds tokens. Tokens are added at a steady rate. Each request consumes one token. If the bucket is empty, the request is rejected. If the bucket is full, excess tokens are discarded.

---

## Getting Started

Add Bucket4j to your Spring Boot project:

```xml
<!-- pom.xml -->
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j-core</artifactId>
    <version>8.7.0</version>
</dependency>
```

For Gradle users:

```groovy
// build.gradle
implementation 'com.bucket4j:bucket4j-core:8.7.0'
```

---

## Basic Rate Limiter

Let's start with a simple in-memory rate limiter:

```java
// RateLimiterService.java
package com.example.ratelimit;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RateLimiterService {

    // Store buckets per client identifier (IP, API key, user ID)
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    // Create a bucket with the default rate limit configuration
    private Bucket createNewBucket() {
        // Allow 100 requests per minute
        Bandwidth limit = Bandwidth.classic(100, Refill.greedy(100, Duration.ofMinutes(1)));
        return Bucket.builder()
                .addLimit(limit)
                .build();
    }

    // Get or create a bucket for the given key
    public Bucket resolveBucket(String key) {
        return buckets.computeIfAbsent(key, k -> createNewBucket());
    }

    // Check if a request should be allowed
    public boolean tryConsume(String key) {
        Bucket bucket = resolveBucket(key);
        return bucket.tryConsume(1);
    }

    // Get remaining tokens for the client
    public long getAvailableTokens(String key) {
        return resolveBucket(key).getAvailableTokens();
    }
}
```

---

## Spring MVC Interceptor

The cleanest way to apply rate limiting across your API is through an interceptor:

```java
// RateLimitInterceptor.java
package com.example.ratelimit;

import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class RateLimitInterceptor implements HandlerInterceptor {

    private final RateLimiterService rateLimiterService;

    public RateLimitInterceptor(RateLimiterService rateLimiterService) {
        this.rateLimiterService = rateLimiterService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) throws Exception {

        // Use client IP as the rate limit key
        String clientId = getClientId(request);
        Bucket bucket = rateLimiterService.resolveBucket(clientId);

        // Try to consume a token
        ConsumptionProbe probe = bucket.tryConsumeAndReturnRemaining(1);

        if (probe.isConsumed()) {
            // Request allowed - add rate limit headers
            response.addHeader("X-Rate-Limit-Remaining",
                    String.valueOf(probe.getRemainingTokens()));
            return true;
        }

        // Request rejected - return 429 with retry information
        long waitTimeSeconds = probe.getNanosToWaitForRefill() / 1_000_000_000;

        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.addHeader("X-Rate-Limit-Remaining", "0");
        response.addHeader("Retry-After", String.valueOf(waitTimeSeconds));
        response.getWriter().write("{\"error\": \"Rate limit exceeded\"}");
        response.setContentType("application/json");

        return false;
    }

    private String getClientId(HttpServletRequest request) {
        // Check for X-Forwarded-For header (when behind a proxy)
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isEmpty()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
```

Register the interceptor in your configuration:

```java
// WebConfig.java
package com.example.ratelimit;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final RateLimitInterceptor rateLimitInterceptor;

    public WebConfig(RateLimitInterceptor rateLimitInterceptor) {
        this.rateLimitInterceptor = rateLimitInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(rateLimitInterceptor)
                .addPathPatterns("/api/**")           // Apply to API endpoints
                .excludePathPatterns("/api/health");  // Exclude health checks
    }
}
```

---

## Multiple Bandwidth Limits

One powerful feature of Bucket4j is supporting multiple limits on a single bucket. This lets you enforce both burst and sustained rate limits:

```java
// MultiBandwidthRateLimiter.java
private Bucket createBucketWithMultipleLimits() {
    // Allow burst of 20 requests
    Bandwidth burstLimit = Bandwidth.classic(20, Refill.greedy(20, Duration.ofSeconds(1)));

    // But sustained rate is 100 per minute
    Bandwidth sustainedLimit = Bandwidth.classic(100, Refill.greedy(100, Duration.ofMinutes(1)));

    // Both limits must be satisfied for a request to proceed
    return Bucket.builder()
            .addLimit(burstLimit)
            .addLimit(sustainedLimit)
            .build();
}
```

This configuration allows clients to make 20 requests in a quick burst, but they cannot exceed 100 requests over any one-minute period.

---

## Tiered Rate Limits

Different users often need different rate limits. Here is how to implement tiered limits based on subscription level:

```java
// TieredRateLimiterService.java
package com.example.ratelimit;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TieredRateLimiterService {

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    public enum PricingPlan {
        FREE(20),        // 20 requests per minute
        BASIC(100),      // 100 requests per minute
        PROFESSIONAL(500), // 500 requests per minute
        ENTERPRISE(5000);  // 5000 requests per minute

        private final int requestsPerMinute;

        PricingPlan(int requestsPerMinute) {
            this.requestsPerMinute = requestsPerMinute;
        }

        public int getRequestsPerMinute() {
            return requestsPerMinute;
        }
    }

    private Bucket createBucket(PricingPlan plan) {
        Bandwidth limit = Bandwidth.classic(
                plan.getRequestsPerMinute(),
                Refill.greedy(plan.getRequestsPerMinute(), Duration.ofMinutes(1))
        );
        return Bucket.builder().addLimit(limit).build();
    }

    public Bucket resolveBucket(String apiKey, PricingPlan plan) {
        String key = apiKey + ":" + plan.name();
        return buckets.computeIfAbsent(key, k -> createBucket(plan));
    }

    public boolean tryConsume(String apiKey, PricingPlan plan) {
        return resolveBucket(apiKey, plan).tryConsume(1);
    }
}
```

---

## Distributed Rate Limiting with Redis

For applications running multiple instances, you need a shared rate limit store. Bucket4j integrates with Redis through the Spring Data Redis:

```xml
<!-- pom.xml - additional dependencies -->
<dependency>
    <groupId>com.bucket4j</groupId>
    <artifactId>bucket4j-redis</artifactId>
    <version>8.7.0</version>
</dependency>
<dependency>
    <groupId>io.lettuce</groupId>
    <artifactId>lettuce-core</artifactId>
</dependency>
```

```java
// DistributedRateLimiterService.java
package com.example.ratelimit;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.Refill;
import io.github.bucket4j.distributed.ExpirationAfterWriteStrategy;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import io.github.bucket4j.redis.lettuce.cas.LettuceBasedProxyManager;
import io.lettuce.core.RedisClient;
import io.lettuce.core.api.StatefulRedisConnection;
import io.lettuce.core.codec.ByteArrayCodec;
import io.lettuce.core.codec.RedisCodec;
import io.lettuce.core.codec.StringCodec;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.time.Duration;
import java.util.function.Supplier;

@Service
public class DistributedRateLimiterService {

    private ProxyManager<String> proxyManager;

    @PostConstruct
    public void init() {
        // Connect to Redis
        RedisClient redisClient = RedisClient.create("redis://localhost:6379");
        StatefulRedisConnection<String, byte[]> connection =
                redisClient.connect(RedisCodec.of(StringCodec.UTF8, ByteArrayCodec.INSTANCE));

        // Create the proxy manager with expiration strategy
        proxyManager = LettuceBasedProxyManager.builderFor(connection)
                .withExpirationStrategy(
                        ExpirationAfterWriteStrategy.basedOnTimeForRefillingBucketUpToMax(
                                Duration.ofMinutes(5)
                        )
                )
                .build();
    }

    private Supplier<BucketConfiguration> getConfigurationSupplier(int requestsPerMinute) {
        return () -> BucketConfiguration.builder()
                .addLimit(Bandwidth.classic(
                        requestsPerMinute,
                        Refill.greedy(requestsPerMinute, Duration.ofMinutes(1))
                ))
                .build();
    }

    public boolean tryConsume(String key, int requestsPerMinute) {
        return proxyManager
                .builder()
                .build(key, getConfigurationSupplier(requestsPerMinute))
                .tryConsume(1);
    }
}
```

---

## Per-Endpoint Rate Limits with Annotations

For fine-grained control, create a custom annotation:

```java
// RateLimit.java
package com.example.ratelimit;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RateLimit {
    int requests() default 100;
    int durationMinutes() default 1;
}
```

```java
// RateLimitAspect.java
package com.example.ratelimit;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.http.HttpServletRequest;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Aspect
@Component
public class RateLimitAspect {

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    @Around("@annotation(rateLimit)")
    public Object enforceRateLimit(ProceedingJoinPoint joinPoint,
                                    RateLimit rateLimit) throws Throwable {

        HttpServletRequest request = ((ServletRequestAttributes)
                RequestContextHolder.currentRequestAttributes()).getRequest();

        // Build unique key: endpoint + client IP
        String key = joinPoint.getSignature().toShortString() + ":" + request.getRemoteAddr();

        Bucket bucket = buckets.computeIfAbsent(key, k -> {
            Bandwidth limit = Bandwidth.classic(
                    rateLimit.requests(),
                    Refill.greedy(rateLimit.requests(),
                            Duration.ofMinutes(rateLimit.durationMinutes()))
            );
            return Bucket.builder().addLimit(limit).build();
        });

        if (bucket.tryConsume(1)) {
            return joinPoint.proceed();
        }

        throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                "Rate limit exceeded for this endpoint");
    }
}
```

Now you can annotate individual endpoints:

```java
// ApiController.java
@RestController
@RequestMapping("/api")
public class ApiController {

    @GetMapping("/data")
    @RateLimit(requests = 100, durationMinutes = 1)
    public ResponseEntity<String> getData() {
        return ResponseEntity.ok("Here is your data");
    }

    @PostMapping("/expensive-operation")
    @RateLimit(requests = 10, durationMinutes = 1)  // Stricter limit
    public ResponseEntity<String> expensiveOperation() {
        return ResponseEntity.ok("Operation completed");
    }
}
```

---

## Best Practices

**Always return rate limit headers.** Clients need to know their limits and remaining quota:

```java
response.addHeader("X-Rate-Limit-Limit", String.valueOf(limit));
response.addHeader("X-Rate-Limit-Remaining", String.valueOf(remaining));
response.addHeader("X-Rate-Limit-Reset", String.valueOf(resetTimestamp));
response.addHeader("Retry-After", String.valueOf(secondsToWait));
```

**Exclude health check endpoints.** Your load balancer and Kubernetes probes should not count against rate limits.

**Use appropriate keys.** For authenticated APIs, rate limit by user ID or API key rather than IP address. Multiple users behind a corporate NAT would otherwise share a single limit.

**Log rate limit events.** Track when and why clients hit limits. This data helps you tune your limits and identify problematic clients.

**Start generous, then tighten.** It is easier to reduce limits than to deal with angry users who suddenly cannot access your API.

---

## Conclusion

Bucket4j provides a solid foundation for rate limiting in Spring Boot applications. The token bucket algorithm handles bursty traffic gracefully, and the library's support for distributed backends makes it suitable for production deployments. Start with in-memory rate limiting for simpler applications, and move to Redis when you scale horizontally.

---

*Need to monitor your API rate limits in production? [OneUptime](https://oneuptime.com) provides API monitoring with detailed metrics on request rates, error patterns, and performance degradation.*

**Related Reading:**
- [How to Implement Rate Limiting in FastAPI Without External Services](https://oneuptime.com/blog/post/2025-01-06-fastapi-rate-limiting/view)
- [How to Implement Sliding Window Rate Limiting in Rust](https://oneuptime.com/blog/post/2026-01-25-sliding-window-rate-limiting-rust/view)
