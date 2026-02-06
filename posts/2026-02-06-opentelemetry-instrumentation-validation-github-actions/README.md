# How to Run OpenTelemetry Instrumentation Validation Tests in GitHub Actions CI Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, GitHub Actions, CI/CD, Testing

Description: Set up GitHub Actions CI pipelines that validate your OpenTelemetry instrumentation is working correctly before code reaches production.

OpenTelemetry instrumentation is code. Like any code, it can break, regress, or drift from its intended behavior. But unlike application logic, broken instrumentation does not cause immediate failures. It causes silent gaps in your observability: missing spans, wrong attributes, broken trace context propagation. You only discover the problem later when you need the data during an incident and it is not there.

Running instrumentation validation tests in your CI pipeline catches these issues at pull request time. This post walks through setting up a comprehensive validation pipeline in GitHub Actions.

## What to Validate

Instrumentation validation tests should check five things:

1. **Spans are produced** - The code creates the expected spans for each operation.
2. **Attributes are correct** - Span attributes have the right names, types, and values.
3. **Context propagation works** - Parent-child relationships are correct across service boundaries.
4. **Error handling is instrumented** - Errors produce proper span status and events.
5. **No instrumentation regressions** - New code changes do not remove or alter existing instrumentation.

## The Test Harness

Build a test harness that sets up an in-memory OpenTelemetry pipeline and provides helper functions for assertions:

```python
# tests/otel_test_harness.py
import pytest
from opentelemetry import trace, context
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory import InMemorySpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.trace import StatusCode

class OTelTestHarness:
    """
    Test harness for validating OpenTelemetry instrumentation.
    Sets up an in-memory pipeline and provides assertion helpers.
    """

    def __init__(self, service_name="test-service"):
        self.exporter = InMemorySpanExporter()
        self.resource = Resource.create({"service.name": service_name})
        self.provider = TracerProvider(resource=self.resource)
        self.provider.add_span_processor(
            SimpleSpanProcessor(self.exporter)
        )

    def install(self):
        trace.set_tracer_provider(self.provider)

    def reset(self):
        self.exporter.clear()

    def get_spans(self):
        return list(self.exporter.get_finished_spans())

    def get_span_by_name(self, name):
        """Find a span by its name. Raises if not found."""
        spans = [s for s in self.get_spans() if s.name == name]
        if not spans:
            available = [s.name for s in self.get_spans()]
            raise AssertionError(
                f"No span named '{name}' found. "
                f"Available spans: {available}"
            )
        return spans[0]

    def assert_span_exists(self, name):
        """Assert that a span with the given name was produced."""
        self.get_span_by_name(name)

    def assert_span_has_attribute(self, span_name, attr_name, expected_value=None):
        """Assert a span has an attribute, optionally with a specific value."""
        span = self.get_span_by_name(span_name)
        attrs = dict(span.attributes) if span.attributes else {}

        if attr_name not in attrs:
            raise AssertionError(
                f"Span '{span_name}' missing attribute '{attr_name}'. "
                f"Available attributes: {list(attrs.keys())}"
            )

        if expected_value is not None and attrs[attr_name] != expected_value:
            raise AssertionError(
                f"Span '{span_name}' attribute '{attr_name}' = "
                f"{attrs[attr_name]}, expected {expected_value}"
            )

    def assert_span_has_parent(self, child_name, parent_name):
        """Assert that one span is a child of another."""
        child = self.get_span_by_name(child_name)
        parent = self.get_span_by_name(parent_name)

        if child.parent is None:
            raise AssertionError(
                f"Span '{child_name}' has no parent, "
                f"expected parent '{parent_name}'"
            )

        if child.parent.span_id != parent.context.span_id:
            raise AssertionError(
                f"Span '{child_name}' parent does not match "
                f"'{parent_name}'"
            )

    def assert_span_has_error(self, span_name, error_message=None):
        """Assert that a span recorded an error."""
        span = self.get_span_by_name(span_name)

        if span.status.status_code != StatusCode.ERROR:
            raise AssertionError(
                f"Span '{span_name}' status is "
                f"{span.status.status_code.name}, expected ERROR"
            )

        if error_message and span.status.description:
            if error_message not in span.status.description:
                raise AssertionError(
                    f"Span '{span_name}' error description "
                    f"'{span.status.description}' does not contain "
                    f"'{error_message}'"
                )

    def assert_span_event_exists(self, span_name, event_name):
        """Assert that a span has a specific event."""
        span = self.get_span_by_name(span_name)
        event_names = [e.name for e in (span.events or [])]

        if event_name not in event_names:
            raise AssertionError(
                f"Span '{span_name}' has no event '{event_name}'. "
                f"Available events: {event_names}"
            )

    def assert_span_count(self, expected_count):
        """Assert the total number of spans produced."""
        actual = len(self.get_spans())
        if actual != expected_count:
            names = [s.name for s in self.get_spans()]
            raise AssertionError(
                f"Expected {expected_count} spans, got {actual}. "
                f"Spans: {names}"
            )
```

## Writing Validation Tests

Here are example tests using the harness:

