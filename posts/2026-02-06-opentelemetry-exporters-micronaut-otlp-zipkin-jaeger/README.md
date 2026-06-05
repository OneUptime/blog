# How to Configure OpenTelemetry Exporters in Micronaut (OTLP, Zipkin, Jaeger)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Micronaut, Exporter, OTLP, Zipkin, Jaeger

Description: Comprehensive guide to configuring and using different OpenTelemetry exporters in Micronaut applications including OTLP, Zipkin, and Jaeger for flexible trace backend integration.

Choosing the right trace exporter for your Micronaut application depends on your observability backend, infrastructure requirements, and team preferences. OpenTelemetry supports multiple exporters, allowing you to send traces to various backends without changing your instrumentation code. This flexibility means you can switch between Jaeger, Zipkin, or vendor-specific backends by simply changing configuration.

This guide provides detailed instructions for configuring OTLP, Zipkin, and Jaeger exporters in Micronaut applications, along with best practices for each.

## Understanding OpenTelemetry Exporters

An exporter is responsible for serializing and transmitting trace data from your application to a backend system. OpenTelemetry defines a standard protocol (OTLP) while maintaining backward compatibility with popular formats like Zipkin and Jaeger.

Each exporter has different characteristics:

- **OTLP**: The native OpenTelemetry protocol, supporting gRPC and HTTP. Best for modern OpenTelemetry collectors and backends.
- **Zipkin**: Mature format with wide support. Good for existing Zipkin infrastructure.
- **Jaeger**: Originally developed by Uber, popular in Kubernetes environments. Current Jaeger backends can receive OTLP directly, so prefer the OTLP exporter for Jaeger unless you are maintaining a legacy setup.

You can configure multiple exporters simultaneously, sending traces to multiple backends for redundancy or migration scenarios.

## Project Dependencies for Different Exporters

First, add the appropriate dependencies based on which exporters you want to use.

```gradle
// build.gradle
dependencies {
    // Core Micronaut tracing
    implementation("io.micronaut.tracing:micronaut-tracing-opentelemetry")

    // OpenTelemetry API
    implementation("io.opentelemetry:opentelemetry-api")
    implementation("io.opentelemetry:opentelemetry-sdk")

    // OTLP Exporter (gRPC)
    implementation("io.opentelemetry:opentelemetry-exporter-otlp")

    // Zipkin Exporter
    implementation("io.opentelemetry:opentelemetry-exporter-zipkin")

    // Optional: Logging exporter for debugging
    implementation("io.opentelemetry:opentelemetry-exporter-logging")
}
```

For Maven projects:

```xml
<dependencies>
    <!-- Core Micronaut tracing -->
    <dependency>
        <groupId>io.micronaut.tracing</groupId>
        <artifactId>micronaut-tracing-opentelemetry</artifactId>
    </dependency>

    <!-- OpenTelemetry SDK -->
    <dependency>
        <groupId>io.opentelemetry</groupId>
        <artifactId>opentelemetry-sdk</artifactId>
    </dependency>

    <!-- OTLP Exporter -->
    <dependency>
        <groupId>io.opentelemetry</groupId>
        <artifactId>opentelemetry-exporter-otlp</artifactId>
    </dependency>

    <!-- Zipkin Exporter -->
    <dependency>
        <groupId>io.opentelemetry</groupId>
        <artifactId>opentelemetry-exporter-zipkin</artifactId>
    </dependency>

</dependencies>
```

## Configuring OTLP Exporter

OTLP (OpenTelemetry Protocol) is the recommended exporter for modern deployments. It supports both gRPC and HTTP/protobuf transports.

```yaml
# application.yml - OTLP with gRPC

otel:
  traces:
    exporter: otlp

  service:
    name: micronaut-otlp-service

  # Resource attributes
  resource:
    attributes: deployment.environment=production,service.version=1.0.0

  # OTLP exporter configuration
  exporter:
    otlp:
      # gRPC endpoint (default port 4317)
      endpoint: http://localhost:4317
      # Protocol: grpc or http/protobuf
      protocol: grpc
      # Timeout for exports
      timeout: 10000
      # Enable compression to reduce network traffic
      compression: gzip
      # Custom headers for authentication
      headers: "Authorization=Bearer ${OTEL_AUTH_TOKEN:},X-Custom-Header=custom-value"

  # Batch span processor configuration
  bsp:
    schedule:
      delay: 5000
    max:
      queue:
        size: 2048
      export:
        batch:
          size: 512
    export:
      timeout: 30000
```

For HTTP/protobuf transport (useful when gRPC is not available):

```yaml
# application.yml - OTLP with HTTP
otel:
  traces:
    exporter: otlp

  exporter:
    otlp:
      # HTTP endpoint (default port 4318)
      endpoint: http://localhost:4318/v1/traces
      protocol: http/protobuf
      timeout: 10000
      compression: gzip
```

