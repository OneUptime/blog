# How to Implement a Custom ID Generator for OpenTelemetry Trace and Span IDs in Java Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Java, ID Generator, Distributed Tracing

Description: Implement a custom ID generator for OpenTelemetry trace and span IDs in Java to meet specific organizational or compliance requirements.

The OpenTelemetry SDK generates trace IDs (128-bit) and span IDs (64-bit) using a random number generator by default. In most cases, this works perfectly. But there are scenarios where you need custom ID generation: embedding a timestamp prefix for time-based querying, incorporating a datacenter identifier for routing, or meeting specific compliance requirements for ID formats.

## The IdGenerator Interface

In the Java SDK, the `IdGenerator` interface defines two methods:

```java
public interface IdGenerator {
    // Generate a 128-bit trace ID as a 32-character hex string
    String generateTraceId();

    // Generate a 64-bit span ID as a 16-character hex string
    String generateSpanId();
}
```

Both methods must return lowercase hex strings. Trace IDs are 32 characters (128 bits), and span IDs are 16 characters (64 bits). The IDs must not be all zeros, as the zero ID has special meaning (invalid/not-sampled).

## Example: Timestamp-Prefixed Trace IDs

This generator embeds a timestamp in the first 8 bytes of the trace ID, making it possible to sort and filter traces by creation time:

```java
import io.opentelemetry.sdk.trace.IdGenerator;
import java.util.concurrent.ThreadLocalRandom;

public class TimestampPrefixedIdGenerator implements IdGenerator {

    @Override
    public String generateTraceId() {
        // First 8 bytes: current time in milliseconds
        long timestampMillis = System.currentTimeMillis();

        // Last 8 bytes: random for uniqueness
        long random = ThreadLocalRandom.current().nextLong();

        // Format as 32-character hex string
        // The timestamp prefix enables time-range queries on trace IDs
        return String.format("%016x%016x", timestampMillis, random);
    }

    @Override
    public String generateSpanId() {
        // Span IDs remain purely random since they do not need
        // to be globally sortable
        long random = ThreadLocalRandom.current().nextLong();

        // Ensure we never return all zeros
        while (random == 0) {
            random = ThreadLocalRandom.current().nextLong();
        }
        return String.format("%016x", random);
    }
}
```

## Example: Datacenter-Aware Trace IDs

If you run services across multiple datacenters and want the trace ID to encode the origin:

```java
import io.opentelemetry.sdk.trace.IdGenerator;
import java.util.concurrent.ThreadLocalRandom;

public class DatacenterAwareIdGenerator implements IdGenerator {

    // 2-byte datacenter ID (e.g., 0x0001 for us-east, 0x0002 for eu-west)
    private final short datacenterId;

    public DatacenterAwareIdGenerator(short datacenterId) {
        this.datacenterId = datacenterId;
    }

    @Override
    public String generateTraceId() {
        // Bytes 0-1: datacenter identifier
        // Bytes 2-7: timestamp in seconds (enough for ~8900 years)
        // Bytes 8-15: random component
        long timestamp = System.currentTimeMillis() / 1000;
        long random = ThreadLocalRandom.current().nextLong();

        // Pack datacenter ID and timestamp into first 8 bytes
        long high = ((long) datacenterId << 48) | (timestamp & 0x0000FFFFFFFFFFFFL);

        return String.format("%016x%016x", high, random);
    }

    @Override
    public String generateSpanId() {
        long random = ThreadLocalRandom.current().nextLong();
        while (random == 0) {
            random = ThreadLocalRandom.current().nextLong();
        }
        return String.format("%016x", random);
    }
}
```

## Registering the Custom ID Generator

Wire the custom generator into your TracerProvider:

```java
import io.opentelemetry.sdk.trace.SdkTracerProvider;
import io.opentelemetry.sdk.trace.export.BatchSpanProcessor;
import io.opentelemetry.exporter.otlp.trace.OtlpGrpcSpanExporter;

public class TracingSetup {
    public static SdkTracerProvider createProvider() {
        // Create your custom ID generator
        IdGenerator idGenerator = new TimestampPrefixedIdGenerator();

        OtlpGrpcSpanExporter exporter = OtlpGrpcSpanExporter.builder()
            .setEndpoint("http://collector:4317")
            .build();

        return SdkTracerProvider.builder()
            // Register the custom generator here
            .setIdGenerator(idGenerator)
            .addSpanProcessor(BatchSpanProcessor.builder(exporter).build())
            .build();
    }
}
```

## Important Constraints

Your custom IDs must follow the W3C Trace Context specification:

1. **Trace IDs must be 16 bytes (32 hex characters)**. Not more, not less.
2. **Span IDs must be 8 bytes (16 hex characters)**.
3. **Neither can be all zeros**. Zero IDs are treated as invalid.
4. **IDs should have sufficient randomness**. At least 8 bytes of randomness is recommended to avoid collisions in distributed systems.

```java
// Validation helper to ensure your generator produces valid IDs
public class IdValidator {
    private static final String INVALID_TRACE_ID = "00000000000000000000000000000000";
    private static final String INVALID_SPAN_ID = "0000000000000000";

    public static boolean isValidTraceId(String traceId) {
        return traceId != null
            && traceId.length() == 32
            && !traceId.equals(INVALID_TRACE_ID)
            && traceId.matches("[0-9a-f]{32}");
    }

    public static boolean isValidSpanId(String spanId) {
        return spanId != null
            && spanId.length() == 16
            && !spanId.equals(INVALID_SPAN_ID)
            && spanId.matches("[0-9a-f]{16}");
    }
}
```

## Thread Safety

The `IdGenerator` methods can be called from multiple threads simultaneously. Make sure your implementation is thread-safe. Using `ThreadLocalRandom` instead of a shared `Random` instance avoids contention:

```java
// Good: ThreadLocalRandom is lock-free per thread
long random = ThreadLocalRandom.current().nextLong();

// Avoid: Shared Random instance causes contention under load
// private final Random random = new Random();
// long value = random.nextLong(); // Synchronized internally
```

## Testing Your Generator

Write tests that verify your generator produces valid, unique IDs:

```java
import org.junit.jupiter.api.Test;
import java.util.HashSet;
import java.util.Set;
import static org.junit.jupiter.api.Assertions.*;

class TimestampPrefixedIdGeneratorTest {
    private final IdGenerator generator = new TimestampPrefixedIdGenerator();

    @Test
    void generateTraceId_producesValidFormat() {
        String traceId = generator.generateTraceId();
        assertEquals(32, traceId.length());
        assertTrue(traceId.matches("[0-9a-f]{32}"));
        assertNotEquals("00000000000000000000000000000000", traceId);
    }

    @Test
    void generateTraceId_producesUniqueIds() {
        Set<String> ids = new HashSet<>();
        for (int i = 0; i < 100_000; i++) {
            assertTrue(ids.add(generator.generateTraceId()),
                "Duplicate trace ID detected");
        }
    }

    @Test
    void generateTraceId_embedsTimestamp() {
        long before = System.currentTimeMillis();
        String traceId = generator.generateTraceId();
        long after = System.currentTimeMillis();

        // Extract timestamp from first 16 hex chars
        long embedded = Long.parseUnsignedLong(traceId.substring(0, 16), 16);
        assertTrue(embedded >= before && embedded <= after);
    }
}
```

Custom ID generators give you control over trace and span identification while maintaining compatibility with the OpenTelemetry ecosystem. Just make sure your IDs meet the specification requirements and have enough randomness to prevent collisions across your distributed system.
