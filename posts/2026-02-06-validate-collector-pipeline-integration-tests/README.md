# How to Validate OpenTelemetry Collector Pipeline Configurations with End-to-End Integration Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector Pipeline, Integration Testing, Configuration Validation, End-to-End Testing

Description: Write end-to-end integration tests that validate your OpenTelemetry Collector pipeline processes, transforms, and exports data correctly.

A typo in your OpenTelemetry Collector configuration can silently drop all your telemetry. The collector starts fine, accepts data, but the processing pipeline either transforms it incorrectly or routes it to the wrong exporter. End-to-end integration tests catch these problems by sending known data through the pipeline and verifying what comes out the other end.

## The Test Architecture

The test setup looks like this:

1. Start an OpenTelemetry Collector with your production config
2. Start a mock backend that receives the collector's output
3. Send known telemetry data to the collector's input
4. Read what the mock backend received and assert on it

## Setting Up the Mock Backend

Create a simple HTTP server that captures OTLP data:

```python
# mock_backend.py
import json
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from google.protobuf.json_format import MessageToDict

class OTLPHandler(BaseHTTPRequestHandler):
    received_traces = []
    received_metrics = []
    lock = threading.Lock()

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)

        with OTLPHandler.lock:
            if '/v1/traces' in self.path:
                OTLPHandler.received_traces.append(json.loads(body))
            elif '/v1/metrics' in self.path:
                OTLPHandler.received_metrics.append(json.loads(body))

        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(b'{}')

    def log_message(self, format, *args):
        pass  # Suppress logging during tests

class MockBackend:
    def __init__(self, port=4319):
        self.port = port
        self.server = HTTPServer(('0.0.0.0', port), OTLPHandler)
        self.thread = None

    def start(self):
        self.thread = threading.Thread(target=self.server.serve_forever)
        self.thread.daemon = True
        self.thread.start()

    def stop(self):
        self.server.shutdown()
        if self.thread:
            self.thread.join()

    def get_traces(self):
        with OTLPHandler.lock:
            return list(OTLPHandler.received_traces)

    def get_metrics(self):
        with OTLPHandler.lock:
            return list(OTLPHandler.received_metrics)

    def clear(self):
        with OTLPHandler.lock:
            OTLPHandler.received_traces.clear()
            OTLPHandler.received_metrics.clear()
```

## The Collector Configuration Under Test

Here is a typical pipeline config with processors that we want to validate:

```yaml
# collector-config-under-test.yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 1s

  # Filter out health check spans
  filter:
    traces:
      span:
        - 'attributes["http.route"] == "/health"'
        - 'attributes["http.route"] == "/ready"'

  # Add environment attribute to all spans
  resource:
    attributes:
      - key: deployment.environment
        value: production
        action: upsert

  # Rename a span attribute
  transform:
    trace_statements:
      - context: span
        statements:
          - set(attributes["http.request.method"], attributes["http.method"])
            where attributes["http.method"] != nil

exporters:
  otlphttp:
    endpoint: http://localhost:4319  # Points to our mock backend
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [filter, resource, transform, batch]
      exporters: [otlphttp]
```

## Writing the Integration Tests

