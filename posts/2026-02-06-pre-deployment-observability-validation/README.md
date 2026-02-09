# How to Implement Pre-Deployment Observability Validation: Ensure OpenTelemetry Instrumentation Exists Before Merge

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, CI/CD, Pre-Deployment Validation, Quality Gates

Description: Build CI/CD gates that validate OpenTelemetry instrumentation exists in code before allowing pull requests to be merged.

What if every new service had to prove it was properly instrumented before it could be deployed? Instead of discovering missing telemetry after an incident, you can catch it in CI. This post shows how to build pre-deployment validation that checks for OpenTelemetry instrumentation as a merge requirement.

## Why Pre-Deployment Validation

Most teams add observability after the fact, usually after something breaks in production. By making instrumentation a merge gate, you shift observability left and ensure every service ships with proper tracing, metrics, and logging from day one.

## What to Validate

Here are the checks you should run before allowing a merge:

1. **OTel SDK dependency exists** in the project manifest.
2. **Tracer initialization** code is present.
3. **Key spans are defined** for HTTP handlers and database calls.
4. **Resource attributes** include `service.name` and `service.version`.
5. **Collector configuration** exists for the deployment.

## GitHub Actions Workflow

```yaml
# .github/workflows/observability-check.yaml
name: Observability Validation
on:
  pull_request:
    branches: [main]

jobs:
  check-instrumentation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check OTel SDK dependency
        run: |
          # Detect language and check for OTel dependency
          if [ -f "package.json" ]; then
            echo "Checking Node.js project..."
            if ! grep -q "@opentelemetry/sdk-node\|@opentelemetry/api" package.json; then
              echo "FAIL: Missing OpenTelemetry SDK dependency in package.json"
              exit 1
            fi
          elif [ -f "requirements.txt" ] || [ -f "pyproject.toml" ]; then
            echo "Checking Python project..."
            if ! grep -rq "opentelemetry-sdk\|opentelemetry-api" requirements.txt pyproject.toml 2>/dev/null; then
              echo "FAIL: Missing OpenTelemetry SDK dependency"
              exit 1
            fi
          elif [ -f "go.mod" ]; then
            echo "Checking Go project..."
            if ! grep -q "go.opentelemetry.io/otel" go.mod; then
              echo "FAIL: Missing OpenTelemetry SDK dependency in go.mod"
              exit 1
            fi
          fi
          echo "PASS: OTel SDK dependency found"

      - name: Check tracer initialization
        run: |
          python3 << 'SCRIPT'
          import os
          import re
          import sys

          # Patterns that indicate tracer initialization
          patterns = [
              # Node.js
              r'NodeSDK|TracerProvider|registerInstrumentations',
              # Python
              r'TracerProvider|configure_opentelemetry|trace\.get_tracer',
              # Go
              r'sdktrace\.NewTracerProvider|otel\.SetTracerProvider',
              # Java
              r'OpenTelemetrySdk\.builder|GlobalOpenTelemetry',
          ]

          found = False
          for root, dirs, files in os.walk('.'):
              # Skip node_modules, vendor, etc.
              dirs[:] = [d for d in dirs if d not in
                         ['node_modules', 'vendor', '.git', 'dist']]
              for f in files:
                  if f.endswith(('.ts', '.js', '.py', '.go', '.java')):
                      filepath = os.path.join(root, f)
                      with open(filepath) as fh:
                          content = fh.read()
                          for pattern in patterns:
                              if re.search(pattern, content):
                                  print(f"PASS: Tracer init found in {filepath}")
                                  found = True
                                  break
              if found:
                  break

          if not found:
              print("FAIL: No tracer initialization found in source code")
              sys.exit(1)
          SCRIPT

      - name: Check resource attributes
        run: |
          python3 << 'SCRIPT'
          import os
          import re
          import sys

          required_attrs = ['service.name', 'service.version']
          found_attrs = set()

          for root, dirs, files in os.walk('.'):
              dirs[:] = [d for d in dirs if d not in
                         ['node_modules', 'vendor', '.git']]
              for f in files:
                  if f.endswith(('.ts', '.js', '.py', '.go', '.java',
                                 '.yaml', '.yml', '.json', '.toml')):
                      filepath = os.path.join(root, f)
                      try:
                          with open(filepath) as fh:
                              content = fh.read()
                              for attr in required_attrs:
                                  if attr in content:
                                      found_attrs.add(attr)
                      except UnicodeDecodeError:
                          pass

          missing = set(required_attrs) - found_attrs
          if missing:
              print(f"FAIL: Missing resource attributes: {missing}")
              sys.exit(1)
          print(f"PASS: All required resource attributes found: {found_attrs}")
          SCRIPT

      - name: Check Collector config exists
        run: |
          # Look for a Collector config in the repo or deployment manifests
          CONFIGS=$(find . -name "otel-collector*.yaml" -o \
                         -name "otel-collector*.yml" -o \
                         -name "collector-config*" | head -5)
          if [ -z "$CONFIGS" ]; then
            # Also check Kubernetes manifests
            CONFIGS=$(grep -rl "otel/opentelemetry-collector" \
                      k8s/ helm/ deploy/ charts/ 2>/dev/null || true)
          fi
          if [ -z "$CONFIGS" ]; then
            echo "WARN: No Collector configuration found"
            echo "Consider adding an otel-collector-config.yaml"
            # Warning only, not a hard failure
          else
            echo "PASS: Collector config found: $CONFIGS"
          fi

      - name: Validate OTel config syntax
        run: |
          # If a Collector config exists, validate its syntax
          for config in $(find . -name "otel-collector*.yaml" 2>/dev/null); do
            echo "Validating $config..."
            docker run --rm \
              -v "$(pwd)/$config:/etc/otel/config.yaml" \
              otel/opentelemetry-collector-contrib:latest \
              validate --config /etc/otel/config.yaml
          done
```

