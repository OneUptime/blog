# How to Instrument Java Applications for Continuous Profiling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Java, Profiling, JFR

Description: Set up continuous profiling for Java applications using OpenTelemetry's profiling signal with JFR integration to capture CPU and allocation profiles.

Java has one of the best built-in profiling tools available: Java Flight Recorder (JFR). It captures detailed performance data with low overhead, making it suitable for production use. The OpenTelemetry Java agent instruments your application for traces, metrics, and logs, while JFR captures CPU, allocation, lock, and JVM runtime events. As of June 2026, the official OpenTelemetry Java agent does not include a built-in switch that exports JFR recordings as OpenTelemetry Profiles; OpenTelemetry profile support in Java is still alpha and requires separate profile SDK/exporter code or a backend-specific profiler.

## How Java Profiling Works with OpenTelemetry

The integration works by:

1. The OpenTelemetry Java agent instruments your application for traces, metrics, and logs
2. JFR starts from a JVM option or a `jcmd` command
3. JFR captures CPU samples, memory allocations, lock contention, and other events
4. JFR recordings are written to `.jfr` files for analysis in JDK Mission Control or a backend that accepts JFR data
5. If you need OTLP profile export, use the alpha OpenTelemetry profiles SDK/exporter or a backend-specific profiling integration

## Setting Up the Java Agent with Profiling

Download the OpenTelemetry Java agent and start your application with the agent and JFR enabled:

```bash
# Download the latest OpenTelemetry Java agent

curl -L -o opentelemetry-javaagent.jar \
  "https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/latest/download/opentelemetry-javaagent.jar"

# Start your application with OpenTelemetry and JFR enabled
java \
  -javaagent:opentelemetry-javaagent.jar \
  -Dotel.service.name=order-service \
  -Dotel.exporter.otlp.endpoint=http://localhost:4318 \
  -XX:StartFlightRecording=filename=/tmp/order-service-%p.jfr,settings=profile,dumponexit=true,maxage=1h,maxsize=256m \
  -jar order-service.jar
```

## Configuration Options

Fine-tune OpenTelemetry and JFR behavior with these options:

```bash
# Basic OTel configuration
# JFR starts with the built-in profile configuration and keeps a bounded on-disk recording
java \
  -javaagent:opentelemetry-javaagent.jar \
  -Dotel.service.name=order-service \
  -Dotel.exporter.otlp.endpoint=http://localhost:4318 \
  -Dotel.resource.attributes="deployment.environment=production,service.version=2.1.0" \
  -XX:StartFlightRecording=filename=/tmp/order-service-%p.jfr,settings=profile,dumponexit=true,maxage=1h,maxsize=256m \
  -jar order-service.jar
```

You can also configure using environment variables:

```bash
export OTEL_SERVICE_NAME=order-service
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
export JAVA_TOOL_OPTIONS="-javaagent:opentelemetry-javaagent.jar -XX:StartFlightRecording=filename=/tmp/order-service-%p.jfr,settings=profile,dumponexit=true,maxage=1h,maxsize=256m"

java -jar order-service.jar
```

## Spring Boot Integration

For Spring Boot applications, add the agent to your Docker entrypoint:

```dockerfile
FROM eclipse-temurin:21-jre

WORKDIR /app

# Copy the OTel Java agent
COPY --from=build /opentelemetry-javaagent.jar /opt/otel/opentelemetry-javaagent.jar

# Copy the application
COPY target/order-service.jar /app/order-service.jar

ENV JAVA_TOOL_OPTIONS="-javaagent:/opt/otel/opentelemetry-javaagent.jar -XX:StartFlightRecording=filename=/tmp/order-service-%p.jfr,settings=profile,dumponexit=true,maxage=1h,maxsize=256m"
ENV OTEL_SERVICE_NAME=order-service
ENV OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318

ENTRYPOINT ["java", "-jar", "order-service.jar"]
```

## Understanding the Profile Data

JFR captures several types of events:

### CPU Profiling

CPU samples show where your application spends processing time. Each sample contains a stack trace captured by JFR:

```text
Sample at 2026-02-06T10:15:32.123Z:
  com.yourorg.order.service.OrderService.processOrder(OrderService.java:45)
  com.yourorg.order.service.PricingEngine.calculateTotal(PricingEngine.java:112)
  com.yourorg.order.service.TaxCalculator.computeTax(TaxCalculator.java:78)
  java.math.BigDecimal.multiply(BigDecimal.java:1550)
```

### Memory Allocation Profiling

Allocation profiling shows where your application creates objects. This is crucial for finding memory pressure and garbage collection issues:

```text
Allocation event at 2026-02-06T10:15:32.456Z:
  Type: byte[]
  Size: 1048576 bytes
  Stack:
    com.yourorg.order.repository.OrderRepository.fetchOrders(OrderRepository.java:89)
    com.fasterxml.jackson.databind.ObjectMapper.readValue(ObjectMapper.java:3713)
    java.io.ByteArrayOutputStream.grow(ByteArrayOutputStream.java:120)
```

## Correlating Profiles with Traces

The OpenTelemetry Java agent does not automatically attach trace IDs and span IDs to JFR execution samples. You can still correlate traces and profiles by service name, deployment metadata, timestamps, and thread names, or by using a backend-specific profiler that adds this correlation.

```java
// This span will be exported by the OpenTelemetry Java agent
@GetMapping("/api/orders/{id}")
public Order getOrder(@PathVariable String id) {
    // JFR may sample this method while the request is running
    Order order = orderRepository.findById(id);
    enrichOrderWithPricing(order);
    return order;
}
```

The trace shows that `getOrder` took 500ms. A JFR recording from the same service and time window can show where CPU time, blocking, or allocations occurred, down to Java methods and line numbers when that information is available.

## JFR Custom Events

You can enrich the JFR recording with custom JFR events:

```java
import jdk.jfr.Category;
import jdk.jfr.Description;
import jdk.jfr.Event;
import jdk.jfr.Label;
import jdk.jfr.Name;

@Name("com.yourorg.OrderProcessed")
@Label("Order Processed")
@Category("Application")
@Description("Fired when an order is successfully processed")
public class OrderProcessedEvent extends Event {
    @Label("Order ID")
    public String orderId;

    @Label("Total Amount")
    public double totalAmount;

    @Label("Item Count")
    public int itemCount;
}

// Usage in your service
public Order processOrder(OrderRequest request) {
    OrderProcessedEvent event = new OrderProcessedEvent();
    event.begin();

    Order order = createOrder(request);
    event.orderId = order.getId();
    event.totalAmount = order.getTotal();
    event.itemCount = order.getItems().size();

    event.commit();
    return order;
}
```

## Production Tuning

For production Java applications, use these recommended settings:

```bash
# Production-safe telemetry and JFR configuration
# Use settings=default for lower overhead continuous recordings; switch to settings=profile for short investigations.
java \
  -javaagent:opentelemetry-javaagent.jar \
  -Dotel.service.name=order-service \
  -Dotel.exporter.otlp.endpoint=http://otel-collector:4318 \
  -XX:StartFlightRecording=filename=/tmp/order-service-%p.jfr,settings=default,dumponexit=true,maxage=1h,maxsize=256m \
  -XX:+UseG1GC \
  -XX:MaxGCPauseMillis=200 \
  -Xms2g -Xmx2g \
  -jar order-service.jar
```

The combination of JFR and OpenTelemetry gives you production-grade Java profiling alongside your existing observability stack. The OpenTelemetry profile signal and Java profile exporters are still evolving, so verify profile ingestion support in your collector and backend before relying on OTLP profiles in production.
