# How to Build a Telemetry Regression Test Suite That Validates Span Names, Attributes, and Status Codes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Regression Testing, Span Validation, Test Automation, Observability

Description: Build a regression test suite that catches unintended changes to span names, attributes, and status codes before they reach production.

Telemetry is an API contract. Your dashboards, alerts, and SLOs depend on specific span names and attributes. When someone renames a span or removes an attribute during a refactor, those downstream consumers break silently. A telemetry regression test suite catches these changes at build time.

## Defining the Contract

Start by documenting what your telemetry should look like. Create a specification file that lists every span your service produces:

```yaml
# telemetry-spec.yaml
spans:
  - name: "POST /api/orders"
    kind: SERVER
    required_attributes:
      - key: http.method
        type: string
      - key: http.status_code
        type: int
      - key: http.route
        type: string
        value: "/api/orders"
      - key: order.id
        type: string
      - key: order.item_count
        type: int
    status: OK

  - name: "INSERT orders"
    kind: CLIENT
    required_attributes:
      - key: db.system
        type: string
        value: "postgresql"
      - key: db.operation
        type: string
        value: "INSERT"
      - key: db.name
        type: string
    status: OK

  - name: "publish order.created"
    kind: PRODUCER
    required_attributes:
      - key: messaging.system
        type: string
        value: "kafka"
      - key: messaging.destination
        type: string
        value: "order.created"
    status: OK
```

## Building the Test Runner

Write a test that exercises your API, collects the spans via an in-memory exporter, and validates them against the spec:

```python
# test_telemetry_regression.py
import yaml
import pytest
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory import InMemorySpanExporter

# Load the telemetry specification
with open("telemetry-spec.yaml") as f:
    SPEC = yaml.safe_load(f)

exporter = InMemorySpanExporter()

@pytest.fixture(autouse=True, scope="module")
def setup_tracing():
    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(exporter))
    trace.set_tracer_provider(provider)
    yield
    provider.shutdown()

@pytest.fixture(autouse=True)
def clear_spans():
    exporter.clear()
    yield

def exercise_api(client):
    """Hit the endpoint that produces all the spans we want to validate."""
    response = client.post("/api/orders", json={
        "user_id": "user-123",
        "items": [{"sku": "WIDGET-1", "qty": 2}],
    })
    assert response.status_code == 201
    return response

class TestTelemetryRegression:
    def test_all_expected_spans_exist(self, test_client):
        exercise_api(test_client)
        spans = exporter.get_finished_spans()
        span_names = [s.name for s in spans]

        for spec_span in SPEC["spans"]:
            assert spec_span["name"] in span_names, (
                f"Expected span '{spec_span['name']}' not found. "
                f"Available spans: {span_names}"
            )

    def test_span_attributes_match_spec(self, test_client):
        exercise_api(test_client)
        spans = exporter.get_finished_spans()

        for spec_span in SPEC["spans"]:
            matching = [s for s in spans if s.name == spec_span["name"]]
            assert matching, f"Span '{spec_span['name']}' not found"

            actual_span = matching[0]
            for attr_spec in spec_span["required_attributes"]:
                key = attr_spec["key"]
                assert key in actual_span.attributes, (
                    f"Span '{spec_span['name']}' missing attribute '{key}'. "
                    f"Available attributes: {list(actual_span.attributes.keys())}"
                )

                # If a specific value is expected, check it
                if "value" in attr_spec:
                    actual_value = actual_span.attributes[key]
                    expected_value = attr_spec["value"]
                    assert actual_value == expected_value, (
                        f"Span '{spec_span['name']}' attribute '{key}' "
                        f"expected '{expected_value}' but got '{actual_value}'"
                    )

    def test_span_status_codes(self, test_client):
        exercise_api(test_client)
        spans = exporter.get_finished_spans()

        for spec_span in SPEC["spans"]:
            matching = [s for s in spans if s.name == spec_span["name"]]
            if not matching:
                continue

            actual_span = matching[0]
            expected_status = spec_span.get("status", "OK")

            if expected_status == "OK":
                assert actual_span.status.is_ok, (
                    f"Span '{spec_span['name']}' expected OK status "
                    f"but got {actual_span.status.status_code}"
                )
```

## Snapshot Testing for Spans

An alternative to a YAML spec is snapshot testing. Capture the current telemetry output as a "golden file" and compare future runs against it:

```python
# test_telemetry_snapshot.py
import json
import os

SNAPSHOT_DIR = "tests/snapshots"

def span_to_dict(span):
    """Convert a span to a comparable dictionary (ignoring timing fields)."""
    return {
        "name": span.name,
        "kind": str(span.kind),
        "attributes": dict(span.attributes),
        "status_code": str(span.status.status_code),
        "events": [{"name": e.name} for e in span.events],
    }

def save_snapshot(name, spans):
    os.makedirs(SNAPSHOT_DIR, exist_ok=True)
    path = os.path.join(SNAPSHOT_DIR, f"{name}.json")
    data = [span_to_dict(s) for s in spans]
    # Sort by name for deterministic comparison
    data.sort(key=lambda x: x["name"])
    with open(path, "w") as f:
        json.dump(data, f, indent=2, sort_keys=True)

def load_snapshot(name):
    path = os.path.join(SNAPSHOT_DIR, f"{name}.json")
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return json.load(f)

def test_order_creation_telemetry(test_client):
    exporter.clear()
    exercise_api(test_client)
    spans = exporter.get_finished_spans()

    current = [span_to_dict(s) for s in spans]
    current.sort(key=lambda x: x["name"])

    snapshot = load_snapshot("order_creation")
    if snapshot is None:
        # First run: save the snapshot
        save_snapshot("order_creation", spans)
        pytest.skip("Snapshot created. Run tests again to validate.")

    # Compare current output against the snapshot
    assert current == snapshot, (
        "Telemetry output changed from snapshot. "
        "If this is intentional, delete the snapshot file and re-run."
    )
```

## Running in CI

Add the regression tests to your CI pipeline:

```yaml
# .github/workflows/test.yaml
- name: Run telemetry regression tests
  run: |
    pytest tests/test_telemetry_regression.py -v --tb=long
```

When someone changes a span name or removes an attribute, the test fails with a clear message explaining exactly what changed. The developer can then either fix the code or update the spec if the change was intentional.

This approach treats telemetry as a first-class contract, not an afterthought. It prevents the slow decay where dashboards gradually stop working because someone refactored a span name three months ago and nobody noticed.