## Configuring Zipkin Exporter

Zipkin exporter is ideal when you have existing Zipkin infrastructure or need broad compatibility.

```yaml
# application.yml - Zipkin configuration
otel:
  traces:
    exporter: zipkin

  service:
    name: micronaut-zipkin-service

  resource:
    attributes: deployment.environment=production

  exporter:
    zipkin:
      # Zipkin collector endpoint
      endpoint: http://localhost:9411/api/v2/spans
```

For programmatic Zipkin configuration with more control:

```java
package com.example.config;

import io.micronaut.context.annotation.Factory;
import io.opentelemetry.exporter.zipkin.ZipkinSpanExporter;
import io.opentelemetry.sdk.trace.export.SpanExporter;
import jakarta.inject.Singleton;

@Factory
public class ZipkinExporterConfig {

    @Singleton
    public SpanExporter zipkinExporter() {
        return ZipkinSpanExporter.builder()
            .setEndpoint("http://localhost:9411/api/v2/spans")
            // Optional: set read timeout
            .setReadTimeout(java.time.Duration.ofSeconds(10))
            .build();
    }
}
```

## Configuring Jaeger Exporter

Jaeger can receive OTLP directly, and OpenTelemetry Java's native Jaeger exporter is deprecated. Configure the OTLP exporter to send traces to Jaeger's OTLP endpoint.

```yaml
# application.yml - Jaeger configuration
otel:
  traces:
    exporter: otlp

  service:
    name: micronaut-jaeger-service

  resource:
    attributes: deployment.environment=production

  exporter:
    otlp:
      # Jaeger OTLP gRPC endpoint
      endpoint: http://localhost:4317
      protocol: grpc
```

Programmatic Jaeger configuration for advanced scenarios:

```java
package com.example.config;

import io.micronaut.context.annotation.Factory;
import io.opentelemetry.exporter.otlp.trace.OtlpGrpcSpanExporter;
import io.opentelemetry.sdk.trace.export.SpanExporter;
import jakarta.inject.Singleton;

import java.time.Duration;

@Factory
public class JaegerExporterConfig {

    @Singleton
    public SpanExporter jaegerExporter() {
        return OtlpGrpcSpanExporter.builder()
            // Jaeger OTLP gRPC endpoint
            .setEndpoint("http://localhost:4317")
            // Connection timeout
            .setTimeout(Duration.ofSeconds(10))
            .build();
    }
}
```

## Configuring Multiple Exporters Simultaneously

Send traces to multiple backends for redundancy, migration, or multi-vendor scenarios.

```java
package com.example.config;

import io.micronaut.context.annotation.Factory;
import io.micronaut.context.annotation.Requires;
import io.micronaut.tracing.opentelemetry.OpenTelemetryBuilderCustomizer;
import io.opentelemetry.exporter.otlp.trace.OtlpGrpcSpanExporter;
import io.opentelemetry.exporter.zipkin.ZipkinSpanExporter;
import io.opentelemetry.sdk.trace.export.SpanExporter;
import jakarta.inject.Singleton;

import java.time.Duration;

@Factory
public class MultiExporterConfig {

    @Singleton
    @Requires(property = "tracing.multi-exporter.enabled", value = "true")
    public OpenTelemetryBuilderCustomizer multiExporterCustomizer() {
        return builder -> builder.addSpanExporterCustomizer((configuredExporter, configProperties) -> {
            // Create Zipkin exporter
            SpanExporter zipkinExporter = ZipkinSpanExporter.builder()
                .setEndpoint("http://zipkin:9411/api/v2/spans")
                .setReadTimeout(Duration.ofSeconds(10))
                .build();

            // Create an OTLP exporter that sends directly to Jaeger
            SpanExporter jaegerOtlpExporter = OtlpGrpcSpanExporter.builder()
                .setEndpoint("http://jaeger:4317")
                .setTimeout(Duration.ofSeconds(10))
                .build();

            // Add these exporters to the exporter configured by otel.traces.exporter
            return SpanExporter.composite(configuredExporter, zipkinExporter, jaegerOtlpExporter);
        });
    }
}
```

Configuration for the multi-exporter setup:

```yaml
# application.yml - Multi-exporter configuration
otel:
  traces:
    exporter: otlp

  exporter:
    otlp:
      endpoint: http://otel-collector:4317
      protocol: grpc

  service:
    name: micronaut-multi-backend-service

  resource:
    attributes: deployment.environment=production,service.version=1.0.0

tracing:
  multi-exporter:
    enabled: true
```

## Exporter Selection Strategy

Here's a decision tree for choosing the right exporter:

