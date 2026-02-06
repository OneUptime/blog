# How to Use the OpenTelemetry Configuration Validator Tool for Environment Variable Substitution and Schema Checking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Configuration Validator, Schema Validation, Environment Variables

Description: Use the OpenTelemetry configuration validator tool to substitute environment variables and validate your YAML config files.

The OpenTelemetry project ships a dedicated configuration validator tool that handles both environment variable substitution and JSON schema validation in a single step. Instead of writing custom scripts or chaining together `envsubst` and `jsonschema`, you can use this purpose-built tool to catch configuration problems early and consistently.

## Installing the Validator

The validator tool is distributed as part of the `opentelemetry-configuration` repository. You can build it from source or use it via Docker:

```bash
# Clone the configuration repository
git clone https://github.com/open-telemetry/opentelemetry-configuration.git
cd opentelemetry-configuration

# Build the validator (requires Go 1.21+)
go build -o otel-config-validator ./cmd/validate
```

Alternatively, use the published Docker image:

```bash
docker pull ghcr.io/open-telemetry/opentelemetry-configuration/validator:latest
```

## Basic Validation

The simplest usage validates a configuration file against the bundled schema:

```bash
# Validate a config file
./otel-config-validator validate --config /path/to/otel-config.yaml
```

If the file is valid, you get a clean exit code 0. If there are problems, the tool prints structured error messages:

```
Error at $.tracer_provider.processors[0].batch.schedule_delay:
  Expected type "integer" but got "string"
  Value: "fast"
  Schema path: #/properties/tracer_provider/properties/processors/items/...
```

The error output includes both the path in your config file and the corresponding schema path, which makes it easy to look up what the field expects.

## Environment Variable Substitution

The killer feature of this tool is that it resolves `${ENV_VAR}` placeholders before validating. This means you can validate your config files exactly as they will be parsed by the SDK at runtime.

Given a config file like this:

```yaml
# otel-config.yaml
file_format: "0.3"

resource:
  attributes:
    service.name: "${SERVICE_NAME}"
    deployment.environment: "${DEPLOY_ENV}"

tracer_provider:
  processors:
    - batch:
        exporter:
          otlp:
            endpoint: "${COLLECTOR_ENDPOINT}"
  sampler:
    parent_based:
      root:
        trace_id_ratio_based:
          ratio: ${SAMPLE_RATIO:-0.1}
```

You can validate it with environment variables set:

```bash
# Set the required environment variables
export SERVICE_NAME="checkout-api"
export DEPLOY_ENV="staging"
export COLLECTOR_ENDPOINT="http://otel-collector:4317"

# Validate with substitution enabled
./otel-config-validator validate \
  --config otel-config.yaml \
  --substitute-env
```

The tool substitutes the variables, applies default values (like the `0.1` default for `SAMPLE_RATIO`), and then runs schema validation against the resolved output.

## Detecting Missing Environment Variables

One of the most useful checks the validator performs is detecting undefined environment variables that have no default value:

```bash
# If SERVICE_NAME is not set and has no default
./otel-config-validator validate \
  --config otel-config.yaml \
  --substitute-env \
  --strict

# Output:
# Error: undefined environment variable "SERVICE_NAME" with no default value
#   at $.resource.attributes.service.name
```

The `--strict` flag treats missing variables without defaults as errors. Without it, the tool replaces them with empty strings, which might still fail schema validation if the field requires a non-empty value.

## Dumping the Resolved Configuration

Sometimes you want to see exactly what the SDK will receive after all substitutions are applied. The `--dump-resolved` flag outputs the fully resolved configuration:

```bash
./otel-config-validator validate \
  --config otel-config.yaml \
  --substitute-env \
  --dump-resolved

# Outputs the resolved YAML to stdout:
# file_format: "0.3"
# resource:
#   attributes:
#     service.name: "checkout-api"
#     deployment.environment: "staging"
# tracer_provider:
#   processors:
#     - batch:
#         exporter:
#           otlp:
#             endpoint: "http://otel-collector:4317"
#   sampler:
#     parent_based:
#       root:
#         trace_id_ratio_based:
#           ratio: 0.1
```

This is great for debugging. Pipe it to a file and diff it against what you expect.

## Using an Env File

For CI environments where you want to validate against a known set of variables, the tool accepts an env file:

```bash
# .env.validation
SERVICE_NAME=test-service
DEPLOY_ENV=test
COLLECTOR_ENDPOINT=http://localhost:4317
SAMPLE_RATIO=0.5
OTEL_AUTH_TOKEN=dummy-token
```

```bash
./otel-config-validator validate \
  --config otel-config.yaml \
  --substitute-env \
  --env-file .env.validation \
  --strict
```

## Integration with CI/CD

Here is a practical GitHub Actions setup using the Docker image:

```yaml
# .github/workflows/validate-otel.yaml
name: Validate OTel Configuration
on:
  pull_request:
    paths:
      - "config/otel/**"

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Validate OTel configs
        run: |
          for config in config/otel/*.yaml; do
            echo "Validating $config..."
            docker run --rm \
              -v "$(pwd):/workspace" \
              -w /workspace \
              --env-file config/otel/.env.validation \
              ghcr.io/open-telemetry/opentelemetry-configuration/validator:latest \
              validate \
                --config "$config" \
                --substitute-env \
                --strict
          done
```

## Validating Against a Specific Schema Version

If you need to validate against a specific schema version (for example, because you are running an older SDK), use the `--schema-version` flag:

```bash
./otel-config-validator validate \
  --config otel-config.yaml \
  --schema-version 0.2 \
  --substitute-env
```

Or bring your own schema file:

```bash
./otel-config-validator validate \
  --config otel-config.yaml \
  --schema-file /path/to/custom-schema.json \
  --substitute-env
```

## Wrapping Up

The OpenTelemetry configuration validator tool is a single binary that handles the two trickiest parts of config management: resolving environment variable placeholders and validating the result against the official schema. Add it to your CI pipeline and you will catch config errors where they are cheapest to fix, before they reach production and leave you without observability data during the incidents that matter most.
