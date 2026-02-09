# How to Build Trace-Based Integration Tests for Kubernetes Microservice Chains

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, OpenTelemetry, Distributed Tracing, Testing, Microservices

Description: Learn how to build trace-based integration tests for Kubernetes microservice chains using OpenTelemetry instrumentation and trace validation to verify end-to-end request flows.

---

Integration testing in Kubernetes microservice architectures presents unique challenges. Traditional assertion-based tests struggle to verify complex distributed request flows across multiple services. Trace-based integration testing offers a powerful alternative by validating the actual distributed traces generated during test execution.

This approach leverages OpenTelemetry instrumentation already present in production code to verify service interactions, timing constraints, error propagation, and data flow through your microservice chains. Instead of mocking service boundaries, you validate real distributed behavior captured in trace data.

## Understanding Trace-Based Integration Testing

Trace-based integration tests validate distributed system behavior by examining the traces produced during test execution. Each test triggers a realistic scenario, and the test framework queries the trace backend to verify that the expected spans, attributes, and timing relationships exist.

This approach provides several advantages over traditional integration tests. You test using the same instrumentation that runs in production, reducing the gap between test and production environments. Trace validation naturally captures timing relationships and asynchronous behavior that traditional assertions miss. You also gain visibility into the entire request flow, not just the final response.

## Setting Up the Test Infrastructure

Start by deploying a complete test environment in Kubernetes with all microservices and an OpenTelemetry Collector configured to export traces to a queryable backend like Jaeger or Tempo.

```yaml
# test-environment.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: integration-test
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: integration-test
spec:
  replicas: 1
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
    spec:
      containers:
      - name: otel-collector
        image: otel/opentelemetry-collector-contrib:0.92.0
        ports:
        - containerPort: 4317  # OTLP gRPC
        - containerPort: 4318  # OTLP HTTP
        volumeMounts:
        - name: config
          mountPath: /etc/otel
      volumes:
      - name: config
        configMap:
          name: otel-collector-config
---
apiVersion: v1
kind: Service
metadata:
  name: otel-collector
  namespace: integration-test
spec:
  selector:
    app: otel-collector
  ports:
  - name: otlp-grpc
    port: 4317
  - name: otlp-http
    port: 4318
```

Configure the OpenTelemetry Collector to export to Jaeger running in the same namespace:

```yaml
# otel-collector-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: integration-test
data:
  config.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318

    processors:
      batch:
        timeout: 1s
        send_batch_size: 1024

      # Add test context attributes
      attributes:
        actions:
        - key: test.environment
          value: integration-test
          action: insert

    exporters:
      otlp:
        endpoint: jaeger:4317
        tls:
          insecure: true

      logging:
        loglevel: debug

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [attributes, batch]
          exporters: [otlp, logging]
```

## Instrumenting Test Services

Each microservice in your test environment needs OpenTelemetry instrumentation configured to export traces to the collector. Here's a Node.js service example:

```javascript
// order-service/app.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

// Initialize OpenTelemetry
const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'order-service',
    [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'integration-test',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: 'test',
  }),
  traceExporter: new OTLPTraceExporter({
    url: 'http://otel-collector.integration-test.svc.cluster.local:4317',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

const express = require('express');
const app = express();

app.post('/orders', async (req, res) => {
  const { trace } = require('@opentelemetry/api');
  const span = trace.getActiveSpan();

  // Add business context to span
  span.setAttribute('order.id', req.body.orderId);
  span.setAttribute('order.total', req.body.total);
  span.setAttribute('customer.id', req.body.customerId);

  try {
    // Call payment service
    const paymentResult = await fetch('http://payment-service/charge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: req.body.orderId, amount: req.body.total }),
    });

    if (!paymentResult.ok) {
      throw new Error('Payment failed');
    }

    // Call inventory service
    await fetch('http://inventory-service/reserve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: req.body.orderId, items: req.body.items }),
    });

    span.setAttribute('order.status', 'completed');
    res.json({ success: true, orderId: req.body.orderId });
  } catch (error) {
    span.recordException(error);
    span.setAttribute('order.status', 'failed');
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000);
```

## Building the Test Framework

Create a test framework that can trigger requests and query traces. Here's a Python example using pytest and the Jaeger client:

