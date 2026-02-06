# How to Set Up Automated Compliance Checks for OpenTelemetry Pipeline Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Compliance, Automation, Pipeline Configuration

Description: Learn how to build automated compliance checks that validate your OpenTelemetry pipeline configurations against security and regulatory policies.

If you run OpenTelemetry in a regulated environment, you already know the pain of proving that your telemetry pipelines meet compliance requirements. Manual reviews are slow, error-prone, and don't scale. The better approach is to automate compliance checks so that every configuration change is validated before it hits production.

This post walks through building a practical compliance checking system for OpenTelemetry Collector configurations using OPA (Open Policy Agent) and CI/CD integration.

## Why Automate Compliance Checks?

OpenTelemetry Collector configs define how data flows through your system - what gets collected, where it goes, and what transformations happen along the way. In industries like healthcare or finance, misconfigured pipelines can lead to data leaks, missing audit trails, or violations of retention policies. Catching these issues early, ideally before deployment, saves you from painful audit findings later.

## Defining Your Compliance Policies

Start by identifying what your compliance framework requires from telemetry pipelines. Common policies include:

- All exporters must use TLS encryption
- PII fields must be redacted before export
- Data must be sent to approved destinations only
- Logging pipelines must include a persistent queue

Here is a Rego policy file that checks whether all exporters in an OTel Collector config enforce TLS.

```rego
# policy/otel_compliance.rego
# This policy ensures every OTLP exporter has TLS configured

package otel.compliance

# Deny if any OTLP exporter is missing TLS configuration
deny[msg] {
    some exporter_name
    exporter := input.exporters[exporter_name]
    startswith(exporter_name, "otlp")
    not exporter.tls
    msg := sprintf("Exporter '%s' is missing TLS configuration", [exporter_name])
}

# Deny if any exporter uses an unapproved endpoint
deny[msg] {
    some exporter_name
    exporter := input.exporters[exporter_name]
    endpoint := exporter.endpoint
    not approved_endpoint(endpoint)
    msg := sprintf("Exporter '%s' uses unapproved endpoint: %s", [exporter_name, endpoint])
}

# List of approved endpoints for your organization
approved_endpoint(ep) {
    approved := {
        "otel-gateway.internal:4317",
        "otel-backup.internal:4317",
        "tempo.monitoring.svc:4317"
    }
    approved[ep]
}
```

## Validating Collector Configs with OPA

You can evaluate the policy against your collector config using the OPA CLI. First, convert your YAML config to JSON since OPA works with JSON input.

```bash
# Convert the OTel Collector YAML config to JSON
# Then run OPA eval to check for any compliance violations
yq eval -o=json otel-collector-config.yaml > /tmp/otel-config.json

opa eval \
  --input /tmp/otel-config.json \
  --data policy/otel_compliance.rego \
  "data.otel.compliance.deny" \
  --format pretty
```

If there are violations, OPA returns the denial messages. An empty result means the config passes all checks.

## Adding a PII Redaction Check

Many compliance frameworks require that sensitive data never leaves your network boundary unmasked. This policy checks that your pipeline includes the attributes processor with redaction rules.

```rego
# policy/pii_check.rego
# Ensures pipelines include PII redaction via the attributes processor

package otel.pii

# Check that at least one processor handles PII redaction
deny[msg] {
    some pipeline_name
    pipeline := input.service.pipelines[pipeline_name]
    not has_redaction_processor(pipeline.processors)
    msg := sprintf("Pipeline '%s' has no PII redaction processor", [pipeline_name])
}

has_redaction_processor(processors) {
    some i
    contains(processors[i], "attributes")
}
```

## Integrating with CI/CD

The real power comes from running these checks automatically on every pull request that touches collector configs. Here is a GitHub Actions workflow that does exactly that.

```yaml
# .github/workflows/otel-compliance.yaml
name: OTel Compliance Check

on:
  pull_request:
    paths:
      - 'deploy/otel/**'
      - 'config/otel-collector*.yaml'

jobs:
  compliance-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install OPA
        run: |
          curl -L -o opa https://openpolicyagent.org/downloads/latest/opa_linux_amd64
          chmod +x opa && sudo mv opa /usr/local/bin/

      - name: Install yq
        run: |
          sudo wget -qO /usr/local/bin/yq \
            https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64
          sudo chmod +x /usr/local/bin/yq

      # Convert each collector config to JSON and run compliance checks
      - name: Run compliance checks
        run: |
          FAILED=0
          for config in config/otel-collector*.yaml; do
            echo "Checking $config..."
            yq eval -o=json "$config" > /tmp/config.json
            RESULT=$(opa eval --input /tmp/config.json \
              --data policy/ \
              "data.otel.compliance.deny" --format json)
            if echo "$RESULT" | grep -q '"value"'; then
              echo "FAIL: $config has compliance violations"
              echo "$RESULT" | jq '.result[0].expressions[0].value'
              FAILED=1
            fi
          done
          exit $FAILED
```

## Building a Compliance Dashboard

Beyond CI checks, it helps to maintain a running record of compliance status. You can write a small script that periodically scans your deployed collector configs and pushes results to a database or monitoring system.

```python
# compliance_scanner.py
# Scans running OTel Collector instances and checks their configs
import requests
import subprocess
import json
from datetime import datetime

COLLECTOR_ENDPOINTS = [
    "http://otel-collector-1:13133",
    "http://otel-collector-2:13133",
]

def fetch_effective_config(endpoint):
    """Fetch the running config from the collector's zpages endpoint."""
    resp = requests.get(f"{endpoint}/debug/configz")
    resp.raise_for_status()
    return resp.json()

def run_opa_check(config_json):
    """Run OPA compliance check against a config."""
    result = subprocess.run(
        ["opa", "eval", "--input", "/dev/stdin",
         "--data", "policy/", "data.otel.compliance.deny",
         "--format", "json"],
        input=json.dumps(config_json),
        capture_output=True, text=True
    )
    return json.loads(result.stdout)

for endpoint in COLLECTOR_ENDPOINTS:
    config = fetch_effective_config(endpoint)
    violations = run_opa_check(config)
    print(f"[{datetime.now().isoformat()}] {endpoint}: "
          f"{len(violations.get('result', []))} violations found")
```

## Wrapping Up

Automated compliance checks turn your OpenTelemetry pipeline configuration into a continuously validated asset rather than a liability. By combining OPA policies with CI/CD gates and periodic scanning, you get early detection of misconfigurations, a clear audit trail of what was checked and when, and confidence that production pipelines match your compliance requirements. Start with the most critical policies - TLS enforcement and approved destinations - and expand from there as your compliance needs grow.
