# How to Enforce Telemetry Standards and Naming Conventions Across Platform Teams

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Standards, Naming Conventions, Governance

Description: Enforce consistent telemetry naming conventions and attribute standards across platform teams using validation at multiple layers of the telemetry pipeline.

Without naming conventions, your telemetry data becomes a mess of inconsistent attribute names that makes cross-service analysis nearly impossible. One team names their span `http.request`, another uses `HTTP_REQUEST`, a third picks `handleHttpRequest`. The same user ID field appears as `user.id`, `userId`, `user_identifier`, and `customer.id` across different services. Queries that should work across the fleet only match a fraction of the data.

OpenTelemetry provides semantic conventions - a standard vocabulary for common telemetry attributes. But adopting those conventions across an organization requires enforcement at multiple layers: code review, SDK configuration, Collector processing, and CI/CD validation.

## The Standards Document

Start with a written standard that extends the OpenTelemetry semantic conventions with your organization-specific attributes. Keep it machine-readable so tooling can validate against it.

```yaml
# telemetry-standards/conventions.yaml
# Organization telemetry naming conventions
# Based on OpenTelemetry Semantic Conventions v1.25

version: "2.0"

# Required resource attributes for all services
resource_attributes:
  required:
    - name: service.name
      type: string
      pattern: "^[a-z][a-z0-9-]{2,63}$"
      description: "Lowercase, hyphenated service name"

    - name: team.name
      type: string
      pattern: "^[a-z][a-z0-9-]{1,31}$"
      description: "Team identifier from service catalog"

    - name: deployment.environment
      type: string
      allowed_values: [production, staging, development, canary]

    - name: service.version
      type: string
      pattern: "^\\d+\\.\\d+\\.\\d+.*$"
      description: "SemVer version string"

# Span naming rules
span_naming:
  # Use format: VERB resource.action
  patterns:
    http: "{method} {route}"          # GET /api/users
    database: "{db.system} {db.operation}" # postgresql SELECT
    messaging: "{system} {operation}" # kafka send
  rules:
    - max_length: 128
    - no_ids: true           # No UUIDs, numeric IDs in span names
    - no_urls: true          # Use route templates, not full URLs
    - lowercase_verbs: false # HTTP methods stay uppercase

# Custom attribute naming rules
custom_attributes:
  namespace_required: true
  # All custom attributes must be namespaced: org.domain.attribute
  pattern: "^[a-z]+\\.[a-z_]+\\.[a-z_]+$"
  reserved_prefixes:
    - "http."     # Reserved for OTel semantic conventions
    - "db."       # Reserved for OTel semantic conventions
    - "rpc."      # Reserved for OTel semantic conventions
  organization_prefixes:
    - "order."    # Commerce domain
    - "user."     # Identity domain
    - "payment."  # Payment domain
    - "platform." # Platform team
```

## SDK-Level Validation

The first enforcement layer is your internal SDK wrapper. Validate span names and attribute keys before they leave the application.

```python
# internal_telemetry/validators.py
import re
import logging
from typing import Optional

logger = logging.getLogger("telemetry.validation")

# Loaded from conventions.yaml at startup
ATTRIBUTE_PATTERN = re.compile(r"^[a-z]+\.[a-z_]+(\.[a-z_]+)*$")
SPAN_NAME_MAX_LENGTH = 128
HIGH_CARDINALITY_PATTERNS = [
    re.compile(r"/[0-9a-f]{8}-[0-9a-f]{4}"),  # UUIDs
    re.compile(r"/\d{4,}"),                      # Long numeric IDs
    re.compile(r"\?.*="),                         # Query strings
]

def validate_attribute_name(key: str) -> Optional[str]:
    """
    Validate an attribute name against org conventions.
    Returns a warning message if invalid, None if valid.
    """
    # Allow standard OTel attributes
    otel_prefixes = ("http.", "db.", "rpc.", "net.", "messaging.", "service.",
                     "deployment.", "telemetry.", "os.", "process.", "host.")
    if any(key.startswith(p) for p in otel_prefixes):
        return None

    if not ATTRIBUTE_PATTERN.match(key):
        return (
            f"Attribute '{key}' does not match naming convention. "
            f"Use lowercase dotted notation: 'domain.entity.attribute'"
        )
    return None

def validate_span_name(name: str) -> Optional[str]:
    """
    Validate a span name for conventions compliance.
    Returns a warning message if problematic, None if valid.
    """
    if len(name) > SPAN_NAME_MAX_LENGTH:
        return f"Span name exceeds {SPAN_NAME_MAX_LENGTH} characters"

    for pattern in HIGH_CARDINALITY_PATTERNS:
        if pattern.search(name):
            return (
                f"Span name '{name}' contains high-cardinality data. "
                "Move variable values to span attributes."
            )
    return None

class ValidatingSpanProcessor:
    """
    SpanProcessor that validates spans against conventions
    and logs warnings for violations.
    """
    def on_start(self, span, parent_context=None):
        warning = validate_span_name(span.name)
        if warning:
            logger.warning(f"[telemetry-standards] {warning}")

    def on_end(self, span):
        for key in span.attributes:
            warning = validate_attribute_name(key)
            if warning:
                logger.warning(f"[telemetry-standards] {warning}")

    def shutdown(self):
        pass

    def force_flush(self, timeout_millis=None):
        pass
```

