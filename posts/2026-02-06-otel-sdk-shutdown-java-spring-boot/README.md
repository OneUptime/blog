# How to Configure OpenTelemetry SDK Shutdown Timeout and ForceFlush in Java Spring Boot Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Java, Spring Boot, Graceful Shutdown

Description: Configure OpenTelemetry SDK shutdown timeout and ForceFlush in Java Spring Boot applications to prevent data loss during deployment.

Spring Boot has a well-defined application lifecycle with shutdown hooks. The OpenTelemetry Java SDK integrates with this lifecycle, but the default configuration may not give enough time for the BatchSpanProcessor to flush its queue during shutdown. This post covers how to configure shutdown timeouts, register proper cleanup hooks, and handle the interaction between Spring Boot's graceful shutdown and the OpenTelemetry SDK.

## The Default Behavior

When using the OpenTelemetry Spring Boot Starter, the SDK registers a JVM shutdown hook automatically. This hook calls `shutdown()` on the TracerProvider and MeterProvider. The default timeout for this operation is 10 seconds.

The problem: if your batch queue is large and your exporter endpoint is slow, 10 seconds may not be enough to flush everything.

## Manual SDK Configuration with Custom Shutdown

If you are configuring the SDK manually (not using auto-configuration), you need to set up the shutdown yourself:

```java
// OtelConfig.java
import io.opentelemetry.sdk.OpenTelemetrySdk;
import io.opentelemetry.sdk.trace.SdkTracerProvider;
import io.opentelemetry.sdk.trace.export.BatchSpanProcessor;
import io.opentelemetry.sdk.metrics.SdkMeterProvider;
import io.opentelemetry.exporter.otlp.trace.OtlpGrpcSpanExporter;
import io.opentelemetry.sdk.resources.Resource;
import io.opentelemetry.api.common.Attributes;
import io.opentelemetry.semconv.ResourceAttributes;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;

@Configuration
public class OtelConfig {

    @Bean
    public OtlpGrpcSpanExporter spanExporter() {
        return OtlpGrpcSpanExporter.builder()
            .setEndpoint("http://collector:4317")
            .setTimeout(Duration.ofSeconds(10))
            .build();
    }

    @Bean
    public BatchSpanProcessor batchSpanProcessor(OtlpGrpcSpanExporter exporter) {
        return BatchSpanProcessor.builder(exporter)
            .setMaxQueueSize(8192)
            .setScheduleDelay(Duration.ofMillis(5000))
            .setMaxExportBatchSize(512)
            // Set the export timeout for individual batch operations
            .setExporterTimeout(Duration.ofSeconds(30))
            .build();
    }

    @Bean
    public SdkTracerProvider tracerProvider(BatchSpanProcessor processor) {
        return SdkTracerProvider.builder()
            .addSpanProcessor(processor)
            .setResource(Resource.create(Attributes.of(
                ResourceAttributes.SERVICE_NAME, "order-service",
                ResourceAttributes.SERVICE_VERSION, "2.1.0"
            )))
            .build();
    }

    @Bean
    public OpenTelemetrySdk openTelemetry(SdkTracerProvider tracerProvider) {
        return OpenTelemetrySdk.builder()
            .setTracerProvider(tracerProvider)
            .build();
    }
}
```

## Registering the Shutdown Hook with Spring

Use Spring's `@PreDestroy` annotation or implement `DisposableBean` to trigger SDK shutdown:

