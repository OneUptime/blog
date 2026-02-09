# How to Instrument Java Applications for Continuous Profiling with the OpenTelemetry Profiling Signal

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Java, Profiling, JFR

Description: Set up continuous profiling for Java applications using OpenTelemetry's profiling signal with JFR integration to capture CPU and allocation profiles.

Java has one of the best built-in profiling tools available: Java Flight Recorder (JFR). It captures detailed performance data with extremely low overhead, making it suitable for production use. The OpenTelemetry Java agent bridges JFR with the OpenTelemetry profiling signal, letting you send continuous profiling data to your observability backend alongside traces, metrics, and logs.

## How Java Profiling Works with OpenTelemetry

The integration works by:

1. The OpenTelemetry Java agent starts a JFR recording inside your application
2. JFR captures CPU samples, memory allocations, lock contention, and other events
3. The agent periodically reads the JFR data and converts it to OpenTelemetry profile format
4. Profile data is exported via OTLP to your collector or backend
5. Trace context (trace ID, span ID) is attached to profile samples for correlation

## Setting Up the Java Agent with Profiling

Download the OpenTelemetry Java agent and start your application with profiling enabled:

```bash
# Download the latest OpenTelemetry Java agent
curl -L -o opentelemetry-javaagent.jar \
  "https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/latest/download/opentelemetry-javaagent.jar"

# Start your application with profiling enabled
java \
  -javaagent:opentelemetry-javaagent.jar \
  -Dotel.service.name=order-service \
  -Dotel.exporter.otlp.endpoint=http://localhost:4317 \
  -Dotel.profiling.enabled=true \
  -jar order-service.jar
```

## Configuration Options

Fine-tune the profiling behavior with these properties:

```bash
java \
  -javaagent:opentelemetry-javaagent.jar \
  # Basic OTel configuration
  -Dotel.service.name=order-service \
  -Dotel.exporter.otlp.endpoint=http://localhost:4317 \
  -Dotel.resource.attributes="deployment.environment=production,service.version=2.1.0" \
  # Enable the profiling signal
  -Dotel.profiling.enabled=true \
  # CPU profiling sampling interval (default: 10ms)
  -Dotel.profiling.sampling.interval=10ms \
  # How often to export profile data (default: 60s)
  -Dotel.profiling.export.interval=60s \
  # Enable allocation profiling
  -Dotel.profiling.memory.enabled=true \
  # Allocation sampling threshold in bytes
  -Dotel.profiling.memory.allocation.threshold=524288 \
  -jar order-service.jar
```

You can also configure using environment variables:

```bash
export OTEL_SERVICE_NAME=order-service
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
export OTEL_PROFILING_ENABLED=true
export OTEL_PROFILING_SAMPLING_INTERVAL=10ms
export OTEL_PROFILING_MEMORY_ENABLED=true

java -javaagent:opentelemetry-javaagent.jar -jar order-service.jar
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

ENV JAVA_TOOL_OPTIONS="-javaagent:/opt/otel/opentelemetry-javaagent.jar"
ENV OTEL_SERVICE_NAME=order-service
ENV OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
ENV OTEL_PROFILING_ENABLED=true

ENTRYPOINT ["java", "-jar", "order-service.jar"]
```

## Understanding the Profile Data

The Java profiler captures several types of events:

### CPU Profiling

CPU samples show where your application spends processing time. Each sample contains a full stack trace captured at the configured interval:

```
Sample at 2026-02-06T10:15:32.123Z (trace_id=abc123, span_id=def456):
  com.yourorg.order.service.OrderService.processOrder(OrderService.java:45)
  com.yourorg.order.service.PricingEngine.calculateTotal(PricingEngine.java:112)
  com.yourorg.order.service.TaxCalculator.computeTax(TaxCalculator.java:78)
  java.math.BigDecimal.multiply(BigDecimal.java:1550)
```

### Memory Allocation Profiling

Allocation profiling shows where your application creates objects. This is crucial for finding memory pressure and garbage collection issues:

```
Allocation event at 2026-02-06T10:15:32.456Z:
  Type: byte[]
  Size: 1048576 bytes
  Stack:
    com.yourorg.order.repository.OrderRepository.fetchOrders(OrderRepository.java:89)
    com.fasterxml.jackson.databind.ObjectMapper.readValue(ObjectMapper.java:3713)
    java.io.ByteArrayOutputStream.grow(ByteArrayOutputStream.java:120)
```

## Correlating Profiles with Traces

The Java agent automatically attaches trace context to profile samples. When you examine a slow trace in your tracing UI, you can drill down into the profile data for that specific request:

```java
// This span will have associated profile data
@GetMapping("/api/orders/{id}")
public Order getOrder(@PathVariable String id) {
    // The profiler is sampling during this method's execution
    // and will attach the current trace_id and span_id
    Order order = orderRepository.findById(id);
    enrichOrderWithPricing(order);
    return order;
}
```

The trace shows that `getOrder` took 500ms. The correlated profile data shows exactly where within that method the time was spent, down to the specific Java methods and line numbers.

## JFR Custom Events

You can enrich the profiling data with custom JFR events:

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
# Production-safe profiling configuration
java \
  -javaagent:opentelemetry-javaagent.jar \
  -Dotel.profiling.enabled=true \
  # 10ms is safe for production (approximately 1% overhead)
  -Dotel.profiling.sampling.interval=10ms \
  # Export every 60 seconds to reduce network overhead
  -Dotel.profiling.export.interval=60s \
  # Enable allocation profiling with a high threshold
  # to only capture large allocations
  -Dotel.profiling.memory.enabled=true \
  -Dotel.profiling.memory.allocation.threshold=1048576 \
  # Standard JVM tuning
  -XX:+UseG1GC \
  -XX:MaxGCPauseMillis=200 \
  -Xms2g -Xmx2g \
  -jar order-service.jar
```

The combination of JFR and OpenTelemetry gives you production-grade profiling that integrates with your existing observability stack. You do not need a separate profiling tool or a different workflow. The profiles flow through the same collector, use the same OTLP protocol, and correlate with the traces you are already collecting.
