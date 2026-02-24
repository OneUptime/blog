# How to Configure Health Checks for Spring Boot with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Spring Boot, Health Checks, Kubernetes, Java

Description: Detailed guide on configuring Spring Boot Actuator health checks to work properly with Istio sidecar proxies and Kubernetes probes.

---

Health checks in Spring Boot with Istio need some careful configuration. Spring Boot Actuator provides excellent health check support out of the box, but when you add an Istio sidecar to the mix, there are timing issues, port conflicts, and probe rewriting behaviors that can trip you up. This guide covers the full setup from basic configuration to production-ready health checks.

## Spring Boot Actuator Setup

First, add the Actuator dependency to your project:

```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-actuator</artifactId>
</dependency>
```

Or with Gradle:

```groovy
implementation 'org.springframework.boot:spring-boot-starter-actuator'
```

## Basic Health Check Configuration

Configure Actuator in your `application.yml`:

```yaml
management:
  server:
    port: 8081
  endpoints:
    web:
      exposure:
        include: health, info, prometheus
  endpoint:
    health:
      show-details: when-authorized
      probes:
        enabled: true
      group:
        liveness:
          include: livenessState
        readiness:
          include: readinessState, db, redis
  health:
    livenessState:
      enabled: true
    readinessState:
      enabled: true

server:
  port: 8080
```

This configuration does several things:
- Runs the management endpoints on a separate port (8081)
- Enables Kubernetes probe endpoints
- Configures liveness to only check if the app is alive (not external dependencies)
- Configures readiness to check the app state plus database and Redis connectivity

The resulting endpoints are:
- `GET /actuator/health/liveness` on port 8081
- `GET /actuator/health/readiness` on port 8081

## Why Use a Separate Management Port?

Running health checks on a separate port from your application traffic has advantages with Istio:

1. You can configure different Istio policies for the management port
2. Health checks do not show up in your application traffic metrics
3. You can exclude the management port from mTLS if needed

```yaml
apiVersion: v1
kind: Service
metadata:
  name: order-service
spec:
  selector:
    app: order-service
  ports:
  - name: http-web
    port: 8080
    targetPort: 8080
  # Note: management port is intentionally NOT exposed in the service
  # Kubernetes probes access it directly on the pod
```

## Kubernetes Probe Configuration

### Standard HTTP Probes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  template:
    spec:
      containers:
      - name: order-service
        image: myregistry/order-service:1.0.0
        ports:
        - name: http-web
          containerPort: 8080
        - name: http-mgmt
          containerPort: 8081
        startupProbe:
          httpGet:
            path: /actuator/health/liveness
            port: 8081
          initialDelaySeconds: 10
          periodSeconds: 5
          failureThreshold: 30
        livenessProbe:
          httpGet:
            path: /actuator/health/liveness
            port: 8081
          initialDelaySeconds: 0
          periodSeconds: 10
          failureThreshold: 3
          timeoutSeconds: 5
        readinessProbe:
          httpGet:
            path: /actuator/health/readiness
            port: 8081
          initialDelaySeconds: 0
          periodSeconds: 5
          failureThreshold: 3
          timeoutSeconds: 5
```

The startup probe is critical for Spring Boot. Spring Boot applications can take 30-60 seconds to start (or more with lots of beans and database migrations). The startup probe allows up to 160 seconds (30 failures * 5 second period + 10 second initial delay) before Kubernetes gives up.

Once the startup probe succeeds, the liveness and readiness probes take over with `initialDelaySeconds: 0` because the app is already running.

## Istio Probe Rewriting

By default, Istio rewrites HTTP probes to route them through the sidecar proxy. This means health check requests go: kubelet -> envoy sidecar -> your app. This usually works fine, but there are edge cases.

### How Probe Rewriting Works

When Istio injects the sidecar, it modifies your probe configuration:
- The original probe path and port are stored in an annotation
- The probe is rewritten to hit port 15020 on the sidecar
- The sidecar forwards the probe to your actual application

You can see this by describing a pod:

```bash
kubectl describe pod order-service-xxx | grep -A 10 "Liveness\|Readiness\|Startup"
```

### Disabling Probe Rewriting

If probe rewriting causes issues (rare but possible), disable it per pod:

```yaml
metadata:
  annotations:
    sidecar.istio.io/rewriteAppHTTPProbers: "false"
```

Or globally in the mesh configuration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      holdApplicationUntilProxyStarts: true
```

## Custom Health Indicators

Create custom health indicators for services your app depends on:

```java
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Component
public class PaymentServiceHealthIndicator implements HealthIndicator {

    private final RestTemplate restTemplate;

    public PaymentServiceHealthIndicator(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Override
    public Health health() {
        try {
            restTemplate.getForEntity(
                "http://payment-service:8080/actuator/health",
                String.class
            );
            return Health.up()
                .withDetail("service", "payment-service")
                .build();
        } catch (Exception e) {
            return Health.down()
                .withDetail("service", "payment-service")
                .withDetail("error", e.getMessage())
                .build();
        }
    }
}
```

