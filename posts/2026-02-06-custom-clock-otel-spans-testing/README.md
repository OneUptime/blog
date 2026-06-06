# How to Build a Custom Clock for OpenTelemetry Spans in Unit Test

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Testing, Custom Clock, Span Timestamps

Description: Implement a custom clock for OpenTelemetry spans to control timestamps in unit tests and integration test environments.

When testing instrumented code, span timestamps depend on the system clock. This makes it impossible to write deterministic assertions about span start times, end times, and durations. A custom clock that you control from your tests lets you set exact timestamps and advance time predictably, resulting in stable and meaningful test assertions.

## Why You Need a Custom Clock

Consider testing a function that creates spans with duration information:

```python
# Without a custom clock, this test is flaky

def test_span_duration():
    with tracer.start_as_current_span("operation"):
        time.sleep(0.1)  # Approximately 100ms

    span = exporter.get_finished_spans()[0]
    duration_ms = (span.end_time - span.start_time) / 1e6
    # This assertion is fragile - actual duration might be 98ms or 115ms
    assert 90 < duration_ms < 150
```

With a custom clock, you can make this deterministic.

## Python Custom Clock Implementation

The Python SDK does not have a built-in clock abstraction for the tracer provider, but spans accept explicit start and end timestamps. A small test helper can use your fake clock and pass those timestamps through the public API:

```python
# test_clock.py
from contextlib import contextmanager


class FakeClock:
    """A controllable clock for testing OpenTelemetry spans."""

    def __init__(self, start_time_ns=1000000000000000000):
        # Start at a known nanosecond timestamp
        self._current_time_ns = start_time_ns

    def now_ns(self):
        """Return current time in nanoseconds."""
        return self._current_time_ns

    def advance(self, milliseconds=0, seconds=0, nanoseconds=0):
        """Advance the clock by a specified duration."""
        self._current_time_ns += nanoseconds
        self._current_time_ns += milliseconds * 1_000_000
        self._current_time_ns += seconds * 1_000_000_000

    def set_time_ns(self, time_ns):
        """Set the clock to a specific time."""
        self._current_time_ns = time_ns


@contextmanager
def start_span_with_clock(tracer, name, clock, **kwargs):
    """Start and end a span using timestamps from the fake clock."""
    with tracer.start_as_current_span(
        name,
        start_time=clock.now_ns(),
        end_on_exit=False,
        **kwargs,
    ) as span:
        try:
            yield span
        finally:
            span.end(end_time=clock.now_ns())
```

## Using the Custom Clock in Tests

```python
# test_order_processing.py
import pytest
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from test_clock import FakeClock, start_span_with_clock


@pytest.fixture
def traced_env():
    clock = FakeClock(start_time_ns=1700000000_000000000)
    exporter = InMemorySpanExporter()

    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(exporter))

    yield clock, exporter, provider

    provider.shutdown()


def test_order_processing_duration(traced_env):
    clock, exporter, provider = traced_env
    tracer = provider.get_tracer("test")

    # Start the parent span at t=0
    with start_span_with_clock(tracer, "process_order", clock) as order_span:
        # Advance clock by 50ms for validation step
        clock.advance(milliseconds=50)

        with start_span_with_clock(tracer, "validate_order", clock):
            # Validation takes 20ms
            clock.advance(milliseconds=20)

        # Advance clock by 30ms for payment step
        clock.advance(milliseconds=30)

        with start_span_with_clock(tracer, "charge_payment", clock):
            # Payment takes 100ms
            clock.advance(milliseconds=100)

    spans = exporter.get_finished_spans()
    spans_by_name = {s.name: s for s in spans}

    # Now we can make exact assertions about timing
    validate = spans_by_name["validate_order"]
    duration_ns = validate.end_time - validate.start_time
    assert duration_ns == 20_000_000  # Exactly 20ms

    payment = spans_by_name["charge_payment"]
    duration_ns = payment.end_time - payment.start_time
    assert duration_ns == 100_000_000  # Exactly 100ms

    order = spans_by_name["process_order"]
    duration_ns = order.end_time - order.start_time
    assert duration_ns == 200_000_000  # Exactly 200ms total
```

## Java Custom Clock

The Java SDK has better support for custom clocks through the `Clock` interface, and the SDK testing artifact includes a mutable `TestClock` for tests:

```java
import io.opentelemetry.sdk.testing.time.TestClock;

TestClock clock = TestClock.create();
```

Register it with the TracerProvider:

```java
import io.opentelemetry.sdk.trace.SdkTracerProvider;
import io.opentelemetry.sdk.trace.export.SimpleSpanProcessor;
import io.opentelemetry.sdk.testing.exporter.InMemorySpanExporter;
import io.opentelemetry.sdk.testing.time.TestClock;
import java.time.Duration;

public class TraceTestSetup {
    public static void main(String[] args) {
        TestClock clock = TestClock.create();
        InMemorySpanExporter exporter = InMemorySpanExporter.create();

        SdkTracerProvider provider = SdkTracerProvider.builder()
            .setClock(clock)
            .addSpanProcessor(SimpleSpanProcessor.create(exporter))
            .build();

        // Use the tracer
        var tracer = provider.get("test");
        var span = tracer.spanBuilder("operation").startSpan();

        clock.advance(Duration.ofMillis(250));  // Simulate 250ms of work
        span.end();

        // Assert exact duration
        var spans = exporter.getFinishedSpanItems();
        long durationNanos = spans.get(0).getEndEpochNanos() - spans.get(0).getStartEpochNanos();
        assert durationNanos == 250_000_000L; // Exactly 250ms
    }
}
```

## Integration Testing with Clock Control

For integration tests where you want to test time-dependent behavior like timeout spans or SLA tracking:

```python
def test_slow_request_flagged(traced_env):
    clock, exporter, provider = traced_env
    tracer = provider.get_tracer("test")

    with start_span_with_clock(tracer, "http_request", clock) as span:
        # Simulate a request that takes 5 seconds
        clock.advance(seconds=5)
        span.set_attribute("http.status_code", 200)

    spans = exporter.get_finished_spans()
    request_span = spans[0]

    # Verify duration-based logic works correctly
    duration_s = (request_span.end_time - request_span.start_time) / 1e9
    assert duration_s == 5.0

    # Your SLA checker can flag this as slow
    assert duration_s > 3.0  # Exceeds 3-second SLA threshold
```

A custom clock turns timing-dependent trace tests from flaky approximations into exact, deterministic assertions. Use it whenever your tests need to verify span durations, timestamp ordering, or time-based business logic.