```java
// OtelShutdownHandler.java
import io.opentelemetry.sdk.OpenTelemetrySdk;
import io.opentelemetry.sdk.trace.SdkTracerProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import jakarta.annotation.PreDestroy;
import java.util.concurrent.TimeUnit;

@Component
public class OtelShutdownHandler {

    private static final Logger log = LoggerFactory.getLogger(OtelShutdownHandler.class);

    @Autowired
    private SdkTracerProvider tracerProvider;

    // Configurable shutdown timeout
    @Value("${otel.shutdown.timeout.seconds:30}")
    private int shutdownTimeoutSeconds;

    @PreDestroy
    public void shutdown() {
        log.info("Starting OpenTelemetry SDK shutdown with {}s timeout",
                 shutdownTimeoutSeconds);

        try {
            // Step 1: Force flush any pending data
            tracerProvider.forceFlush()
                .join(shutdownTimeoutSeconds, TimeUnit.SECONDS);
            log.info("ForceFlush completed successfully");

            // Step 2: Shut down the provider
            tracerProvider.shutdown()
                .join(shutdownTimeoutSeconds, TimeUnit.SECONDS);
            log.info("TracerProvider shutdown completed successfully");

        } catch (Exception e) {
            log.error("Error during OpenTelemetry shutdown", e);
        }
    }
}
```

## Configuring Spring Boot's Graceful Shutdown

Spring Boot 2.3+ supports graceful shutdown. Configure it to work with OpenTelemetry:

```yaml
# application.yml
server:
  shutdown: graceful

spring:
  lifecycle:
    timeout-per-shutdown-phase: 30s

# Custom OTel shutdown timeout
otel:
  shutdown:
    timeout:
      seconds: 20
```

The `timeout-per-shutdown-phase` controls how long Spring waits for in-flight requests to complete. The OTel shutdown should happen after Spring stops accepting new requests but before the JVM exits.

## Handling the Shutdown Order

The shutdown order in Spring Boot is:

1. Spring stops accepting new HTTP requests
2. Spring waits for in-flight requests to complete (up to `timeout-per-shutdown-phase`)
3. `@PreDestroy` methods run
4. JVM shutdown hooks run

Since `@PreDestroy` runs after in-flight requests complete, all spans from those requests should already be in the batch queue. The `@PreDestroy` handler then flushes the queue.

```java
// ApplicationShutdownListener.java
import org.springframework.context.ApplicationListener;
import org.springframework.context.event.ContextClosedEvent;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Order(1)  // Run early in the shutdown sequence
public class ApplicationShutdownListener
    implements ApplicationListener<ContextClosedEvent> {

    private final SdkTracerProvider tracerProvider;

    public ApplicationShutdownListener(SdkTracerProvider tracerProvider) {
        this.tracerProvider = tracerProvider;
    }

    @Override
    public void onApplicationEvent(ContextClosedEvent event) {
        // This fires when the ApplicationContext is closing
        // Good place for a ForceFlush before beans are destroyed
        tracerProvider.forceFlush()
            .join(10, TimeUnit.SECONDS);
    }
}
```

## Using the Auto-Configuration Approach

If you use the OpenTelemetry Spring Boot Starter with auto-configuration, shutdown is handled for you. You can still customize the timeout via environment variables:

```bash
# Set via environment variables
export OTEL_BSP_EXPORT_TIMEOUT=30000
export OTEL_BSP_MAX_QUEUE_SIZE=8192
```

Or in `application.yml`:

```yaml
otel:
  bsp:
    export:
      timeout: 30000
    max:
      queue:
        size: 8192
```

## Verifying Shutdown Behavior

Write an integration test that confirms spans are flushed during shutdown:

```java
@SpringBootTest
@TestPropertySource(properties = {
    "otel.shutdown.timeout.seconds=5"
})
class ShutdownTest {

    @Autowired
    private SdkTracerProvider tracerProvider;

    @Test
    void spansFlushedOnShutdown() {
        // Create a tracer and produce spans
        var tracer = tracerProvider.get("test");
        var span = tracer.spanBuilder("test-operation").startSpan();
        span.end();

        // Trigger shutdown
        tracerProvider.forceFlush().join(5, TimeUnit.SECONDS);

        // Verify no spans remain in the queue
        // (Check your exporter or use an in-memory exporter for testing)
    }
}
```

Proper shutdown configuration in Spring Boot ensures that the last batch of telemetry data is not lost during deployments. The combination of Spring's graceful shutdown and properly configured SDK timeouts gives your spans enough time to reach the Collector.
