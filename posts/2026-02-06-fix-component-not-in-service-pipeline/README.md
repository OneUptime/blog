# How to Fix the Common Mistake of Configuring a Component but Not Including It in the Service Pipeline

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Configuration, Pipeline

Description: Fix the silent misconfiguration where Collector components are defined but never included in the service pipeline section.

The OpenTelemetry Collector configuration has two parts: component definitions and service pipelines. You can define a receiver, processor, or exporter with perfect syntax, but if you do not reference it in the `service.pipelines` section, it never runs. The Collector does not warn you about unused components, making this one of the most common silent misconfiguration issues.

## The Configuration Structure

The Collector config has a clear two-part structure:

```yaml
# Part 1: Define components
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 5s
  memory_limiter:
    check_interval: 1s
    limit_mib: 512

exporters:
  otlp:
    endpoint: "https://backend:4317"

# Part 2: Wire components into pipelines
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp]
```

Part 1 defines what components are available and how they are configured. Part 2 says which components actually run and in what order. A component in Part 1 that is not in Part 2 is dead configuration.

## The Mistake

Here is a real-world example. A team wants to add tail sampling to their pipeline:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 5s
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
  tail_sampling:  # Defined but...
    decision_wait: 10s
    policies:
      - name: errors-only
        type: status_code
        status_codes: [ERROR]

exporters:
  otlp:
    endpoint: "https://backend:4317"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]  # ...not included here!
      exporters: [otlp]
```

The `tail_sampling` processor is fully configured but never runs because it is missing from the pipeline's `processors` list. Every trace passes through unsampled. The Collector starts without errors.

## How to Spot This Issue

### Check 1: Validate Your Config

The Collector has a `validate` command that checks configuration syntax:

```bash
otelcol-contrib validate --config=config.yaml
```

Unfortunately, this validates syntax but does not warn about unused components. It will catch typos in the `service.pipelines` section but not missing references.

### Check 2: Compare Definitions to Pipeline References

Manually compare the components defined in sections like `receivers`, `processors`, and `exporters` against what is listed in `service.pipelines`. Every component in the definitions should appear in at least one pipeline.

### Check 3: Use the Collector's zpages Extension

```yaml
extensions:
  zpages:
    endpoint: "localhost:55679"

service:
  extensions: [zpages]
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp]
```

Visit `http://localhost:55679/debug/pipelinez` to see which components are active in each pipeline.

## The Fix

Add the missing component to the pipeline:

```yaml
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, tail_sampling, batch]  # Added tail_sampling
      exporters: [otlp]
```

## Processor Order Matters

When adding processors to the pipeline, order is significant:

```yaml
# Correct order for these processors
processors: [memory_limiter, tail_sampling, batch]

# memory_limiter: first, to prevent OOM
# tail_sampling: second, to filter traces before batching
# batch: last, to batch the remaining data for export
```

If you put `batch` before `tail_sampling`, the sampler receives pre-batched data which can affect its decision-making.

## A Configuration Checklist

Use this checklist whenever you modify your Collector config:

```yaml
# For each receiver defined:
# [ ] Is it listed in at least one pipeline under service.pipelines.*.receivers?

# For each processor defined:
# [ ] Is it listed in at least one pipeline under service.pipelines.*.processors?
# [ ] Is it in the correct position relative to other processors?

# For each exporter defined:
# [ ] Is it listed in at least one pipeline under service.pipelines.*.exporters?

# For each extension defined:
# [ ] Is it listed under service.extensions?
```

## A CI Check

You can automate this check in your CI pipeline with a simple script:

```python
import yaml
import sys

with open(sys.argv[1]) as f:
    config = yaml.safe_load(f)

# Collect all components referenced in pipelines
used = set()
for pipeline_name, pipeline in config.get('service', {}).get('pipelines', {}).items():
    for component_type in ['receivers', 'processors', 'exporters']:
        for component in pipeline.get(component_type, []):
            used.add(f"{component_type}.{component}")

# Check for defined but unused components
for section in ['receivers', 'processors', 'exporters']:
    for component_name in config.get(section, {}):
        key = f"{section}.{component_name}"
        if key not in used:
            print(f"WARNING: {section}/{component_name} is defined but not used in any pipeline")
            sys.exit(1)

print("All components are referenced in pipelines")
```

Run it in CI:

```bash
python check_collector_config.py collector-config.yaml
```

This catches the "defined but not used" mistake before it reaches production. A small investment in configuration validation saves hours of wondering why your processor is not doing anything.
