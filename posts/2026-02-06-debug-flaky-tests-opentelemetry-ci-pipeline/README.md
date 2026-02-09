# How to Debug Flaky Tests Using OpenTelemetry Traces Captured During CI Pipeline Execution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Flaky Tests, CI/CD, Testing, Debugging

Description: Capture OpenTelemetry traces during CI pipeline test execution to diagnose and fix flaky tests with precise timing data.

Flaky tests erode trust in your CI pipeline. A test passes 95% of the time and fails randomly on the other 5%. You rerun the pipeline and it goes green. Nobody investigates because it is "just flaky." But flaky tests are often symptoms of real bugs: race conditions, timing dependencies, shared state, or resource contention. By capturing OpenTelemetry traces during test execution, you get the data you need to diagnose why a test fails intermittently.

## Setting Up Tracing in Your Test Suite

Configure your test framework to create spans for each test case. Here is a pytest plugin that does this:

```python
# conftest.py
import pytest
import time
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

# Configure the tracer for CI
resource = Resource.create({
    "service.name": "test-suite",
    "ci.pipeline.id": os.environ.get("CI_PIPELINE_ID", "local"),
    "ci.job.name": os.environ.get("CI_JOB_NAME", "local"),
    "ci.commit.sha": os.environ.get("CI_COMMIT_SHA", "unknown"),
})

provider = TracerProvider(resource=resource)
provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint="http://otel-collector:4317"))
)
trace.set_tracer_provider(provider)

tracer = trace.get_tracer("test-runner")


@pytest.hookimpl(tryfirst=True)
def pytest_runtest_protocol(item, nextitem):
    """Create a span for each test case."""
    test_name = item.nodeid

    with tracer.start_as_current_span("test.execute") as span:
        span.set_attribute("test.name", test_name)
        span.set_attribute("test.file", str(item.fspath))
        span.set_attribute("test.class", item.cls.__name__ if item.cls else "")
        span.set_attribute("test.function", item.name)

        # Record markers
        markers = [m.name for m in item.iter_markers()]
        span.set_attribute("test.markers", str(markers))

        # Run the test
        reports = []
        ihook = item.ihook

        report = ihook.pytest_runtest_makereport(item=item, call=None)
        span.set_attribute("test.outcome", "unknown")

    return None  # Let pytest continue with default protocol


@pytest.hookimpl(hookimpl=True)
def pytest_runtest_makereport(item, call):
    """Record test outcome on the current span."""
    span = trace.get_current_span()
    if call.when == "call":
        if call.excinfo is not None:
            span.set_attribute("test.outcome", "failed")
            span.set_attribute("test.error", str(call.excinfo.value))
            span.set_attribute("error", True)
        else:
            span.set_attribute("test.outcome", "passed")
```

## Instrumenting Test Infrastructure

The real value comes from tracing the infrastructure your tests interact with. If your test calls an API endpoint, the trace continues into the server:

```python
# In your test file
import httpx
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentation

# Auto-instrument the HTTP client used in tests
HTTPXClientInstrumentation().instrument()

class TestOrderAPI:
    def test_create_order(self, test_client):
        """This test is flaky - sometimes returns 500."""
        with tracer.start_as_current_span("test.create_order") as span:
            # The trace propagates into the service being tested
            response = test_client.post("/api/orders", json={
                "items": [{"sku": "WIDGET-1", "qty": 2}],
                "customer_id": "test-user-123",
            })

            span.set_attribute("http.status_code", response.status_code)
            assert response.status_code == 201
```

When the test fails, the trace shows you not just that the test got a 500 error, but the entire server-side span tree including which database query failed or which downstream service timed out.

## Analyzing Flaky Test Patterns

Collect traces from many CI runs and compare passing vs failing executions:

```python
def analyze_flaky_test(traces, test_name):
    """
    Compare traces from passing and failing runs of the same test
    to find what differs.
    """
    passing_traces = []
    failing_traces = []

    for t in traces:
        test_span = find_span_by_name(t, "test.execute")
        if test_span["attributes"].get("test.name") != test_name:
            continue

        if test_span["attributes"].get("test.outcome") == "passed":
            passing_traces.append(t)
        elif test_span["attributes"].get("test.outcome") == "failed":
            failing_traces.append(t)

    # Compare average durations of each span type
    passing_durations = aggregate_span_durations(passing_traces)
    failing_durations = aggregate_span_durations(failing_traces)

    print(f"Test: {test_name}")
    print(f"Pass rate: {len(passing_traces)}/{len(passing_traces) + len(failing_traces)}")
    print(f"\nSpan duration comparison (avg ms):")
    print(f"{'Span Name':<40} {'Passing':>10} {'Failing':>10} {'Diff':>10}")

    all_span_names = set(passing_durations.keys()) | set(failing_durations.keys())
    for name in sorted(all_span_names):
        p = passing_durations.get(name, 0)
        f = failing_durations.get(name, 0)
        diff = f - p
        if abs(diff) > 10:  # Only show meaningful differences
            print(f"{name:<40} {p:>10.1f} {f:>10.1f} {diff:>+10.1f}")


def aggregate_span_durations(traces):
    """Calculate average duration for each span name."""
    totals = {}
    counts = {}

    for t in traces:
        for span in t["spans"]:
            name = span["name"]
            duration = (span["endTime"] - span["startTime"]) / 1_000_000
            totals[name] = totals.get(name, 0) + duration
            counts[name] = counts.get(name, 0) + 1

    return {name: totals[name] / counts[name] for name in totals}
```

## Common Flaky Test Patterns in Traces

**Timing dependency**: The failing trace shows a database query taking 200ms instead of the usual 20ms. The test has a hardcoded sleep or timeout that is not long enough for slow CI runners.

**Shared state**: The failing trace shows a "test.setup" span that reads stale data from a previous test. The span attributes show the data version does not match what was expected.

**Resource contention**: The failing trace shows long wait times for database connections or ports. Other tests running in parallel are competing for the same resources.

**External service flakiness**: The failing trace shows an HTTP client span to a third-party service returning a 503. The test is not mocking external dependencies.

## CI Pipeline Configuration

Add OpenTelemetry collection to your CI pipeline:

```yaml
# .gitlab-ci.yml example
test:
  image: python:3.11
  services:
    - name: otel/opentelemetry-collector:latest
      alias: otel-collector
  variables:
    OTEL_EXPORTER_OTLP_ENDPOINT: "http://otel-collector:4317"
    CI_PIPELINE_ID: $CI_PIPELINE_ID
    CI_COMMIT_SHA: $CI_COMMIT_SHA
  script:
    - pip install -r requirements-test.txt
    - pytest tests/ --tb=short -v
```

## Summary

Flaky tests are debuggable when you have the right data. OpenTelemetry traces captured during test execution give you precise timing, full request paths through your test infrastructure, and the ability to compare passing and failing runs side by side. Instrument your test framework with spans, make sure traces propagate into the services being tested, and analyze the differences between green and red runs. The root cause is in the data.
