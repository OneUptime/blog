# How to Replace Datadog APM Libraries with OpenTelemetry SDKs in Java

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Datadog, Java, APM, Migration, Tracing, Metrics, Spring Boot

Description: A detailed guide to replacing the Datadog Java APM agent with OpenTelemetry Java instrumentation, covering auto-instrumentation, manual spans, custom metrics, and Spring Boot integration.

---

> Datadog's Java APM agent works well, but it ties your instrumentation to Datadog's proprietary format and pricing model. OpenTelemetry provides equivalent automatic instrumentation for Java applications while giving you the freedom to send data to any backend. This guide shows you exactly how to make the switch.

We will cover removing the Datadog agent, installing the OpenTelemetry Java agent, migrating custom traces and metrics, and handling the Spring Boot specific details that most Java applications need.

---

## Why Replace the Datadog Java Agent?

The Datadog Java agent (dd-java-agent) is a capable tool, but there are several practical reasons to move to OpenTelemetry:

- **Cost control**: Datadog pricing is based on hosts and ingestion volume. With OpenTelemetry, you choose your backend and pricing model.
- **Vendor flexibility**: Your instrumentation code works with any OTLP-compatible backend, not just Datadog.
- **Open standard**: OpenTelemetry is a CNCF project with broad industry support. Your team's knowledge transfers across jobs and projects.
- **Growing ecosystem**: Over 100 Java libraries have OpenTelemetry instrumentation, with more added regularly.

---

## Concept Mapping

Here is how Datadog APM concepts translate to OpenTelemetry:

| Datadog APM Concept | OpenTelemetry Equivalent |
|---|---|
| dd-java-agent.jar | opentelemetry-javaagent.jar |
| Service name (DD_SERVICE) | service.name resource attribute |
| Environment (DD_ENV) | deployment.environment resource attribute |
| Version (DD_VERSION) | service.version resource attribute |
| Trace | Trace |
| Span | Span |
| Resource name | Span name |
| Span tag | Span attribute |
| Custom metric (StatsD) | Meter instrument |
| dd.trace.* config | otel.* config |

---

## Step 1: Remove the Datadog Java Agent

Start by removing the Datadog agent from your application startup. This typically involves removing the `-javaagent` flag and the associated environment variables:

```bash
# BEFORE: Application startup with Datadog agent
# java -javaagent:/opt/dd-java-agent.jar \
#      -Ddd.service=order-service \
#      -Ddd.env=production \
#      -Ddd.version=1.5.0 \
#      -Ddd.trace.sample.rate=1.0 \
#      -Ddd.logs.injection=true \
#      -jar order-service.jar

# Remove the Datadog agent JAR file
rm /opt/dd-java-agent.jar
```

If you are using Docker, update your Dockerfile to remove Datadog-specific downloads and configuration:

```dockerfile
# REMOVE these lines from your Dockerfile
# RUN curl -L -o /opt/dd-java-agent.jar \
#     https://dtdg.co/latest-java-tracer
# ENV DD_SERVICE=order-service
# ENV DD_ENV=production
# ENV DD_VERSION=1.5.0
# ENV DD_AGENT_HOST=datadog-agent
# ENV DD_TRACE_AGENT_PORT=8126
```

Also remove the `dd-trace-api` dependency from your build file if you used manual instrumentation:

```xml
<!-- REMOVE from pom.xml -->
<!-- <dependency>
    <groupId>com.datadoghq</groupId>
    <artifactId>dd-trace-api</artifactId>
    <version>1.31.0</version>
</dependency> -->
```

---

## Step 2: Install the OpenTelemetry Java Agent

Download the OpenTelemetry Java auto-instrumentation agent. This single JAR file replaces the Datadog agent and provides automatic instrumentation for the same set of libraries:

```bash
# Download the latest OpenTelemetry Java agent
# This is a drop-in replacement for dd-java-agent.jar
curl -L -o /opt/opentelemetry-javaagent.jar \
  https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/latest/download/opentelemetry-javaagent.jar
```

Run your application with the OpenTelemetry agent. The environment variable mapping is straightforward:

```bash
# AFTER: Application startup with OpenTelemetry agent
# Each Datadog env var has a direct OpenTelemetry equivalent
java -javaagent:/opt/opentelemetry-javaagent.jar \
     -Dotel.service.name=order-service \
     -Dotel.exporter.otlp.endpoint=https://oneuptime.com/otlp \
     -Dotel.exporter.otlp.headers=x-oneuptime-token=your-token-here \
     -Dotel.resource.attributes=deployment.environment=production,service.version=1.5.0 \
     -jar order-service.jar
```

Here is the environment variable translation table for your deployment scripts:

```bash
# Datadog environment variables    ->  OpenTelemetry equivalents
# DD_SERVICE=order-service         ->  OTEL_SERVICE_NAME=order-service
# DD_ENV=production                ->  OTEL_RESOURCE_ATTRIBUTES=deployment.environment=production
# DD_VERSION=1.5.0                 ->  OTEL_RESOURCE_ATTRIBUTES=service.version=1.5.0
# DD_AGENT_HOST=datadog-agent      ->  OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
# DD_TRACE_SAMPLE_RATE=1.0         ->  OTEL_TRACES_SAMPLER=parentbased_always_on
# DD_LOGS_INJECTION=true           ->  (automatic with OTel agent)

export OTEL_SERVICE_NAME="order-service"
export OTEL_EXPORTER_OTLP_ENDPOINT="https://oneuptime.com/otlp"
export OTEL_EXPORTER_OTLP_HEADERS="x-oneuptime-token=your-token-here"
export OTEL_RESOURCE_ATTRIBUTES="deployment.environment=production,service.version=1.5.0"
```

---

## Step 3: Update Docker Configuration

Here is a complete Dockerfile that replaces the Datadog setup with OpenTelemetry:

```dockerfile
# Dockerfile with OpenTelemetry Java agent
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Download the OpenTelemetry Java agent at build time
# This replaces the Datadog agent download step
ADD https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/latest/download/opentelemetry-javaagent.jar /opt/opentelemetry-javaagent.jar

# Copy your application JAR
COPY target/order-service.jar /app/order-service.jar

# Configure OpenTelemetry via JAVA_TOOL_OPTIONS
# This ensures the agent loads regardless of how the container is started
ENV JAVA_TOOL_OPTIONS="-javaagent:/opt/opentelemetry-javaagent.jar"
ENV OTEL_SERVICE_NAME="order-service"
ENV OTEL_EXPORTER_OTLP_ENDPOINT="http://otel-collector:4317"

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/order-service.jar"]
```

---

## Step 4: Migrate Custom Traces

If you used the Datadog `dd-trace-api` for manual instrumentation, replace those calls with the OpenTelemetry API. First, add the OpenTelemetry API dependency:

```xml
<!-- pom.xml: Add OpenTelemetry API for manual instrumentation -->
<dependency>
    <groupId>io.opentelemetry</groupId>
    <artifactId>opentelemetry-api</artifactId>
    <version>1.44.1</version>
</dependency>
```

Now replace the Datadog trace API calls with OpenTelemetry equivalents:

```java
// BEFORE: Datadog manual instrumentation
// import datadog.trace.api.DDTags;
// import datadog.trace.api.Trace;
// import io.opentracing.Scope;
// import io.opentracing.Span;
// import io.opentracing.util.GlobalTracer;
//
// @Trace(operationName = "process.payment", resourceName = "PaymentService.process")
// public PaymentResult processPayment(String orderId, double amount) {
//     Span span = GlobalTracer.get().activeSpan();
//     span.setTag("order.id", orderId);
//     span.setTag("payment.amount", amount);
//     span.setTag(DDTags.ANALYTICS_SAMPLE_RATE, 1.0);
//     // ... business logic
// }

// AFTER: OpenTelemetry manual instrumentation
import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.StatusCode;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.context.Scope;

public class PaymentService {

    // Create a Tracer for this class (replaces GlobalTracer.get())
    private static final Tracer tracer =
        GlobalOpenTelemetry.getTracer("com.myapp.payments", "1.0.0");

    public PaymentResult processPayment(String orderId, double amount) {
        // Start a new span (replaces @Trace annotation)
        Span span = tracer.spanBuilder("process.payment")
            .setAttribute("order.id", orderId)
            .setAttribute("payment.amount", amount)
            .startSpan();

        // Make this span the current active span
        try (Scope scope = span.makeCurrent()) {
            // Your business logic here
            PaymentResult result = chargeCard(orderId, amount);

            // Add result attributes
            span.setAttribute("payment.success", result.isSuccess());
            span.setAttribute("payment.transaction_id", result.getTransactionId());

            return result;

        } catch (Exception e) {
            // Record the exception on the span (replaces span.setTag("error", true))
            span.setStatus(StatusCode.ERROR, e.getMessage());
            span.recordException(e);
            throw e;

        } finally {
            // Always end the span
            span.end();
        }
    }
}
```

