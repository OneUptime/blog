# How to Create a Minimal Collector Config for Local Testing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Configuration, Local Development, Testing, Getting Started

Description: Learn how to build a minimal OpenTelemetry Collector configuration for local development and testing that is easy to understand and quick to iterate on.

---

Production Collector configurations tend to be large. They have multiple pipelines, authentication, TLS, sampling rules, and resource detection. That complexity is necessary in production but it gets in the way when you are developing locally. You do not need a full production setup to test that your instrumentation is working or that your spans have the right attributes.

A minimal Collector config strips everything back to the essentials: receive telemetry, optionally process it, and output it somewhere you can see it. This guide builds up a local testing configuration step by step, starting from the absolute minimum and adding pieces as needed.

## The Absolute Minimum

The smallest valid Collector configuration needs one receiver, one exporter, and one pipeline connecting them. Here it is.

```yaml
# minimal-config.yaml
# The simplest possible Collector configuration
receivers:
  # OTLP receiver accepts traces, metrics, and logs
  otlp:
    protocols:
      grpc:
        # Listen on the standard OTLP gRPC port
        endpoint: 0.0.0.0:4317

exporters:
  # Debug exporter prints telemetry to the console
  debug:
    # "detailed" shows full span/metric/log content
    verbosity: detailed

service:
  pipelines:
    # A single pipeline for traces
    traces:
      receivers: [otlp]
      exporters: [debug]
```

That is it. Thirteen lines of meaningful YAML. This configuration accepts OTLP data over gRPC and prints it to the console. No authentication, no TLS, no batching, no sampling. Just receive and display.

## Running the Minimal Config

You can run the Collector locally using Docker or the binary directly. Docker is usually the easier path because it does not require installing anything.

```bash
# Run with Docker, mounting your config file
docker run --rm -it \
  -p 4317:4317 \
  -v $(pwd)/minimal-config.yaml:/etc/otelcol/config.yaml \
  otel/opentelemetry-collector-contrib:latest \
  --config /etc/otelcol/config.yaml

# Or if you have the binary installed
otelcol --config minimal-config.yaml
```

Once the Collector starts, you will see a startup log confirming that the OTLP receiver is listening and the debug exporter is active. Any telemetry sent to `localhost:4317` will appear in the terminal output.

## Sending Test Data

To verify that the Collector is working, send some test data using the `telemetrygen` tool. This is a utility from the OpenTelemetry project designed for exactly this purpose.

```bash
# Install telemetrygen
go install github.com/open-telemetry/opentelemetry-collector-contrib/cmd/telemetrygen@latest

# Send 5 test traces to the Collector
telemetrygen traces \
  --otlp-endpoint localhost:4317 \
  --otlp-insecure \
  --traces 5 \
  --service "test-service"

# Send test metrics
telemetrygen metrics \
  --otlp-endpoint localhost:4317 \
  --otlp-insecure \
  --metrics 10 \
  --service "test-service"

# Send test logs
telemetrygen logs \
  --otlp-endpoint localhost:4317 \
  --otlp-insecure \
  --logs 3 \
  --service "test-service"
```

You should see the trace, metric, and log data printed in the Collector's console output. If you do, your setup is working.

## Adding HTTP Support

Some SDKs and tools send telemetry over HTTP instead of gRPC. Adding the HTTP protocol to the OTLP receiver costs one extra line.

```yaml
# minimal-with-http.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      # Add HTTP support on the standard OTLP HTTP port
      http:
        endpoint: 0.0.0.0:4318

exporters:
  debug:
    verbosity: detailed

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [debug]
    metrics:
      receivers: [otlp]
      exporters: [debug]
    logs:
      receivers: [otlp]
      exporters: [debug]
```

Notice that this version also adds separate pipelines for metrics and logs. In the minimal config, only traces were wired up. If your application sends metrics or logs, you need those pipelines too.

## Adding a File Exporter for Persistent Output

The debug exporter prints to the console, which is great for real-time watching but bad for review later. The file exporter writes telemetry to disk so you can inspect it after the fact.

```yaml
# minimal-with-file.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

exporters:
  # Console output for real-time visibility
  debug:
    verbosity: detailed

  # File output for persistent records
  file:
    # Write telemetry data to a JSON file
    path: /tmp/otel-output.json

service:
  pipelines:
    traces:
      receivers: [otlp]
      # Send to both exporters simultaneously
      exporters: [debug, file]
    metrics:
      receivers: [otlp]
      exporters: [debug, file]
    logs:
      receivers: [otlp]
      exporters: [debug, file]
```

Now telemetry shows up in the console and gets written to `/tmp/otel-output.json`. You can use `jq` to parse and filter the file output, which is handy for verifying specific attributes or checking that your instrumentation produces the expected data.

