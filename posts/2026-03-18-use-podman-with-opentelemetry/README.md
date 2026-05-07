# How to Use Podman with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, OpenTelemetry, Observability, Tracing, Metric

Description: Learn how to use Podman with OpenTelemetry to implement unified observability for containerized applications, collecting traces, metrics, and logs through a single framework.

---

> OpenTelemetry running in Podman containers provides a vendor-neutral observability framework that unifies traces, metrics, and logs collection across all your containerized services.

OpenTelemetry (OTel) is the industry standard for instrumentation and telemetry collection. It provides a single set of APIs, SDKs, and tools for collecting traces, metrics, and logs from your applications. The OpenTelemetry Collector acts as a central pipeline that receives, processes, and exports telemetry data to any backend. Running the collector in Podman containers creates a flexible, scalable observability layer that works with any monitoring platform.

---

## Deploying the OpenTelemetry Collector

Start by deploying the OTel Collector in a container:

```bash
mkdir -p ~/otel/config
```

Create the collector configuration:

```yaml
# ~/otel/config/otel-collector-config.yml

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

  prometheus:
    config:
      scrape_configs:
        - job_name: 'otel-collector'
          scrape_interval: 10s
          static_configs:
            - targets: ['localhost:8888']

processors:
  batch:
    timeout: 5s
    send_batch_size: 1024

  memory_limiter:
    check_interval: 1s
    limit_mib: 512

  attributes:
    actions:
      - key: environment
        value: production
        action: upsert

exporters:
  debug:
    verbosity: detailed

  otlp/jaeger:
    endpoint: jaeger:4317
    tls:
      insecure: true

  otlphttp/loki:
    endpoint: http://loki:3100/otlp

  prometheus:
    endpoint: 0.0.0.0:8889

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch, attributes]
      exporters: [otlp/jaeger, debug]

    metrics:
      receivers: [otlp, prometheus]
      processors: [memory_limiter, batch]
      exporters: [prometheus, debug]

    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlphttp/loki, debug]

  telemetry:
    metrics:
      readers:
        - pull:
            exporter:
              prometheus:
                host: 0.0.0.0
                port: 8888
```

Run the collector:

```bash
podman run -d \
  --name otel-collector \
  --restart always \
  -p 4317:4317 \
  -p 4318:4318 \
  -p 8888:8888 \
  -p 8889:8889 \
  -v ~/otel/config/otel-collector-config.yml:/etc/otelcol-contrib/config.yaml:ro,Z \
  otel/opentelemetry-collector-contrib:latest
```

## Complete Observability Stack

Deploy the collector with backends for traces, metrics, and logs:

```yaml
# observability-stack.yml
version: "3"
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    restart: always
    ports:
      - "4317:4317"
      - "4318:4318"
      - "8889:8889"
    volumes:
      - ./otel/config/otel-collector-config.yml:/etc/otelcol-contrib/config.yaml:ro,Z

  jaeger:
    image: jaegertracing/all-in-one:latest
    restart: always
    ports:
      - "16686:16686"

  prometheus:
    image: prom/prometheus:latest
    restart: always
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro,Z
      - prometheus-data:/prometheus

  grafana:
    image: grafana/grafana:latest
    restart: always
    ports:
      - "3000:3000"
    volumes:
      - grafana-data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning:ro,Z
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin

  loki:
    image: grafana/loki:latest
    restart: always
    ports:
      - "3100:3100"

volumes:
  prometheus-data:
  grafana-data:
```

Configure Prometheus to scrape the OTel collector:

```yaml
# prometheus/prometheus.yml
scrape_configs:
  - job_name: 'otel-collector'
    static_configs:
      - targets: ['otel-collector:8889']
```

## Instrumenting a Go Application

