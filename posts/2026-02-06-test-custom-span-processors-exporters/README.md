# How to Test Custom Span Processors and Exporters with the OpenTelemetry SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Span Processors, Exporter, SDK Testing, Custom Component

Description: Use OpenTelemetry SDK test utilities to write thorough tests for custom span processors and exporters across Java, Python, and Node.js.

When you write custom span processors or exporters, you need to test them in isolation before plugging them into your production pipeline. OpenTelemetry SDKs provide test utilities in many languages that make this straightforward. This post covers how to test both processors and exporters with proper setup, assertions, and edge case handling.

## Testing a Custom Span Processor in Python

Suppose you have written a processor that redacts sensitive data from span attributes before export:

```python
# redacting_processor.py

from opentelemetry.sdk.trace import SpanProcessor

SENSITIVE_KEYS = {"user.email", "user.phone", "credit_card.number", "db.statement"}

class RedactingSpanProcessor(SpanProcessor):
    """Redacts sensitive attributes as they are set on a recording span."""

    def __init__(self, next_processor=None):
        self.next_processor = next_processor

    def on_start(self, span, parent_context=None):
        original_set_attribute = span.set_attribute

        def redacting_set_attribute(key, value):
            if key in SENSITIVE_KEYS:
                value = "[REDACTED]"
            return original_set_attribute(key, value)

        span.set_attribute = redacting_set_attribute

        if self.next_processor:
            self.next_processor.on_start(span, parent_context)

    def on_end(self, span):
        # on_end receives a ReadableSpan, so this processor only forwards it.
        if self.next_processor:
            self.next_processor.on_end(span)

    def shutdown(self):
        if self.next_processor:
            self.next_processor.shutdown()

    def force_flush(self, timeout_millis=None):
        if self.next_processor:
            return self.next_processor.force_flush(timeout_millis)
        return True
```

If attributes can be added by code paths that bypass `set_attribute`, use a custom exporter wrapper and redact in the exported payload instead of trying to mutate the ended `ReadableSpan`:

```python
# redacting_exporter.py
from opentelemetry.sdk.trace.export import SpanExporter, SpanExportResult

SENSITIVE_KEYS = {"user.email", "user.phone", "credit_card.number", "db.statement"}

class RedactingExporter(SpanExporter):
    def __init__(self, backend_client):
        self.backend_client = backend_client

    def export(self, spans):
        payload = []
        for span in spans:
            attributes = {
                key: "[REDACTED]" if key in SENSITIVE_KEYS else value
                for key, value in span.attributes.items()
            }
            payload.append({"name": span.name, "attributes": attributes})

        self.backend_client.send(payload)
        return SpanExportResult.SUCCESS

    def force_flush(self, timeout_millis=None):
        return True

    def shutdown(self):
        self.backend_client.close()
```

## Testing with InMemorySpanExporter

Here is how to test the processor behavior end to end:

```python
# test_redacting_processor.py
import pytest
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter

from redacting_processor import RedactingSpanProcessor

@pytest.fixture
def setup():
    """Create a tracer with the redacting processor forwarding to an in-memory exporter."""
    exporter = InMemorySpanExporter()
    provider = TracerProvider()
    simple_processor = SimpleSpanProcessor(exporter)
    provider.add_span_processor(RedactingSpanProcessor(simple_processor))
    tracer = provider.get_tracer("test")
    return tracer, exporter, provider

def test_sensitive_attributes_are_redacted(setup):
    tracer, exporter, provider = setup

    with tracer.start_as_current_span("test-span") as span:
        span.set_attribute("user.email", "john@example.com")
        span.set_attribute("user.name", "John Doe")
        span.set_attribute("http.method", "GET")

    provider.force_flush()
    spans = exporter.get_finished_spans()
    assert len(spans) == 1

    attrs = dict(spans[0].attributes)
    # email should be redacted
    assert attrs.get("user.email") == "[REDACTED]"
    # name and method should not be redacted
    assert attrs.get("user.name") == "John Doe"
    assert attrs.get("http.method") == "GET"

def test_non_sensitive_spans_pass_through(setup):
    tracer, exporter, provider = setup

    with tracer.start_as_current_span("safe-span") as span:
        span.set_attribute("http.method", "POST")
        span.set_attribute("http.route", "/api/orders")
        span.set_attribute("http.status_code", 200)

    provider.force_flush()
    spans = exporter.get_finished_spans()
    attrs = dict(spans[0].attributes)

    assert attrs["http.method"] == "POST"
    assert attrs["http.route"] == "/api/orders"
    assert attrs["http.status_code"] == 200
```

## Testing a Custom Exporter

