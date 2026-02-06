# How to Use OpenTelemetry to Monitor Test Suite Execution Performance and Flaky Test Detection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Test Suite Monitoring, Flaky Tests, CI/CD, Test Performance

Description: Instrument your test suite with OpenTelemetry to track test execution times, detect flaky tests, and identify slow test patterns.

Slow and flaky tests waste developer time. The typical response is to rerun and hope, but that does not fix the underlying problem. By instrumenting your test suite with OpenTelemetry, you get historical data on every test: how long it takes, how often it fails, and whether it is getting slower over time. This turns test reliability from a gut feeling into a measurable metric.

## Instrumenting pytest with OpenTelemetry

Write a pytest plugin that creates a span for every test:

```python
# conftest.py
import pytest
import time
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

# Configure the tracer provider
resource = Resource.create({
    "service.name": "test-suite",
    "ci.pipeline.id": os.environ.get("CI_PIPELINE_ID", "local"),
    "ci.branch": os.environ.get("CI_BRANCH", "unknown"),
    "ci.commit_sha": os.environ.get("CI_COMMIT_SHA", "unknown"),
})

provider = TracerProvider(resource=resource)
exporter = OTLPSpanExporter(endpoint="http://localhost:4317", insecure=True)
provider.add_span_processor(BatchSpanProcessor(exporter))
trace.set_tracer_provider(provider)

tracer = trace.get_tracer("pytest-otel")

class OpenTelemetryPlugin:
    """pytest plugin that creates spans for test execution."""

    def __init__(self):
        self.test_spans = {}
        self.suite_span = None

    @pytest.hookimpl(tryfirst=True)
    def pytest_sessionstart(self, session):
        self.suite_span = tracer.start_span("test_suite", attributes={
            "test.suite.name": str(session.config.rootdir),
            "test.suite.start_time": time.time(),
        })

    @pytest.hookimpl(tryfirst=True)
    def pytest_runtest_setup(self, item):
        ctx = trace.set_span_in_context(self.suite_span)
        span = tracer.start_span(
            f"test: {item.nodeid}",
            context=ctx,
            attributes={
                "test.name": item.name,
                "test.module": item.module.__name__ if item.module else "unknown",
                "test.file": str(item.fspath),
                "test.nodeid": item.nodeid,
            },
        )
        self.test_spans[item.nodeid] = {
            "span": span,
            "start_time": time.monotonic(),
        }

    @pytest.hookimpl(trylast=True)
    def pytest_runtest_makereport(self, item, call):
        if item.nodeid not in self.test_spans:
            return

        span_info = self.test_spans[item.nodeid]
        span = span_info["span"]

        if call.when == "call":
            duration_ms = (time.monotonic() - span_info["start_time"]) * 1000
            span.set_attribute("test.duration_ms", duration_ms)

            if call.excinfo is not None:
                span.set_attribute("test.outcome", "failed")
                span.set_attribute("test.error.type", call.excinfo.typename)
                span.set_attribute("test.error.message", str(call.excinfo.value))
                span.set_status(trace.Status(trace.StatusCode.ERROR, str(call.excinfo.value)))
                span.record_exception(call.excinfo.value)
            else:
                span.set_attribute("test.outcome", "passed")
                span.set_status(trace.Status(trace.StatusCode.OK))

        if call.when == "teardown":
            span.end()
            del self.test_spans[item.nodeid]

    @pytest.hookimpl(trylast=True)
    def pytest_runtest_logreport(self, report):
        # Detect xfail and skip
        if hasattr(report, "wasxfail"):
            nodeid = report.nodeid
            if nodeid in self.test_spans:
                self.test_spans[nodeid]["span"].set_attribute("test.outcome", "xfail")

    def pytest_sessionfinish(self, session, exitstatus):
        if self.suite_span:
            self.suite_span.set_attribute("test.suite.exit_code", exitstatus)
            self.suite_span.set_attribute("test.suite.total_duration_s",
                                          time.time() - self.suite_span.attributes.get("test.suite.start_time", 0))
            self.suite_span.end()

        # Flush all spans
        provider.force_flush()

def pytest_configure(config):
    config.pluginmanager.register(OpenTelemetryPlugin(), "opentelemetry")
```

## Detecting Flaky Tests

A flaky test is one that sometimes passes and sometimes fails without code changes. Use the span data to detect them:

