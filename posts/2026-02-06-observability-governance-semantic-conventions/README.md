# How to Implement Observability Governance: Enforce Semantic Convention Compliance and Attribute Standards Org-Wide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Governance, Semantic Conventions, Attribute Standards

Description: Enforce OpenTelemetry semantic convention compliance and attribute naming standards across your entire organization with automated governance.

When every team names their attributes differently, your observability data becomes a mess. One team uses `user_id`, another uses `userId`, and a third uses `user.id`. Dashboards break when a team renames an attribute. Queries return incomplete results because half the services use a different naming convention. Observability governance solves this by enforcing OpenTelemetry semantic conventions and custom attribute standards organization-wide.

## What Semantic Conventions Cover

OpenTelemetry semantic conventions define standard attribute names for common concepts:

- `service.name`, `service.version` for service identity
- `http.request.method`, `http.response.status_code` for HTTP
- `db.system`, `db.statement` for databases
- `rpc.system`, `rpc.method` for RPC calls
- `messaging.system`, `messaging.destination.name` for messaging

## Defining Your Organization's Standards

Start by extending OTel's semantic conventions with your own:

```yaml
# attribute-standards.yaml
# Organization-wide attribute naming standards

required_resource_attributes:
  # Every service MUST set these
  - name: service.name
    type: string
    pattern: "^[a-z][a-z0-9-]+$"
    description: "Service name in kebab-case"
  - name: service.version
    type: string
    pattern: "^\\d+\\.\\d+\\.\\d+$"
    description: "Semantic version"
  - name: deployment.environment
    type: string
    allowed_values: [production, staging, development, canary]
  - name: team.name
    type: string
    description: "Owning team identifier"

required_span_attributes:
  http:
    # For HTTP server spans
    - name: http.request.method
      type: string
      description: "Use new OTel conventions, not deprecated http.method"
    - name: http.response.status_code
      type: int
    - name: url.path
      type: string

  database:
    - name: db.system
      type: string
      allowed_values: [postgresql, mysql, redis, mongodb, elasticsearch]
    - name: db.operation.name
      type: string
    - name: db.collection.name
      type: string

# Deprecated attributes that must NOT be used
deprecated_attributes:
  - name: http.method
    replacement: http.request.method
    deadline: "2026-06-01"
  - name: http.status_code
    replacement: http.response.status_code
    deadline: "2026-06-01"
  - name: http.url
    replacement: url.full
    deadline: "2026-06-01"

# Custom organization attributes
custom_attributes:
  - name: feature.flag
    type: string
    description: "Active feature flag identifier"
  - name: deployment.canary.weight
    type: int
    description: "Canary deployment traffic percentage"
  - name: incident.id
    type: string
    description: "Active incident identifier for correlation"

# Naming rules
naming_rules:
  # All attributes must use dot notation
  pattern: "^[a-z][a-z0-9]*(\\.[a-z][a-z0-9]*)*$"
  # Maximum key length
  max_key_length: 64
  # Maximum value length
  max_value_length: 256
  # Maximum number of attributes per span
  max_attributes_per_span: 128
```

## Collector-Level Enforcement

Configure the Collector to enforce attribute standards:

```yaml
# governance-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Transform deprecated attributes to new conventions
  transform/migrate:
    trace_statements:
      - context: span
        statements:
          # Migrate deprecated HTTP attributes
          - set(attributes["http.request.method"],
              attributes["http.method"])
            where attributes["http.method"] != nil
          - delete_key(attributes, "http.method")

          - set(attributes["http.response.status_code"],
              attributes["http.status_code"])
            where attributes["http.status_code"] != nil
          - delete_key(attributes, "http.status_code")

          - set(attributes["url.full"], attributes["http.url"])
            where attributes["http.url"] != nil
          - delete_key(attributes, "http.url")

  # Drop non-compliant attributes
  filter/attribute_compliance:
    traces:
      span:
        # Drop spans with non-standard attribute patterns
        - 'IsMatch(resource.attributes["service.name"], "^[A-Z]")'

  # Enforce resource attribute requirements
  transform/enforce:
    trace_statements:
      - context: resource
        statements:
          # Set default values for missing required attributes
          - set(attributes["deployment.environment"], "unknown")
            where attributes["deployment.environment"] == nil
          - set(attributes["team.name"], "unowned")
            where attributes["team.name"] == nil

  batch:
    send_batch_size: 4096
    timeout: 1s

exporters:
  otlphttp:
    endpoint: https://backend:4318

  # Send non-compliant telemetry to a separate dead-letter queue
  kafka/non_compliant:
    brokers: ["kafka:9092"]
    topic: otel-non-compliant
    encoding: otlp_json

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [transform/migrate, transform/enforce, batch]
      exporters: [otlphttp]
```