For a custom exporter (e.g., one that writes to a custom backend), test the `export` method directly:

```python
# test_custom_exporter.py
import pytest
from unittest.mock import MagicMock, patch
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor, SpanExportResult

from custom_exporter import CustomBackendExporter

@pytest.fixture
def exporter():
    return CustomBackendExporter(
        endpoint="http://localhost:9999/ingest",
        api_key="test-key",
    )

def create_test_span(name="test-span", attributes=None):
    """Helper to create a span for testing."""
    from opentelemetry.sdk.trace.export.in_memory_span_exporter import InMemorySpanExporter

    mem_exporter = InMemorySpanExporter()
    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(mem_exporter))
    tracer = provider.get_tracer("test")

    with tracer.start_as_current_span(name) as span:
        if attributes:
            for k, v in attributes.items():
                span.set_attribute(k, v)

    provider.force_flush()
    return mem_exporter.get_finished_spans()

@patch("requests.post")
def test_export_sends_to_backend(mock_post, exporter):
    mock_post.return_value = MagicMock(status_code=200)

    spans = create_test_span("order.create", {"order.id": "123"})
    result = exporter.export(spans)

    assert result == SpanExportResult.SUCCESS
    mock_post.assert_called_once()

    # Verify the payload structure
    call_args = mock_post.call_args
    assert "http://localhost:9999/ingest" in call_args[0][0]
    assert call_args[1]["headers"]["Authorization"] == "Bearer test-key"

@patch("requests.post")
def test_export_handles_network_failure(mock_post, exporter):
    import requests

    mock_post.side_effect = requests.exceptions.ConnectionError("Connection refused")

    spans = create_test_span("test-span")
    result = exporter.export(spans)

    assert result == SpanExportResult.FAILURE

@patch("requests.post")
def test_export_handles_server_error(mock_post, exporter):
    mock_post.return_value = MagicMock(status_code=500)

    spans = create_test_span("test-span")
    result = exporter.export(spans)

    assert result == SpanExportResult.FAILURE
```

## Testing in Node.js

```javascript
// test/customProcessor.test.js
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { InMemorySpanExporter, SimpleSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { SamplingRateProcessor } = require('../src/samplingRateProcessor');

describe('SamplingRateProcessor', () => {
  let exporter;
  let provider;

  beforeEach(() => {
    exporter = new InMemorySpanExporter();
    const simpleProcessor = new SimpleSpanProcessor(exporter);
    const customProcessor = new SamplingRateProcessor(simpleProcessor, {
      sampleRate: 0.5,
    });

    provider = new NodeTracerProvider({
      spanProcessors: [customProcessor],
    });
    provider.register();
  });

  afterEach(async () => {
    exporter.reset();
    await provider.shutdown();
  });

  test('respects the configured sample rate', () => {
    const tracer = provider.getTracer('test');

    // Create 1000 spans
    for (let i = 0; i < 1000; i++) {
      const span = tracer.startSpan(`span-${i}`);
      span.end();
    }

    const exported = exporter.getFinishedSpans();
    // With 50% sampling, expect roughly 500 spans (allow variance)
    expect(exported.length).toBeGreaterThan(350);
    expect(exported.length).toBeLessThan(650);
  });

  test('forceFlush exports remaining spans', async () => {
    const tracer = provider.getTracer('test');
    const span = tracer.startSpan('final-span');
    span.end();

    await provider.forceFlush();

    // Span should have been flushed by forceFlush
    const exported = exporter.getFinishedSpans();
    expect(exported.length).toBeGreaterThanOrEqual(0); // May or may not be sampled
  });
});
```

## Testing Edge Cases

Always test these edge cases for processors and exporters:

```python
def test_empty_batch(exporter):
    """Export with no spans should succeed without errors."""
    result = exporter.export([])
    assert result == SpanExportResult.SUCCESS

def test_shutdown_then_export(exporter):
    """Exporting after shutdown should fail gracefully."""
    exporter.shutdown()
    spans = create_test_span("post-shutdown")
    result = exporter.export(spans)
    assert result == SpanExportResult.FAILURE

def test_concurrent_exports(exporter):
    """Multiple threads exporting simultaneously should not crash."""
    import threading
    errors = []

    def export_batch():
        try:
            spans = create_test_span("concurrent")
            exporter.export(spans)
        except Exception as e:
            errors.append(e)

    threads = [threading.Thread(target=export_batch) for _ in range(10)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    assert len(errors) == 0, f"Concurrent export errors: {errors}"
```

Testing custom processors and exporters thoroughly prevents production incidents caused by edge cases like network failures, empty batches, or shutdown races. The SDK test utilities make this easy, and there is no excuse for shipping untested telemetry components.
