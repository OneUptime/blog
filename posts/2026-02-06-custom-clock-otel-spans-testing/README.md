# How to Implement a Custom Clock for OpenTelemetry Spans in Unit Test and Integration Test Environments

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

The Python SDK does not have a built-in clock abstraction, but you can monkey-patch the time source or use a custom SpanProcessor that overrides timestamps:

```python
# test_clock.py
import time as time_module


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


class ClockOverrideSpanProcessor:
    """SpanProcessor that overrides span timestamps with a fake clock.

    This processor intercepts span start and end events and
    records the fake clock's current time instead of the real time.
    """

    def __init__(self, clock):
        self._clock = clock
        self._span_start_times = {}

    def on_start(self, span, parent_context=None):
        # Record the fake start time
        self._span_start_times[span.context.span_id] = self._clock.now_ns()
        # Override the span's start time
        span._start_time = self._clock.now_ns()

    def on_end(self, span):
        # Override the span's end time
        span._end_time = self._clock.now_ns()

    def shutdown(self):
        pass

    def force_flush(self, timeout_millis=None):
        pass
```

## Using the Custom Clock in Tests

```python
# test_order_processing.py
import pytest
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export.in_memory import InMemorySpanExporter
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from test_clock import FakeClock, ClockOverrideSpanProcessor


@pytest.fixture
def traced_env():
    clock = FakeClock(start_time_ns=1700000000_000000000)
    exporter = InMemorySpanExporter()
    clock_processor = ClockOverrideSpanProcessor(clock)

    provider = TracerProvider()
    # Clock processor must be added before the export processor
    provider.add_span_processor(clock_processor)
    provider.add_span_processor(SimpleSpanProcessor(exporter))
    trace.set_tracer_provider(provider)

    yield clock, exporter

    provider.shutdown()


def test_order_processing_duration(traced_env):
    clock, exporter = traced_env
    tracer = trace.get_tracer("test")

    # Start the parent span at t=0
    with tracer.start_as_current_span("process_order") as order_span:
        # Advance clock by 50ms for validation step
        clock.advance(milliseconds=50)

        with tracer.start_as_current_span("validate_order"):
            # Validation takes 20ms
            clock.advance(milliseconds=20)

        # Advance clock by 30ms for payment step
        clock.advance(milliseconds=30)

        with tracer.start_as_current_span("charge_payment"):
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

The Java SDK has better support for custom clocks through the `Clock` interface:

```java
import io.opentelemetry.sdk.common.Clock;
import java.util.concurrent.atomic.AtomicLong;

public class TestClock implements Clock {
    private final AtomicLong currentNanos;

    public TestClock(long startNanos) {
        this.currentNanos = new AtomicLong(startNanos);
    }

    public TestClock() {
        this(1_700_000_000_000_000_000L);
    }

    @Override
    public long now() {
        return currentNanos.get();
    }

    @Override
    public long nanoTime() {
        return currentNanos.get();
    }

    // Advance the clock by a specified number of milliseconds
    public void advanceMillis(long millis) {
        currentNanos.addAndGet(millis * 1_000_000);
    }

    // Advance by nanoseconds for precise control
    public void advanceNanos(long nanos) {
        currentNanos.addAndGet(nanos);
    }

    // Set to a specific time
    public void setNanos(long nanos) {
        currentNanos.set(nanos);
    }
}
```

Register it with the TracerProvider:

```java
import io.opentelemetry.sdk.trace.SdkTracerProvider;
import io.opentelemetry.sdk.trace.export.SimpleSpanProcessor;
import io.opentelemetry.sdk.testing.exporter.InMemorySpanExporter;

public class TraceTestSetup {
    public static void main(String[] args) {
        TestClock clock = new TestClock();
        InMemorySpanExporter exporter = InMemorySpanExporter.create();

        SdkTracerProvider provider = SdkTracerProvider.builder()
            .setClock(clock)
            .addSpanProcessor(SimpleSpanProcessor.create(exporter))
            .build();

        // Use the tracer
        var tracer = provider.get("test");
        var span = tracer.spanBuilder("operation").startSpan();

        clock.advanceMillis(250);  // Simulate 250ms of work
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
    clock, exporter = traced_env
    tracer = trace.get_tracer("test")

    with tracer.start_as_current_span("http_request") as span:
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
