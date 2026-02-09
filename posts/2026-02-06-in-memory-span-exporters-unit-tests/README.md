# How to Use In-Memory Span Exporters to Assert Span Creation in Unit Tests (Java, Python, Node.js)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Unit Testing, In-Memory Exporter, Java, Python, Node.js

Description: Use in-memory span exporters in Java, Python, and Node.js to write unit tests that assert your code creates the correct spans.

If you are adding OpenTelemetry instrumentation to your code, you need a way to verify it works without sending data to an actual backend. In-memory span exporters capture spans locally so your unit tests can inspect them. This post shows how to do this in Java, Python, and Node.js.

## The Pattern

The approach is the same regardless of language:

1. Create an in-memory exporter
2. Wire it into a test-only TracerProvider
3. Run the code under test
4. Read spans from the exporter and assert on their properties

## Python

Python's OpenTelemetry SDK ships with `InMemorySpanExporter` out of the box.

```python
# test_order_service.py
import pytest
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory import InMemorySpanExporter

from myapp.order_service import OrderService

@pytest.fixture
def tracing():
    """Set up a test tracer provider with an in-memory exporter."""
    exporter = InMemorySpanExporter()
    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(exporter))

    # Set as the global tracer provider for the duration of the test
    previous = trace.get_tracer_provider()
    trace.set_tracer_provider(provider)

    yield exporter

    # Clean up
    trace.set_tracer_provider(previous)
    exporter.shutdown()

def test_create_order_creates_span(tracing):
    """Verify that creating an order produces the expected span."""
    service = OrderService()
    service.create_order(user_id="user-123", items=["item-a", "item-b"])

    spans = tracing.get_finished_spans()
    assert len(spans) == 1

    span = spans[0]
    assert span.name == "create_order"
    assert span.attributes["order.user_id"] == "user-123"
    assert span.attributes["order.item_count"] == 2
    assert span.status.is_ok

def test_failed_order_sets_error_status(tracing):
    """Verify that a failed order sets error status on the span."""
    service = OrderService()

    with pytest.raises(ValueError):
        service.create_order(user_id="user-123", items=[])  # Empty items should fail

    spans = tracing.get_finished_spans()
    assert len(spans) == 1

    span = spans[0]
    assert span.status.status_code == trace.StatusCode.ERROR
    assert "items cannot be empty" in span.status.description
```

## Node.js

Node.js uses `InMemorySpanExporter` from the `@opentelemetry/sdk-trace-base` package.

```javascript
// test/orderService.test.js
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const {
  InMemorySpanExporter,
  SimpleSpanProcessor,
} = require('@opentelemetry/sdk-trace-base');
const { trace, SpanStatusCode } = require('@opentelemetry/api');
const { OrderService } = require('../src/orderService');

describe('OrderService', () => {
  let exporter;
  let provider;

  beforeEach(() => {
    // Create a fresh exporter and provider for each test
    exporter = new InMemorySpanExporter();
    provider = new NodeTracerProvider();
    provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
    provider.register();
  });

  afterEach(async () => {
    // Clean up spans between tests
    exporter.reset();
    await provider.shutdown();
  });

  test('createOrder produces a span with correct attributes', async () => {
    const service = new OrderService();
    await service.createOrder('user-123', ['item-a', 'item-b']);

    const spans = exporter.getFinishedSpans();
    expect(spans).toHaveLength(1);

    const span = spans[0];
    expect(span.name).toBe('create_order');
    expect(span.attributes['order.user_id']).toBe('user-123');
    expect(span.attributes['order.item_count']).toBe(2);
    expect(span.status.code).toBe(SpanStatusCode.OK);
  });

  test('failed order records error status', async () => {
    const service = new OrderService();

    await expect(service.createOrder('user-123', []))
      .rejects.toThrow('items cannot be empty');

    const spans = exporter.getFinishedSpans();
    expect(spans).toHaveLength(1);

    const span = spans[0];
    expect(span.status.code).toBe(SpanStatusCode.ERROR);
    expect(span.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'exception' }),
      ])
    );
  });
});
```

## Java

Java has a dedicated `opentelemetry-sdk-testing` module that provides `InMemorySpanExporter` and assertion utilities.

```xml
<!-- pom.xml -->
<dependency>
    <groupId>io.opentelemetry</groupId>
    <artifactId>opentelemetry-sdk-testing</artifactId>
    <version>1.34.0</version>
    <scope>test</scope>
</dependency>
```

```java
// OrderServiceTest.java
import io.opentelemetry.api.trace.StatusCode;
import io.opentelemetry.sdk.testing.exporter.InMemorySpanExporter;
import io.opentelemetry.sdk.trace.SdkTracerProvider;
import io.opentelemetry.sdk.trace.export.SimpleSpanProcessor;
import io.opentelemetry.sdk.trace.data.SpanData;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class OrderServiceTest {
    private InMemorySpanExporter exporter;
    private SdkTracerProvider tracerProvider;
    private OrderService orderService;

    @BeforeEach
    void setUp() {
        exporter = InMemorySpanExporter.create();
        tracerProvider = SdkTracerProvider.builder()
            .addSpanProcessor(SimpleSpanProcessor.create(exporter))
            .build();

        // Inject the test tracer provider into your service
        orderService = new OrderService(tracerProvider.get("test"));
    }

    @AfterEach
    void tearDown() {
        exporter.reset();
        tracerProvider.shutdown();
    }

    @Test
    void createOrder_producesSpanWithCorrectAttributes() {
        orderService.createOrder("user-123", List.of("item-a", "item-b"));

        List<SpanData> spans = exporter.getFinishedSpanItems();
        assertThat(spans).hasSize(1);

        SpanData span = spans.get(0);
        assertThat(span.getName()).isEqualTo("create_order");
        assertThat(span.getAttributes().get(
            io.opentelemetry.api.common.AttributeKey.stringKey("order.user_id")
        )).isEqualTo("user-123");
        assertThat(span.getAttributes().get(
            io.opentelemetry.api.common.AttributeKey.longKey("order.item_count")
        )).isEqualTo(2L);
        assertThat(span.getStatus().getStatusCode()).isEqualTo(StatusCode.OK);
    }

    @Test
    void failedOrder_setsErrorStatus() {
        try {
            orderService.createOrder("user-123", List.of());
        } catch (IllegalArgumentException e) {
            // expected
        }

        List<SpanData> spans = exporter.getFinishedSpanItems();
        assertThat(spans).hasSize(1);

        SpanData span = spans.get(0);
        assertThat(span.getStatus().getStatusCode()).isEqualTo(StatusCode.ERROR);
        assertThat(span.getEvents()).anyMatch(
            event -> event.getName().equals("exception")
        );
    }
}
```

## Tips for Reliable Tests

A few things to keep in mind when writing these tests:

- Use `SimpleSpanProcessor` instead of `BatchSpanProcessor` in tests. The simple processor exports spans synchronously, so they are available immediately after the code runs. Batch processors introduce timing issues.
- Call `exporter.reset()` or `exporter.clear()` between tests to avoid spans from one test leaking into another.
- If your code creates child spans, check the parent-child relationships using `span.parentSpanId`.
- Test both the happy path and error cases. Verify that error spans have the `ERROR` status code and that exception events are recorded.

In-memory exporters are the standard way to test OpenTelemetry instrumentation. They are fast, deterministic, and available in every language SDK. If you are instrumenting your code, you should be testing that instrumentation.