```python
# test_collector_pipeline.py
import pytest
import subprocess
import time
import requests
import json
import os
import signal

from mock_backend import MockBackend

@pytest.fixture(scope="module")
def mock_backend():
    backend = MockBackend(port=4319)
    backend.start()
    yield backend
    backend.stop()

@pytest.fixture(scope="module")
def collector(mock_backend):
    """Start the collector as a subprocess."""
    proc = subprocess.Popen(
        ["otelcol-contrib", "--config", "collector-config-under-test.yaml"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    # Wait for the collector to be ready
    for _ in range(30):
        try:
            requests.get("http://localhost:13133/")  # health check
            break
        except requests.ConnectionError:
            time.sleep(1)
    else:
        proc.kill()
        pytest.fail("Collector did not start within 30 seconds")

    yield proc

    proc.send_signal(signal.SIGTERM)
    proc.wait(timeout=10)

@pytest.fixture(autouse=True)
def clear_data(mock_backend):
    mock_backend.clear()
    yield

def send_trace(spans):
    """Send OTLP trace data to the collector."""
    payload = {
        "resourceSpans": [{
            "resource": {
                "attributes": [
                    {"key": "service.name", "value": {"stringValue": "test-service"}}
                ]
            },
            "scopeSpans": [{
                "spans": spans
            }]
        }]
    }
    resp = requests.post(
        "http://localhost:4318/v1/traces",
        json=payload,
        headers={"Content-Type": "application/json"},
    )
    assert resp.status_code == 200
    return resp

def make_span(name, attributes=None, trace_id="0123456789abcdef0123456789abcdef",
              span_id="0123456789abcdef"):
    """Create a span payload for OTLP."""
    span = {
        "traceId": trace_id,
        "spanId": span_id,
        "name": name,
        "kind": 2,  # SERVER
        "startTimeUnixNano": str(int(time.time() * 1e9)),
        "endTimeUnixNano": str(int(time.time() * 1e9) + 100000000),
        "attributes": [],
    }
    if attributes:
        for k, v in attributes.items():
            if isinstance(v, str):
                span["attributes"].append({"key": k, "value": {"stringValue": v}})
            elif isinstance(v, int):
                span["attributes"].append({"key": k, "value": {"intValue": str(v)}})
    return span


class TestFilterProcessor:
    """Tests that health check spans are filtered out."""

    def test_health_check_spans_are_dropped(self, collector, mock_backend):
        # Send a health check span
        span = make_span("GET /health", {"http.route": "/health", "http.method": "GET"})
        send_trace([span])

        time.sleep(3)  # Wait for batch processor
        traces = mock_backend.get_traces()

        # The health check span should have been filtered out
        all_spans = []
        for t in traces:
            for rs in t.get("resourceSpans", []):
                for ss in rs.get("scopeSpans", []):
                    all_spans.extend(ss.get("spans", []))

        health_spans = [s for s in all_spans if s["name"] == "GET /health"]
        assert len(health_spans) == 0, "Health check spans should be filtered out"

    def test_normal_spans_pass_through(self, collector, mock_backend):
        span = make_span("POST /api/orders", {"http.route": "/api/orders", "http.method": "POST"})
        send_trace([span])

        time.sleep(3)
        traces = mock_backend.get_traces()

        all_spans = []
        for t in traces:
            for rs in t.get("resourceSpans", []):
                for ss in rs.get("scopeSpans", []):
                    all_spans.extend(ss.get("spans", []))

        order_spans = [s for s in all_spans if s["name"] == "POST /api/orders"]
        assert len(order_spans) == 1, "Normal spans should pass through the filter"


class TestResourceProcessor:
    """Tests that resource attributes are added correctly."""

    def test_environment_attribute_is_added(self, collector, mock_backend):
        span = make_span("test-span")
        send_trace([span])

        time.sleep(3)
        traces = mock_backend.get_traces()

        assert len(traces) > 0, "Expected at least one trace"

        # Check resource attributes
        resource_attrs = {}
        for t in traces:
            for rs in t.get("resourceSpans", []):
                for attr in rs.get("resource", {}).get("attributes", []):
                    resource_attrs[attr["key"]] = attr["value"]

        assert "deployment.environment" in resource_attrs, (
            "deployment.environment should be added by resource processor"
        )
        assert resource_attrs["deployment.environment"]["stringValue"] == "production"


class TestTransformProcessor:
    """Tests that span attributes are transformed correctly."""

    def test_http_method_is_renamed(self, collector, mock_backend):
        span = make_span("GET /api/users", {"http.method": "GET"})
        send_trace([span])

        time.sleep(3)
        traces = mock_backend.get_traces()

        all_spans = []
        for t in traces:
            for rs in t.get("resourceSpans", []):
                for ss in rs.get("scopeSpans", []):
                    all_spans.extend(ss.get("spans", []))

        assert len(all_spans) > 0
        attrs = {a["key"]: a["value"] for a in all_spans[0].get("attributes", [])}

        assert "http.request.method" in attrs, (
            "Transform processor should copy http.method to http.request.method"
        )
        assert attrs["http.request.method"]["stringValue"] == "GET"
```

## Running the Tests

```bash
# Run the integration tests
pytest test_collector_pipeline.py -v --timeout=60

# Or in Docker for CI
docker compose -f docker-compose.test.yaml run --rm test-runner \
  pytest test_collector_pipeline.py -v
```

## CI Integration

```yaml
# .github/workflows/collector-tests.yaml
name: Collector Pipeline Tests
on:
  push:
    paths:
      - 'collector-config*.yaml'
      - 'test_collector_pipeline.py'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install collector
        run: |
          curl -L -o otelcol-contrib.tar.gz \
            "https://github.com/open-telemetry/opentelemetry-collector-releases/releases/download/v0.96.0/otelcol-contrib_0.96.0_linux_amd64.tar.gz"
          tar xzf otelcol-contrib.tar.gz
          sudo mv otelcol-contrib /usr/local/bin/

      - name: Run pipeline tests
        run: pytest test_collector_pipeline.py -v --timeout=60
```

Testing your Collector pipeline configuration with real data prevents the kind of silent failures that are hardest to debug: the collector runs without errors, but your data is being filtered, transformed, or routed incorrectly. These integration tests give you confidence that config changes do what you intend.