### Replacing the @Trace Annotation

Datadog provides a `@Trace` annotation for declarative instrumentation. OpenTelemetry does not have a built-in annotation, but you can use the `@WithSpan` annotation from the instrumentation library:

```xml
<!-- Add the annotation dependency -->
<dependency>
    <groupId>io.opentelemetry.instrumentation</groupId>
    <artifactId>opentelemetry-instrumentation-annotations</artifactId>
    <version>2.11.0</version>
</dependency>
```

```java
// BEFORE: Datadog @Trace annotation
// @Trace(operationName = "validate.order")
// public boolean validateOrder(Order order) { ... }

// AFTER: OpenTelemetry @WithSpan annotation
import io.opentelemetry.instrumentation.annotations.WithSpan;
import io.opentelemetry.instrumentation.annotations.SpanAttribute;

// The @WithSpan annotation creates a span automatically
// @SpanAttribute captures method parameters as span attributes
@WithSpan("validate.order")
public boolean validateOrder(
        @SpanAttribute("order.id") String orderId,
        @SpanAttribute("order.item_count") int itemCount) {

    // Validation logic here
    boolean isValid = orderId != null && itemCount > 0;
    return isValid;
}
```

---

## Step 5: Migrate Custom Metrics

Datadog custom metrics typically use DogStatsD. Replace these with OpenTelemetry Metrics API calls:

```java
// BEFORE: Datadog DogStatsD metrics
// import com.timgroup.statsd.NonBlockingStatsDClient;
//
// NonBlockingStatsDClient statsd = new NonBlockingStatsDClient("myapp", "localhost", 8125);
// statsd.incrementCounter("orders.placed", "region:us-east", "type:standard");
// statsd.recordHistogramValue("orders.processing_time", duration, "region:us-east");
// statsd.gauge("orders.queue_size", queueSize);

// AFTER: OpenTelemetry Metrics API
import io.opentelemetry.api.GlobalOpenTelemetry;
import io.opentelemetry.api.common.AttributeKey;
import io.opentelemetry.api.common.Attributes;
import io.opentelemetry.api.metrics.LongCounter;
import io.opentelemetry.api.metrics.DoubleHistogram;
import io.opentelemetry.api.metrics.LongGauge;
import io.opentelemetry.api.metrics.Meter;

public class OrderMetrics {

    // Create a Meter for your application metrics
    private static final Meter meter =
        GlobalOpenTelemetry.getMeter("com.myapp.orders", "1.0.0");

    // Counter replaces statsd.incrementCounter
    private static final LongCounter ordersPlaced = meter
        .counterBuilder("orders.placed")
        .setDescription("Number of orders placed")
        .setUnit("orders")
        .build();

    // Histogram replaces statsd.recordHistogramValue
    private static final DoubleHistogram processingTime = meter
        .histogramBuilder("orders.processing_time")
        .setDescription("Order processing duration")
        .setUnit("ms")
        .build();

    // Gauge replaces statsd.gauge
    // Note: gauges in OTel use a callback pattern for async observation
    private static final LongGauge queueSize = meter
        .gaugeBuilder("orders.queue_size")
        .setDescription("Current order queue depth")
        .setUnit("orders")
        .ofLongs()
        .build();

    public void recordOrderPlaced(String region, String type) {
        // Attributes replace Datadog tags
        Attributes attrs = Attributes.of(
            AttributeKey.stringKey("region"), region,
            AttributeKey.stringKey("order.type"), type
        );
        ordersPlaced.add(1, attrs);
    }

    public void recordProcessingTime(double durationMs, String region) {
        Attributes attrs = Attributes.of(
            AttributeKey.stringKey("region"), region
        );
        processingTime.record(durationMs, attrs);
    }

    public void recordQueueSize(long size) {
        queueSize.set(size);
    }
}
```

