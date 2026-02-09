# How to Replace Environment Variables with OpenTelemetry YAML Declarative Configuration for SDK Setup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Declarative Configuration, YAML, SDK Setup

Description: Learn how to move from scattered OTEL environment variables to a single YAML declarative configuration file for your OpenTelemetry SDK setup.

If you have been running OpenTelemetry in production for any length of time, you know the pain of managing a growing list of `OTEL_*` environment variables. What starts as a couple of lines in your Dockerfile quickly becomes a tangled mess of exporter endpoints, sampler ratios, resource attributes, and propagator settings scattered across deployment manifests, shell scripts, and CI pipelines.

OpenTelemetry's declarative configuration specification offers a cleaner alternative. Instead of dozens of environment variables, you define your entire SDK configuration in a single YAML file. This post walks through the practical steps to make that switch.

## The Problem with Environment Variables

Consider a typical production setup. Your deployment manifest might contain something like this:

```bash
# Exporter settings
export OTEL_EXPORTER_OTLP_ENDPOINT="https://collector.example.com:4317"
export OTEL_EXPORTER_OTLP_PROTOCOL="grpc"
export OTEL_EXPORTER_OTLP_HEADERS="Authorization=Bearer token123"

# Sampler settings
export OTEL_TRACES_SAMPLER="parentbased_traceidratio"
export OTEL_TRACES_SAMPLER_ARG="0.1"

# Resource attributes
export OTEL_RESOURCE_ATTRIBUTES="service.name=payment-api,service.version=2.4.1,deployment.environment=production"

# Propagators
export OTEL_PROPAGATORS="tracecontext,baggage"

# Log settings
export OTEL_LOGS_EXPORTER="otlp"
export OTEL_METRICS_EXPORTER="otlp"
```

This works, but it has real downsides. There is no schema validation, no auto-completion in your editor, no way to add comments explaining why a sampler ratio is set to 0.1, and no straightforward way to compose configurations across environments.

## The Declarative Configuration Alternative

The OpenTelemetry configuration file specification defines a YAML schema that covers everything those environment variables do, and more. Here is the equivalent of the environment variables above:

```yaml
# otel-config.yaml
file_format: "0.3"

# Resource definition shared across all signals
resource:
  attributes:
    service.name: "payment-api"
    service.version: "2.4.1"
    deployment.environment: "production"

# Tracer provider configuration
tracer_provider:
  processors:
    - batch:
        exporter:
          otlp:
            endpoint: "https://collector.example.com:4317"
            protocol: "grpc"
            headers:
              Authorization: "Bearer token123"
  sampler:
    parent_based:
      root:
        trace_id_ratio_based:
          ratio: 0.1

# Meter provider configuration
meter_provider:
  readers:
    - periodic:
        exporter:
          otlp:
            endpoint: "https://collector.example.com:4317"
            protocol: "grpc"

# Logger provider configuration
logger_provider:
  processors:
    - batch:
        exporter:
          otlp:
            endpoint: "https://collector.example.com:4317"
            protocol: "grpc"

# Context propagation
propagator:
  composite: [tracecontext, baggage]
```

Notice how much more readable this is. The hierarchical structure groups related settings together, and you can add inline comments to explain decisions.

## How to Point the SDK at Your Config File

Once you have your YAML file, you tell the SDK to use it by setting a single environment variable:

```bash
export OTEL_EXPERIMENTAL_CONFIG_FILE="/etc/otel/otel-config.yaml"
```

That is the only environment variable you need. The SDK reads the file at startup and configures itself accordingly.

In a Kubernetes deployment, you would mount the config file as a ConfigMap:

```yaml
# k8s-deployment.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-config
data:
  otel-config.yaml: |
    file_format: "0.3"
    resource:
      attributes:
        service.name: "payment-api"
    tracer_provider:
      processors:
        - batch:
            exporter:
              otlp:
                endpoint: "http://otel-collector:4317"
                protocol: "grpc"
---
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - name: payment-api
          env:
            - name: OTEL_EXPERIMENTAL_CONFIG_FILE
              value: "/etc/otel/otel-config.yaml"
          volumeMounts:
            - name: otel-config
              mountPath: /etc/otel
      volumes:
        - name: otel-config
          configMap:
            name: otel-config
```

## Using Environment Variable Substitution in YAML

You do not have to hardcode everything. The declarative configuration supports environment variable substitution using the `${ENV_VAR}` syntax:

```yaml
# otel-config.yaml
file_format: "0.3"

resource:
  attributes:
    service.name: "${SERVICE_NAME}"
    service.version: "${SERVICE_VERSION}"
    deployment.environment: "${DEPLOY_ENV}"

tracer_provider:
  processors:
    - batch:
        exporter:
          otlp:
            endpoint: "${OTEL_COLLECTOR_ENDPOINT}"
            headers:
              Authorization: "Bearer ${OTEL_AUTH_TOKEN}"
  sampler:
    parent_based:
      root:
        trace_id_ratio_based:
          ratio: ${SAMPLE_RATIO:-0.1}  # defaults to 0.1 if not set
```

This gives you the best of both worlds: a structured, validated configuration file that still pulls sensitive or environment-specific values from the runtime environment.

## What to Watch Out For

A few things to keep in mind as you make this transition:

1. **SDK support varies by language.** As of early 2026, the Java agent has the most mature support. Python, Go, and .NET are in various stages of implementing the spec. Check your language SDK's documentation for the current status.

2. **The `file_format` field matters.** It pins the schema version your file targets. If you upgrade your SDK, check whether new config options require a newer file format version.

3. **Config file takes precedence.** When both environment variables and a config file are present, the config file wins. This can trip you up during migration if you forget to remove old env vars.

4. **Validate before deploying.** The OpenTelemetry project publishes a JSON schema you can use to validate your YAML files in CI. We will cover that in detail in a follow-up post.

## Wrapping Up

Replacing environment variables with a YAML declarative configuration file is a straightforward improvement that pays off quickly. You get better readability, schema validation, inline documentation through comments, and a single source of truth that is easy to version control and review in pull requests. Start by translating your existing env vars into the YAML format, set `OTEL_EXPERIMENTAL_CONFIG_FILE`, and remove the old variables one service at a time.
