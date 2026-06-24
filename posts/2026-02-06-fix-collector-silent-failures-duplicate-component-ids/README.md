# How to Fix Collector Silent Failures When Duplicate Component IDs Exist

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Configuration, Pipeline

Description: Fix silent data loss caused by duplicate component IDs in OpenTelemetry Collector pipeline configuration YAML files.

Duplicate or overlapping component IDs in Collector configuration can cause subtle, hard-to-debug issues. Some YAML parsers and configuration merge tools silently overwrite duplicate keys, so the later definition replaces the earlier one. Current Collector releases reject duplicate keys in a single config file, but duplicates can still be introduced or hidden by tooling before the final config reaches the Collector. This can lead to missing processors, wrong exporter settings, or broken pipelines.

## The Problem

Some YAML parsers do not error on duplicate keys. They use the last one:

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

In tools that use this last-wins behavior, the first `otlp` exporter definition (pointing to Tempo) is silently overwritten by the second one (pointing to Jaeger). All your traces go to Jaeger, and Tempo receives nothing. If you pass this raw duplicate-key file directly to a current Collector, `validate` should reject it.

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

In a last-wins YAML parser, the second `processors:` block replaces the first entirely. Alice's processor is gone.

### Scenario 2: Helm Values Merge

When using Helm with multiple values files, later values files can override earlier values at the same path:

```bash
helm upgrade otel-collector open-telemetry/opentelemetry-collector \
  -f base-values.yaml \
  -f team-a-values.yaml \
  -f team-b-values.yaml
```

If both team files define the same YAML paths, the more specific or later-supplied value wins. This is not a duplicate key in one rendered YAML file, but it can produce the same kind of surprise if a Collector component ID is overwritten before validation.

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

```text
collector-config.yaml:15:3: error: duplication of key "otlp" in mapping (key-duplicates)
```

### Method 2: Use the Collector's Validate Command

```bash
otelcol-contrib validate --config config.yaml
```

Current Collector releases catch duplicate keys in a single config file during parsing. Still use a YAML linter as well, because Helm values files, generated YAML, or multiple Collector config files can resolve overlapping paths before the Collector validates the final merged configuration.

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

Each component has a unique ID (`otlp/tempo` vs `otlp/jaeger`), so you do not need to reuse the same key for multiple instances of the same component type.

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

YAML duplicate keys and overlapping config merges can cause overwrites that lead to data loss. Use named component IDs (`type/name` syntax) when you need multiple instances of the same component type. Lint your YAML files with `yamllint` to catch duplicates. Add validation to your CI pipeline so duplicate keys are caught before they reach production.
