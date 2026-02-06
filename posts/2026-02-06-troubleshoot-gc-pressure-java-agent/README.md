# How to Troubleshoot High GC Pressure and p99 Latency Spikes Caused by OpenTelemetry Java Agent Span Allocation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Java, Garbage Collection, Performance

Description: Reduce GC pressure and p99 latency spikes caused by excessive span object allocation from the OpenTelemetry Java agent.

The OpenTelemetry Java agent creates span objects for every instrumented operation. Each span allocates memory for its name, attributes, events, and links. Under high throughput, this allocation rate can trigger frequent garbage collection pauses, causing p99 latency spikes that appear unrelated to application logic.

## Identifying GC-Related Latency Spikes

Enable GC logging to correlate GC pauses with latency spikes:

```bash
java -javaagent:opentelemetry-javaagent.jar \
     -Xlog:gc*:file=/var/log/gc.log:time,level,tags \
     -jar myapp.jar
```

Look for GC pauses that coincide with your p99 latency spikes. If every latency spike aligns with a GC event, span allocation is likely the cause.

## Measuring Allocation Rate

```bash
# Monitor allocation rate with jstat
jstat -gcutil <pid> 1000

# High S0/S1 (survivor space) usage and frequent YGC (young GC) indicate high allocation
```

## Fix 1: Reduce Span Volume with Sampling

The most effective fix is to produce fewer spans:

```bash
# Sample 10% of traces
java -javaagent:opentelemetry-javaagent.jar \
     -Dotel.traces.sampler=parentbased_traceidratio \
     -Dotel.traces.sampler.arg=0.1 \
     -jar myapp.jar
```

This reduces span allocation by 90%, proportionally reducing GC pressure.

## Fix 2: Limit Span Attributes

Each attribute on a span allocates memory. Limit the number and size of attributes:

```bash
java -javaagent:opentelemetry-javaagent.jar \
     -Dotel.span.attribute.count.limit=32 \
     -Dotel.attribute.value.length.limit=128 \
     -Dotel.span.event.count.limit=8 \
     -Dotel.span.link.count.limit=4 \
     -jar myapp.jar
```

## Fix 3: Disable High-Volume Instrumentations

Some instrumentations create spans for every low-level operation:

```bash
# Disable instrumentation for high-volume, low-value operations
java -javaagent:opentelemetry-javaagent.jar \
     -Dotel.instrumentation.jdbc-datasource.enabled=false \
     -Dotel.instrumentation.internal-class-loader.enabled=false \
     -Dotel.instrumentation.executors.enabled=false \
     -jar myapp.jar
```

JDBC instrumentation, in particular, can generate a span for every database query. If your service makes hundreds of queries per request, that is hundreds of span objects allocated per request.

## Fix 4: Tune the Batch Span Processor

A smaller batch processor queue means spans are exported and garbage-collected sooner:

```bash
java -javaagent:opentelemetry-javaagent.jar \
     -Dotel.bsp.max.queue.size=2048 \
     -Dotel.bsp.schedule.delay=2000 \
     -Dotel.bsp.max.export.batch.size=512 \
     -jar myapp.jar
```

More frequent exports (lower `schedule.delay`) keep the queue smaller, reducing the amount of live span data on the heap at any given time.

## Fix 5: Increase Heap and Tune GC

If you cannot reduce span volume, give the JVM more headroom:

```bash
java -javaagent:opentelemetry-javaagent.jar \
     -Xmx4g -Xms4g \
     -XX:+UseG1GC \
     -XX:MaxGCPauseMillis=50 \
     -XX:G1NewSizePercent=30 \
     -XX:G1MaxNewSizePercent=40 \
     -jar myapp.jar
```

A larger young generation reduces YGC frequency. The G1 collector with a low pause target helps keep pauses short.

## Fix 6: Use the SDK Instead of the Agent

The SDK gives you fine-grained control over which operations are instrumented:

```java
@RestController
public class OrderController {

    private final Tracer tracer;

    @GetMapping("/api/orders/{id}")
    public Order getOrder(@PathVariable String id) {
        // Only create spans for meaningful operations
        Span span = tracer.spanBuilder("getOrder")
            .setAttribute("order.id", id)
            .startSpan();
        try (Scope scope = span.makeCurrent()) {
            return orderService.findById(id);
        } finally {
            span.end();
        }
    }
}
```

With manual instrumentation, you control exactly how many spans are created per request.

## Monitoring GC Impact

Add these JVM metrics to your dashboard:

```bash
# Enable JVM runtime metrics
-Dotel.instrumentation.runtime-telemetry.enabled=true
```

Key metrics:
- `process.runtime.jvm.gc.duration` - GC pause duration
- `process.runtime.jvm.memory.usage` - Heap usage
- `process.runtime.jvm.memory.committed` - Committed memory

Create an alert for GC pauses exceeding your SLA:

```yaml
alert: HighGCPause
expr: rate(jvm_gc_pause_seconds_sum[5m]) / rate(jvm_gc_pause_seconds_count[5m]) > 0.1
for: 10m
```

## Summary

GC pressure from span allocation is a real performance concern in high-throughput Java applications. The most effective fixes are sampling (produce fewer spans), disabling high-volume instrumentations, and limiting attribute counts. Always monitor GC behavior alongside your application latency to catch these issues early.