```python
# tests/test_order_flow.py
import pytest
import requests
import time
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from jaeger_client import Config
import json

class TraceValidator:
    """Helper class to query and validate traces"""

    def __init__(self, jaeger_url):
        self.jaeger_url = jaeger_url

    def get_trace_by_id(self, trace_id, max_retries=10, delay=1):
        """Query Jaeger for a specific trace ID with retries"""
        for i in range(max_retries):
            response = requests.get(
                f'{self.jaeger_url}/api/traces/{trace_id}'
            )
            if response.status_code == 200:
                data = response.json()
                if data['data'] and len(data['data']) > 0:
                    return data['data'][0]
            time.sleep(delay)
        raise TimeoutError(f'Trace {trace_id} not found after {max_retries} retries')

    def find_span(self, trace, service_name, operation_name):
        """Find a specific span in the trace"""
        for span in trace['spans']:
            if (span['process']['serviceName'] == service_name and
                span['operationName'] == operation_name):
                return span
        return None

    def assert_span_exists(self, trace, service_name, operation_name):
        """Assert that a span exists in the trace"""
        span = self.find_span(trace, service_name, operation_name)
        assert span is not None, f'Span {operation_name} not found in {service_name}'
        return span

    def assert_span_attribute(self, span, key, expected_value):
        """Assert that a span has a specific attribute value"""
        tags = {tag['key']: tag['value'] for tag in span.get('tags', [])}
        actual_value = tags.get(key)
        assert actual_value == expected_value, \
            f'Expected {key}={expected_value}, got {actual_value}'

    def assert_span_duration(self, span, max_duration_ms):
        """Assert that a span duration is within limits"""
        duration_us = span['duration']
        duration_ms = duration_us / 1000
        assert duration_ms <= max_duration_ms, \
            f'Span duration {duration_ms}ms exceeds limit {max_duration_ms}ms'

    def assert_parent_child(self, trace, parent_span_id, child_span_id):
        """Assert parent-child relationship between spans"""
        child_span = next(s for s in trace['spans'] if s['spanID'] == child_span_id)
        parent_refs = [ref for ref in child_span.get('references', [])
                       if ref['refType'] == 'CHILD_OF']
        assert len(parent_refs) > 0, 'Child span has no parent reference'
        assert parent_refs[0]['spanID'] == parent_span_id, \
            f'Parent span ID mismatch: expected {parent_span_id}, got {parent_refs[0]["spanID"]}'

@pytest.fixture
def trace_validator():
    """Fixture to provide trace validation helper"""
    return TraceValidator('http://jaeger-query.integration-test.svc.cluster.local:16686')

@pytest.fixture
def order_service_url():
    """Fixture to provide order service URL"""
    return 'http://order-service.integration-test.svc.cluster.local:3000'

def test_successful_order_flow(trace_validator, order_service_url):
    """Test complete order flow with trace validation"""

    # Setup OpenTelemetry for test client
    provider = TracerProvider()
    processor = BatchSpanProcessor(
        OTLPSpanExporter(endpoint='http://otel-collector.integration-test.svc.cluster.local:4317')
    )
    provider.add_span_processor(processor)
    trace.set_tracer_provider(provider)
    tracer = trace.get_tracer(__name__)

    # Execute test with tracing
    with tracer.start_as_current_span('integration-test-order-flow') as span:
        trace_id = format(span.get_span_context().trace_id, '032x')
        span.set_attribute('test.name', 'test_successful_order_flow')

        # Make order request
        response = requests.post(
            f'{order_service_url}/orders',
            json={
                'orderId': 'test-123',
                'customerId': 'cust-456',
                'total': 99.99,
                'items': [{'sku': 'WIDGET-1', 'quantity': 2}]
            }
        )

        assert response.status_code == 200
        assert response.json()['success'] is True

    # Force flush to ensure trace is exported
    provider.force_flush()

    # Wait for trace to be indexed
    time.sleep(2)

    # Retrieve and validate trace
    trace_data = trace_validator.get_trace_by_id(trace_id)

    # Verify all expected spans exist
    order_span = trace_validator.assert_span_exists(
        trace_data, 'order-service', 'POST /orders'
    )
    payment_span = trace_validator.assert_span_exists(
        trace_data, 'payment-service', 'POST /charge'
    )
    inventory_span = trace_validator.assert_span_exists(
        trace_data, 'inventory-service', 'POST /reserve'
    )

    # Verify span attributes
    trace_validator.assert_span_attribute(order_span, 'order.id', 'test-123')
    trace_validator.assert_span_attribute(order_span, 'order.status', 'completed')
    trace_validator.assert_span_attribute(payment_span, 'payment.amount', 99.99)

    # Verify timing constraints
    trace_validator.assert_span_duration(order_span, 5000)  # Max 5 seconds
    trace_validator.assert_span_duration(payment_span, 2000)  # Max 2 seconds

    # Verify span relationships
    trace_validator.assert_parent_child(trace_data, order_span['spanID'], payment_span['spanID'])
    trace_validator.assert_parent_child(trace_data, order_span['spanID'], inventory_span['spanID'])

def test_payment_failure_handling(trace_validator, order_service_url):
    """Test order flow when payment fails"""

    provider = TracerProvider()
    processor = BatchSpanProcessor(
        OTLPSpanExporter(endpoint='http://otel-collector.integration-test.svc.cluster.local:4317')
    )
    provider.add_span_processor(processor)
    trace.set_tracer_provider(provider)
    tracer = trace.get_tracer(__name__)

    with tracer.start_as_current_span('integration-test-payment-failure') as span:
        trace_id = format(span.get_span_context().trace_id, '032x')

        # Trigger payment failure with invalid card
        response = requests.post(
            f'{order_service_url}/orders',
            json={
                'orderId': 'test-124',
                'customerId': 'cust-456',
                'total': 99.99,
                'items': [{'sku': 'WIDGET-1', 'quantity': 2}],
                'paymentMethod': 'INVALID_CARD'  # Triggers failure
            }
        )

        assert response.status_code == 500

    provider.force_flush()
    time.sleep(2)

    trace_data = trace_validator.get_trace_by_id(trace_id)

    # Verify error was recorded
    order_span = trace_validator.assert_span_exists(
        trace_data, 'order-service', 'POST /orders'
    )
    payment_span = trace_validator.assert_span_exists(
        trace_data, 'payment-service', 'POST /charge'
    )

    # Verify error attributes
    trace_validator.assert_span_attribute(order_span, 'order.status', 'failed')
    trace_validator.assert_span_attribute(payment_span, 'error', True)

    # Verify inventory was NOT called (no span should exist)
    inventory_span = trace_validator.find_span(
        trace_data, 'inventory-service', 'POST /reserve'
    )
    assert inventory_span is None, 'Inventory should not be called after payment failure'
```

