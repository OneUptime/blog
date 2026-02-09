# How to Fix the Common Mistake of Confusing OpenTelemetry Core and Contrib Collector Distributions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Distributions, Configuration

Description: Understand the difference between OpenTelemetry Collector Core and Contrib distributions and pick the right one for your needs.

One of the most confusing aspects of the OpenTelemetry Collector is that it ships in two official distributions: Core and Contrib. Teams regularly deploy the Core distribution, configure it with components that only exist in Contrib, and then spend hours debugging why the Collector fails to start or silently ignores their configuration.

## The Two Distributions

**Core** (`otelcol`) contains only the essential, well-tested components maintained by the OpenTelemetry project:
- Receivers: OTLP
- Processors: batch, memory_limiter
- Exporters: OTLP, debug

**Contrib** (`otelcol-contrib`) contains everything in Core plus dozens of community-contributed components:
- Receivers: OTLP, Prometheus, Jaeger, Zipkin, Kafka, and many more
- Processors: attributes, filter, resource, tail_sampling, transform, and many more
- Exporters: OTLP, Prometheus, Jaeger, Zipkin, Kafka, and many more

## The Failure Mode

Here is what happens when you use the Core distribution with a Contrib component:

```yaml
# This config references the tail_sampling processor
processors:
  tail_sampling:
    decision_wait: 10s
    policies:
      - name: errors-only
        type: status_code
        status_code:
          status_codes: [ERROR]

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [tail_sampling]
      exporters: [otlp]
```

Starting the Core distribution with this config produces:

```
Error: failed to build pipelines: unknown processor type: "tail_sampling"
```

This error is clear, but sometimes the failure is more subtle. If you have a typo in a component name, you get a similar error that sends you down the wrong debugging path.

## How to Check Which Distribution You Are Running

```bash
# Check the binary name and version
otelcol --version
# or
otelcol-contrib --version
```

You can also list all supported components:

```bash
# List all available components
otelcol components
```

This command outputs every receiver, processor, exporter, and extension that the binary supports. If the component you need is not in the list, you are using the wrong distribution.

## Choosing the Right Distribution

**Use Core when:**
- You only need OTLP in and OTLP out
- You want the smallest, most secure binary
- You are running in a security-sensitive environment and want minimal attack surface

**Use Contrib when:**
- You need to receive data in non-OTLP formats (Prometheus, Jaeger, Zipkin)
- You need processing capabilities like tail sampling, attribute filtering, or transforms
- You need to export to non-OTLP backends

## Docker Image References

The Docker image names differ between the two distributions:

```yaml
# Core distribution
services:
  collector:
    image: otel/opentelemetry-collector:0.96.0

# Contrib distribution
services:
  collector:
    image: otel/opentelemetry-collector-contrib:0.96.0
```

Note the `-contrib` suffix. A common mistake is pulling the image without this suffix and wondering why components are missing.

## Kubernetes Helm Chart

If you deploy via Helm, the chart defaults to the Contrib image, but you should be explicit:

```yaml
# values.yaml
image:
  repository: otel/opentelemetry-collector-contrib
  tag: "0.96.0"
```

## Building a Custom Distribution

If Contrib is too large and Core is too small, you can build a custom distribution using the OpenTelemetry Collector Builder (ocb):

```yaml
# builder-config.yaml
dist:
  name: my-custom-collector
  description: Custom collector with only the components we need
  output_path: ./dist

receivers:
  - gomod: go.opentelemetry.io/collector/receiver/otlpreceiver v0.96.0

processors:
  - gomod: go.opentelemetry.io/collector/processor/batchprocessor v0.96.0
  - gomod: go.opentelemetry.io/collector/processor/memorylimiterprocessor v0.96.0
  - gomod: github.com/open-telemetry/opentelemetry-collector-contrib/processor/tailsamplingprocessor v0.96.0

exporters:
  - gomod: go.opentelemetry.io/collector/exporter/otlpexporter v0.96.0
```

Build it with:

```bash
# Install the builder
go install go.opentelemetry.io/collector/cmd/builder@latest

# Build the custom collector
builder --config=builder-config.yaml
```

This gives you a binary that includes only the components you actually use, which is smaller than Contrib but has the specific capabilities you need.

## A Migration Path

If you are currently using Core and need to switch to Contrib:

1. Update your Docker image or binary to the Contrib version
2. Test with your existing config (all Core components work in Contrib)
3. Add the new components you need
4. Test the new pipeline in a staging environment before deploying to production

The config format is identical between the two distributions. The only difference is which components are available. Switching distributions does not require rewriting your pipeline configuration.

## Summary

Know which Collector distribution you are running. Check the binary or Docker image name. If you get "unknown component type" errors, you probably need the Contrib distribution. And if neither Core nor Contrib fits your needs exactly, build a custom distribution with the Collector Builder.