## Collector-Level Enforcement

The Collector acts as a second enforcement layer. Use the transform processor to normalize attributes and the filter processor to drop non-compliant data.

```yaml
# otel-collector-standards.yaml
processors:
  # Normalize common mistakes automatically
  transform/normalize:
    trace_statements:
      - context: span
        statements:
          # Fix common attribute name mistakes
          - replace_pattern(attributes["userId"], ".*", attributes["user.id"])
          - replace_pattern(attributes["user_id"], ".*", attributes["user.id"])
          - replace_pattern(attributes["UserID"], ".*", attributes["user.id"])

  # Tag spans that violate conventions
  transform/tag_violations:
    trace_statements:
      - context: resource
        statements:
          # Mark resources missing required attributes
          - set(attributes["telemetry.compliance"], "missing_team")
            where attributes["team.name"] == nil

  # Count violations for metrics (do not drop data in enforcement mode)
  attributes/compliance_metrics:
    actions:
      - key: telemetry.compliance_checked
        value: "true"
        action: upsert
```

## CI/CD Pipeline Validation

Catch convention violations before code reaches production. A CI step scans instrumentation code for common mistakes.

```python
# ci/check_telemetry_conventions.py
"""
CI pipeline step that checks instrumentation code for convention violations.
Exit code 1 if violations found, 0 if clean.
"""
import ast
import sys
import re
from pathlib import Path

VIOLATIONS = []

def check_file(filepath: Path):
    """Parse a Python file and check for telemetry convention issues."""
    source = filepath.read_text()
    tree = ast.parse(source)

    for node in ast.walk(tree):
        # Check span name literals
        if isinstance(node, ast.Call):
            func = node.func
            if isinstance(func, ast.Attribute) and func.attr == "start_as_current_span":
                if node.args and isinstance(node.args[0], ast.JoinedStr):
                    VIOLATIONS.append(
                        f"{filepath}:{node.lineno} - "
                        "f-string in span name suggests dynamic content. "
                        "Use static span names and put variables in attributes."
                    )

        # Check set_attribute calls for naming
        if isinstance(node, ast.Call):
            func = node.func
            if isinstance(func, ast.Attribute) and func.attr == "set_attribute":
                if node.args and isinstance(node.args[0], ast.Constant):
                    attr_name = node.args[0].value
                    if not re.match(r"^[a-z]+\.[a-z_.]+$", str(attr_name)):
                        VIOLATIONS.append(
                            f"{filepath}:{node.lineno} - "
                            f"Attribute '{attr_name}' does not follow "
                            "dotted lowercase convention."
                        )

if __name__ == "__main__":
    for py_file in Path("src").rglob("*.py"):
        check_file(py_file)

    if VIOLATIONS:
        print("Telemetry convention violations found:")
        for v in VIOLATIONS:
            print(f"  - {v}")
        sys.exit(1)
    else:
        print("All telemetry conventions pass.")
        sys.exit(0)
```

## Compliance Dashboard

Track convention adoption across the organization with a compliance dashboard that queries your telemetry backend.

```yaml
# compliance-dashboard-queries.yaml
# These queries power the telemetry standards compliance dashboard

panels:
  - title: "Services Missing Required Resource Attributes"
    query: |
      count by (service_name) (
        group by (service_name) (up)
        unless
        group by (service_name) (
          up{team_name!=""}
        )
      )

  - title: "High-Cardinality Span Names (Top 20)"
    query: |
      topk(20,
        count by (span_name, service_name) (
          rate(traces_spanmetricsconnector_duration_seconds_count[1h])
        )
      )

  - title: "Non-Standard Attribute Usage"
    type: trace_query
    query: 'attributes["telemetry.compliance"] = "missing_team"'
```

Enforcement works best when it is gradual. Start with warnings in logs, then add CI checks that report but do not block, then switch to blocking mode after teams have had time to fix existing violations. Hard enforcement on day one creates friction. Gradual enforcement with clear documentation and tooling support creates adoption.
