# How to Use the OpenTelemetry Collector Builder (OCB) Manifest to Include Your Custom Components

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OCB, Collector Builder, Custom Components, Go

Description: Use the OpenTelemetry Collector Builder (OCB) to create a custom collector distribution that includes your custom receivers, processors, and exporters.

After writing custom receivers, processors, or exporters, you need to compile them into a collector binary. The OpenTelemetry Collector Builder (OCB) is the official tool for this. It takes a manifest file that lists every component you want and produces a compiled binary with exactly those components, nothing more, nothing less.

## Why Use OCB?

The standard `otelcol-contrib` binary includes every component in the contrib repository, which means a large binary with many dependencies you do not need. OCB lets you build a lean binary with only the components you use, plus your custom ones. This reduces the attack surface, memory footprint, and binary size.

## Installing OCB

```bash
# Install the latest OCB
go install go.opentelemetry.io/collector/cmd/builder@latest

# Verify the installation
builder version
```

## The Manifest File

The manifest file (`builder-config.yaml`) specifies which components to include:

```yaml
# builder-config.yaml
dist:
  # Name of the output binary
  name: my-otel-collector
  # Description shown in --version output
  description: "Custom OpenTelemetry Collector for MyCompany"
  # Output directory for the built binary
  output_path: ./build
  # OpenTelemetry Collector version to base on
  otel_col_version: "0.96.0"
  # Go module path for the generated code
  module: github.com/mycompany/otel-collector

# Standard receivers from the contrib repo
receivers:
  - gomod: go.opentelemetry.io/collector/receiver/otlpreceiver v0.96.0
  - gomod: github.com/open-telemetry/opentelemetry-collector-contrib/receiver/prometheusreceiver v0.96.0
  - gomod: github.com/open-telemetry/opentelemetry-collector-contrib/receiver/hostmetricsreceiver v0.96.0
  - gomod: github.com/open-telemetry/opentelemetry-collector-contrib/receiver/filelogreceiver v0.96.0
  # Your custom receiver
  - gomod: github.com/mycompany/otel-components/myreceiver v0.1.0

# Standard processors
processors:
  - gomod: go.opentelemetry.io/collector/processor/batchprocessor v0.96.0
  - gomod: go.opentelemetry.io/collector/processor/memorylimiterprocessor v0.96.0
  - gomod: github.com/open-telemetry/opentelemetry-collector-contrib/processor/transformprocessor v0.96.0
  - gomod: github.com/open-telemetry/opentelemetry-collector-contrib/processor/filterprocessor v0.96.0
  - gomod: github.com/open-telemetry/opentelemetry-collector-contrib/processor/k8sattributesprocessor v0.96.0
  # Your custom processor
  - gomod: github.com/mycompany/otel-components/piiprocessor v0.1.0

# Standard exporters
exporters:
  - gomod: go.opentelemetry.io/collector/exporter/otlpexporter v0.96.0
  - gomod: go.opentelemetry.io/collector/exporter/otlphttpexporter v0.96.0
  - gomod: go.opentelemetry.io/collector/exporter/debugexporter v0.96.0
  # Your custom exporter
  - gomod: github.com/mycompany/otel-components/myexporter v0.1.0

# Connectors
connectors:
  - gomod: github.com/open-telemetry/opentelemetry-collector-contrib/connector/routingconnector v0.96.0
  - gomod: go.opentelemetry.io/collector/connector/forwardconnector v0.96.0

# Extensions
extensions:
  - gomod: go.opentelemetry.io/collector/extension/zpagesextension v0.96.0
  - gomod: github.com/open-telemetry/opentelemetry-collector-contrib/extension/healthcheckextension v0.96.0
```

## Using Local Components During Development

When developing custom components, you do not want to publish them to a Go registry just to test. Use the `replaces` directive to point to local directories:

```yaml
# builder-config.yaml
dist:
  name: my-otel-collector
  output_path: ./build
  otel_col_version: "0.96.0"
  module: github.com/mycompany/otel-collector

receivers:
  - gomod: go.opentelemetry.io/collector/receiver/otlpreceiver v0.96.0
  - gomod: github.com/mycompany/otel-components/myreceiver v0.1.0

processors:
  - gomod: go.opentelemetry.io/collector/processor/batchprocessor v0.96.0
  - gomod: github.com/mycompany/otel-components/piiprocessor v0.1.0

exporters:
  - gomod: go.opentelemetry.io/collector/exporter/otlpexporter v0.96.0
  - gomod: github.com/mycompany/otel-components/myexporter v0.1.0

# Point to local directories during development
replaces:
  - github.com/mycompany/otel-components/myreceiver v0.1.0 => ../components/myreceiver
  - github.com/mycompany/otel-components/piiprocessor v0.1.0 => ../components/piiprocessor
  - github.com/mycompany/otel-components/myexporter v0.1.0 => ../components/myexporter
```

## Building the Collector

```bash
# Build the custom collector binary
builder --config=builder-config.yaml

# The binary is in the output directory
ls -la ./build/my-otel-collector

# Test it
./build/my-otel-collector --version
# Output: my-otel-collector version 0.96.0

# Validate a config that uses your custom components
./build/my-otel-collector validate --config=my-config.yaml

# Run it
./build/my-otel-collector --config=my-config.yaml
```

## Dockerfile for the Custom Collector

```dockerfile
# Dockerfile
# Build stage
FROM golang:1.22 AS builder

# Install OCB
RUN go install go.opentelemetry.io/collector/cmd/builder@v0.96.0

WORKDIR /build
COPY builder-config.yaml .
COPY components/ ./components/

# Build the collector
RUN builder --config=builder-config.yaml

# Runtime stage
FROM gcr.io/distroless/base-debian12

COPY --from=builder /build/build/my-otel-collector /otel-collector
COPY config.yaml /etc/otel/config.yaml

ENTRYPOINT ["/otel-collector"]
CMD ["--config=/etc/otel/config.yaml"]
```

## CI/CD Pipeline

Automate the build in your CI:

```yaml
# .github/workflows/build-collector.yaml
name: Build Custom Collector
on:
  push:
    branches: [main]
    paths:
      - "components/**"
      - "builder-config.yaml"

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-go@v5
        with:
          go-version: "1.22"

      - name: Install OCB
        run: go install go.opentelemetry.io/collector/cmd/builder@v0.96.0

      - name: Build Collector
        run: builder --config=builder-config.yaml

      - name: Test Config Validation
        run: ./build/my-otel-collector validate --config=test-config.yaml

      - name: Build and Push Docker Image
        run: |
          docker build -t myregistry/otel-collector:${{ github.sha }} .
          docker push myregistry/otel-collector:${{ github.sha }}
```

## Keeping Versions in Sync

The most common issue with OCB is version mismatches. All OpenTelemetry collector modules must use the same version:

```yaml
# All of these must have the same version
dist:
  otel_col_version: "0.96.0"

receivers:
  - gomod: go.opentelemetry.io/collector/receiver/otlpreceiver v0.96.0

processors:
  - gomod: go.opentelemetry.io/collector/processor/batchprocessor v0.96.0

exporters:
  - gomod: go.opentelemetry.io/collector/exporter/otlpexporter v0.96.0
```

If you see compilation errors about incompatible module versions, check that every `v0.96.0` (or whatever version you use) is consistent across the entire manifest.

## Wrapping Up

OCB is the standard way to build custom collector distributions. It generates Go source code, resolves dependencies, and compiles a single binary with exactly the components you need. Keep your manifest in version control, automate builds in CI, and use local `replaces` directives during development. This gives you full control over what runs in your collector while still benefiting from the upstream ecosystem.