## Advanced Trace Assertions

Build more sophisticated assertions to validate complex distributed behavior:

```python
# tests/trace_assertions.py
class AdvancedTraceAssertions:

    @staticmethod
    def assert_sequential_execution(trace, span_ids):
        """Assert that spans executed in sequential order"""
        spans = {s['spanID']: s for s in trace['spans']}
        for i in range(len(span_ids) - 1):
            current_span = spans[span_ids[i]]
            next_span = spans[span_ids[i + 1]]

            current_end = current_span['startTime'] + current_span['duration']
            next_start = next_span['startTime']

            assert next_start >= current_end, \
                f'Span {i+1} started before span {i} finished'

    @staticmethod
    def assert_parallel_execution(trace, span_ids, max_overlap_ratio=0.8):
        """Assert that spans executed in parallel with sufficient overlap"""
        spans = {s['spanID']: s for s in trace['spans']}

        # Calculate time ranges
        ranges = []
        for span_id in span_ids:
            span = spans[span_id]
            start = span['startTime']
            end = start + span['duration']
            ranges.append((start, end))

        # Check for overlap
        overlaps = []
        for i in range(len(ranges)):
            for j in range(i + 1, len(ranges)):
                start1, end1 = ranges[i]
                start2, end2 = ranges[j]
                overlap_start = max(start1, start2)
                overlap_end = min(end1, end2)
                if overlap_end > overlap_start:
                    overlap = overlap_end - overlap_start
                    duration1 = end1 - start1
                    duration2 = end2 - start2
                    ratio = overlap / min(duration1, duration2)
                    overlaps.append(ratio)

        avg_overlap = sum(overlaps) / len(overlaps) if overlaps else 0
        assert avg_overlap >= max_overlap_ratio, \
            f'Average overlap ratio {avg_overlap} below threshold {max_overlap_ratio}'

    @staticmethod
    def assert_retry_pattern(trace, service_name, operation_name, expected_retries):
        """Assert that a service retried the expected number of times"""
        retry_spans = [
            s for s in trace['spans']
            if s['process']['serviceName'] == service_name and
               s['operationName'] == operation_name
        ]

        assert len(retry_spans) == expected_retries + 1, \
            f'Expected {expected_retries} retries, found {len(retry_spans) - 1}'
```

## Running Tests in CI/CD

Integrate trace-based tests into your CI/CD pipeline:

```yaml
# .github/workflows/integration-tests.yaml
name: Integration Tests
on: [push, pull_request]

jobs:
  integration-test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3

    - name: Setup Kubernetes
      uses: helm/kind-action@v1.5.0
      with:
        cluster_name: integration-test

    - name: Deploy test infrastructure
      run: |
        kubectl apply -f k8s/test-environment.yaml
        kubectl wait --for=condition=ready pod -l app=jaeger -n integration-test --timeout=300s
        kubectl wait --for=condition=ready pod -l app=otel-collector -n integration-test --timeout=300s

    - name: Deploy microservices
      run: |
        kubectl apply -f k8s/order-service.yaml
        kubectl apply -f k8s/payment-service.yaml
        kubectl apply -f k8s/inventory-service.yaml
        kubectl wait --for=condition=ready pod --all -n integration-test --timeout=300s

    - name: Run trace-based tests
      run: |
        pytest tests/ -v --tb=short

    - name: Export traces on failure
      if: failure()
      run: |
        kubectl port-forward -n integration-test svc/jaeger-query 16686:16686 &
        curl http://localhost:16686/api/traces?service=order-service > traces.json

    - name: Upload trace artifacts
      if: failure()
      uses: actions/upload-artifact@v3
      with:
        name: failed-traces
        path: traces.json
```

Trace-based integration testing transforms how you validate distributed systems. By leveraging actual trace data, you verify real distributed behavior including timing, relationships, and error propagation across your Kubernetes microservice chains.