Add it to the readiness group but NOT the liveness group:

```yaml
management:
  endpoint:
    health:
      group:
        liveness:
          include: livenessState
        readiness:
          include: readinessState, db, redis, paymentService
```

Never include external dependency checks in the liveness probe. If a downstream service goes down and your liveness probe fails because of it, Kubernetes will restart your pod, which will not fix the downstream service and could cause a cascading failure.

## Handling the Sidecar Startup Race

The biggest issue with Spring Boot and Istio health checks is the startup race condition. When a pod starts:

1. The istio-init container runs and sets up iptables rules
2. The istio-proxy sidecar starts
3. Your Spring Boot app starts
4. Kubernetes starts running probes

If your Spring Boot app tries to connect to a database during startup and the sidecar is not ready, the connection fails because the sidecar intercepts the traffic but cannot forward it yet.

### Fix 1: Hold Application Until Proxy Starts

```yaml
metadata:
  annotations:
    proxy.istio.io/config: '{"holdApplicationUntilProxyStarts": true}'
```

This tells Istio to block the application container from starting until the sidecar is ready. It is the cleanest solution.

### Fix 2: Spring Boot Retry on Startup

Configure your database connection pool to retry:

```yaml
spring:
  datasource:
    hikari:
      connection-timeout: 30000
      initialization-fail-timeout: -1
      maximum-pool-size: 10
      minimum-idle: 2
```

`initialization-fail-timeout: -1` means HikariCP will keep retrying the connection indefinitely instead of failing fast.

For other dependencies, use Spring Retry:

```java
@Configuration
@EnableRetry
public class AppConfig {

    @Bean
    @Retryable(maxAttempts = 10, backoff = @Backoff(delay = 2000))
    public CacheManager cacheManager(RedisConnectionFactory factory) {
        return RedisCacheManager.builder(factory).build();
    }
}
```

### Fix 3: Lazy Initialization

Delay bean initialization to after the sidecar is ready:

```yaml
spring:
  main:
    lazy-initialization: true
```

This makes Spring Boot create beans on first use rather than at startup. The downside is that the first request to each endpoint will be slower.

## Monitoring Health Check Results

Expose health check status as Prometheus metrics:

```java
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.boot.actuate.health.HealthEndpoint;
import org.springframework.boot.actuate.health.Status;
import org.springframework.context.annotation.Configuration;

@Configuration
public class HealthMetricsConfig {

    public HealthMetricsConfig(MeterRegistry registry, HealthEndpoint healthEndpoint) {
        Gauge.builder("application_health", healthEndpoint, ep -> {
            Status status = ep.health().getStatus();
            if (status.equals(Status.UP)) return 1.0;
            if (status.equals(Status.DOWN)) return 0.0;
            return -1.0;
        })
        .description("Application health status")
        .register(registry);
    }
}
```

Then you can create Istio-aware alerts based on health check failures:

```yaml
# Prometheus alert rule
groups:
- name: spring-boot-health
  rules:
  - alert: ServiceUnhealthy
    expr: application_health == 0
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "{{ $labels.pod }} is unhealthy"
```

## Graceful Shutdown and Health Checks

When a pod is shutting down, the readiness probe should fail immediately so Kubernetes stops sending traffic. Spring Boot handles this automatically with its lifecycle management:

```yaml
server:
  shutdown: graceful
spring:
  lifecycle:
    timeout-per-shutdown-phase: 20s
```

The sequence during shutdown:
1. Kubernetes sends SIGTERM
2. Spring Boot sets the readiness state to REFUSING_TRAFFIC
3. The readiness probe fails
4. Kubernetes removes the pod from endpoints
5. Spring Boot drains existing requests
6. The application shuts down

With Istio, add a preStop hook to give the sidecar time to update:

```yaml
lifecycle:
  preStop:
    exec:
      command: ["/bin/sh", "-c", "sleep 5"]
terminationGracePeriodSeconds: 35
```

## Authorization Policies and Health Checks

If you have strict Istio authorization policies, health check requests from the kubelet need to be allowed. Since the kubelet connects directly (not through the mesh), you might need a policy that allows unauthenticated access to health endpoints:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-health-checks
  namespace: production
spec:
  selector:
    matchLabels:
      app: order-service
  action: ALLOW
  rules:
  - to:
    - operation:
        paths: ["/actuator/health/*"]
        ports: ["8081"]
```

## Summary

The key points for Spring Boot health checks with Istio:

1. Use separate ports for application traffic and management endpoints
2. Enable Kubernetes probe endpoints in Actuator (`probes.enabled: true`)
3. Keep liveness checks simple - no external dependency checks
4. Use startup probes to handle Spring Boot's slow startup
5. Configure `holdApplicationUntilProxyStarts` to avoid race conditions
6. Add retry logic for database and cache connections during startup
7. Set up graceful shutdown with preStop hooks for sidecar coordination

Getting health checks right is one of the most impactful things you can do for the reliability of your Spring Boot services in an Istio mesh. Take the time to configure them properly and your deployments will be much smoother.
