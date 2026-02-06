# How to Create a Deterministic Span ID Generator for OpenTelemetry Replay and Testing Scenarios

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Testing, Deterministic IDs, Span ID Generator

Description: Build a deterministic span ID generator for OpenTelemetry that produces predictable IDs for testing, debugging, and trace replay scenarios.

When writing tests for instrumented code, random trace and span IDs make assertions difficult. You cannot compare expected trace output against actual output when the IDs change on every run. A deterministic ID generator solves this by producing a predictable sequence of IDs, making your test assertions stable and your trace replay scenarios reproducible.

## Use Cases for Deterministic IDs

- **Unit testing**: Assert on exact span attributes including IDs
- **Snapshot testing**: Compare trace output against golden files
- **Trace replay**: Re-import exported traces with consistent IDs
- **Documentation**: Generate example traces with readable IDs
- **Debugging**: Produce specific ID patterns that are easy to spot in logs

## Python Implementation

```python
# deterministic_id_generator.py
from opentelemetry.sdk.trace.id_generator import IdGenerator
import struct


class DeterministicIdGenerator(IdGenerator):
    """Generates predictable trace and span IDs for testing.

    IDs are generated from sequential counters, producing
    IDs like 00000000000000000000000000000001, 00000000000000000000000000000002, etc.
    """

    def __init__(self, trace_id_start=1, span_id_start=1):
        self._trace_id_counter = trace_id_start
        self._span_id_counter = span_id_start

    def generate_trace_id(self) -> int:
        """Generate a deterministic 128-bit trace ID."""
        trace_id = self._trace_id_counter
        self._trace_id_counter += 1
        return trace_id

    def generate_span_id(self) -> int:
        """Generate a deterministic 64-bit span ID."""
        span_id = self._span_id_counter
        self._span_id_counter += 1
        return span_id

    def reset(self, trace_id_start=1, span_id_start=1):
        """Reset counters to starting values between tests."""
        self._trace_id_counter = trace_id_start
        self._span_id_counter = span_id_start
```

## Using It in Tests

```python
# test_checkout_service.py
import pytest
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export.in_memory import InMemorySpanExporter
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from deterministic_id_generator import DeterministicIdGenerator


@pytest.fixture
def setup_tracing():
    """Set up tracing with deterministic IDs for each test."""
    id_generator = DeterministicIdGenerator()
    exporter = InMemorySpanExporter()

    provider = TracerProvider(id_generator=id_generator)
    provider.add_span_processor(SimpleSpanProcessor(exporter))
    trace.set_tracer_provider(provider)

    yield exporter, id_generator

    # Clean up
    provider.shutdown()


def test_checkout_creates_expected_spans(setup_tracing):
    exporter, id_gen = setup_tracing
    tracer = trace.get_tracer("test")

    # Run the code under test
    with tracer.start_as_current_span("checkout") as parent:
        with tracer.start_as_current_span("validate_cart") as child:
            pass

    spans = exporter.get_finished_spans()
    assert len(spans) == 2

    # With deterministic IDs, we can assert on exact values
    # Trace ID 1 is shared by both spans
    checkout_span = spans[1]  # Parent span
    validate_span = spans[0]  # Child span

    assert checkout_span.context.trace_id == 1
    assert validate_span.context.trace_id == 1

    # Span IDs are sequential: 1 for checkout, 2 for validate_cart
    assert checkout_span.context.span_id == 1
    assert validate_span.context.span_id == 2


def test_independent_traces_get_different_ids(setup_tracing):
    exporter, id_gen = setup_tracing
    tracer = trace.get_tracer("test")

    with tracer.start_as_current_span("request_1"):
        pass

    with tracer.start_as_current_span("request_2"):
        pass

    spans = exporter.get_finished_spans()
    # Each root span gets its own trace ID
    assert spans[0].context.trace_id == 1
    assert spans[1].context.trace_id == 2
```

## Go Implementation

