# How to Use Docker Desktop Built-In OpenTelemetry Integration for Local Development Trace Collection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Docker Desktop, Local Development, Tracing

Description: Use Docker Desktop's built-in OpenTelemetry integration to collect traces and metrics from your local development environment automatically.

Docker Desktop includes a built-in OpenTelemetry Collector that captures telemetry from containers running on your machine. This means you can start collecting traces, metrics, and logs during local development without setting up a separate Collector. It is a quick way to validate your instrumentation before deploying to staging or production.

## Enabling the Built-In OTLP Endpoint

Docker Desktop exposes an OTLP endpoint that your containers can send telemetry to. In Docker Desktop settings:

1. Open Docker Desktop
2. Go to Settings (gear icon)
3. Navigate to General
4. Enable "Send usage statistics" or the OTLP-related setting

The OTLP endpoint is available at `host.docker.internal:4317` (gRPC) and `host.docker.internal:4318` (HTTP) from inside containers.

## Configuring Your Application

Point your application's OTLP exporter at the Docker Desktop endpoint:

```yaml
# docker-compose.yaml
version: "3.8"

services:
  web-app:
    build: .
    environment:
      # Use the Docker Desktop OTLP endpoint
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://host.docker.internal:4318
      - OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
      - OTEL_SERVICE_NAME=web-app
      - OTEL_RESOURCE_ATTRIBUTES=deployment.environment=local
    ports:
      - "8080:8080"
```

For a Go application:

```go
package main

import (
    "context"
    "log"
    "net/http"
    "os"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
)

func initTracer() (*sdktrace.TracerProvider, error) {
    ctx := context.Background()

    // The exporter reads OTEL_EXPORTER_OTLP_ENDPOINT from env
    exporter, err := otlptracehttp.New(ctx)
    if err != nil {
        return nil, err
    }

    res, err := resource.New(ctx,
        resource.WithAttributes(
            semconv.ServiceName(os.Getenv("OTEL_SERVICE_NAME")),
        ),
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

## Viewing Traces in Docker Desktop

Docker Desktop provides a built-in trace viewer. Open Docker Desktop and navigate to the "Open Telemetry" or "Observability" tab (depending on your version). You will see traces from your containers, including span details, timing, and attributes.

## Setting Up a Local Grafana Stack

For a richer experience, forward traces from Docker Desktop to a local Grafana stack:

```yaml
# docker-compose-observability.yaml
version: "3.8"

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
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./collector-config.yaml:/etc/otelcol-contrib/config.yaml
    ports:
      - "4317:4317"
      - "4318:4318"
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
  - OTEL_EXPORTER_OTLP_ENDPOINT=http://host.docker.internal:4318
  - OTEL_SERVICE_NAME=java-service
  - JAVA_TOOL_OPTIONS=-javaagent:/opt/opentelemetry-javaagent.jar
```

## Development Workflow Tips

Keep these practices in mind for local development:

1. **Always set `OTEL_SERVICE_NAME`**: Without it, all your services show up as "unknown_service" in the trace viewer.

2. **Use `deployment.environment=local`**: This lets you filter out local development traces if they accidentally reach your production backend.

3. **Set sampling to 100%**: During development, you want to see every trace. Set `OTEL_TRACES_SAMPLER=always_on`.

4. **Check traces after each change**: Get in the habit of reviewing traces as part of your development workflow, not just when debugging production issues.

```bash
# Quick test to verify tracing works
curl http://localhost:8080/
# Then check Docker Desktop or Grafana for the trace
```

## Switching Between Local and Remote Backends

Use environment variable files to switch between local and remote backends:

```bash
# .env.local
OTEL_EXPORTER_OTLP_ENDPOINT=http://host.docker.internal:4318
OTEL_TRACES_SAMPLER=always_on

# .env.staging
OTEL_EXPORTER_OTLP_ENDPOINT=https://staging-collector.example.com:4318
OTEL_TRACES_SAMPLER=parentbased_traceidratio
OTEL_TRACES_SAMPLER_ARG=0.1
```

```bash
docker compose --env-file .env.local up
```

## Summary

Docker Desktop's built-in OpenTelemetry support makes it easy to collect traces during local development. Point your application's OTLP exporter at `host.docker.internal:4317` or `host.docker.internal:4318`, and traces appear in Docker Desktop's UI. For more advanced analysis, forward traces to a local Grafana and Tempo stack. This lets you validate your instrumentation before it reaches production.