```mermaid
graph TD
    A[Choose Exporter] --> B{Existing Backend?}
    B -->|Yes| C{Which Backend?}
    B -->|No| D[Use OTLP]

    C -->|Zipkin| E[Zipkin Exporter]
    C -->|Jaeger| F{Jaeger Version?}
    C -->|Vendor Backend| G{Supports OTLP?}

    F -->|Latest| D
    F -->|Legacy| H[Legacy Jaeger Exporter]

    G -->|Yes| D
    G -->|No| I[Vendor-Specific Exporter]

    D --> J[OpenTelemetry Collector]
    J --> K[Any Backend]

    style D fill:#90EE90
    style E fill:#FFE4B5
    style H fill:#FFE4B5
```

## Environment-Specific Configurations

Create different configurations for development, staging, and production environments.

```yaml
# application.yml - Common configuration
otel:
  service:
    name: ${SERVICE_NAME:micronaut-service}
  resource:
    attributes: service.version=${APP_VERSION:dev}

---
# application-dev.yml - Development configuration
micronaut:
  application:
    name: micronaut-service
  config-client:
    enabled: true

otel:
  traces:
    exporter: otlp
    sampler: always_on

  exporter:
    otlp:
      endpoint: http://localhost:4317
      protocol: grpc

  # Shorter delays for immediate feedback
  bsp:
    schedule:
      delay: 1000

---
# application-staging.yml - Staging configuration
otel:
  traces:
    exporter: otlp
    sampler: traceidratio
    sampler.arg: 0.5

  resource:
    attributes: deployment.environment=staging

  exporter:
    otlp:
      endpoint: ${OTEL_COLLECTOR_ENDPOINT:http://otel-collector.staging:4317}
      protocol: grpc
      compression: gzip

  bsp:
    schedule:
      delay: 3000

---
# application-prod.yml - Production configuration
otel:
  traces:
    exporter: otlp
    sampler: parentbased_traceidratio
    sampler.arg: ${TRACE_SAMPLE_RATE:0.1}

  resource:
    attributes: deployment.environment=production

  exporter:
    otlp:
      endpoint: ${OTEL_COLLECTOR_ENDPOINT}
      protocol: grpc
      compression: gzip
      # Authentication headers
      headers: "Authorization=Bearer ${OTEL_AUTH_TOKEN}"

  # Optimized batch processing
  bsp:
    schedule:
      delay: 5000
    max:
      queue:
        size: 2048
      export:
        batch:
          size: 512
```

## Custom Exporter Implementation

For specialized requirements, implement a custom exporter.

```java
package com.example.exporter;

import io.opentelemetry.sdk.common.CompletableResultCode;
import io.opentelemetry.sdk.trace.data.SpanData;
import io.opentelemetry.sdk.trace.export.SpanExporter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Collection;
import java.util.StringJoiner;
import java.util.concurrent.CompletableFuture;

/**
 * Custom exporter that writes spans to a custom backend
 */
public class CustomSpanExporter implements SpanExporter {

    private static final Logger log = LoggerFactory.getLogger(CustomSpanExporter.class);

    private final String endpoint;
    private final CustomBackendClient client;
    private volatile boolean isShutdown = false;

    public CustomSpanExporter(String endpoint) {
        this.endpoint = endpoint;
        this.client = new CustomBackendClient(endpoint);
    }

    @Override
    public CompletableResultCode export(Collection<SpanData> spans) {
        if (isShutdown) {
            return CompletableResultCode.ofFailure();
        }

        CompletableResultCode result = new CompletableResultCode();

        try {
            // Convert spans to custom format
            String payload = convertSpansToCustomFormat(spans);

            // Send to backend
            client.sendAsync(payload)
                .thenAccept(response -> {
                    log.debug("Exported {} spans successfully", spans.size());
                    result.succeed();
                })
                .exceptionally(throwable -> {
                    log.error("Failed to export spans", throwable);
                    result.fail();
                    return null;
                });

        } catch (Exception e) {
            log.error("Error during span export", e);
            result.fail();
        }

        return result;
    }

    @Override
    public CompletableResultCode flush() {
        if (isShutdown) {
            return CompletableResultCode.ofFailure();
        }

        CompletableResultCode result = new CompletableResultCode();

        try {
            client.flush();
            result.succeed();
        } catch (Exception e) {
            log.error("Failed to flush exporter", e);
            result.fail();
        }

        return result;
    }

    @Override
    public CompletableResultCode shutdown() {
        if (isShutdown) {
            return CompletableResultCode.ofSuccess();
        }

        isShutdown = true;
        CompletableResultCode result = new CompletableResultCode();

        try {
            client.close();
            result.succeed();
        } catch (Exception e) {
            log.error("Failed to shutdown exporter", e);
            result.fail();
        }

        return result;
    }

    private String convertSpansToCustomFormat(Collection<SpanData> spans) {
        // Convert OpenTelemetry spans to your custom format
        StringJoiner spanJson = new StringJoiner(",", "[", "]");

        for (SpanData span : spans) {
            StringJoiner attributesJson = new StringJoiner(",", "{", "}");

            span.getAttributes().forEach((key, value) -> {
                attributesJson.add("\"" + escapeJson(key.getKey()) + "\":\"" + escapeJson(String.valueOf(value)) + "\"");
            });

            spanJson.add("{"
                + "\"traceId\":\"" + span.getTraceId() + "\","
                + "\"spanId\":\"" + span.getSpanId() + "\","
                + "\"name\":\"" + escapeJson(span.getName()) + "\","
                + "\"startTime\":" + span.getStartEpochNanos() + ","
                + "\"endTime\":" + span.getEndEpochNanos() + ","
                + "\"attributes\":" + attributesJson
                + "}");
        }

        return spanJson.toString();
    }

    private String escapeJson(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private static final class CustomBackendClient {

        CustomBackendClient(String endpoint) {
            // Initialize your HTTP or messaging client with the endpoint.
        }

        CompletableFuture<Void> sendAsync(String payload) {
            // Send the payload asynchronously in your real implementation.
            return CompletableFuture.completedFuture(null);
        }

        void flush() {
            // Flush buffered data in your real implementation.
        }

        void close() {
            // Close network resources in your real implementation.
        }
    }
}
```

