# How to Validate OpenTelemetry Declarative Configuration Files Against the JSON Schema Before Deployment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, JSON Schema, Validation, CI/CD

Description: Learn how to validate your OpenTelemetry declarative configuration YAML files against the official JSON schema in CI pipelines.

Shipping a broken OpenTelemetry configuration to production means your application starts without observability. No traces, no metrics, no logs. You find out when an incident happens and you have nothing to look at. Validating your configuration files before deployment prevents this entirely.

The OpenTelemetry project publishes a JSON schema that describes the full structure of the declarative configuration format. You can use this schema to catch typos, missing required fields, and invalid values before your code ever reaches a staging environment.

## Getting the JSON Schema

The schema lives in the OpenTelemetry specification repository. You can download it directly:

```bash
# Download the schema for the version you are targeting
curl -o otel-config-schema.json \
  https://raw.githubusercontent.com/open-telemetry/opentelemetry-configuration/main/schema/opentelemetry_configuration.json
```

Pin the schema version to match the `file_format` version in your configuration file. If your config uses `file_format: "0.3"`, use the schema that corresponds to that version.

## Validating with Python and jsonschema

The `jsonschema` Python library is one of the simplest ways to validate YAML against a JSON schema. First, install the dependencies:

```bash
pip install jsonschema pyyaml
```

Then write a validation script:

```python
#!/usr/bin/env python3
# validate_otel_config.py
# Validates an OpenTelemetry YAML config file against the JSON schema

import json
import sys

import yaml
from jsonschema import validate, ValidationError, SchemaError

def load_yaml_config(path):
    """Load and parse a YAML configuration file."""
    with open(path, "r") as f:
        return yaml.safe_load(f)

def load_json_schema(path):
    """Load the JSON schema file."""
    with open(path, "r") as f:
        return json.load(f)

def validate_config(config_path, schema_path):
    """Validate the config against the schema. Returns True on success."""
    config = load_yaml_config(config_path)
    schema = load_json_schema(schema_path)

    try:
        validate(instance=config, schema=schema)
        print(f"OK: {config_path} is valid")
        return True
    except ValidationError as e:
        # Print the path to the invalid field and the error message
        field_path = " -> ".join(str(p) for p in e.absolute_path)
        print(f"FAIL: {config_path}")
        print(f"  Field: {field_path}")
        print(f"  Error: {e.message}")
        return False
    except SchemaError as e:
        print(f"Schema error: {e.message}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: validate_otel_config.py <config.yaml> <schema.json>")
        sys.exit(1)

    success = validate_config(sys.argv[1], sys.argv[2])
    sys.exit(0 if success else 1)
```

Run it against your config:

```bash
python validate_otel_config.py otel-config.yaml otel-config-schema.json
# OK: otel-config.yaml is valid
```

If there is an error, you get a clear message:

```
FAIL: otel-config.yaml
  Field: tracer_provider -> processors -> 0 -> batch -> schedule_delay
  Error: 'fast' is not of type 'integer'
```

## Validating with ajv-cli (Node.js)

If your team is more comfortable with Node.js, `ajv-cli` is a fast JSON schema validator:

```bash
npm install -g ajv-cli ajv-formats
```

Since `ajv-cli` expects JSON input, convert your YAML first:

```bash
# Install yq if you do not have it
brew install yq

# Convert YAML to JSON and validate
yq -o json otel-config.yaml > /tmp/otel-config.json
ajv validate -s otel-config-schema.json -d /tmp/otel-config.json
```

## Adding Validation to Your CI Pipeline

The real value comes from running validation automatically on every pull request. Here is a GitHub Actions workflow:

```yaml
# .github/workflows/validate-otel-config.yaml
name: Validate OTel Config

on:
  pull_request:
    paths:
      - "config/otel-*.yaml"
      - "deploy/**/otel-*.yaml"

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install dependencies
        run: pip install jsonschema pyyaml

      - name: Download OTel config schema
        run: |
          curl -o /tmp/otel-schema.json \
            https://raw.githubusercontent.com/open-telemetry/opentelemetry-configuration/main/schema/opentelemetry_configuration.json

      - name: Validate all OTel config files
        run: |
          # Find all YAML config files and validate each one
          failed=0
          for config_file in $(find . -name "otel-*.yaml" -not -path "./.github/*"); do
            python validate_otel_config.py "$config_file" /tmp/otel-schema.json || failed=1
          done
          exit $failed
```

This workflow triggers only when OpenTelemetry config files change, keeping your CI fast for unrelated PRs.

## Handling Environment Variable Placeholders

One tricky part: if your config uses `${ENV_VAR}` substitution syntax, the raw file will not validate because the schema expects actual values, not placeholder strings. You need to substitute the variables before validation.

A simple approach is to use `envsubst` with dummy values:

```bash
#!/bin/bash
# validate-with-substitution.sh
# Substitutes env vars with dummy values, then validates

# Set dummy values for all referenced variables
export SERVICE_NAME="dummy-service"
export SERVICE_VERSION="0.0.0"
export DEPLOY_ENV="test"
export OTEL_COLLECTOR_ENDPOINT="http://localhost:4317"
export SAMPLE_RATIO="0.5"

# Substitute and validate
envsubst < otel-config.yaml > /tmp/otel-config-resolved.yaml
python validate_otel_config.py /tmp/otel-config-resolved.yaml otel-config-schema.json
```

You can also maintain a `.env.validation` file with these dummy values and source it in CI.

## Pre-commit Hook

For faster feedback, add a pre-commit hook so developers catch errors before they push:

```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: validate-otel-config
        name: Validate OTel Config
        entry: python validate_otel_config.py
        language: python
        files: 'otel-.*\.yaml$'
        additional_dependencies: ['jsonschema', 'pyyaml']
        args: ['--schema', 'otel-config-schema.json']
```

## Wrapping Up

Schema validation for OpenTelemetry configuration files is a small investment that prevents real production outages. Add it to your CI pipeline, set up a pre-commit hook for fast local feedback, and treat your observability configuration with the same rigor you apply to your application code. A typo in a YAML file should never be the reason you fly blind during an incident.
