# How to Use Docker Desktop Built-In OpenTelemetry Integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Docker Desktop, Local Development, Tracing

Description: Use Docker Desktop's built-in OpenTelemetry integration to collect traces and metrics from your local development environment automatically.

Docker Desktop works well with the OpenTelemetry Collector running as a local container. This means you can start collecting traces, metrics, and logs during local development with a small Compose setup. It is a quick way to validate your instrumentation before deploying to staging or production.

## Running a Local OTLP Endpoint

Run an OpenTelemetry Collector container that your application containers can send telemetry to:

```yaml
# docker-compose.yaml

services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.152.0
    volumes:
      - ./collector-config.yaml:/etc/otelcol-contrib/config.yaml
    ports:
      - "4317:4317"
      - "4318:4318"
```

Use this minimal collector configuration to receive telemetry and print it to the collector logs:

```yaml
# collector-config.yaml

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
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

The OTLP endpoint is available at `otel-collector:4317` for OTLP/gRPC and `otel-collector:4318` for OTLP/HTTP from containers on the same Compose network. If the collector is running on the host and your app is in a separate Compose project, use `host.docker.internal:4317` or `host.docker.internal:4318` from inside Docker Desktop containers.

## Configuring Your Application

Point your application's OTLP exporter at the local collector endpoint in the same Compose file or Compose project:

```yaml
# docker-compose.yaml

services:
  web-app:
    build: .
    environment:
      # Use the local collector's OTLP/HTTP endpoint
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
      - OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
      - OTEL_SERVICE_NAME=web-app
      - OTEL_RESOURCE_ATTRIBUTES=deployment.environment.name=development
    ports:
      - "8080:8080"
    depends_on:
      - otel-collector
```

For a Go application:

```go
package main

import (
    "context"
    "log"
    "net/http"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
)

func initTracer() (*sdktrace.TracerProvider, error) {
    ctx := context.Background()

    // The exporter reads OTEL_EXPORTER_OTLP_ENDPOINT from env
    exporter, err := otlptracehttp.New(ctx)
    if err != nil {
        return nil, err
    }

    res, err := resource.New(ctx,
        resource.WithFromEnv(),
        resource.WithTelemetrySDK(),
    )
    if err != nil {
        return nil, err
    }

    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(res),
    )
    otel.SetTracerProvider(tp)
    return tp, nil
}

func main() {
    tp, err := initTracer()
    if err != nil {
        log.Fatal(err)
    }
    defer tp.Shutdown(context.Background())

    tracer := otel.Tracer("web-app")

    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        _, span := tracer.Start(r.Context(), "handle-request")
        defer span.End()
        w.Write([]byte("Hello from traced app"))
    })

    log.Println("Starting server on :8080")
    http.ListenAndServe(":8080", nil)
}
```

## Viewing Traces Locally

Docker Desktop does not provide a built-in application trace viewer. With the debug exporter above, you can confirm that spans are being received by checking the OpenTelemetry Collector container logs in Docker Desktop or by running `docker compose logs otel-collector`. For a trace UI, send the traces to a local backend such as Grafana Tempo.

## Setting Up a Local Grafana Stack

For a richer experience, forward traces from the OpenTelemetry Collector to a local Grafana stack:

```yaml
# docker-compose-observability.yaml
services:
  tempo:
    image: grafana/tempo:latest
    command: ["-config.file=/etc/tempo/config.yaml"]
    volumes:
      - ./tempo-config.yaml:/etc/tempo/config.yaml
    ports:
      - "3200:3200"

  grafana:
    image: grafana/grafana:latest
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - ./grafana-datasources.yaml:/etc/grafana/provisioning/datasources/ds.yaml
    ports:
      - "3000:3000"
    depends_on:
      - tempo

  # Your collector that receives from apps and forwards to Tempo
  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.152.0
    volumes:
      - ./collector-config.yaml:/etc/otelcol-contrib/config.yaml
    ports:
      - "4317:4317"
      - "4318:4318"
```

Update `collector-config.yaml` to export traces to Tempo:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:

exporters:
  otlp:
    endpoint: tempo:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
```

## Using the OTLP Exporter with Different Languages

### Python
```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

# Reads OTEL_EXPORTER_OTLP_ENDPOINT from environment
provider = TracerProvider()
exporter = OTLPSpanExporter()
provider.add_span_processor(BatchSpanProcessor(exporter))
trace.set_tracer_provider(provider)

tracer = trace.get_tracer("my-python-app")
with tracer.start_as_current_span("do-work"):
    print("Traced operation")
```

### Java
```java
// build.gradle
// implementation 'io.opentelemetry:opentelemetry-sdk:1.35.0'
// implementation 'io.opentelemetry:opentelemetry-exporter-otlp:1.35.0'

// Use the Java agent for auto-instrumentation
// java -javaagent:opentelemetry-javaagent.jar -jar myapp.jar
```

Set the environment variables in your Docker Compose:

```yaml
environment:
  - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
  - OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
  - OTEL_SERVICE_NAME=java-service
  - JAVA_TOOL_OPTIONS=-javaagent:/opt/opentelemetry-javaagent.jar
```

## Development Workflow Tips

Keep these practices in mind for local development:

1. **Always set `OTEL_SERVICE_NAME`**: Without it, SDKs use a default service name such as "unknown_service".

2. **Use `deployment.environment.name=development`**: This lets you filter out local development traces if they accidentally reach your production backend.

3. **Set sampling to 100%**: During development, you want to see every trace. Set `OTEL_TRACES_SAMPLER=always_on`.

4. **Check traces after each change**: Get in the habit of reviewing traces as part of your development workflow, not just when debugging production issues.

```bash
# Quick test to verify tracing works
curl http://localhost:8080/
# Then check the collector logs or Grafana for the trace
```

## Switching Between Local and Remote Backends

Use environment variable files to switch between local and remote backends:

```bash
# .env.local
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_TRACES_SAMPLER=always_on

# .env.staging
OTEL_EXPORTER_OTLP_ENDPOINT=https://staging-collector.example.com:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1
```

```bash
docker compose --env-file .env.local up
```

## Summary

Docker Desktop makes it easy to run an OpenTelemetry Collector for local development. Point your application's OTLP exporter at `otel-collector:4318` for OTLP/HTTP or `otel-collector:4317` for OTLP/gRPC, and confirm received telemetry in the collector logs. For more advanced analysis, forward traces to a local Grafana and Tempo stack. This lets you validate your instrumentation before it reaches production.
