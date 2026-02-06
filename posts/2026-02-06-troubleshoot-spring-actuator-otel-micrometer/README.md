# How to Troubleshoot Spring Boot Actuator Metrics Not Appearing When Using OpenTelemetry Instead of Micrometer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Spring Boot, Micrometer, Metrics

Description: Fix missing Spring Boot Actuator metrics when switching from Micrometer to OpenTelemetry and ensure both systems work together.

Spring Boot Actuator uses Micrometer as its metrics facade. When you add the OpenTelemetry Java agent or SDK, you might expect Actuator metrics to flow through OpenTelemetry automatically. They do not. Without a bridge between Micrometer and OpenTelemetry, your Actuator endpoint shows metrics but they never reach your OpenTelemetry backend.

## The Problem

You have Spring Boot Actuator configured:

```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health, metrics, prometheus
```

`/actuator/metrics` shows metrics, but your OpenTelemetry backend does not receive them.

## Why They Do Not Connect

Micrometer and OpenTelemetry are separate metrics systems. Micrometer collects metrics through its `MeterRegistry`. OpenTelemetry collects metrics through its `MeterProvider`. Without a bridge, they operate independently.

## Fix 1: Use the Micrometer-OpenTelemetry Bridge

The `micrometer-registry-otlp` or the OpenTelemetry Micrometer bridge sends Micrometer metrics through OpenTelemetry:

```xml
<dependency>
    <groupId>io.opentelemetry.instrumentation</groupId>
    <artifactId>opentelemetry-micrometer-1.5</artifactId>
    <version>2.1.0-alpha</version>
</dependency>
```

When using the Java agent, the bridge is included automatically. Enable it:

```bash
java -javaagent:opentelemetry-javaagent.jar \
     -Dotel.instrumentation.micrometer.enabled=true \
     -jar myapp.jar
```

## Fix 2: Use the Spring Boot OpenTelemetry Starter

The OpenTelemetry Spring Boot starter integrates with Micrometer automatically:

```xml
<dependency>
    <groupId>io.opentelemetry.instrumentation</groupId>
    <artifactId>opentelemetry-spring-boot-starter</artifactId>
    <version>2.1.0</version>
</dependency>
```

```yaml
# application.yml
otel:
  exporter:
    otlp:
      endpoint: http://collector:4318
  resource:
    attributes:
      service.name: my-spring-service
```

The starter configures the Micrometer bridge and sets up OpenTelemetry metrics export.

## Fix 3: Configure Micrometer OTLP Registry Directly

Spring Boot 3.x supports the OTLP Micrometer registry natively:

```xml
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-registry-otlp</artifactId>
</dependency>
```

```yaml
# application.yml
management:
  otlp:
    metrics:
      export:
        enabled: true
        url: http://collector:4318/v1/metrics
        step: 60s
```

This sends Micrometer metrics directly via OTLP without needing the OpenTelemetry SDK for metrics.

## What Metrics Get Bridged

When the bridge is active, these Micrometer metrics become available in OpenTelemetry:

- `jvm.memory.used` - JVM memory usage
- `jvm.gc.pause` - Garbage collection pauses
- `http.server.requests` - HTTP request metrics
- `spring.data.repository.invocations` - Spring Data queries
- Custom metrics created with Micrometer API

## Verifying the Bridge

Check that metrics appear in your OpenTelemetry backend with the `micrometer` scope:

```
# Metric names in OpenTelemetry backend
jvm.memory.used{area="heap", id="G1 Eden Space"}
http.server.requests{method="GET", uri="/api/users", status="200"}
```

Or use the debug exporter temporarily:

```bash
-Dotel.metrics.exporter=logging
```

## Common Issues

### Issue: Duplicate Metrics

If both Micrometer's OTLP registry and the OpenTelemetry bridge are active, you get duplicate metrics:

```yaml
# Disable Micrometer's own OTLP export when using the OTel bridge
management:
  otlp:
    metrics:
      export:
        enabled: false
```

### Issue: Metric Name Differences

Micrometer uses dot-separated names (`http.server.requests`). OpenTelemetry uses dot-separated names too, but the exact names may differ between the bridge and native OpenTelemetry instrumentation.

### Issue: Missing Custom Metrics

Custom Micrometer metrics only flow through the bridge if they are registered with the global `MeterRegistry`:

```java
@Component
public class OrderMetrics {
    private final Counter orderCounter;

    public OrderMetrics(MeterRegistry registry) {
        // This counter will be bridged to OpenTelemetry
        this.orderCounter = Counter.builder("orders.created")
            .description("Number of orders created")
            .tag("type", "web")
            .register(registry);
    }

    public void recordOrder() {
        orderCounter.increment();
    }
}
```

## Choosing Between Micrometer and OpenTelemetry Metrics

| Aspect | Micrometer | OpenTelemetry |
|--------|-----------|---------------|
| Spring Boot integration | Native | Via starter/agent |
| Actuator endpoints | Built-in | Requires bridge |
| Backend flexibility | Many registries | OTLP standard |
| Custom metrics API | Micrometer API | OTel Meter API |

For most Spring Boot applications, using Micrometer with the OTLP registry or the OpenTelemetry bridge is the pragmatic choice. You keep full Actuator compatibility while exporting to your OpenTelemetry backend.