```bash
# Pretty-print the output file
jq '.' /tmp/otel-output.json

# Extract just span names from the trace data
jq '.resourceSpans[].scopeSpans[].spans[].name' /tmp/otel-output.json

# Filter for spans longer than 100ms
jq '.resourceSpans[].scopeSpans[].spans[] | select(.endTimeUnixNano - .startTimeUnixNano > 100000000)' /tmp/otel-output.json
```

## The Local Development Architecture

Here is how all the pieces fit together in a typical local development setup.

```mermaid
graph LR
    A[Your Application with OTel SDK] -->|OTLP gRPC :4317| C[Collector]
    B[telemetrygen] -->|OTLP gRPC :4317| C
    C -->|debug exporter| D[Console Output]
    C -->|file exporter| E[/tmp/otel-output.json]
```

Your application sends telemetry to the Collector. The Collector writes it to the console and a file. You read the console for real-time feedback and the file for detailed inspection.

## Adding Basic Processing

Once you have data flowing, you might want to add a processor to test filtering or transformation. The attributes processor is useful for testing because it lets you add, modify, or delete attributes without changing your application code.

```yaml
# minimal-with-processing.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  # Add environment info to all telemetry
  attributes:
    actions:
      # Insert a static attribute on every span/metric/log
      - key: deployment.environment
        value: local-dev
        action: insert
      # Delete attributes you do not want to see
      - key: host.name
        action: delete

  # Resource processor modifies resource-level attributes
  resource:
    attributes:
      - key: service.namespace
        value: local-testing
        action: upsert

exporters:
  debug:
    verbosity: detailed

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [attributes, resource]
      exporters: [debug]
```

This config adds `deployment.environment: local-dev` to every piece of telemetry and removes the `host.name` attribute. It is a quick way to test how processors transform your data without building a full pipeline.

## Docker Compose for Multi-Service Testing

When you are testing instrumentation across multiple services, Docker Compose gives you a clean way to run everything together.

```yaml
# docker-compose.yaml
version: "3.8"

services:
  # The OpenTelemetry Collector
  collector:
    image: otel/opentelemetry-collector-contrib:latest
    command: ["--config", "/etc/otelcol/config.yaml"]
    volumes:
      - ./minimal-config.yaml:/etc/otelcol/config.yaml:ro
      - ./otel-output:/tmp/otel-output
    ports:
      - "4317:4317"   # OTLP gRPC
      - "4318:4318"   # OTLP HTTP
      - "55679:55679" # zPages for debugging

  # Your application service
  app:
    build: .
    environment:
      # Point the OTel SDK at the Collector
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4317
      - OTEL_SERVICE_NAME=my-app
      - OTEL_TRACES_EXPORTER=otlp
    depends_on:
      - collector
```

With this setup, `docker compose up` starts both your application and the Collector. The application sends telemetry to the Collector using the Docker network DNS name `collector`, and you can see the output in the Collector's logs.

## Configuration Switching with Multiple Files

Keep a directory of config files for different testing scenarios. This saves you from constantly editing a single file.

```bash
# Directory structure for local testing configs
configs/
  minimal.yaml           # Bare minimum: receive and print
  with-file.yaml         # Add file export for inspection
  with-processing.yaml   # Add attribute processors
  with-sampling.yaml     # Test sampling configurations
  production-mirror.yaml # Scaled-down version of production config
```

```bash
# Switch between configs easily
# Test basic connectivity
docker run --rm -it \
  -p 4317:4317 \
  -v $(pwd)/configs/minimal.yaml:/etc/otelcol/config.yaml \
  otel/opentelemetry-collector-contrib:latest

# Test with processing
docker run --rm -it \
  -p 4317:4317 \
  -v $(pwd)/configs/with-processing.yaml:/etc/otelcol/config.yaml \
  otel/opentelemetry-collector-contrib:latest
```

This approach lets you test specific aspects of your Collector configuration in isolation. When you need to debug a processing rule, load the processing config. When you just want to verify instrumentation, load the minimal config.

## Tips for Local Testing

A few practical suggestions that will save you time.

Use `verbosity: detailed` on the debug exporter. The default verbosity level hides most of the interesting data. The detailed level shows every attribute, event, and link on every span.

Bind receivers to `0.0.0.0` instead of `localhost`. This matters when running in Docker because `localhost` inside a container is not the same as `localhost` on your host machine.

Do not add `memory_limiter` to local configs. It adds complexity without value when you are running on your development machine. Save it for staging and production configs.

Use the `--set` flag to override config values from the command line without editing files.

```bash
# Override the debug exporter verbosity from the command line
otelcol --config minimal.yaml \
  --set "exporters.debug.verbosity=basic"
```

## Wrapping Up

A minimal Collector config is your best friend during development. It takes seconds to set up, gives you immediate visibility into your telemetry data, and lets you iterate quickly on instrumentation changes. Start with the 13-line minimum, add pieces as you need them, and keep a library of configs for different testing scenarios. Your production config will always be more complex, but your local testing config should be as simple as possible.