## Custom Validation Script

For more sophisticated checks, write a dedicated validation script:

```python
# scripts/validate_instrumentation.py
import ast
import sys
import os
import json

class InstrumentationValidator:
    def __init__(self, project_root):
        self.root = project_root
        self.errors = []
        self.warnings = []

    def validate(self):
        self.check_sdk_dependency()
        self.check_tracer_init()
        self.check_span_coverage()
        self.check_error_handling()
        return len(self.errors) == 0

    def check_span_coverage(self):
        """Check that HTTP handlers have spans."""
        handler_files = []
        for root, dirs, files in os.walk(self.root):
            dirs[:] = [d for d in dirs
                       if d not in ['node_modules', 'vendor', '.git']]
            for f in files:
                filepath = os.path.join(root, f)
                if f.endswith('.py'):
                    with open(filepath) as fh:
                        content = fh.read()
                    # Check for Flask/FastAPI route handlers
                    has_routes = ('@app.route' in content or
                                  '@router.' in content)
                    has_spans = ('start_as_current_span' in content or
                                 'tracer.start_span' in content or
                                 'instrument_app' in content)
                    if has_routes and not has_spans:
                        self.warnings.append(
                            f"{filepath}: HTTP handlers found without "
                            f"explicit spans. Consider adding auto-"
                            f"instrumentation."
                        )

    def check_error_handling(self):
        """Check that span status is set on errors."""
        for root, dirs, files in os.walk(self.root):
            dirs[:] = [d for d in dirs
                       if d not in ['node_modules', 'vendor', '.git']]
            for f in files:
                if f.endswith('.py'):
                    filepath = os.path.join(root, f)
                    with open(filepath) as fh:
                        content = fh.read()
                    if ('start_as_current_span' in content and
                            'set_status' not in content and
                            'record_exception' not in content):
                        self.warnings.append(
                            f"{filepath}: Spans created but no error "
                            f"status handling found."
                        )

    def report(self):
        print("=== Observability Validation Report ===")
        for w in self.warnings:
            print(f"  WARN: {w}")
        for e in self.errors:
            print(f"  FAIL: {e}")
        if not self.errors and not self.warnings:
            print("  All checks passed.")
        return len(self.errors) == 0

if __name__ == "__main__":
    validator = InstrumentationValidator(os.getcwd())
    validator.validate()
    success = validator.report()
    sys.exit(0 if success else 1)
```

## Wrapping Up

Pre-deployment observability validation ensures that instrumentation is treated as a first-class requirement, not an afterthought. By running these checks in CI, you guarantee that every service that reaches production has the minimum telemetry needed for debugging and monitoring. Start with dependency and initialization checks, then gradually add more sophisticated span coverage analysis.