```python
# analyze_flaky_tests.py
import requests
from collections import defaultdict

TRACE_BACKEND = "http://localhost:16686"  # Jaeger

def get_test_results(lookback_hours=24):
    """Fetch test spans from the last N hours."""
    resp = requests.get(f"{TRACE_BACKEND}/api/traces", params={
        "service": "test-suite",
        "operation": "test:",  # All test spans start with "test:"
        "lookback": f"{lookback_hours}h",
        "limit": 5000,
    })
    return resp.json().get("data", [])

def find_flaky_tests(traces):
    """Identify tests that have both passed and failed recently."""
    test_outcomes = defaultdict(list)

    for trace_data in traces:
        for span in trace_data.get("spans", []):
            tags = {t["key"]: t["value"] for t in span.get("tags", [])}
            test_name = tags.get("test.nodeid")
            outcome = tags.get("test.outcome")
            if test_name and outcome:
                test_outcomes[test_name].append(outcome)

    flaky_tests = []
    for test_name, outcomes in test_outcomes.items():
        unique_outcomes = set(outcomes)
        if "passed" in unique_outcomes and "failed" in unique_outcomes:
            fail_rate = outcomes.count("failed") / len(outcomes) * 100
            flaky_tests.append({
                "name": test_name,
                "total_runs": len(outcomes),
                "failures": outcomes.count("failed"),
                "fail_rate": fail_rate,
            })

    return sorted(flaky_tests, key=lambda x: x["fail_rate"], reverse=True)

def find_slow_tests(traces, threshold_ms=5000):
    """Find tests that are consistently slow."""
    test_durations = defaultdict(list)

    for trace_data in traces:
        for span in trace_data.get("spans", []):
            tags = {t["key"]: t["value"] for t in span.get("tags", [])}
            test_name = tags.get("test.nodeid")
            duration = tags.get("test.duration_ms")
            if test_name and duration:
                test_durations[test_name].append(float(duration))

    slow_tests = []
    for test_name, durations in test_durations.items():
        avg_duration = sum(durations) / len(durations)
        if avg_duration > threshold_ms:
            slow_tests.append({
                "name": test_name,
                "avg_duration_ms": avg_duration,
                "max_duration_ms": max(durations),
                "runs": len(durations),
            })

    return sorted(slow_tests, key=lambda x: x["avg_duration_ms"], reverse=True)

# Run the analysis
traces = get_test_results(lookback_hours=72)
print("=== Flaky Tests (last 72 hours) ===")
for test in find_flaky_tests(traces):
    print(f"  {test['name']}: {test['fail_rate']:.0f}% failure rate "
          f"({test['failures']}/{test['total_runs']} runs)")

print("\n=== Slow Tests (avg > 5s) ===")
for test in find_slow_tests(traces):
    print(f"  {test['name']}: avg {test['avg_duration_ms']:.0f}ms, "
          f"max {test['max_duration_ms']:.0f}ms")
```

## Building Dashboards

With spans flowing to your trace backend, you can build dashboards using the spanmetrics connector:

```yaml
# otel-collector-config.yaml
connectors:
  spanmetrics:
    dimensions:
      - name: test.name
      - name: test.outcome
      - name: test.module
      - name: ci.branch

exporters:
  prometheus:
    endpoint: 0.0.0.0:8889
```

Then create Prometheus queries:

```promql
# Test failure rate by test name
sum(rate(calls_total{service_name="test-suite", test_outcome="failed"}[1d])) by (test_name)
/
sum(rate(calls_total{service_name="test-suite"}[1d])) by (test_name)

# Average test duration trend
avg(rate(duration_milliseconds_sum{service_name="test-suite"}[1h]))
by (test_name)
/
avg(rate(duration_milliseconds_count{service_name="test-suite"}[1h]))
by (test_name)
```

## Alerting on Test Regressions

Set up alerts for when a previously stable test starts flaking:

```yaml
# alerting-rules.yaml
groups:
  - name: test-reliability
    rules:
      - alert: FlakyTestDetected
        expr: |
          (sum(rate(calls_total{service_name="test-suite", test_outcome="failed"}[24h])) by (test_name))
          /
          (sum(rate(calls_total{service_name="test-suite"}[24h])) by (test_name))
          > 0.1
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Test {{ $labels.test_name }} has >10% failure rate"
```

Instrumenting your test suite with OpenTelemetry gives you the same kind of observability into your CI/CD pipeline that you have in production. Flaky tests become visible before they erode developer trust, and slow tests get flagged before they turn your CI from a 5-minute feedback loop into a 30-minute one.
