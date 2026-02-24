# How to Configure Istio for Java Spring Boot Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Java, Spring Boot, Kubernetes, Service Mesh

Description: Complete guide to configuring Istio for Java Spring Boot applications including health checks, resource tuning, and common gotchas.

---

Spring Boot is probably the most common framework you will find in Kubernetes clusters running Java workloads. It works well with Istio out of the box, but there are some specific configurations that make the integration much smoother. From health checks to JVM resource tuning to handling the sidecar lifecycle, this guide covers everything you need to get Spring Boot apps running properly in an Istio mesh.

## Basic Deployment Setup

A typical Spring Boot application deployment with Istio-friendly configuration:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-service
      version: v1
  template:
    metadata:
      labels:
        app: order-service
        version: v1
    spec:
      containers:
      - name: order-service
        image: myregistry/order-service:1.0.0
        ports:
        - name: http-web
          containerPort: 8080
        - name: http-management
          containerPort: 8081
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 2000m
            memory: 1Gi
        env:
        - name: JAVA_OPTS
          value: "-XX:MaxRAMPercentage=75.0 -XX:InitialRAMPercentage=50.0"
        - name: SERVER_PORT
          value: "8080"
        - name: MANAGEMENT_SERVER_PORT
          value: "8081"
```

Notice the port names - `http-web` and `http-management` both start with `http-`, which tells Istio these are HTTP ports. This is critical for proper protocol detection.

## Service Configuration

Your Kubernetes Service needs properly named ports too:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: order-service
  namespace: production
spec:
  selector:
    app: order-service
  ports:
  - name: http-web
    port: 8080
    targetPort: http-web
  - name: http-management
    port: 8081
    targetPort: http-management
```

## Health Check Configuration

Spring Boot Actuator provides health check endpoints that work perfectly with Istio. Configure them in your `application.yml`:

```yaml
management:
  server:
    port: 8081
  endpoints:
    web:
      exposure:
        include: health,info,prometheus
  endpoint:
    health:
      show-details: always
      probes:
        enabled: true
  health:
    livenessState:
      enabled: true
    readinessState:
      enabled: true
```

This enables the Kubernetes-specific probe endpoints at `/actuator/health/liveness` and `/actuator/health/readiness`.

Then configure your deployment probes:

```yaml
containers:
- name: order-service
  livenessProbe:
    httpGet:
      path: /actuator/health/liveness
      port: 8081
    initialDelaySeconds: 30
    periodSeconds: 10
    failureThreshold: 3
  readinessProbe:
    httpGet:
      path: /actuator/health/readiness
      port: 8081
    initialDelaySeconds: 15
    periodSeconds: 5
    failureThreshold: 3
  startupProbe:
    httpGet:
      path: /actuator/health/liveness
      port: 8081
    initialDelaySeconds: 10
    periodSeconds: 5
    failureThreshold: 30
```

The startup probe is especially important for Spring Boot apps because they can take 30-60 seconds to start up, especially with heavy dependency injection. Without a startup probe, the liveness probe might kill the pod before the app finishes starting.

## Handling Sidecar Startup Order

Spring Boot apps often connect to databases, message brokers, and other services during startup. If the Istio sidecar is not ready when these connections are attempted, the app fails to start.

Enable the hold-until-ready feature:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: '{"holdApplicationUntilProxyStarts": true}'
```

Alternatively, add retry logic in your Spring Boot application:

```yaml
# application.yml
spring:
  datasource:
    hikari:
      connection-timeout: 30000
      initialization-fail-timeout: -1
  kafka:
    listener:
      missing-topics-fatal: false
