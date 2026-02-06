# How to Validate Semantic Convention Compliance in Your Spans Using Automated Tests

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Semantic Conventions, Automated Testing, Span Validation, Compliance

Description: Write automated tests that check whether your OpenTelemetry spans follow semantic conventions for HTTP, database, and messaging operations.

OpenTelemetry semantic conventions define a standard set of attribute names, types, and values for common operations. When your spans follow these conventions, every tool in the ecosystem (dashboards, alerting, service maps) works out of the box. When they do not, things break in subtle ways. Automated compliance tests catch deviations before they ship.

## Why This Matters

Imagine you instrument a database call with `db.query` instead of the correct `db.statement`. Your spans look fine in a basic trace viewer, but any dashboard that filters on `db.statement` will miss them. Semantic conventions are the contract between your instrumentation and every tool that consumes it.

## Defining the Rules

The OpenTelemetry specification defines required and optional attributes for each span kind. Here is a simplified rule set for the most common operations:

```python
# semantic_rules.py
RULES = {
    "http.server": {
        "required": [
            ("http.request.method", str),
            ("url.scheme", str),
            ("url.path", str),
            ("http.response.status_code", int),
            ("server.address", str),
        ],
        "optional": [
            ("http.route", str),
            ("server.port", int),
            ("user_agent.original", str),
        ],
        "span_kind": "SERVER",
    },
    "http.client": {
        "required": [
            ("http.request.method", str),
            ("url.full", str),
            ("http.response.status_code", int),
        ],
        "optional": [
            ("server.address", str),
            ("server.port", int),
        ],
        "span_kind": "CLIENT",
    },
    "db": {
        "required": [
            ("db.system", str),
            ("db.operation.name", str),
        ],
        "optional": [
            ("db.statement", str),
            ("db.collection.name", str),
            ("server.address", str),
            ("server.port", int),
        ],
        "span_kind": "CLIENT",
    },
    "messaging": {
        "required": [
            ("messaging.system", str),
            ("messaging.operation.type", str),
            ("messaging.destination.name", str),
        ],
        "optional": [
            ("messaging.message.id", str),
            ("messaging.batch.message_count", int),
        ],
    },
}
```

## Building the Compliance Checker

Write a function that takes a span and checks it against the rules:

```python
# compliance_checker.py
from semantic_rules import RULES

class ComplianceViolation:
    def __init__(self, span_name, rule_type, attribute, message):
        self.span_name = span_name
        self.rule_type = rule_type
        self.attribute = attribute
        self.message = message

    def __str__(self):
        return f"[{self.rule_type}] Span '{self.span_name}': {self.message}"

def detect_span_category(span):
    """Determine which semantic convention category a span belongs to."""
    attrs = dict(span.attributes) if span.attributes else {}

    if "db.system" in attrs:
        return "db"
    if "messaging.system" in attrs:
        return "messaging"
    if "http.request.method" in attrs or "http.method" in attrs:
        kind = str(span.kind)
        if "SERVER" in kind:
            return "http.server"
        return "http.client"
    return None

def check_compliance(span):
    """Check a single span against semantic conventions. Returns violations."""
    violations = []
    category = detect_span_category(span)

    if category is None:
        return violations  # Cannot determine category, skip

    rules = RULES.get(category, {})
    attrs = dict(span.attributes) if span.attributes else {}

    # Check required attributes
    for attr_name, attr_type in rules.get("required", []):
        if attr_name not in attrs:
            violations.append(ComplianceViolation(
                span.name, category, attr_name,
                f"Missing required attribute '{attr_name}'"
            ))
        elif not isinstance(attrs[attr_name], attr_type):
            violations.append(ComplianceViolation(
                span.name, category, attr_name,
                f"Attribute '{attr_name}' should be {attr_type.__name__} "
                f"but got {type(attrs[attr_name]).__name__}"
            ))

    # Check for deprecated attribute names
    deprecated = {
        "http.method": "http.request.method",
        "http.status_code": "http.response.status_code",
        "http.url": "url.full",
        "http.target": "url.path",
        "net.peer.name": "server.address",
        "net.peer.port": "server.port",
        "db.name": "db.namespace",
    }

    for old_name, new_name in deprecated.items():
        if old_name in attrs:
            violations.append(ComplianceViolation(
                span.name, category, old_name,
                f"Deprecated attribute '{old_name}', use '{new_name}' instead"
            ))

    return violations
```

## Writing the Test

Integrate the compliance checker into your test suite:

```python
# test_semantic_compliance.py
import pytest
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import SimpleSpanProcessor
from opentelemetry.sdk.trace.export.in_memory import InMemorySpanExporter
from compliance_checker import check_compliance

exporter = InMemorySpanExporter()

@pytest.fixture(autouse=True, scope="module")
def setup():
    provider = TracerProvider()
    provider.add_span_processor(SimpleSpanProcessor(exporter))
    trace.set_tracer_provider(provider)
    yield
    provider.shutdown()

@pytest.fixture(autouse=True)
def clear():
    exporter.clear()

def test_http_endpoint_compliance(test_client):
    """All HTTP spans should follow semantic conventions."""
    # Exercise the API
    test_client.get("/api/orders/123")
    test_client.post("/api/orders", json={"items": ["a"]})

    spans = exporter.get_finished_spans()
    all_violations = []

    for span in spans:
        violations = check_compliance(span)
        all_violations.extend(violations)

    if all_violations:
        violation_report = "\n".join(str(v) for v in all_violations)
        pytest.fail(
            f"Found {len(all_violations)} semantic convention violations:\n"
            f"{violation_report}"
        )

def test_database_span_compliance(test_client):
    """All database spans should follow semantic conventions."""
    test_client.get("/api/orders/123")  # Triggers a DB query

    spans = exporter.get_finished_spans()
    db_spans = [s for s in spans if "db.system" in (dict(s.attributes) or {})]

    assert len(db_spans) > 0, "Expected at least one database span"

    for span in db_spans:
        violations = check_compliance(span)
        assert not violations, (
            f"Database span '{span.name}' has violations: "
            + "; ".join(str(v) for v in violations)
        )

def test_no_deprecated_attributes(test_client):
    """No spans should use deprecated attribute names."""
    test_client.get("/api/orders")

    spans = exporter.get_finished_spans()
    deprecated_found = []

    deprecated_attrs = {"http.method", "http.status_code", "http.url",
                        "http.target", "net.peer.name", "net.peer.port", "db.name"}

    for span in spans:
        attrs = dict(span.attributes) if span.attributes else {}
        for attr in deprecated_attrs:
            if attr in attrs:
                deprecated_found.append(f"Span '{span.name}' uses deprecated '{attr}'")

    assert not deprecated_found, (
        "Found deprecated attributes:\n" + "\n".join(deprecated_found)
    )
```

## Running as a Pre-Commit Hook

You can run the compliance check as a pre-commit hook to catch issues early:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: otel-compliance
        name: OpenTelemetry Semantic Convention Compliance
        entry: pytest tests/test_semantic_compliance.py -x -q
        language: system
        pass_filenames: false
        always_run: true
```

Automated semantic convention compliance tests protect you from gradual drift. They are especially valuable in large teams where multiple developers instrument different parts of the system. Without them, you end up with a mix of old and new attribute names, inconsistent span kinds, and dashboards that only work for some services.
