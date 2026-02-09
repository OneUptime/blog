# How to Implement Contract Testing for OpenTelemetry Spans to Prevent Instrumentation Regressions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Contract Testing, Instrumentation, Testing

Description: Implement contract testing for your OpenTelemetry spans to catch instrumentation regressions before they break dashboards and alerts.

You spend weeks building dashboards and alert rules that rely on specific span attributes, metric names, and trace structures. Then someone refactors the payment service and renames `payment.amount` to `order.total`, and half your dashboards break silently. Nobody notices until the next incident when the alerts do not fire.

Contract testing for OpenTelemetry spans prevents this. By defining contracts that specify which spans, attributes, and values your instrumentation must produce, you can catch breaking changes in CI before they reach production.

## What is a Span Contract

A span contract is a specification that says: "When service X handles operation Y, it must produce a span with these attributes." It is similar to API contract testing (like Pact), but instead of testing HTTP request/response schemas, you test the telemetry your service emits.

A contract includes:

- **Span name** - The expected name of the span.
- **Required attributes** - Attributes that must be present.
- **Attribute types** - The expected data type of each attribute.
- **Attribute value constraints** - Allowed values or patterns.

## Defining Span Contracts

Create a JSON schema for your span contracts:

```json
{
  "contracts": [
    {
      "service": "order-service",
      "operation": "create_order",
      "span_name": "POST /api/v1/orders",
      "span_kind": "SERVER",
      "required_attributes": {
        "http.method": {"type": "string", "values": ["POST"]},
        "http.route": {"type": "string", "values": ["/api/v1/orders"]},
        "http.status_code": {"type": "int"},
        "order.id": {"type": "string", "pattern": "^ord-[a-z0-9]+$"},
        "order.total_amount": {"type": "float"},
        "order.currency": {"type": "string", "values": ["USD", "EUR", "GBP"]},
        "order.item_count": {"type": "int"},
        "customer.id": {"type": "string"}
      },
      "optional_attributes": {
        "order.promo_code": {"type": "string"},
        "order.discount_percent": {"type": "float"}
      },
      "child_spans": [
        {
          "span_name": "INSERT orders",
          "span_kind": "CLIENT",
          "required_attributes": {
            "db.system": {"type": "string", "values": ["postgresql"]},
            "db.operation": {"type": "string", "values": ["INSERT"]}
          }
        }
      ]
    }
  ]
}
```

## Building the Contract Validator

Here is a Python implementation that validates spans against contracts:

```python
import json
import re
from dataclasses import dataclass
from typing import Optional

@dataclass
class ContractViolation:
    contract_name: str
    span_name: str
    violation_type: str  # "missing_attribute", "wrong_type", "invalid_value"
    attribute: str
    expected: str
    actual: str

class SpanContractValidator:
    """
    Validates OpenTelemetry spans against defined contracts.
    Reports violations that would break downstream consumers
    (dashboards, alerts, queries).
    """

    def __init__(self, contract_file):
        with open(contract_file) as f:
            data = json.load(f)
        self.contracts = data["contracts"]

    def validate_span(self, span):
        """
        Check a span against all matching contracts.
        Returns a list of violations.
        """
        violations = []

        for contract in self.contracts:
            if not self.span_matches_contract(span, contract):
                continue

            # Check required attributes
            for attr_name, attr_spec in contract["required_attributes"].items():
                violation = self.validate_attribute(
                    span, contract, attr_name, attr_spec, required=True
                )
                if violation:
                    violations.append(violation)

            # Check optional attributes (only validate type/value if present)
            for attr_name, attr_spec in contract.get("optional_attributes", {}).items():
                if attr_name in span.attributes:
                    violation = self.validate_attribute(
                        span, contract, attr_name, attr_spec, required=False
                    )
                    if violation:
                        violations.append(violation)

            # Check child span contracts
            for child_contract in contract.get("child_spans", []):
                child_found = False
                for child_span in span.children:
                    if child_span.name == child_contract["span_name"]:
                        child_found = True
                        for attr_name, attr_spec in child_contract["required_attributes"].items():
                            violation = self.validate_attribute(
                                child_span, child_contract,
                                attr_name, attr_spec, required=True
                            )
                            if violation:
                                violations.append(violation)

                if not child_found:
                    violations.append(ContractViolation(
                        contract_name=contract["operation"],
                        span_name=span.name,
                        violation_type="missing_child_span",
                        attribute="",
                        expected=child_contract["span_name"],
                        actual="not found",
                    ))

        return violations

    def span_matches_contract(self, span, contract):
        """Check if a span should be validated by this contract."""
        return (
            span.name == contract["span_name"]
            and span.resource_attrs.get("service.name") == contract["service"]
        )

    def validate_attribute(self, span, contract, attr_name, attr_spec, required):
        """Validate a single attribute against its spec."""
        value = span.attributes.get(attr_name)

        # Check if required attribute is missing
        if value is None:
            if required:
                return ContractViolation(
                    contract_name=contract.get("operation", contract["span_name"]),
                    span_name=span.name,
                    violation_type="missing_attribute",
                    attribute=attr_name,
                    expected=f"type={attr_spec['type']}",
                    actual="attribute not present",
                )
            return None

        # Check type
        expected_type = attr_spec["type"]
        type_map = {
            "string": str,
            "int": int,
            "float": (int, float),
            "bool": bool,
        }

        if not isinstance(value, type_map.get(expected_type, str)):
            return ContractViolation(
                contract_name=contract.get("operation", contract["span_name"]),
                span_name=span.name,
                violation_type="wrong_type",
                attribute=attr_name,
                expected=expected_type,
                actual=type(value).__name__,
            )

        # Check allowed values
        if "values" in attr_spec and value not in attr_spec["values"]:
            return ContractViolation(
                contract_name=contract.get("operation", contract["span_name"]),
                span_name=span.name,
                violation_type="invalid_value",
                attribute=attr_name,
                expected=f"one of {attr_spec['values']}",
                actual=str(value),
            )

        # Check pattern
        if "pattern" in attr_spec and isinstance(value, str):
            if not re.match(attr_spec["pattern"], value):
                return ContractViolation(
                    contract_name=contract.get("operation", contract["span_name"]),
                    span_name=span.name,
                    violation_type="invalid_value",
                    attribute=attr_name,
                    expected=f"matches {attr_spec['pattern']}",
                    actual=value,
                )

        return None
```