```python
# tests/test_instrumentation.py
import pytest
from otel_test_harness import OTelTestHarness
from myapp import create_app

harness = OTelTestHarness(service_name="order-service")

@pytest.fixture(autouse=True)
def setup():
    harness.install()
    harness.reset()
    yield
    harness.reset()

@pytest.fixture
def client():
    app = create_app(testing=True)
    return app.test_client()


class TestOrderEndpointInstrumentation:
    """Validate instrumentation for the order endpoints."""

    def test_create_order_produces_expected_spans(self, client):
        """The create order flow should produce exactly 4 spans."""
        client.post("/api/v1/orders", json={
            "product_id": "prod-1",
            "quantity": 2,
        })

        # Verify the span count
        harness.assert_span_count(4)

        # Verify each expected span exists
        harness.assert_span_exists("POST /api/v1/orders")
        harness.assert_span_exists("INSERT orders")
        harness.assert_span_exists("POST /payments/charge")
        harness.assert_span_exists("orders.created publish")

    def test_create_order_has_required_attributes(self, client):
        """All required attributes must be present on the root span."""
        client.post("/api/v1/orders", json={
            "product_id": "prod-1",
            "quantity": 2,
        })

        harness.assert_span_has_attribute(
            "POST /api/v1/orders", "http.method", "POST"
        )
        harness.assert_span_has_attribute(
            "POST /api/v1/orders", "http.route", "/api/v1/orders"
        )
        harness.assert_span_has_attribute(
            "POST /api/v1/orders", "http.status_code", 201
        )
        harness.assert_span_has_attribute(
            "POST /api/v1/orders", "order.id"
        )
        harness.assert_span_has_attribute(
            "POST /api/v1/orders", "order.total_amount"
        )

    def test_span_parent_child_relationships(self, client):
        """Database and downstream calls must be children of the API span."""
        client.post("/api/v1/orders", json={
            "product_id": "prod-1",
            "quantity": 2,
        })

        harness.assert_span_has_parent(
            "INSERT orders", "POST /api/v1/orders"
        )
        harness.assert_span_has_parent(
            "POST /payments/charge", "POST /api/v1/orders"
        )
        harness.assert_span_has_parent(
            "orders.created publish", "POST /api/v1/orders"
        )

    def test_error_handling_instrumentation(self, client):
        """Errors must be properly recorded on spans."""
        client.post("/api/v1/orders", json={
            "product_id": "",  # Invalid
            "quantity": -1,    # Invalid
        })

        harness.assert_span_has_error(
            "POST /api/v1/orders", "validation"
        )
        harness.assert_span_has_attribute(
            "POST /api/v1/orders", "http.status_code", 400
        )

    def test_context_propagation_to_downstream(self, client):
        """
        The trace context must propagate to downstream HTTP calls.
        Both spans must share the same trace ID.
        """
        client.post("/api/v1/orders", json={
            "product_id": "prod-1",
            "quantity": 1,
        })

        api_span = harness.get_span_by_name("POST /api/v1/orders")
        payment_span = harness.get_span_by_name("POST /payments/charge")

        assert api_span.context.trace_id == payment_span.context.trace_id, \
            "Trace context was not propagated to the payment service call"
```

## GitHub Actions Workflow

Here is the complete GitHub Actions workflow:

```yaml
# .github/workflows/instrumentation-validation.yaml
name: Instrumentation Validation

on:
  pull_request:
    branches: [main]
    paths:
      # Only run when source code changes (not docs, etc.)
      - 'src/**'
      - 'tests/**'
      - 'requirements*.txt'

jobs:
  validate-instrumentation:
    runs-on: ubuntu-latest

    services:
      # Start dependent services for integration tests
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: testdb
          POSTGRES_PASSWORD: testpass
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      rabbitmq:
        image: rabbitmq:3-management
        ports:
          - 5672:5672
        options: >-
          --health-cmd "rabbitmq-diagnostics -q ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
          cache: "pip"

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install -r requirements-test.txt

      - name: Run instrumentation validation tests
        env:
          DATABASE_URL: postgresql://postgres:testpass@localhost:5432/testdb
          RABBITMQ_URL: amqp://guest:guest@localhost:5672
          OTEL_SDK_DISABLED: false
          OTEL_TRACES_EXPORTER: none
        run: |
          pytest tests/test_instrumentation.py \
            -v \
            --tb=long \
            --junitxml=test-results/instrumentation.xml

      - name: Run span contract tests
        run: |
          pytest tests/test_span_contracts.py \
            -v \
            --tb=long \
            --junitxml=test-results/contracts.xml

      - name: Run telemetry snapshot tests
        run: |
          pytest tests/test_telemetry_snapshots.py \
            -v \
            --tb=long \
            --junitxml=test-results/snapshots.xml

      - name: Publish test results
        uses: dorny/test-reporter@v1
        if: always()
        with:
          name: Instrumentation Test Results
          path: test-results/*.xml
          reporter: java-junit

      - name: Comment on PR if tests fail
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `Instrumentation validation tests failed. Please review the test output to ensure your changes do not break existing telemetry. Changes to span names, attributes, or trace structure can break dashboards and alerts.\n\nSee the [workflow run](${context.serverUrl}/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}) for details.`
            })
```

## Handling Flaky Tests

Telemetry tests can be flaky if they depend on timing. Here are some tips:

```python
import time

def wait_for_spans(harness, expected_count, timeout=5):
    """
    Wait for the expected number of spans to be collected.
    Useful when spans are produced asynchronously.
    """
    start = time.monotonic()
    while time.monotonic() - start < timeout:
        if len(harness.get_spans()) >= expected_count:
            return
        time.sleep(0.1)

    actual = len(harness.get_spans())
    raise TimeoutError(
        f"Expected {expected_count} spans within {timeout}s, "
        f"only got {actual}"
    )
```

## Summary

Running instrumentation validation tests in GitHub Actions CI catches telemetry regressions at the earliest possible point: before the code is merged. The combination of span existence checks, attribute validation, parent-child relationship assertions, error handling verification, and context propagation tests gives you high confidence that your instrumentation works correctly. The key is making these tests part of the required checks on your pull requests so that no code change can break your observability without someone explicitly acknowledging it.
