# How to Build Health Probes for Kubernetes in Spring Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Boot, Kubernetes, Health Probes, Liveness, Readiness

Description: Learn how to implement production-ready health probes in Spring Boot for Kubernetes deployments. This guide covers liveness, readiness, and startup probes with practical examples and best practices.

---

> Running Spring Boot applications in Kubernetes without proper health probes is like flying blind. Kubernetes needs to know when your application is alive, when it can handle traffic, and when something has gone wrong. Get this right, and Kubernetes becomes your application's best friend - automatically restarting unhealthy pods and routing traffic only to healthy instances.

If you've ever had Kubernetes restart your pods in a loop or send traffic to containers that weren't ready, you know how important health probes are. This guide walks you through implementing robust health checks in Spring Boot that give Kubernetes the information it needs.

---

## Understanding Kubernetes Probes

Before diving into code, let's understand what each probe type does:

| Probe Type | Purpose | Failure Action |
|------------|---------|----------------|
| **Liveness** | Is the process alive? | Container is restarted |
| **Readiness** | Can it handle traffic? | Pod removed from service endpoints |
| **Startup** | Has it finished starting? | Other probes are delayed |

The distinction matters. A liveness probe that checks database connectivity will cause unnecessary restarts when the database has a brief hiccup. A readiness probe that's too simple might send traffic to pods that aren't actually ready.

---

## Spring Boot Actuator - Your Starting Point

Spring Boot Actuator provides health check endpoints out of the box. Add the dependency to your `pom.xml`:

```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

Or for Gradle users:

```groovy
// build.gradle
implementation 'org.springframework.boot:spring-boot-starter-actuator'
```

Next, configure the health endpoints in `application.yml`:

```yaml
# application.yml
# Enable Kubernetes-specific health endpoints
management:
  endpoints:
    web:
      exposure:
        include: health,info,prometheus
  endpoint:
    health:
      # Show detailed health information
      show-details: always
      # Enable separate liveness and readiness endpoints
      probes:
        enabled: true
  health:
    # Include liveness and readiness state in health checks
    livenessstate:
      enabled: true
    readinessstate:
      enabled: true
```

This configuration exposes three health endpoints:
- `/actuator/health/liveness` - for the liveness probe
- `/actuator/health/readiness` - for the readiness probe
- `/actuator/health` - combined health status

---

## Basic Kubernetes Deployment

With Actuator configured, here's how to set up probes in your Kubernetes deployment:

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: spring-boot-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: spring-boot-app
  template:
    metadata:
      labels:
        app: spring-boot-app
    spec:
      # Allow time for graceful shutdown
      terminationGracePeriodSeconds: 30
      containers:
      - name: app
        image: my-spring-app:latest
        ports:
        - containerPort: 8080

        # Startup probe - gives the app time to start
        startupProbe:
          httpGet:
            path: /actuator/health/liveness
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
          failureThreshold: 30  # 30 * 5 = 150 seconds max startup time

        # Liveness probe - restart if the app is stuck
        livenessProbe:
          httpGet:
            path: /actuator/health/liveness
            port: 8080
          periodSeconds: 10
          failureThreshold: 3
          timeoutSeconds: 5

        # Readiness probe - check if ready for traffic
        readinessProbe:
          httpGet:
            path: /actuator/health/readiness
            port: 8080
          periodSeconds: 5
          failureThreshold: 3
          successThreshold: 1
          timeoutSeconds: 5
```

The `startupProbe` is particularly important for Spring Boot applications. Java apps often take longer to start than containers running Node.js or Go, so giving them time to initialize prevents unnecessary restarts.

---

## Custom Health Indicators

The default health checks are useful, but real applications need custom checks. Here's how to create a health indicator that verifies your database connection:

```java
// DatabaseHealthIndicator.java
package com.example.health;

import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class DatabaseHealthIndicator implements HealthIndicator {

    private final JdbcTemplate jdbcTemplate;

    public DatabaseHealthIndicator(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public Health health() {
        try {
            // Run a simple query to verify connectivity
            long startTime = System.currentTimeMillis();
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            long responseTime = System.currentTimeMillis() - startTime;

            // Include response time in health details
            return Health.up()
                .withDetail("responseTime", responseTime + "ms")
                .withDetail("database", "PostgreSQL")
                .build();

        } catch (Exception e) {
            // Log the error and return unhealthy status
            return Health.down()
                .withDetail("error", e.getMessage())
                .build();
        }
    }
}
```

For checking external services like Redis:

```java
// RedisHealthIndicator.java
package com.example.health;

import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.stereotype.Component;

@Component
public class RedisHealthIndicator implements HealthIndicator {

    private final RedisConnectionFactory connectionFactory;

    public RedisHealthIndicator(RedisConnectionFactory connectionFactory) {
        this.connectionFactory = connectionFactory;
    }

    @Override
    public Health health() {
        try {
            // Ping Redis to check connectivity
            String result = connectionFactory.getConnection().ping();

            if ("PONG".equals(result)) {
                return Health.up()
                    .withDetail("connection", "established")
                    .build();
            }

            return Health.down()
                .withDetail("error", "Unexpected ping response: " + result)
                .build();

        } catch (Exception e) {
            return Health.down()
                .withDetail("error", e.getMessage())
                .build();
        }
    }
}
```

---

## Separating Liveness and Readiness Checks