Register the custom exporter as a bean:

```java
package com.example.config;

import com.example.exporter.CustomSpanExporter;
import io.micronaut.context.annotation.Factory;
import io.micronaut.context.annotation.Requires;
import io.micronaut.context.annotation.Value;
import io.opentelemetry.sdk.trace.export.SpanExporter;
import jakarta.inject.Singleton;

@Factory
public class CustomExporterConfig {

    @Singleton
    @Requires(property = "tracing.custom.enabled", value = "true")
    public SpanExporter customExporter(
            @Value("${tracing.custom.endpoint}") String endpoint) {
        return new CustomSpanExporter(endpoint);
    }
}
```

## Monitoring Exporter Health

Implement health checks to monitor exporter status.

```java
package com.example.health;

import io.micronaut.health.HealthStatus;
import io.micronaut.management.health.indicator.HealthIndicator;
import io.micronaut.management.health.indicator.HealthResult;
import io.opentelemetry.sdk.trace.export.SpanExporter;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import org.reactivestreams.Publisher;
import reactor.core.publisher.Mono;

import java.util.HashMap;
import java.util.Map;

@Singleton
public class TracingHealthIndicator implements HealthIndicator {

    @Inject
    private SpanExporter spanExporter;

    @Override
    public Publisher<HealthResult> getResult() {
        return Mono.fromCallable(() -> {
            Map<String, Object> details = new HashMap<>();

            try {
                // Test exporter by flushing
                var result = spanExporter.flush();
                boolean success = result.join(5, java.util.concurrent.TimeUnit.SECONDS)
                    .isSuccess();

                if (success) {
                    details.put("status", "operational");
                    details.put("exporter", spanExporter.getClass().getSimpleName());
                    return HealthResult.builder("tracing", HealthStatus.UP)
                        .details(details)
                        .build();
                } else {
                    details.put("status", "degraded");
                    details.put("message", "Exporter flush failed");
                    return HealthResult.builder("tracing", HealthStatus.DOWN)
                        .details(details)
                        .build();
                }

            } catch (Exception e) {
                details.put("status", "error");
                details.put("error", e.getMessage());
                return HealthResult.builder("tracing", HealthStatus.DOWN)
                    .details(details)
                    .build();
            }
        });
    }
}
```

## Performance Optimization Tips

Optimize exporter performance for production workloads:

```yaml
# application-prod.yml - Optimized configuration
otel:
  # Batch processor settings for optimal throughput
  bsp:
    schedule:
      # Balance between latency and throughput
      delay: 5000
    max:
      queue:
        # Large queue for traffic bursts
        size: 4096
      export:
        batch:
          # Optimal batch size for network efficiency
          size: 512
    export:
      # Timeout for slow backends
      timeout: 30000

  # Resource limits to prevent memory issues
  span:
    attribute:
      count:
        limit: 128
      value:
        length:
          limit: 512
    event:
      count:
        limit: 128
    link:
      count:
        limit: 32

  # Efficient sampling
  traces:
    sampler: parentbased_traceidratio
    sampler.arg: 0.1

  exporter:
    otlp:
      protocol: grpc
      # Use compression
      compression: gzip
      # Reasonable timeout
      timeout: 10000
```

Configuring OpenTelemetry exporters in Micronaut gives you flexibility in how and where you send trace data. Start with OTLP for future compatibility, but don't hesitate to use Zipkin or OTLP-to-Jaeger if they match your existing infrastructure. The ability to use multiple exporters simultaneously makes migration and redundancy straightforward, while custom exporters handle specialized requirements.
