# How to Fix Collector Silent Failures When Duplicate Component IDs Exist in Pipeline Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Configuration, Pipeline

Description: Fix silent data loss caused by duplicate component IDs in OpenTelemetry Collector pipeline configuration YAML files.

Duplicate component IDs in the Collector configuration can cause subtle, hard-to-debug issues. YAML silently overwrites duplicate keys, so the second definition replaces the first without any warning. This can lead to missing processors, wrong exporter settings, or broken pipelines.

## The Problem

YAML does not error on duplicate keys. It just uses the last one:

```yaml
exporters:
  otlp:
    endpoint: tempo:4317
    tls:
      insecure: true

  # Later in the same file, maybe from a merge or copy-paste
  otlp:
    endpoint: jaeger:4317
    tls:
      insecure: true
```

The first `otlp` exporter definition (pointing to Tempo) is silently overwritten by the second one (pointing to Jaeger). All your traces go to Jaeger, and Tempo receives nothing. There is no error, no warning.

## Why This Happens in Practice

### Scenario 1: Multiple Team Members Editing the Same File

```yaml
# Alice adds this
processors:
  attributes/team-a:
    actions:
    - key: team
      value: team-a
      action: upsert

# Bob adds this, not noticing Alice's section
processors:
  attributes/team-b:
    actions:
    - key: team
      value: team-b
      action: upsert
```

Because both are under `processors:`, the second `processors:` block replaces the first entirely. Alice's processor is gone.

### Scenario 2: Helm Values Merge

When using Helm with multiple values files, YAML merging can create duplicates:

```bash
helm upgrade otel-collector open-telemetry/opentelemetry-collector \
  -f base-values.yaml \
  -f team-a-values.yaml \
  -f team-b-values.yaml
```

If both team files define the same YAML paths, the last file wins.

## Detecting Duplicates

### Method 1: Use a YAML Linter

```bash
# Install yamllint
pip install yamllint

# Create a config that catches duplicates
cat > .yamllint.yaml << 'EOF'
rules:
  key-duplicates: enable
  truthy: disable
EOF

# Lint your collector config
yamllint -c .yamllint.yaml collector-config.yaml
```

`yamllint` will report:

```
collector-config.yaml:15:3: error: duplication of key "otlp" in mapping (key-duplicates)
```

### Method 2: Use the Collector's Validate Command

```bash
otelcol-contrib validate --config config.yaml
```

Note: the validate command catches some but not all duplicate key issues, since the YAML parser resolves duplicates before the Collector sees them.

### Method 3: Python Script for Detection

```python
#!/usr/bin/env python3
"""Detect duplicate keys in YAML files."""
import yaml
import sys

class DuplicateKeyLoader(yaml.SafeLoader):
    pass

def check_duplicates(loader, node):
    mapping = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node)
        if key in mapping:
            print(f"ERROR: Duplicate key '{key}' at line {key_node.start_mark.line + 1}")
            sys.exit(1)
        mapping[key] = loader.construct_object(value_node)
    return mapping

DuplicateKeyLoader.add_constructor(
    yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG,
    check_duplicates
)

with open(sys.argv[1]) as f:
    yaml.load(f, Loader=DuplicateKeyLoader)

print("No duplicate keys found")
```

## Using Named Component IDs

The Collector supports named component IDs using the `type/name` syntax. Use this to avoid conflicts:

```yaml
exporters:
  otlp/tempo:
    endpoint: tempo:4317
    tls:
      insecure: true
  otlp/jaeger:
    endpoint: jaeger:4317
    tls:
      insecure: true

processors:
  attributes/team-a:
    actions:
    - key: team
      value: team-a
      action: upsert
  attributes/team-b:
    actions:
    - key: team
      value: team-b
      action: upsert

service:
  pipelines:
    traces/team-a:
      receivers: [otlp]
      processors: [attributes/team-a, batch]
      exporters: [otlp/tempo]
    traces/team-b:
      receivers: [otlp]
      processors: [attributes/team-b, batch]
      exporters: [otlp/jaeger]
```

Each component has a unique ID (`otlp/tempo` vs `otlp/jaeger`), so there is no possibility of accidental overwriting.

## CI/CD Validation

Add duplicate key detection to your CI pipeline:

```yaml
# GitHub Actions
jobs:
  validate-config:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Check for duplicate YAML keys
      run: |
        pip install yamllint
        yamllint -d "{rules: {key-duplicates: enable}}" \
          collector-config.yaml
    - name: Validate Collector config
      run: |
        docker run --rm \
          -v ${{ github.workspace }}:/config \
          otel/opentelemetry-collector-contrib:0.121.0 \
          validate --config /config/collector-config.yaml
```

## Summary

YAML duplicate keys cause silent overwrites that lead to data loss. Always use named component IDs (`type/name` syntax) to keep IDs unique. Lint your YAML files with `yamllint` to catch duplicates. Add validation to your CI pipeline so duplicate keys are caught before they reach production.
