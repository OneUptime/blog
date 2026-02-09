# How to Build Snapshot Tests for Telemetry Output to Catch Unexpected Span Structure Changes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Snapshot Testing, Telemetry, Testing

Description: Build snapshot tests that capture your telemetry output and alert you when span structures change unexpectedly in your codebase.

Snapshot testing is a technique where you capture the output of your code, save it as a "snapshot" file, and compare future outputs against that saved version. If the output changes, the test fails, and you have to explicitly approve the change. This concept works extremely well for OpenTelemetry instrumentation because span structures should be stable and predictable.

When a developer changes a span name, adds or removes an attribute, or modifies the trace hierarchy, a snapshot test catches it immediately. The developer then has to review the change and update the snapshot, which creates a deliberate checkpoint for instrumentation changes.

## Setting Up the In-Memory Exporter

The foundation of snapshot testing for telemetry is capturing spans in memory during tests:

```python
import json
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory import InMemorySpanExporter

class TelemetryCapture:
    """
    Captures OpenTelemetry spans in memory for snapshot testing.
    Provides methods to serialize spans into a stable,
    comparable format.
    """

    def __init__(self):
        self.exporter = InMemorySpanExporter()
        self.provider = TracerProvider()
        self.provider.add_span_processor(
            SimpleSpanProcessor(self.exporter)
        )

    def install(self):
        """Replace the global tracer provider with our capturing one."""
        trace.set_tracer_provider(self.provider)

    def clear(self):
        """Clear captured spans between tests."""
        self.exporter.clear()

    def get_spans(self):
        """Return captured spans."""
        return self.exporter.get_finished_spans()

    def serialize_spans(self, spans=None):
        """
        Convert captured spans into a stable JSON format
        suitable for snapshot comparison.

        We strip out non-deterministic fields like timestamps,
        trace IDs, and span IDs since those change every run.
        """
        if spans is None:
            spans = self.get_spans()

        serialized = []
        for span in sorted(spans, key=lambda s: s.name):
            span_data = {
                "name": span.name,
                "kind": span.kind.name if span.kind else "INTERNAL",
                "status": {
                    "code": span.status.status_code.name,
                    "description": span.status.description or "",
                },
                "attributes": self.normalize_attributes(
                    dict(span.attributes) if span.attributes else {}
                ),
                "events": [
                    {
                        "name": event.name,
                        "attributes": self.normalize_attributes(
                            dict(event.attributes) if event.attributes else {}
                        ),
                    }
                    for event in (span.events or [])
                ],
                "has_parent": span.parent is not None,
                "child_count": self.count_children(span, spans),
            }
            serialized.append(span_data)

        return json.dumps(serialized, indent=2, sort_keys=True)

    def normalize_attributes(self, attrs):
        """
        Normalize attribute values for stable comparison.
        Replace dynamic values with placeholders.
        """
        normalized = {}
        for key, value in sorted(attrs.items()):
            # Replace UUIDs with a placeholder
            if isinstance(value, str) and self.looks_like_uuid(value):
                normalized[key] = "<UUID>"
            # Replace timestamps
            elif isinstance(value, str) and self.looks_like_timestamp(value):
                normalized[key] = "<TIMESTAMP>"
            # Replace numeric IDs that change per run
            elif key.endswith(".id") and isinstance(value, (int, str)):
                normalized[key] = "<ID>"
            else:
                normalized[key] = value
        return normalized

    def looks_like_uuid(self, value):
        import re
        return bool(re.match(
            r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$',
            value
        ))

    def looks_like_timestamp(self, value):
        import re
        return bool(re.match(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}', value))

    def count_children(self, parent_span, all_spans):
        count = 0
        for span in all_spans:
            if (span.parent
                and span.parent.span_id == parent_span.context.span_id):
                count += 1
        return count
```

## Writing Snapshot Tests with pytest

Use pytest with a snapshot plugin to manage the snapshot files:

```python
# tests/test_telemetry_snapshots.py
import pytest
from telemetry_capture import TelemetryCapture

capture = TelemetryCapture()

@pytest.fixture(autouse=True)
def setup_telemetry():
    capture.install()
    capture.clear()
    yield
    capture.clear()

def test_create_order_telemetry(client, snapshot):
    """
    Snapshot test for the create order endpoint.
    If the span structure changes, this test fails
    and you must review and approve the changes.
    """
    response = client.post("/api/v1/orders", json={
        "product_id": "prod-test",
        "quantity": 3,
        "shipping": "standard",
    })

    assert response.status_code == 201

    # Serialize the captured spans and compare to snapshot
    telemetry_output = capture.serialize_spans()
    snapshot.assert_match(telemetry_output, "create_order_spans.json")


def test_get_order_telemetry(client, snapshot):
    """Snapshot test for the get order endpoint."""
    # First create an order
    create_response = client.post("/api/v1/orders", json={
        "product_id": "prod-test",
        "quantity": 1,
    })
    order_id = create_response.json()["id"]

    # Clear spans from the create call
    capture.clear()

    # Now test the get call
    response = client.get(f"/api/v1/orders/{order_id}")
    assert response.status_code == 200

    telemetry_output = capture.serialize_spans()
    snapshot.assert_match(telemetry_output, "get_order_spans.json")


def test_failed_order_telemetry(client, snapshot):
    """Snapshot test for validation failure telemetry."""
    response = client.post("/api/v1/orders", json={
        "product_id": "",
        "quantity": -1,
    })

    assert response.status_code == 400

    telemetry_output = capture.serialize_spans()
    snapshot.assert_match(telemetry_output, "failed_order_spans.json")
```