```

Setting `initialization-fail-timeout: -1` tells HikariCP to keep retrying the database connection instead of failing fast.

## Configuring Istio Traffic Management

Set up a VirtualService and DestinationRule for your Spring Boot service:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: order-service
  namespace: production
spec:
  hosts:
  - order-service
  http:
  - route:
    - destination:
        host: order-service
        port:
          number: 8080
    timeout: 30s
    retries:
      attempts: 3
      perTryTimeout: 10s
      retryOn: 5xx,reset,connect-failure,retriable-4xx
---
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: order-service
  namespace: production
spec:
  host: order-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: DEFAULT
        http1MaxPendingRequests: 100
        http2MaxRequests: 1000
        maxRequestsPerConnection: 10
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

## JVM and Resource Considerations

The Istio sidecar adds resource overhead on top of your Spring Boot application. Plan accordingly:

```yaml
containers:
- name: order-service
  resources:
    requests:
      cpu: 500m
      memory: 512Mi
    limits:
      cpu: 2000m
      memory: 1Gi
  env:
  - name: JAVA_OPTS
    value: >-
      -XX:MaxRAMPercentage=75.0
      -XX:InitialRAMPercentage=50.0
      -XX:+UseG1GC
      -XX:MaxGCPauseMillis=200
```

Use `MaxRAMPercentage` instead of fixed `-Xmx` values so the JVM adapts to the container memory limit. Setting it to 75% leaves room for non-heap memory, native memory, and thread stacks.

For the sidecar, adjust its resources based on your traffic volume:

```yaml
metadata:
  annotations:
    sidecar.istio.io/proxyCPU: "100m"
    sidecar.istio.io/proxyMemory: "128Mi"
    sidecar.istio.io/proxyCPULimit: "1000m"
    sidecar.istio.io/proxyMemoryLimit: "512Mi"
```

## Exposing Prometheus Metrics

Spring Boot can expose Prometheus metrics through Actuator, and Istio can scrape them along with its own proxy metrics:

Add the Micrometer Prometheus dependency to your `pom.xml`:

```xml
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-prometheus</artifactId>
</dependency>
```

Then configure Prometheus annotations on your pod:

```yaml
metadata:
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "8081"
    prometheus.io/path: "/actuator/prometheus"
```

This gives you both application-level metrics (JVM stats, request counts, custom metrics) and Istio proxy metrics (connection counts, latency histograms) for the same service.

## Handling Graceful Shutdown

Spring Boot has its own graceful shutdown mechanism. You need to coordinate it with Istio's sidecar termination:

```yaml
# application.yml
server:
  shutdown: graceful
spring:
  lifecycle:
    timeout-per-shutdown-phase: 20s
```

In your deployment, add a preStop hook to give the sidecar time to drain:

```yaml
containers:
- name: order-service
  lifecycle:
    preStop:
      exec:
        command: ["/bin/sh", "-c", "sleep 5"]
spec:
  terminationGracePeriodSeconds: 30
```

The sequence is: Kubernetes sends SIGTERM, the preStop hook runs (5 second sleep), then Spring Boot starts its graceful shutdown (draining requests for up to 20 seconds). The total termination grace period of 30 seconds covers both phases.

## Common Spring Boot + Istio Issues

**Issue: Actuator endpoints blocked by authorization policies**

If you have strict authorization policies, make sure health check traffic from the kubelet is allowed:

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
  rules:
  - to:
    - operation:
        paths: ["/actuator/health/*"]
        ports: ["8081"]
```

**Issue: Spring Boot admin endpoints exposed through the mesh**

If you use a separate management port, you can exclude it from the Istio service to prevent external access:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: order-service
spec:
  ports:
  - name: http-web
    port: 8080
    targetPort: 8080
  # Do NOT expose port 8081 in the service
```

**Issue: Slow DNS resolution causing startup delays**

Spring Boot apps sometimes do DNS lookups during startup. If the sidecar is not ready, these lookups fail. Besides using holdApplicationUntilProxyStarts, you can configure Spring Boot to be more tolerant:

```yaml
# application.yml
spring:
  cloud:
    discovery:
      enabled: false
  jpa:
    properties:
      hibernate:
        temp:
          use_jdbc_metadata_defaults: false
```

Getting Spring Boot and Istio working together well is mostly about getting the startup ordering right, configuring health checks properly, and making sure port names follow Istio conventions. Once those basics are in place, Spring Boot apps are very well-behaved mesh citizens.