```go
// main.go
package main

import (
    "context"
    "fmt"
    "log"
    "net/http"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
    "go.opentelemetry.io/otel/metric"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    sdkmetric "go.opentelemetry.io/otel/sdk/metric"
    semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
)

func initTracer(ctx context.Context) (*sdktrace.TracerProvider, error) {
    exporter, err := otlptracegrpc.New(ctx,
        otlptracegrpc.WithEndpoint("otel-collector:4317"),
        otlptracegrpc.WithInsecure(),
    )
    if err != nil {
        return nil, err
    }

    res := resource.NewWithAttributes(
        semconv.SchemaURL,
        semconv.ServiceName("my-go-service"),
        semconv.ServiceVersion("1.0.0"),
    )

    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(res),
    )

    otel.SetTracerProvider(tp)
    return tp, nil
}

func initMeter(ctx context.Context) (*sdkmetric.MeterProvider, error) {
    exporter, err := otlpmetricgrpc.New(ctx,
        otlpmetricgrpc.WithEndpoint("otel-collector:4317"),
        otlpmetricgrpc.WithInsecure(),
    )
    if err != nil {
        return nil, err
    }

    mp := sdkmetric.NewMeterProvider(
        sdkmetric.WithReader(sdkmetric.NewPeriodicReader(exporter)),
    )

    otel.SetMeterProvider(mp)
    return mp, nil
}

func main() {
    ctx := context.Background()

    tp, err := initTracer(ctx)
    if err != nil {
        log.Fatal(err)
    }
    defer tp.Shutdown(ctx)

    mp, err := initMeter(ctx)
    if err != nil {
        log.Fatal(err)
    }
    defer mp.Shutdown(ctx)

    tracer := otel.Tracer("api-handler")
    meter := otel.Meter("api-metrics")

    requestCounter, _ := meter.Int64Counter("http.requests.total",
        metric.WithDescription("Total HTTP requests"),
    )

    requestDuration, _ := meter.Float64Histogram("http.request.duration",
        metric.WithDescription("HTTP request duration in seconds"),
    )

    http.HandleFunc("/api/data", func(w http.ResponseWriter, r *http.Request) {
        ctx, span := tracer.Start(r.Context(), "handle-request")
        defer span.End()

        start := time.Now()

        span.SetAttributes(
            attribute.String("http.request.method", r.Method),
            attribute.String("url.path", r.URL.Path),
        )

        // Simulate work
        processData(ctx)

        duration := time.Since(start).Seconds()
        requestCounter.Add(ctx, 1,
            metric.WithAttributes(attribute.String("endpoint", "/api/data")),
        )
        requestDuration.Record(ctx, duration,
            metric.WithAttributes(attribute.String("endpoint", "/api/data")),
        )

        fmt.Fprintf(w, `{"status": "ok"}`)
    })

    log.Println("Server starting on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}

func processData(ctx context.Context) {
    tracer := otel.Tracer("api-handler")
    _, span := tracer.Start(ctx, "process-data")
    defer span.End()

    time.Sleep(50 * time.Millisecond)
    span.SetAttributes(attribute.Int("records.processed", 42))
}
```

## Instrumenting a Python Application

```python
# app.py
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from flask import Flask
import time

# Configure resource
resource = Resource.create({
    "service.name": "my-python-service",
    "service.version": "1.0.0",
})

# Configure tracing
trace_exporter = OTLPSpanExporter(endpoint="http://otel-collector:4317", insecure=True)
trace_provider = TracerProvider(resource=resource)
trace_provider.add_span_processor(BatchSpanProcessor(trace_exporter))
trace.set_tracer_provider(trace_provider)

# Configure metrics
metric_exporter = OTLPMetricExporter(endpoint="http://otel-collector:4317", insecure=True)
metric_reader = PeriodicExportingMetricReader(metric_exporter, export_interval_millis=5000)
meter_provider = MeterProvider(resource=resource, metric_readers=[metric_reader])
metrics.set_meter_provider(meter_provider)

# Create instruments
tracer = trace.get_tracer(__name__)
meter = metrics.get_meter(__name__)
request_counter = meter.create_counter("http.requests", description="Total requests")

app = Flask(__name__)
FlaskInstrumentor().instrument_app(app)

@app.route('/api/process')
def process():
    with tracer.start_as_current_span("process-request") as span:
        request_counter.add(1, {"endpoint": "/api/process"})
        span.set_attribute("processing.type", "standard")
        time.sleep(0.1)
        return {"status": "processed"}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

## Collector Pipeline Patterns

Configure the collector for common patterns:

```yaml
# Tail-based sampling for traces
processors:
  tail_sampling:
    decision_wait: 10s
    policies:
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]
      - name: slow-traces
        type: latency
        latency:
          threshold_ms: 1000
      - name: probabilistic
        type: probabilistic
        probabilistic:
          sampling_percentage: 10
  transform:
    trace_statements:
      - set(resource.attributes["deployment.environment.name"], "production")
      - set(resource.attributes["service.namespace"], "myapp")

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, tail_sampling, transform, batch]
      exporters: [otlp/jaeger]
```

## Environment Variable Configuration

If your application already uses the OpenTelemetry SDK or a zero-code auto-instrumentation agent, you can configure it with environment variables:

```bash
podman run -d \
  --name my-service \
  -e OTEL_SERVICE_NAME=my-service \
  -e OTEL_TRACES_EXPORTER=otlp \
  -e OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317 \
  -e OTEL_EXPORTER_OTLP_PROTOCOL=grpc \
  -e OTEL_TRACES_SAMPLER=parentbased_traceidratio \
  -e OTEL_TRACES_SAMPLER_ARG=0.1 \
  -e OTEL_METRICS_EXPORTER=otlp \
  -e OTEL_LOGS_EXPORTER=otlp \
  my-service:latest
```

## Conclusion

OpenTelemetry with Podman creates a vendor-neutral, comprehensive observability framework for containerized applications. The OTel Collector running in a container acts as a central telemetry pipeline that decouples instrumentation from backend choices. You can switch between Jaeger, Zipkin, Datadog, or any other backend without changing application code. The combination of traces, metrics, and logs through a single framework reduces the complexity of observability instrumentation and gives you a unified view of your system's behavior.