---

## Step 6: Spring Boot Specific Configuration

Most Java services use Spring Boot. Here is how to configure OpenTelemetry specifically for Spring Boot applications using the starter dependency:

```xml
<!-- pom.xml: Spring Boot OpenTelemetry starter -->
<!-- This provides auto-configuration for Spring Boot applications -->
<dependency>
    <groupId>io.opentelemetry.instrumentation</groupId>
    <artifactId>opentelemetry-spring-boot-starter</artifactId>
    <version>2.11.0</version>
</dependency>
```

Configure via `application.yml` instead of Datadog's environment variables:

```yaml
# application.yml
# These settings replace the DD_* environment variables

otel:
  sdk:
    disabled: false
  service:
    name: order-service
  resource:
    attributes:
      deployment.environment: ${ENVIRONMENT:production}
      service.version: ${APP_VERSION:1.0.0}
  exporter:
    otlp:
      endpoint: ${OTEL_EXPORTER_OTLP_ENDPOINT:https://oneuptime.com/otlp}
      headers:
        x-oneuptime-token: ${ONEUPTIME_TOKEN:your-token-here}
  traces:
    sampler:
      # Sample all traces (equivalent to DD_TRACE_SAMPLE_RATE=1.0)
      name: parentbased_always_on
```

---

## Step 7: Migrate Kubernetes Deployment

If you are running in Kubernetes, update your deployment manifest to replace Datadog annotations with OpenTelemetry configuration:

```yaml
# BEFORE: Kubernetes deployment with Datadog
# annotations:
#   ad.datadoghq.com/order-service.check_names: '["openmetrics"]'
#   ad.datadoghq.com/order-service.init_configs: '[{}]'

# AFTER: Kubernetes deployment with OpenTelemetry
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  template:
    spec:
      containers:
        - name: order-service
          image: myregistry/order-service:1.5.0
          env:
            # OpenTelemetry configuration via environment variables
            - name: JAVA_TOOL_OPTIONS
              value: "-javaagent:/opt/opentelemetry-javaagent.jar"
            - name: OTEL_SERVICE_NAME
              value: "order-service"
            - name: OTEL_EXPORTER_OTLP_ENDPOINT
              value: "http://otel-collector.observability:4317"
            - name: OTEL_RESOURCE_ATTRIBUTES
              value: "deployment.environment=production,service.version=1.5.0"
```

---

## Verification

After completing the migration, verify these items:

1. **Traces appear** in your backend with the correct service name
2. **Automatic instrumentation** covers Spring MVC, JDBC, HTTP clients, and Kafka
3. **Custom spans** from manual instrumentation show up with correct attributes
4. **Metrics** are being collected and exported
5. **Context propagation** works across service boundaries (check that distributed traces connect)
6. **Error tracking** captures exceptions with stack traces

---

## Conclusion

Replacing the Datadog Java APM agent with OpenTelemetry is a clean swap. The OpenTelemetry Java agent provides equivalent automatic instrumentation for the same set of libraries, and the manual API is straightforward to adopt. The biggest win is that your Java services are no longer locked into a single vendor's pricing and ecosystem.

Start with one service, validate the telemetry output, and then roll the change across your fleet. The migration is typically a day of work per service for the initial setup, with custom instrumentation migration taking a bit longer depending on how much Datadog-specific API usage you have.

---

*Need a backend for your OpenTelemetry data? [OneUptime](https://oneuptime.com) provides full OTLP support with traces, metrics, logs, alerting, and dashboards. Try it free and see your Java telemetry in minutes.*