Here's where it gets interesting. You want your liveness probe to be simple and fast - it should only restart your pod when the process is truly stuck. The readiness probe, on the other hand, should check dependencies.

```java
// CustomHealthConfig.java
package com.example.health;

import org.springframework.boot.actuate.availability.LivenessStateHealthIndicator;
import org.springframework.boot.actuate.availability.ReadinessStateHealthIndicator;
import org.springframework.boot.availability.ApplicationAvailability;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class CustomHealthConfig {

    // Liveness should be simple - is the JVM running?
    @Bean
    public LivenessStateHealthIndicator livenessIndicator(
            ApplicationAvailability availability) {
        return new LivenessStateHealthIndicator(availability);
    }

    // Readiness checks if we can handle traffic
    @Bean
    public ReadinessStateHealthIndicator readinessIndicator(
            ApplicationAvailability availability) {
        return new ReadinessStateHealthIndicator(availability);
    }
}
```

You can also control the availability state programmatically:

```java
// ApplicationStateManager.java
package com.example.health;

import org.springframework.boot.availability.AvailabilityChangeEvent;
import org.springframework.boot.availability.LivenessState;
import org.springframework.boot.availability.ReadinessState;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

@Component
public class ApplicationStateManager {

    private final ApplicationEventPublisher eventPublisher;

    public ApplicationStateManager(ApplicationEventPublisher eventPublisher) {
        this.eventPublisher = eventPublisher;
    }

    // Call this when your app finishes initializing
    public void markReady() {
        AvailabilityChangeEvent.publish(
            eventPublisher,
            this,
            ReadinessState.ACCEPTING_TRAFFIC
        );
    }

    // Call this during graceful shutdown
    public void markNotReady() {
        AvailabilityChangeEvent.publish(
            eventPublisher,
            this,
            ReadinessState.REFUSING_TRAFFIC
        );
    }

    // Call this if your app enters an unrecoverable state
    public void markBroken() {
        AvailabilityChangeEvent.publish(
            eventPublisher,
            this,
            LivenessState.BROKEN
        );
    }
}
```

---

## Handling Graceful Shutdown

When Kubernetes sends a SIGTERM signal, your app needs to stop accepting new traffic while finishing existing requests. Here's how to handle this properly:

```java
// GracefulShutdownHandler.java
package com.example.lifecycle;

import com.example.health.ApplicationStateManager;
import org.springframework.context.ApplicationListener;
import org.springframework.context.event.ContextClosedEvent;
import org.springframework.stereotype.Component;

@Component
public class GracefulShutdownHandler
        implements ApplicationListener<ContextClosedEvent> {

    private final ApplicationStateManager stateManager;

    public GracefulShutdownHandler(ApplicationStateManager stateManager) {
        this.stateManager = stateManager;
    }

    @Override
    public void onApplicationEvent(ContextClosedEvent event) {
        // Mark as not ready - Kubernetes will stop sending traffic
        stateManager.markNotReady();

        try {
            // Wait for in-flight requests to complete
            // This should match your terminationGracePeriodSeconds
            Thread.sleep(5000);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
```

Also enable graceful shutdown in your configuration:

```yaml
# application.yml
server:
  shutdown: graceful

spring:
  lifecycle:
    timeout-per-shutdown-phase: 20s
```

---

## Health Check Groups

Spring Boot 2.3+ supports health check groups, letting you create different combinations for different probes:

```yaml
# application.yml
management:
  endpoint:
    health:
      group:
        # Liveness group - keep it simple
        liveness:
          include: livenessState
          show-details: never
        # Readiness group - check dependencies
        readiness:
          include: readinessState,db,redis,diskSpace
          show-details: always
```

This configuration means:
- `/actuator/health/liveness` only checks if the JVM is responsive
- `/actuator/health/readiness` checks the database, Redis, and disk space

---

## Common Pitfalls to Avoid

**1. Checking dependencies in liveness probes**

If your database goes down for 30 seconds and your liveness probe checks the database, Kubernetes will restart your pod - which won't fix the database problem and will cause additional downtime.

**2. Setting timeouts too short**

A timeout of 1 second might work in development but fail under production load. Give your health checks enough time to respond.

**3. Forgetting the startup probe**

Without a startup probe, Kubernetes might restart your Spring Boot app before it finishes initializing. Java apps often need 30-60 seconds to start.

**4. Not handling graceful shutdown**

If your readiness probe doesn't fail during shutdown, Kubernetes will keep sending traffic to a pod that's about to terminate.

---

## Conclusion

Proper health probes transform how Kubernetes manages your Spring Boot applications. The key points to remember:

- Use **liveness probes** to detect stuck processes, but keep them simple
- Use **readiness probes** to check dependencies and control traffic routing
- Use **startup probes** for applications that need time to initialize
- Handle **graceful shutdown** by marking your app as not ready before stopping

With these patterns in place, Kubernetes can intelligently manage your pods, automatically recovering from failures and ensuring traffic only goes to healthy instances.

---

*Want to monitor your Spring Boot health checks across multiple clusters? [OneUptime](https://oneuptime.com) provides unified observability with automatic alerting when your probes start failing.*

**Related Reading:**
- [How to Build Health Checks and Readiness Probes in Python](https://oneuptime.com/blog/post/2025-01-06-python-health-checks-kubernetes/view)
- [How to Build Health Checks and Readiness Probes in Node.js](https://oneuptime.com/blog/post/2026-01-06-nodejs-health-checks-kubernetes/view)