## Writing the Test Runner

Integrate the contract validator into your test suite:

```python
import pytest
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export.in_memory import InMemorySpanExporter

# Use an in-memory exporter to capture spans during tests
exporter = InMemorySpanExporter()

@pytest.fixture(autouse=True)
def setup_tracing():
    """Set up a test tracer provider that captures spans in memory."""
    provider = TracerProvider()
    provider.add_span_processor(
        SimpleSpanProcessor(exporter)
    )
    trace.set_tracer_provider(provider)
    exporter.clear()
    yield
    exporter.clear()

@pytest.fixture
def contract_validator():
    return SpanContractValidator("contracts/span-contracts.json")

def test_create_order_span_contract(client, contract_validator):
    """
    Verify that the create order endpoint produces spans
    that match the defined contract.
    """
    # Trigger the operation
    response = client.post("/api/v1/orders", json={
        "product_id": "prod-123",
        "quantity": 2,
    })
    assert response.status_code == 201

    # Get the captured spans
    spans = exporter.get_finished_spans()

    # Validate each span against contracts
    all_violations = []
    for span in spans:
        violations = contract_validator.validate_span(span)
        all_violations.extend(violations)

    # Report violations clearly
    if all_violations:
        violation_report = "\n".join(
            f"  - [{v.violation_type}] {v.span_name}.{v.attribute}: "
            f"expected {v.expected}, got {v.actual}"
            for v in all_violations
        )
        pytest.fail(
            f"Span contract violations detected:\n{violation_report}\n\n"
            f"These changes will break dashboards and alerts that "
            f"depend on these span attributes."
        )

def test_no_unknown_attributes_added(client, contract_validator):
    """
    Optionally verify that no unexpected attributes were added.
    This is a stricter check that ensures the contract is kept
    up to date.
    """
    response = client.post("/api/v1/orders", json={
        "product_id": "prod-123",
        "quantity": 2,
    })

    spans = exporter.get_finished_spans()

    for span in spans:
        for contract in contract_validator.contracts:
            if not contract_validator.span_matches_contract(span, contract):
                continue

            known_attrs = set(contract["required_attributes"].keys())
            known_attrs.update(contract.get("optional_attributes", {}).keys())
            actual_attrs = set(span.attributes.keys())

            # Filter out standard OTel attributes
            standard_prefixes = ("otel.", "telemetry.", "tracetest.")
            actual_attrs = {
                a for a in actual_attrs
                if not any(a.startswith(p) for p in standard_prefixes)
            }

            unknown = actual_attrs - known_attrs
            if unknown:
                print(f"Warning: unknown attributes on {span.name}: {unknown}")
                print("Consider adding these to the contract if they are intentional.")
```

## CI Integration

Add the contract tests to your CI pipeline:

```yaml
# .github/workflows/span-contracts.yaml
name: Span Contract Tests
on:
  pull_request:
    branches: [main]

jobs:
  contract-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Install dependencies
        run: pip install -r requirements-test.txt

      - name: Run span contract tests
        run: pytest tests/contracts/ -v --tb=long
```

## Summary

Contract testing for OpenTelemetry spans prevents the silent breakage that happens when someone changes instrumentation without knowing what depends on it. By defining explicit contracts for your spans and validating them in CI, you catch attribute renames, type changes, and missing attributes before they break your dashboards and alerts. The effort to maintain contracts is small compared to the cost of discovering broken observability during an incident.