## The Snapshot File

When you run the test for the first time, it generates a snapshot file like this:

```json
[
  {
    "attributes": {
      "db.operation": "INSERT",
      "db.sql.table": "orders",
      "db.system": "postgresql"
    },
    "child_count": 0,
    "events": [],
    "has_parent": true,
    "kind": "CLIENT",
    "name": "INSERT orders",
    "status": {
      "code": "UNSET",
      "description": ""
    }
  },
  {
    "attributes": {
      "http.method": "POST",
      "http.route": "/api/v1/orders",
      "http.status_code": 201,
      "order.currency": "USD",
      "order.id": "<ID>",
      "order.item_count": 3,
      "order.total_amount": 29.97
    },
    "child_count": 3,
    "events": [],
    "has_parent": false,
    "kind": "SERVER",
    "name": "POST /api/v1/orders",
    "status": {
      "code": "OK",
      "description": ""
    }
  },
  {
    "attributes": {
      "messaging.destination.name": "orders.created",
      "messaging.operation": "publish",
      "messaging.system": "rabbitmq"
    },
    "child_count": 0,
    "events": [],
    "has_parent": true,
    "kind": "PRODUCER",
    "name": "orders.created publish",
    "status": {
      "code": "UNSET",
      "description": ""
    }
  }
]
```

## Handling Snapshot Updates

When a snapshot test fails, the output shows you exactly what changed:

```
FAILED tests/test_telemetry_snapshots.py::test_create_order_telemetry
  Snapshot "create_order_spans.json" does not match:

  --- expected
  +++ actual
  @@ -15,7 +15,7 @@
       "http.method": "POST",
       "http.route": "/api/v1/orders",
       "http.status_code": 201,
  -    "order.currency": "USD",
  +    "payment.currency": "USD",
       "order.id": "<ID>",
```

The developer sees that `order.currency` was renamed to `payment.currency`. They can then decide whether this was intentional and update the snapshot:

```bash
# Update snapshots after reviewing the changes
pytest tests/test_telemetry_snapshots.py --snapshot-update
```

## Custom Snapshot Comparison

For more control, build a custom comparator that gives better error messages:

```python
import json
from deepdiff import DeepDiff

def compare_telemetry_snapshots(expected_file, actual_output):
    """
    Compare the actual telemetry output against the snapshot.
    Returns a human-readable diff if they do not match.
    """
    with open(expected_file) as f:
        expected = json.load(f)

    actual = json.loads(actual_output)

    diff = DeepDiff(expected, actual, ignore_order=True)

    if not diff:
        return None  # No differences

    report_lines = ["Telemetry snapshot mismatch:\n"]

    if "dictionary_item_added" in diff:
        report_lines.append("New attributes added:")
        for item in diff["dictionary_item_added"]:
            report_lines.append(f"  + {item}")

    if "dictionary_item_removed" in diff:
        report_lines.append("Attributes removed (this will break consumers):")
        for item in diff["dictionary_item_removed"]:
            report_lines.append(f"  - {item}")

    if "values_changed" in diff:
        report_lines.append("Attribute values changed:")
        for path, change in diff["values_changed"].items():
            report_lines.append(
                f"  {path}: {change['old_value']} -> {change['new_value']}"
            )

    if "type_changes" in diff:
        report_lines.append("Attribute types changed:")
        for path, change in diff["type_changes"].items():
            report_lines.append(
                f"  {path}: {change['old_type'].__name__} "
                f"-> {change['new_type'].__name__}"
            )

    return "\n".join(report_lines)
```

## CI Integration

Add snapshot tests to your CI pipeline with a check that prevents uncommitted snapshot updates:

```yaml
# .github/workflows/telemetry-snapshots.yaml
name: Telemetry Snapshot Tests
on:
  pull_request:
    branches: [main]

jobs:
  snapshot-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Install dependencies
        run: pip install -r requirements-test.txt

      - name: Run snapshot tests
        run: pytest tests/test_telemetry_snapshots.py -v

      - name: Check for uncommitted snapshot updates
        run: |
          if [ -n "$(git diff --name-only tests/snapshots/)" ]; then
            echo "Snapshot files have been modified but not committed."
            echo "Run 'pytest --snapshot-update' locally and commit the changes."
            git diff tests/snapshots/
            exit 1
          fi
```

## Summary

Snapshot tests for OpenTelemetry telemetry output catch span structure changes the moment they happen. By serializing spans into a stable format and comparing against saved snapshots, you create a checkpoint that forces developers to explicitly review and approve any instrumentation changes. This prevents accidental breakage of dashboards, alerts, and downstream systems that depend on specific span attributes and structures. The key is normalizing dynamic values (IDs, timestamps) in the serialization step so that only structural changes cause test failures.