```go
package testutil

import (
    "context"
    "sync/atomic"

    "go.opentelemetry.io/otel/trace"
)

// DeterministicIDGenerator produces predictable IDs for testing.
type DeterministicIDGenerator struct {
    traceCounter atomic.Uint64
    spanCounter  atomic.Uint64
}

func NewDeterministicIDGenerator() *DeterministicIDGenerator {
    return &DeterministicIDGenerator{}
}

func (g *DeterministicIDGenerator) NewIDs(ctx context.Context) (trace.TraceID, trace.SpanID) {
    traceNum := g.traceCounter.Add(1)
    spanNum := g.spanCounter.Add(1)

    var traceID trace.TraceID
    var spanID trace.SpanID

    // Put the counter value in the last 8 bytes
    traceID[8] = byte(traceNum >> 56)
    traceID[9] = byte(traceNum >> 48)
    traceID[10] = byte(traceNum >> 40)
    traceID[11] = byte(traceNum >> 32)
    traceID[12] = byte(traceNum >> 24)
    traceID[13] = byte(traceNum >> 16)
    traceID[14] = byte(traceNum >> 8)
    traceID[15] = byte(traceNum)

    spanID[0] = byte(spanNum >> 56)
    spanID[1] = byte(spanNum >> 48)
    spanID[2] = byte(spanNum >> 40)
    spanID[3] = byte(spanNum >> 32)
    spanID[4] = byte(spanNum >> 24)
    spanID[5] = byte(spanNum >> 16)
    spanID[6] = byte(spanNum >> 8)
    spanID[7] = byte(spanNum)

    return traceID, spanID
}

func (g *DeterministicIDGenerator) NewSpanID(ctx context.Context, traceID trace.TraceID) trace.SpanID {
    spanNum := g.spanCounter.Add(1)
    var spanID trace.SpanID

    spanID[0] = byte(spanNum >> 56)
    spanID[1] = byte(spanNum >> 48)
    spanID[2] = byte(spanNum >> 40)
    spanID[3] = byte(spanNum >> 32)
    spanID[4] = byte(spanNum >> 24)
    spanID[5] = byte(spanNum >> 16)
    spanID[6] = byte(spanNum >> 8)
    spanID[7] = byte(spanNum)

    return spanID
}

// Reset resets counters for use between tests.
func (g *DeterministicIDGenerator) Reset() {
    g.traceCounter.Store(0)
    g.spanCounter.Store(0)
}
```

## Seed-Based Generator for Reproducible Randomness

If you want IDs that look random but are reproducible across runs, use a seeded random generator:

```python
# seeded_id_generator.py
import random
from opentelemetry.sdk.trace.id_generator import IdGenerator


class SeededIdGenerator(IdGenerator):
    """Generates reproducible pseudo-random IDs from a fixed seed."""

    def __init__(self, seed=42):
        self._rng = random.Random(seed)

    def generate_trace_id(self) -> int:
        # Generate a 128-bit value that looks random but is reproducible
        return self._rng.getrandbits(128)

    def generate_span_id(self) -> int:
        # Generate a 64-bit value
        value = self._rng.getrandbits(64)
        # Ensure non-zero
        return value if value != 0 else self._rng.getrandbits(64)
```

## Important Caveats

Never use deterministic ID generators in production. They will cause:

- **ID collisions** across service instances
- **Broken sampling** because sampling often uses random bits from the trace ID
- **Security issues** because predictable IDs can be guessed and used to query traces

Guard against accidental production use:

```python
import os

def create_id_generator():
    if os.getenv("ENVIRONMENT") == "test":
        return DeterministicIdGenerator()
    else:
        # Use the default random generator in non-test environments
        from opentelemetry.sdk.trace.id_generator import RandomIdGenerator
        return RandomIdGenerator()
```

Deterministic ID generators are a testing tool. They make your trace-related tests predictable and your debugging sessions easier. Just keep them out of production.