## CI/CD Compliance Checker

Run compliance checks on instrumentation code:

```python
# check_compliance.py
import yaml
import ast
import re
import sys
import os

class ComplianceChecker:
    def __init__(self, standards_file):
        with open(standards_file) as f:
            self.standards = yaml.safe_load(f)
        self.violations = []

    def check_file(self, filepath):
        """Check a source file for compliance violations."""
        with open(filepath) as f:
            content = f.read()

        # Check for deprecated attributes
        for dep in self.standards.get("deprecated_attributes", []):
            # Look for the deprecated attribute name in string literals
            pattern = re.compile(
                rf'["\']({re.escape(dep["name"])})["\']'
            )
            for match in pattern.finditer(content):
                self.violations.append({
                    "file": filepath,
                    "line": content[:match.start()].count("\n") + 1,
                    "type": "deprecated_attribute",
                    "attribute": dep["name"],
                    "replacement": dep["replacement"],
                    "deadline": dep["deadline"],
                    "severity": "warning",
                })

        # Check for non-standard attribute patterns
        naming_pattern = self.standards["naming_rules"]["pattern"]
        attr_pattern = re.compile(
            r'set_attribute\(["\']([^"\']+)["\']'
            r'|attributes\[["\']([^"\']+)["\']\]'
        )
        for match in attr_pattern.finditer(content):
            attr_name = match.group(1) or match.group(2)
            if not re.match(naming_pattern, attr_name):
                self.violations.append({
                    "file": filepath,
                    "line": content[:match.start()].count("\n") + 1,
                    "type": "naming_violation",
                    "attribute": attr_name,
                    "expected_pattern": naming_pattern,
                    "severity": "error",
                })

    def check_directory(self, directory):
        """Recursively check all source files."""
        skip_dirs = {"node_modules", "vendor", ".git", "dist", "build"}
        extensions = {".py", ".ts", ".js", ".go", ".java"}

        for root, dirs, files in os.walk(directory):
            dirs[:] = [d for d in dirs if d not in skip_dirs]
            for f in files:
                if any(f.endswith(ext) for ext in extensions):
                    self.check_file(os.path.join(root, f))

    def report(self):
        """Print compliance report."""
        errors = [v for v in self.violations if v["severity"] == "error"]
        warnings = [v for v in self.violations if v["severity"] == "warning"]

        print(f"Compliance Check Results")
        print(f"Errors: {len(errors)}, Warnings: {len(warnings)}")

        for v in self.violations:
            level = v["severity"].upper()
            print(f"  [{level}] {v['file']}:{v['line']} "
                  f"- {v['type']}: {v['attribute']}")
            if v["type"] == "deprecated_attribute":
                print(f"    Use '{v['replacement']}' instead "
                      f"(deadline: {v['deadline']})")

        return len(errors) == 0

if __name__ == "__main__":
    checker = ComplianceChecker("attribute-standards.yaml")
    checker.check_directory(sys.argv[1] if len(sys.argv) > 1 else ".")
    success = checker.report()
    sys.exit(0 if success else 1)
```

## GitHub Actions Integration

```yaml
# .github/workflows/compliance.yaml
name: Attribute Compliance Check
on: [pull_request]

jobs:
  compliance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install pyyaml
      - name: Check attribute compliance
        run: python check_compliance.py src/
```

## Wrapping Up

Observability governance ensures that telemetry data is consistent, queryable, and useful across the entire organization. By defining attribute standards as code, enforcing them at the Collector level with automatic migration of deprecated attributes, and checking compliance in CI, you create a system where the quality of your observability data improves over time instead of degrading.
