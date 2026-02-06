# How to Build a Custom ID Generator for Trace and Span IDs That Integrates with Your Existing Correlation System

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Custom ID Generator, Trace ID, Span ID, Correlation

Description: Build a custom OpenTelemetry ID generator that produces trace and span IDs compatible with your existing correlation system for seamless integration.

OpenTelemetry generates random 128-bit trace IDs and 64-bit span IDs by default. This works fine for greenfield projects, but if your organization already has a correlation system with its own ID format, you might want OpenTelemetry to produce IDs that are compatible with it. A custom ID generator lets you control exactly how trace and span IDs are created.

## Why Custom IDs?

Common reasons to customize ID generation:

- Your existing logging system uses a specific request ID format, and you want trace IDs to match
- You want to embed metadata in the trace ID (region, service shard, timestamp)
- Your backend requires a specific ID format for efficient indexing
- You need to correlate OpenTelemetry traces with an existing non-OpenTelemetry system

## Python: Custom ID Generator

```python
# custom_id_generator.py
import time
import os
import struct
import threading
from opentelemetry.sdk.trace.id_generator import IdGenerator


class CorrelationIdGenerator(IdGenerator):
    """
    Custom ID generator that produces trace IDs compatible with our
    existing correlation system.

    Our correlation ID format (128 bits / 32 hex chars):
    - Bits 127-96: Unix timestamp in seconds (32 bits)
    - Bits 95-80:  Region code (16 bits)
    - Bits 79-64:  Service shard ID (16 bits)
    - Bits 63-0:   Random component (64 bits)

    This format has several advantages:
    - IDs are roughly time-ordered, which helps with database indexing
    - You can extract the region and shard from the ID for routing
    - The random component ensures uniqueness
    """

    # Region code mapping
    REGIONS = {
        "us-east-1": 0x0001,
        "us-west-2": 0x0002,
        "eu-west-1": 0x0003,
        "ap-south-1": 0x0004,
    }

    def __init__(self, region: str = "us-east-1", shard_id: int = 0):
        self._region_code = self.REGIONS.get(region, 0x0000)
        self._shard_id = shard_id & 0xFFFF
        self._counter = 0
        self._lock = threading.Lock()

    def generate_span_id(self) -> int:
        """
        Generate a 64-bit span ID.
        Format:
        - Bits 63-32: Lower 32 bits of timestamp (for ordering)
        - Bits 31-16: Counter (for uniqueness within same timestamp)
        - Bits 15-0:  Random (for additional entropy)
        """
        timestamp_low = int(time.time()) & 0xFFFFFFFF

        with self._lock:
            self._counter = (self._counter + 1) & 0xFFFF
            counter = self._counter

        random_bits = int.from_bytes(os.urandom(2), byteorder="big")

        span_id = (timestamp_low << 32) | (counter << 16) | random_bits

        # Span ID must not be 0
        if span_id == 0:
            span_id = 1

        return span_id

    def generate_trace_id(self) -> int:
        """
        Generate a 128-bit trace ID that encodes region and shard metadata.
        """
        timestamp = int(time.time()) & 0xFFFFFFFF
        random_bits = int.from_bytes(os.urandom(8), byteorder="big")

        # Build the 128-bit trace ID
        trace_id = (
            (timestamp << 96) |
            (self._region_code << 80) |
            (self._shard_id << 64) |
            random_bits
        )

        # Trace ID must not be 0
        if trace_id == 0:
            trace_id = 1

        return trace_id


def extract_metadata_from_trace_id(trace_id_hex: str) -> dict:
    """
    Utility function to extract embedded metadata from a trace ID.
    Useful for log correlation and debugging.
    """
    trace_id = int(trace_id_hex, 16)

    timestamp = (trace_id >> 96) & 0xFFFFFFFF
    region_code = (trace_id >> 80) & 0xFFFF
    shard_id = (trace_id >> 64) & 0xFFFF

    # Reverse lookup region name
    region_names = {v: k for k, v in CorrelationIdGenerator.REGIONS.items()}
    region = region_names.get(region_code, f"unknown-{region_code:#06x}")

    return {
        "timestamp": timestamp,
        "region": region,
        "shard_id": shard_id,
        "generated_at": time.strftime(
            "%Y-%m-%d %H:%M:%S", time.gmtime(timestamp)
        ),
    }
```

## Registering the Custom Generator

