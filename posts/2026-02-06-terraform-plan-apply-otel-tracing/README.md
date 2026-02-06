# How to Monitor Terraform Plan and Apply Operations with OpenTelemetry Tracing and Metrics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Terraform, Tracing, Infrastructure Monitoring

Description: Instrument Terraform plan and apply operations with OpenTelemetry tracing and metrics to gain visibility into IaC performance.

Terraform operations can be slow and opaque. A `terraform apply` might take 30 minutes, and you have no idea which resource is taking the longest or which API calls are failing. By wrapping Terraform operations with OpenTelemetry tracing, you get detailed visibility into every step of your infrastructure provisioning.

## The Approach

There are two ways to instrument Terraform with OpenTelemetry:

1. **Wrapper script**: Wrap the `terraform` CLI invocation and create spans for each operation phase.
2. **Custom provider instrumentation**: Some Terraform providers emit OpenTelemetry traces natively.

We will focus on the wrapper approach since it works with any provider.

## Terraform Wrapper with OpenTelemetry

Here is a Python wrapper that creates spans around Terraform operations:

```python
# terraform_otel_wrapper.py
import subprocess
import sys
import time
import json
import os
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.semconv.resource import ResourceAttributes

# Set up the tracer
resource = Resource.create({
    ResourceAttributes.SERVICE_NAME: "terraform",
    "terraform.workspace": os.getenv("TF_WORKSPACE", "default"),
    "terraform.working_dir": os.getcwd(),
})

provider = TracerProvider(resource=resource)
provider.add_span_processor(
    BatchSpanProcessor(
        OTLPSpanExporter(
            endpoint=os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT",
                               "http://localhost:4317")
        )
    )
)
trace.set_tracer_provider(provider)
tracer = trace.get_tracer("terraform-wrapper", "1.0.0")


def run_terraform(command, args):
    """Run a terraform command wrapped in an OpenTelemetry span."""
    with tracer.start_as_current_span(
        f"terraform.{command}",
        attributes={
            "terraform.command": command,
            "terraform.args": " ".join(args),
        }
    ) as span:
        start = time.time()

        # Run terraform with JSON output where possible
        cmd = ["terraform", command] + args
        if command in ("plan", "apply"):
            # Add JSON output flag for structured parsing
            if command == "plan":
                cmd.extend(["-json"])

        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )

        stdout_lines = []
        resource_count = 0
        error_count = 0

        # Parse JSON output line by line
        for line in process.stdout:
            stdout_lines.append(line)
            try:
                event = json.loads(line.strip())
                msg_type = event.get("type", "")

                if msg_type == "planned_change":
                    resource_count += 1
                    resource_addr = event.get("change", {}).get(
                        "resource", {}).get("addr", "unknown")
                    # Create a child span for each resource change
                    with tracer.start_as_current_span(
                        f"terraform.resource.{resource_addr}",
                        attributes={
                            "terraform.resource.address": resource_addr,
                            "terraform.resource.action": event.get(
                                "change", {}).get("action", "unknown"),
                        }
                    ):
                        pass  # Span captures timing

                elif msg_type == "diagnostic" and event.get(
                        "diagnostic", {}).get("severity") == "error":
                    error_count += 1
                    span.add_event("terraform.error", {
                        "error.message": event.get("diagnostic", {}).get(
                            "summary", ""),
                    })

            except json.JSONDecodeError:
                pass  # Not all output is JSON

        process.wait()
        duration = time.time() - start

        # Set span attributes with operation summary
        span.set_attribute("terraform.exit_code", process.returncode)
        span.set_attribute("terraform.duration_seconds", duration)
        span.set_attribute("terraform.resource_count", resource_count)
        span.set_attribute("terraform.error_count", error_count)

        if process.returncode != 0:
            stderr = process.stderr.read()
            span.set_attribute("terraform.stderr", stderr[:1000])
            span.set_status(
                trace.StatusCode.ERROR,
                f"Terraform {command} failed with exit code "
                f"{process.returncode}"
            )

        return process.returncode


def main():
    if len(sys.argv) < 2:
        print("Usage: python terraform_otel_wrapper.py <command> [args...]")
        sys.exit(1)

    command = sys.argv[1]
    args = sys.argv[2:]

    # Create a root span for the entire Terraform operation
    with tracer.start_as_current_span("terraform.run") as root:
        root.set_attribute("terraform.version",
                           get_terraform_version())

        exit_code = run_terraform(command, args)

    # Ensure all spans are exported before exit
    provider.force_flush()
    sys.exit(exit_code)


def get_terraform_version():
    result = subprocess.run(
        ["terraform", "version", "-json"],
        capture_output=True, text=True
    )
    try:
        return json.loads(result.stdout).get(
            "terraform_version", "unknown")
    except (json.JSONDecodeError, KeyError):
        return "unknown"


if __name__ == "__main__":
    main()
```

## Metrics Collection

In addition to traces, collect metrics about Terraform operations:

```python
# terraform_metrics.py
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import (
    OTLPMetricExporter
)

reader = PeriodicExportingMetricReader(OTLPMetricExporter())
meter_provider = MeterProvider(metric_readers=[reader])
metrics.set_meter_provider(meter_provider)

meter = metrics.get_meter("terraform-metrics", "1.0.0")

# Define metrics
plan_duration = meter.create_histogram(
    "terraform.plan.duration",
    unit="s",
    description="Duration of terraform plan operations"
)

apply_duration = meter.create_histogram(
    "terraform.apply.duration",
    unit="s",
    description="Duration of terraform apply operations"
)

resource_changes = meter.create_counter(
    "terraform.resource.changes",
    unit="1",
    description="Number of resource changes by type"
)

apply_errors = meter.create_counter(
    "terraform.apply.errors",
    unit="1",
    description="Number of terraform apply errors"
)
```

## Using the Wrapper

Replace `terraform` with the wrapper in your CI/CD pipeline:

```bash
# Instead of: terraform plan
python terraform_otel_wrapper.py plan -out=tfplan

# Instead of: terraform apply
python terraform_otel_wrapper.py apply tfplan
```

Or create an alias:

```bash
alias tf="python /opt/terraform_otel_wrapper.py"
tf plan -out=tfplan
tf apply tfplan
```

## Wrapping Up

Instrumenting Terraform with OpenTelemetry gives you visibility into infrastructure provisioning that you have never had before. You can see which resources take the longest to create, track error rates by provider, and identify performance regressions in your IaC pipeline. This data is valuable for both performance optimization and debugging failed deployments.
