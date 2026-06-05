# How to Use the OpenTelemetry Config Validator Tool for Env Variable

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Configuration Validator, Schema Validation, Environment Variable

Description: Use the OpenTelemetry configuration validator tool to substitute environment variables and validate your YAML config files.

The OpenTelemetry project ships a dedicated configuration validator tool that handles both environment variable substitution and JSON schema validation in a single step. Instead of writing custom scripts or chaining together `envsubst` and `jsonschema`, you can use this purpose-built tool to catch configuration problems early and consistently.

## Installing the Validator

The validator tool is distributed as part of the `opentelemetry-configuration` repository. You can build it from source or use it via Docker:

```bash
# Clone the configuration repository

git clone https://github.com/open-telemetry/opentelemetry-configuration.git
cd opentelemetry-configuration

# Build the validator (requires Go 1.20+)
make validator
```

Alternatively, build the Docker image:

```bash
make validator-docker-image
```

## Basic Validation

The simplest usage validates a configuration file against the bundled schema:

```bash
# Validate a config file
./validator/otel_config_validator /path/to/otel-config.yaml
```

If the file is valid, you get a clean exit code 0. If there are problems, the tool prints structured error messages:

```text
jsonschema: '/tracer_provider/processors/0/batch/schedule_delay' does not validate with https://opentelemetry.io/otelconfig/opentelemetry_configuration.json#/properties/tracer_provider/$ref/properties/processors/items/$ref/properties/batch/$ref/properties/schedule_delay/type: expected integer or null, but got string
```

The error output includes both the path in your config file and the corresponding schema path, which makes it easy to look up what the field expects.

## Environment Variable Substitution

The killer feature of this tool is that it resolves `${ENV_VAR}` placeholders before validating. This means you can validate your config files exactly as they will be parsed by the SDK at runtime.

Given a config file like this:

```yaml
# otel-config.yaml
file_format: "1.0"

resource:
  attributes:
    - name: service.name
      value: "${SERVICE_NAME}"
    - name: deployment.environment.name
      value: "${DEPLOY_ENV}"

tracer_provider:
  processors:
    - batch:
        exporter:
          otlp_grpc:
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
./validator/otel_config_validator otel-config.yaml
```

The tool substitutes the variables, applies default values (like the `0.1` default for `SAMPLE_RATIO`), and then runs schema validation against the resolved output.

## Detecting Missing Environment Variables

One useful behavior is that undefined environment variables without defaults become empty values before validation:

```bash
# If SERVICE_NAME is not set and has no default
./validator/otel_config_validator otel-config.yaml

# Output:
# jsonschema: '/resource/attributes/0/value' does not validate with ...: expected string, but got null
```

If a variable is undefined and has no default, the OpenTelemetry declarative configuration substitution rules replace it with an empty value. That empty value can still fail schema validation if the field requires a non-null value.

## Dumping the Resolved Configuration

Sometimes you want to see exactly what the SDK will receive after all substitutions are applied. The `-o` flag writes the fully resolved configuration to a JSON or YAML file:

```bash
./validator/otel_config_validator \
  -o resolved.yaml \
  otel-config.yaml

# Writes the resolved YAML to resolved.yaml:
# file_format: "1.0"
# resource:
#   attributes:
#     - name: service.name
#       value: "checkout-api"
#     - name: deployment.environment.name
#       value: "staging"
# tracer_provider:
#   processors:
#     - batch:
#         exporter:
#           otlp_grpc:
#             endpoint: "http://otel-collector:4317"
#   sampler:
#     parent_based:
#       root:
#         trace_id_ratio_based:
#           ratio: 0.1
```

This is great for debugging. Diff the generated file against what you expect.

## Using an Env File

For CI environments where you want to validate against a known set of variables, load an env file before running the validator:

```bash
# .env.validation
SERVICE_NAME=test-service
DEPLOY_ENV=test
COLLECTOR_ENDPOINT=http://localhost:4317
SAMPLE_RATIO=0.5
OTEL_AUTH_TOKEN=dummy-token
```

```bash
set -a
. ./.env.validation
set +a

./validator/otel_config_validator otel-config.yaml
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

      - name: Build validator image
        run: |
          git clone --depth 1 https://github.com/open-telemetry/opentelemetry-configuration.git
          make -C opentelemetry-configuration validator-docker-image

      - name: Validate OTel configs
        run: |
          for config in config/otel/*.yaml; do
            echo "Validating $config..."
            docker run --rm \
              -v "$(pwd):/workspace" \
              -w /workspace \
              --env-file config/otel/.env.validation \
              otel_config_validator:current \
              "$config"
          done
```

## Validating Against a Specific Schema Version

If you need to validate against a specific schema version (for example, because you are running an older SDK), pass a directory containing that schema with `-s`:

```bash
./validator/otel_config_validator \
  -s /path/to/opentelemetry-configuration-0.2.0/schema \
  otel-config.yaml
```

Or bring your own schema directory:

```bash
./validator/otel_config_validator \
  -s /path/to/custom-schema-dir \
  otel-config.yaml
```

## Wrapping Up

The OpenTelemetry configuration validator tool is a single binary that handles the two trickiest parts of config management: resolving environment variable placeholders and validating the result against the official schema. Add it to your CI pipeline and you will catch config errors where they are cheapest to fix, before they reach production and leave you without observability data during the incidents that matter most.