```python
# main.py
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry import trace
import os

from custom_id_generator import CorrelationIdGenerator

# Read region and shard from environment
region = os.environ.get("DEPLOY_REGION", "us-east-1")
shard_id = int(os.environ.get("SHARD_ID", "0"))

# Create the tracer provider with the custom ID generator
provider = TracerProvider(
    id_generator=CorrelationIdGenerator(
        region=region,
        shard_id=shard_id,
    )
)

provider.add_span_processor(
    BatchSpanProcessor(
        OTLPSpanExporter(endpoint="http://localhost:4317")
    )
)

trace.set_tracer_provider(provider)

# Now all traces will have IDs that encode region and shard metadata
tracer = trace.get_tracer("my-service")
with tracer.start_as_current_span("process-order") as span:
    trace_id = format(span.get_span_context().trace_id, "032x")
    print(f"Trace ID: {trace_id}")
    # Output: Trace ID: 65a1b2c300010000a1b2c3d4e5f67890
    # Decodes to: timestamp=2025-01-12, region=us-east-1, shard=0
```

## Java: Custom ID Generator

```java
// CorrelationIdGenerator.java
import io.opentelemetry.sdk.trace.IdGenerator;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.atomic.AtomicInteger;

public class CorrelationIdGenerator implements IdGenerator {

    private final int regionCode;
    private final int shardId;
    private final AtomicInteger counter = new AtomicInteger(0);

    public CorrelationIdGenerator(String region, int shardId) {
        this.regionCode = regionToCode(region);
        this.shardId = shardId & 0xFFFF;
    }

    @Override
    public String generateTraceId() {
        long timestamp = System.currentTimeMillis() / 1000;
        long random = ThreadLocalRandom.current().nextLong();

        // High 64 bits: timestamp (32) + region (16) + shard (16)
        long high = ((timestamp & 0xFFFFFFFFL) << 32)
                   | ((long)(regionCode & 0xFFFF) << 16)
                   | (shardId & 0xFFFF);

        // Low 64 bits: random
        long low = random;

        return String.format("%016x%016x", high, low);
    }

    @Override
    public String generateSpanId() {
        long timestamp = System.currentTimeMillis() / 1000;
        int count = counter.incrementAndGet() & 0xFFFF;
        int random = ThreadLocalRandom.current().nextInt() & 0xFFFF;

        long spanId = ((timestamp & 0xFFFFFFFFL) << 32)
                    | ((long)count << 16)
                    | random;

        return String.format("%016x", spanId == 0 ? 1 : spanId);
    }

    private static int regionToCode(String region) {
        return switch (region) {
            case "us-east-1" -> 0x0001;
            case "us-west-2" -> 0x0002;
            case "eu-west-1" -> 0x0003;
            default -> 0x0000;
        };
    }
}
```

Register it:

```java
SdkTracerProvider tracerProvider = SdkTracerProvider.builder()
    .setIdGenerator(new CorrelationIdGenerator("us-east-1", 0))
    .addSpanProcessor(BatchSpanProcessor.builder(exporter).build())
    .build();
```

## Correlating with Existing Logs

The beauty of custom IDs is that you can use the same generation logic in your existing logging system:

```python
# In your log formatter
import logging
from custom_id_generator import extract_metadata_from_trace_id
from opentelemetry import trace

class CorrelationLogFormatter(logging.Formatter):
    def format(self, record):
        span = trace.get_current_span()
        ctx = span.get_span_context()

        if ctx.is_valid:
            trace_id_hex = format(ctx.trace_id, "032x")
            record.trace_id = trace_id_hex
            metadata = extract_metadata_from_trace_id(trace_id_hex)
            record.trace_region = metadata["region"]
            record.trace_shard = metadata["shard_id"]
        else:
            record.trace_id = "none"

        return super().format(record)
```

## Testing the Generator

```python
# test_id_generator.py
from custom_id_generator import CorrelationIdGenerator, extract_metadata_from_trace_id

def test_trace_id_encodes_region():
    gen = CorrelationIdGenerator(region="us-east-1", shard_id=5)
    trace_id = gen.generate_trace_id()

    # Should be a valid 128-bit ID (non-zero)
    assert trace_id > 0
    assert trace_id.bit_length() <= 128

    # Extract and verify metadata
    trace_id_hex = format(trace_id, "032x")
    metadata = extract_metadata_from_trace_id(trace_id_hex)
    assert metadata["region"] == "us-east-1"
    assert metadata["shard_id"] == 5

def test_span_id_uniqueness():
    gen = CorrelationIdGenerator()
    ids = set(gen.generate_span_id() for _ in range(10000))
    # All 10,000 IDs should be unique
    assert len(ids) == 10000

def test_trace_id_is_never_zero():
    gen = CorrelationIdGenerator()
    for _ in range(10000):
        assert gen.generate_trace_id() != 0
        assert gen.generate_span_id() != 0
```

## Wrapping Up

Custom ID generators let you bridge OpenTelemetry's tracing with your existing correlation infrastructure. By embedding metadata in the trace ID itself, you gain the ability to extract routing and debugging information without any external lookup. Just make sure your IDs are always non-zero, have enough entropy to be unique, and do not violate the W3C Trace Context specification's requirements for valid trace IDs.
