# How to Instrument Terragrunt Runs with OpenTelemetry for IaC Performance Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Terragrunt, IaC, Performance Analysis

Description: Instrument Terragrunt runs with OpenTelemetry tracing and metrics for deep visibility into infrastructure-as-code performance.

Terragrunt adds a layer of orchestration on top of Terraform, managing dependencies between modules and keeping configurations DRY. But this extra layer also makes it harder to understand where time is being spent during `terragrunt run-all apply`. By instrumenting Terragrunt with OpenTelemetry, you can see exactly which modules take the longest and where bottlenecks are.

## The Challenge with Terragrunt Observability

When you run `terragrunt run-all plan` across 50 modules, some run in parallel and some wait for dependencies. Understanding the critical path through this dependency graph is nearly impossible without tracing. OpenTelemetry lets you visualize the entire execution as a trace with spans for each module.

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
      "--command", "plan"
    ]
  }

  after_hook "otel_end" {
    commands     = ["plan", "apply", "destroy"]
    run_on_error = true
    execute = [
      "python3", "/opt/otel-hooks/end_span.py",
      "--module", get_terragrunt_dir(),
      "--command", "plan",
      "--exit-code", "0"
    ]
  }
}
```

## OpenTelemetry Hook Scripts

Create the hook scripts that manage span lifecycle using a shared context file:

```python
# /opt/otel-hooks/start_span.py
import argparse
import json
import os
import time
from opentelemetry import trace, context
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

# Parse arguments
parser = argparse.ArgumentParser()
parser.add_argument("--module", required=True)
parser.add_argument("--command", required=True)
args = parser.parse_args()

# Initialize tracer
resource = Resource.create({
    "service.name": "terragrunt",
    "terragrunt.root_dir": os.getenv("TERRAGRUNT_ROOT", os.getcwd()),
})
provider = TracerProvider(resource=resource)
provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter())
)
trace.set_tracer_provider(provider)
tracer = trace.get_tracer("terragrunt-hooks")

# Extract module name from path
module_name = os.path.basename(args.module)

# Start a span and save context to a temp file
# so the end_span script can close it
span = tracer.start_span(
    f"terragrunt.{args.command}.{module_name}",
    attributes={
        "terragrunt.module.path": args.module,
        "terragrunt.module.name": module_name,
        "terragrunt.command": args.command,
        "terragrunt.start_time": time.time(),
    }
)

# Save span context for the after hook
context_file = f"/tmp/otel-tg-{module_name}-{args.command}.json"
span_context = span.get_span_context()
with open(context_file, "w") as f:
    json.dump({
        "trace_id": format(span_context.trace_id, "032x"),
        "span_id": format(span_context.span_id, "016x"),
        "start_time": time.time(),
    }, f)

provider.force_flush()
```

```python
# /opt/otel-hooks/end_span.py
import argparse
import json
import os
import time
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

parser = argparse.ArgumentParser()
parser.add_argument("--module", required=True)
parser.add_argument("--command", required=True)
parser.add_argument("--exit-code", default="0")
args = parser.parse_args()

module_name = os.path.basename(args.module)

# Read context from the start hook
context_file = f"/tmp/otel-tg-{module_name}-{args.command}.json"
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

duration = time.time() - ctx["start_time"]
exit_code = int(args.exit_code)

# Create a completion span with the duration info
with tracer.start_as_current_span(
    f"terragrunt.{args.command}.{module_name}.complete",
    attributes={
        "terragrunt.module.name": module_name,
        "terragrunt.module.path": args.module,
        "terragrunt.command": args.command,
        "terragrunt.duration_seconds": duration,
        "terragrunt.exit_code": exit_code,
        "terragrunt.parent_trace_id": ctx["trace_id"],
    }
) as span:
    if exit_code != 0:
        span.set_status(
            trace.StatusCode.ERROR,
            f"Module {module_name} failed with exit code {exit_code}"
        )

provider.force_flush()
```

## Full Wrapper Script for run-all

For a better trace structure that captures the entire `run-all` operation as a parent span:

```bash
#!/bin/bash
# terragrunt-otel.sh - Wrapper for instrumented Terragrunt runs

export OTEL_EXPORTER_OTLP_ENDPOINT="${OTEL_EXPORTER_OTLP_ENDPOINT:-http://localhost:4317}"
export TERRAGRUNT_ROOT="$(pwd)"

# Generate a trace ID for the entire run
export OTEL_TRACE_ID=$(python3 -c "import uuid; print(uuid.uuid4().hex)")

echo "Starting Terragrunt run with trace ID: ${OTEL_TRACE_ID}"
echo "View trace at: https://your-backend.example.com/trace/${OTEL_TRACE_ID}"

# Record the start time
START_TIME=$(date +%s)

# Run terragrunt with all arguments passed through
terragrunt "$@"
EXIT_CODE=$?

# Record the end time and report
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Send a summary span
python3 /opt/otel-hooks/report_summary.py \
  --trace-id "${OTEL_TRACE_ID}" \
  --command "$1" \
  --duration "${DURATION}" \
  --exit-code "${EXIT_CODE}" \
  --module-count "$(find . -name 'terragrunt.hcl' | wc -l)"

echo "Terragrunt run complete in ${DURATION}s (exit code: ${EXIT_CODE})"
exit ${EXIT_CODE}
```

## Analyzing the Results

Once traces are flowing, you can answer questions like:

- Which module takes the longest to apply?
- What is the critical path through the dependency graph?
- How has the total plan/apply time changed over the past month?
- Which provider API calls are the slowest?

## Wrapping Up

Instrumenting Terragrunt with OpenTelemetry turns opaque infrastructure provisioning into a visible, measurable process. You can identify bottlenecks, track performance trends, and debug failures with the same tools you use for application observability. The hook-based approach works with any Terragrunt setup without modifying the underlying Terraform code.
