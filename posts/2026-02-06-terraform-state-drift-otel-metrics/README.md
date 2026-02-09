# How to Monitor Terraform State Drift Detection and Plan Execution Duration with OpenTelemetry Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Terraform, State Drift, Metrics, Infrastructure Monitoring

Description: Monitor Terraform state drift detection and plan execution duration by instrumenting your CI/CD pipeline with OpenTelemetry metrics.

Terraform state drift happens when the real infrastructure diverges from the state file. Monitoring drift detection and plan execution metrics helps you catch unexpected changes, track infrastructure complexity, and identify slow providers. Since Terraform does not natively export OpenTelemetry metrics, we build a wrapper that instruments the key operations.

## The Approach

We wrap Terraform commands with a script that measures execution time, counts resource changes, and exports these as OpenTelemetry metrics through the Collector's OTLP receiver.

## Instrumenting Terraform with a Wrapper Script

```python
#!/usr/bin/env python3
# terraform_instrumented.py
"""
Wrapper script that runs Terraform commands and exports
metrics to an OpenTelemetry Collector.
"""

import subprocess
import json
import time
import sys
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.resources import Resource

# Configure the OTel SDK
resource = Resource.create({
    "service.name": "terraform",
    "deployment.environment": sys.argv[1] if len(sys.argv) > 1 else "unknown",
})

exporter = OTLPMetricExporter(
    endpoint="localhost:4317",
    insecure=True,
)

reader = PeriodicExportingMetricReader(exporter, export_interval_millis=5000)
provider = MeterProvider(resource=resource, metric_readers=[reader])
metrics.set_meter_provider(provider)

meter = metrics.get_meter("terraform.instrumentation")

# Define metrics
plan_duration = meter.create_histogram(
    name="terraform.plan.duration",
    description="Duration of terraform plan execution in seconds",
    unit="s",
)

apply_duration = meter.create_histogram(
    name="terraform.apply.duration",
    description="Duration of terraform apply execution in seconds",
    unit="s",
)

resource_drift_count = meter.create_counter(
    name="terraform.drift.resources",
    description="Number of resources that have drifted from state",
)

resources_to_change = meter.create_histogram(
    name="terraform.plan.resources_changed",
    description="Number of resources that will be changed by the plan",
)

plan_errors = meter.create_counter(
    name="terraform.plan.errors",
    description="Number of failed terraform plan executions",
)


def run_plan(workspace: str, directory: str):
    """Run terraform plan and export metrics."""
    start = time.time()

    # Run plan with JSON output for machine parsing
    result = subprocess.run(
        ["terraform", "plan", "-detailed-exitcode", "-json", "-out=tfplan"],
        capture_output=True,
        text=True,
        cwd=directory,
    )

    duration = time.time() - start
    attrs = {"tf.workspace": workspace, "tf.directory": directory}

    plan_duration.record(duration, attrs)

    if result.returncode == 2:
        # Exit code 2 means changes detected (drift)
        plan_output = subprocess.run(
            ["terraform", "show", "-json", "tfplan"],
            capture_output=True,
            text=True,
            cwd=directory,
        )

        if plan_output.returncode == 0:
            plan_data = json.loads(plan_output.stdout)
            changes = plan_data.get("resource_changes", [])

            # Count drift by change type
            add_count = sum(1 for c in changes if "create" in c.get("change", {}).get("actions", []))
            update_count = sum(1 for c in changes if "update" in c.get("change", {}).get("actions", []))
            delete_count = sum(1 for c in changes if "delete" in c.get("change", {}).get("actions", []))

            drift_total = add_count + update_count + delete_count
            resource_drift_count.add(drift_total, {**attrs, "drift.type": "total"})
            resources_to_change.record(drift_total, attrs)

            print(f"Drift detected: +{add_count} ~{update_count} -{delete_count}")

    elif result.returncode == 1:
        plan_errors.add(1, attrs)
        print(f"Plan failed: {result.stderr}")

    else:
        print("No changes detected - infrastructure matches state")

    # Flush metrics
    provider.force_flush()


if __name__ == "__main__":
    workspace = sys.argv[1] if len(sys.argv) > 1 else "default"
    directory = sys.argv[2] if len(sys.argv) > 2 else "."
    run_plan(workspace, directory)
```

## CI/CD Pipeline Integration

Integrate the instrumented wrapper into your CI/CD pipeline:

```yaml
# .gitlab-ci.yml
terraform-drift-check:
  stage: drift-detection
  image: hashicorp/terraform:1.7
  before_script:
    - pip install opentelemetry-api opentelemetry-sdk opentelemetry-exporter-otlp-proto-grpc
  script:
    - terraform init
    - python3 terraform_instrumented.py production ./infrastructure
  rules:
    # Run drift detection on a schedule
    - if: $CI_PIPELINE_SOURCE == "schedule"
```

For GitHub Actions:

```yaml
# .github/workflows/drift-detection.yml
name: Terraform Drift Detection
on:
  schedule:
    - cron: "0 */6 * * *"  # Every 6 hours

jobs:
  drift-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Install OTel Python SDK
        run: pip install opentelemetry-api opentelemetry-sdk opentelemetry-exporter-otlp-proto-grpc

      - name: Run drift detection
        env:
          OTEL_EXPORTER_OTLP_ENDPOINT: ${{ secrets.OTLP_ENDPOINT }}
        run: |
          terraform init
          python3 terraform_instrumented.py production ./infrastructure
```

## Collector Configuration

Configure the Collector to receive these Terraform metrics:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

processors:
  resource/terraform:
    attributes:
      - key: service.name
        value: "terraform"
        action: upsert

  batch:
    timeout: 10s

exporters:
  otlp:
    endpoint: "backend.internal:4317"

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [resource/terraform, batch]
      exporters: [otlp]
```

## Dashboard Metrics

Build dashboards with these queries:

- **Drift trend**: `terraform.drift.resources` over time, broken down by workspace
- **Plan duration trend**: `terraform.plan.duration` p50, p90, p99
- **Error rate**: `terraform.plan.errors` rate
- **Resources managed**: `terraform.plan.resources_changed` histogram

## Alerting

Set up alerts for drift and failures:

```
# Alert: Drift detected in production
# terraform.drift.resources{tf.workspace="production"} > 0

# Alert: Plan execution taking too long (> 10 minutes)
# terraform.plan.duration p99 > 600

# Alert: Plan failures
# rate(terraform.plan.errors) > 0
```

Monitoring Terraform operations with OpenTelemetry bridges the gap between your infrastructure-as-code workflow and your observability platform. You can track drift trends, optimize slow plans, and catch errors in your CI/CD pipeline using the same tools you use for application monitoring.
