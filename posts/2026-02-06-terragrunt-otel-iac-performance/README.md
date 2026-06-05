# How to Instrument Terragrunt Runs with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Terragrunt, IaC, Performance Analysis

Description: Instrument Terragrunt runs with OpenTelemetry tracing and metrics for deep visibility into infrastructure-as-code performance.

Terragrunt adds a layer of orchestration on top of Terraform, managing dependencies between modules and keeping configurations DRY. But this extra layer also makes it harder to understand where time is being spent during `terragrunt run --all -- apply`. By instrumenting Terragrunt with OpenTelemetry, you can see exactly which modules take the longest and where bottlenecks are.

## The Challenge with Terragrunt Observability

When you run `terragrunt run --all -- plan` across 50 modules, some run in parallel and some wait for dependencies. Understanding the critical path through this dependency graph is nearly impossible without tracing. OpenTelemetry lets you visualize the entire execution as a trace with spans for each module.

## Instrumenting Terragrunt with a Before/After Hook Wrapper

Terragrunt supports `before_hook` and `after_hook` blocks. We can use these to create OpenTelemetry spans:

```hcl
# terragrunt.hcl (root configuration)

terraform {
  before_hook "otel_start" {
    commands = ["plan", "apply", "destroy"]
    execute  = [
      "python3", "/opt/otel-hooks/start_span.py",
      "--module", get_terragrunt_dir(),
      "--command", get_env("TG_CTX_COMMAND", "unknown")
    ]
  }

  after_hook "otel_end" {
    commands = ["plan", "apply", "destroy"]
    execute = [
      "python3", "/opt/otel-hooks/end_span.py",
      "--module", get_terragrunt_dir(),
      "--command", get_env("TG_CTX_COMMAND", "unknown"),
      "--exit-code", "0"
    ]
  }

  error_hook "otel_error" {
    commands = ["plan", "apply", "destroy"]
    execute = [
      "python3", "/opt/otel-hooks/end_span.py",
      "--module", get_terragrunt_dir(),
      "--command", get_env("TG_CTX_COMMAND", "unknown"),
      "--exit-code", "1"
    ]
    on_errors = [".*"]
  }
}
```

## OpenTelemetry Hook Scripts

Create the hook scripts that record the start time in a shared context file and emit a completed span from the after hook:

```python
# /opt/otel-hooks/start_span.py

import argparse
import hashlib
import json
import os
import time

# Parse arguments
parser = argparse.ArgumentParser()
parser.add_argument("--module", required=True)
parser.add_argument("--command", required=True)
args = parser.parse_args()

# Extract module name from path
module_name = os.path.basename(args.module)

# Save start time for the after hook
module_key = hashlib.sha256(args.module.encode("utf-8")).hexdigest()[:16]
context_file = f"/tmp/otel-tg-{module_key}-{args.command}.json"
with open(context_file, "w") as f:
    json.dump({
        "module_name": module_name,
        "start_time_ns": time.time_ns(),
    }, f)
```

```python
# /opt/otel-hooks/end_span.py
import argparse
import hashlib
import json
import os
import time
from opentelemetry import trace
from opentelemetry.propagate import extract
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.trace import Status, StatusCode

parser = argparse.ArgumentParser()
parser.add_argument("--module", required=True)
parser.add_argument("--command", required=True)
parser.add_argument("--exit-code", default="0")
args = parser.parse_args()

module_name = os.path.basename(args.module)

# Read context from the start hook
module_key = hashlib.sha256(args.module.encode("utf-8")).hexdigest()[:16]
context_file = f"/tmp/otel-tg-{module_key}-{args.command}.json"
try:
    with open(context_file) as f:
        ctx = json.load(f)
    os.remove(context_file)  # Clean up
except FileNotFoundError:
    print(f"Warning: No span context found for {module_name}")
    exit(0)

# Set up the tracer
resource = Resource.create({"service.name": "terragrunt"})
provider = TracerProvider(resource=resource)
provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter())
)
trace.set_tracer_provider(provider)
tracer = trace.get_tracer("terragrunt-hooks")

end_time_ns = time.time_ns()
duration = (end_time_ns - ctx["start_time_ns"]) / 1_000_000_000
exit_code = int(args.exit_code)
parent_context = extract({"traceparent": os.environ["TRACEPARENT"]}) if "TRACEPARENT" in os.environ else None

# Create one completed span with the original start time and final status
span = tracer.start_span(
    f"terragrunt.{args.command}.{module_name}",
    context=parent_context,
    start_time=ctx["start_time_ns"],
    attributes={
        "terragrunt.module.name": module_name,
        "terragrunt.module.path": args.module,
        "terragrunt.command": args.command,
        "terragrunt.duration_seconds": duration,
        "terragrunt.exit_code": exit_code,
    }
)
if exit_code != 0:
    span.set_status(
        Status(StatusCode.ERROR, f"Module {module_name} failed with exit code {exit_code}")
    )
span.end(end_time=end_time_ns)

provider.force_flush()
```

## Full Wrapper Script for run --all

For a better trace structure that keeps the entire `run --all` operation in one trace:

```bash
#!/bin/bash
# terragrunt-otel.sh - Wrapper for instrumented Terragrunt runs

export OTEL_EXPORTER_OTLP_ENDPOINT="${OTEL_EXPORTER_OTLP_ENDPOINT:-http://localhost:4317}"
export TG_TELEMETRY_TRACE_EXPORTER="${TG_TELEMETRY_TRACE_EXPORTER:-otlpGrpc}"
export TG_TELEMETRY_TRACE_EXPORTER_INSECURE_ENDPOINT="${TG_TELEMETRY_TRACE_EXPORTER_INSECURE_ENDPOINT:-true}"
export TERRAGRUNT_ROOT="$(pwd)"

# Generate a W3C trace context for the entire run
export OTEL_TRACE_ID=$(python3 -c "import uuid; print(uuid.uuid4().hex)")
export OTEL_PARENT_SPAN_ID=$(python3 -c "import secrets; print(secrets.token_hex(8))")
export TRACEPARENT="00-${OTEL_TRACE_ID}-${OTEL_PARENT_SPAN_ID}-01"

echo "Starting Terragrunt run with trace ID: ${OTEL_TRACE_ID}"
echo "View trace at: https://your-backend.example.com/trace/${OTEL_TRACE_ID}"

# Record the start time
START_TIME=$(date +%s)

# Run terragrunt across all units with all Terraform/OpenTofu arguments passed through
terragrunt run --all -- "$@"
EXIT_CODE=$?

# Record the end time and report
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "Terragrunt run complete in ${DURATION}s (exit code: ${EXIT_CODE})"
exit ${EXIT_CODE}
```

## Analyzing the Results

Once traces are flowing, you can answer questions like:

- Which module takes the longest to apply?
- What is the critical path through the dependency graph?
- How has the total plan/apply time changed over the past month?
- Which Terraform/OpenTofu commands or API-bound modules are the slowest?

## Wrapping Up

Instrumenting Terragrunt with OpenTelemetry turns opaque infrastructure provisioning into a visible, measurable process. You can identify bottlenecks, track performance trends, and debug failures with the same tools you use for application observability. The hook-based approach works with any Terragrunt setup without modifying the underlying Terraform code.
