# How to Fix Memory Leaks in the OpenTelemetry Java Agent Caused by Instrumentation Holding Object References

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Java, Memory Leak, JVM

Description: Identify and fix memory leaks caused by the OpenTelemetry Java agent holding references to objects that should be garbage collected.

The OpenTelemetry Java agent can cause memory leaks when its instrumentation holds references to request objects, database connections, or other per-request data beyond their expected lifecycle. These leaks manifest as gradually increasing heap usage that eventually leads to OutOfMemoryError. This post covers how to identify and fix these leaks.

## Symptoms

- Heap usage grows steadily over hours or days
- Full GC events become more frequent
- Eventually `java.lang.OutOfMemoryError: Java heap space`
- Memory usage drops to baseline after restart

## Diagnosing the Leak

### Step 1: Take Heap Dumps

```bash
# Trigger a heap dump
jcmd <pid> GC.heap_dump /tmp/heap.hprof

# Or set JVM flags to dump on OOM
java -XX:+HeapDumpOnOutOfMemoryError \
     -XX:HeapDumpPath=/tmp/heap-oom.hprof \
     -javaagent:opentelemetry-javaagent.jar \
     -jar myapp.jar
```

### Step 2: Analyze with Eclipse MAT or VisualVM

Open the heap dump in Eclipse MAT and look for:
- Objects retained by `io.opentelemetry.javaagent` classes
- Large numbers of `ReadableSpan` or `SpanData` objects
- Request/response objects retained by span attributes

### Step 3: Check Retained Paths

In Eclipse MAT, use "Path to GC Roots" on suspected objects. If the path goes through OpenTelemetry instrumentation classes, you have found the leak.

## Common Leak Sources

### Leak 1: Span Attributes Holding Large Objects

```java
// BAD - stores the entire request body as an attribute
Span span = tracer.spanBuilder("process").startSpan();
span.setAttribute("request.body", requestBody.toString()); // 10MB string!
```

**Fix:** Only store small, serializable values:

```java
Span span = tracer.spanBuilder("process").startSpan();
span.setAttribute("request.content_length", requestBody.length());
span.setAttribute("request.content_type", "application/json");
```

### Leak 2: Unclosed Spans in Error Paths

```java
// BAD - span never closed on exception
Span span = tracer.spanBuilder("query").startSpan();
ResultSet rs = connection.executeQuery(sql); // throws!
span.end(); // never reached
```

**Fix:** Always use try/finally:

```java
Span span = tracer.spanBuilder("query").startSpan();
try (Scope scope = span.makeCurrent()) {
    ResultSet rs = connection.executeQuery(sql);
    return processResults(rs);
} catch (Exception e) {
    span.setStatus(StatusCode.ERROR, e.getMessage());
    span.recordException(e);
    throw e;
} finally {
    span.end();
}
```

### Leak 3: Batch Processor Queue Growing Unbounded

If the exporter is slow or failing, the batch processor queue accumulates spans:

```bash
# Limit the queue size
-Dotel.bsp.max.queue.size=2048
-Dotel.bsp.max.export.batch.size=512
-Dotel.bsp.schedule.delay=5000
```

## Fix 1: Update the Java Agent

Memory leak fixes are regularly released. Update to the latest version:

```bash
# Download the latest agent
curl -L -o opentelemetry-javaagent.jar \
  https://github.com/open-telemetry/opentelemetry-java-instrumentation/releases/latest/download/opentelemetry-javaagent.jar
```

## Fix 2: Limit Span Attribute Sizes

Configure the agent to truncate large attribute values:

```bash
java -javaagent:opentelemetry-javaagent.jar \
     -Dotel.attribute.value.length.limit=256 \
     -Dotel.span.attribute.value.length.limit=256 \
     -Dotel.span.attribute.count.limit=64 \
     -jar myapp.jar
```

## Fix 3: Disable Problematic Instrumentations

If a specific instrumentation causes the leak, disable it:

```bash
# Disable the leaking instrumentation
-Dotel.instrumentation.spring-webmvc.enabled=false
```

Use heap analysis to identify which instrumentation is retaining objects.

## Fix 4: Tune the Batch Span Processor

```bash
# Smaller queue, more frequent exports
-Dotel.bsp.max.queue.size=2048
-Dotel.bsp.schedule.delay=2000
-Dotel.bsp.export.timeout=10000
```

## Monitoring for Leaks

Add JVM metrics to detect leaks early:

```bash
# Enable JVM metrics
-Dotel.instrumentation.runtime-telemetry.enabled=true
```

Monitor these metrics:
- `process.runtime.jvm.memory.usage` (heap usage over time)
- `process.runtime.jvm.gc.duration` (GC frequency and duration)
- `process.runtime.jvm.classes.loaded` (class loading leaks)

Set an alert when heap usage after GC exceeds 80%:

```yaml
alert: JvmHeapLeakDetected
expr: jvm_memory_used_bytes{area="heap"} / jvm_memory_max_bytes{area="heap"} > 0.8
for: 30m
labels:
  severity: warning
```

If heap usage after GC events keeps climbing, you have a leak. The 30-minute `for` window ensures you are looking at a trend, not a transient spike.

The OpenTelemetry Java agent is well-tested, but leaks can still occur through custom instrumentation, large span attributes, or unclosed spans. Regular heap monitoring catches these issues before they cause production outages.
