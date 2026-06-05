# How to Correlate OpenTelemetry Profiles with Traces to Pinpoint Exactly Which

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Profiling, Trace, Latency, Performance

Description: Correlate OpenTelemetry continuous profiling data with traces to identify the exact code responsible for latency in production.

Traces tell you which service is slow. Profiles tell you which function in that service is consuming the CPU or blocking on I/O. When you correlate the two, you go from "the checkout endpoint is slow" to "the JSON serialization in `CartSerializer.toJson()` is taking 800ms because it is doing N+1 attribute lookups." This post shows how to set up that correlation using OpenTelemetry's profiling support.

## The Gap Between Traces and Code

A trace tells you that `POST /checkout` took 3.2 seconds, and the `calculate-total` span took 2.8 seconds of that. Great, you know the slow operation. But the span is a black box. You do not know if the 2.8 seconds was spent in CPU computation, database I/O, garbage collection, or lock contention.

Continuous profiling fills this gap by periodically sampling the call stack of your application (typically every 10ms). Each sample records what function was executing and what the call stack looked like at that moment.

When profiles are linked to trace context, you can filter profile samples to only those that occurred during a specific span. This gives you a flamegraph scoped to the exact operation that was slow.

## Setting Up Profiling with Trace Correlation

### Java with Pyroscope and the OpenTelemetry Agent

For Java span profiles, use the Pyroscope OpenTelemetry Java agent extension with the OpenTelemetry Java agent:

```bash
# Download the Pyroscope OpenTelemetry Java agent extension

curl -L -o pyroscope-otel.jar \
  https://github.com/grafana/otel-profiling-java/releases/latest/download/pyroscope-otel.jar
```

Run your application with the OpenTelemetry Java agent and load the Pyroscope extension:

```bash
java \
  -javaagent:/opt/opentelemetry-javaagent.jar \
  -Dotel.javaagent.extensions=/opt/pyroscope-otel.jar \
  -Dpyroscope.server.address=http://pyroscope:4040 \
  -Dpyroscope.application.name=checkout-service \
  -Dpyroscope.format=jfr \
  -Dpyroscope.profiler.event=itimer \
  -Dpyroscope.labels="service_name=checkout-service" \
  -Dotel.experimental.config.file=/etc/otel/otel-config.yaml \
  -jar checkout-service.jar
```

The extension connects the two signals by enriching spans and profile data so Grafana can query span-specific profile data. For wall-clock latency analysis, use `-Dpyroscope.profiler.event=wall` instead of `itimer`.

### Python with Pyroscope and OpenTelemetry

For Python applications, use Pyroscope's Python SDK together with the `pyroscope-otel` package:

```bash
pip install pyroscope-io pyroscope-otel
```

```python
# profiling_setup.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from pyroscope import configure as configure_pyroscope
from pyroscope.otel import PyroscopeSpanProcessor

# Set up the tracer provider
provider = TracerProvider()

# Add the Pyroscope span processor
# This processor connects profile data with the current span context
pyroscope_processor = PyroscopeSpanProcessor()
provider.add_span_processor(pyroscope_processor)

trace.set_tracer_provider(provider)

# Configure Pyroscope
configure_pyroscope(
    application_name="checkout-service",
    server_address="http://pyroscope:4040",
    tags={"service_name": "checkout-service"},
)
```

Now when a span is active, profile samples captured during that span can be associated with that span:

```python
tracer = trace.get_tracer("checkout-service")

def process_checkout(cart):
    with tracer.start_as_current_span("process_checkout") as span:
        # Profile samples captured during this span can be linked
        # back to this OpenTelemetry span in Grafana.

        total = calculate_total(cart)  # CPU-intensive
        validate_inventory(cart)        # might block on DB
        charge_payment(cart, total)     # external API call

        return total
```

### Go with otel-profiling-go

For Go applications, use the `otel-profiling-go` tracer provider wrapper with the Pyroscope Go SDK:

```go
// profiling.go
package main

import (
    "context"

    otelpyroscope "github.com/grafana/otel-profiling-go"
    "github.com/grafana/pyroscope-go"
    "go.opentelemetry.io/otel"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
)

func setupProfiling(tp *sdktrace.TracerProvider) {
    otel.SetTracerProvider(otelpyroscope.NewTracerProvider(tp))

    _, _ = pyroscope.Start(pyroscope.Config{
        ApplicationName: "checkout-service",
        ServerAddress:   "http://pyroscope:4040",
    })
}

func processCheckout(ctx context.Context) {
    ctx, span := otel.Tracer("checkout-service").Start(ctx, "process_checkout")
    defer span.End()

    // Profile samples captured while this span is active can be
    // queried as a span profile in Grafana.
    _ = ctx
}
```

## Collector Configuration

Configure the OpenTelemetry Collector to receive and export profiling data:

```yaml
# collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"
      http:
        endpoint: "0.0.0.0:4318"

exporters:
  otlp/traces:
    endpoint: "tempo:4317"
    tls:
      insecure: true

  otlp/profiles:
    endpoint: "pyroscope:4040"
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [otlp/traces]

    # Profile pipeline
    profiles:
      receivers: [otlp]
      exporters: [otlp/profiles]
```

Start collector versions that gate profile pipelines with `--feature-gates=service.profilesSupport`.

## Using the Correlation in Practice

Once profiles are linked to trace context, the workflow during an incident looks like this:

1. You see a latency spike on your dashboard
2. You click an exemplar to open a slow trace
3. In the trace view, you see the `process_checkout` span took 2.8 seconds
4. You click "View Profile" on that span
5. A flamegraph opens showing only the profile samples from that span's execution time
6. The flamegraph shows that `CartSerializer.toJson()` consumed 60% of the span's CPU time
7. You drill into `CartSerializer.toJson()` and see it is calling `loadAttribute()` in a loop

Without the correlation, step 4 through 7 would require manually matching timestamps, guessing which profile data corresponds to which request, and hoping you got it right.

## Grafana Integration

In Grafana, configure Tempo and Pyroscope data sources to link together:

```yaml
# Grafana datasource configuration
apiVersion: 1
datasources:
  - name: Tempo
    type: tempo
    url: http://tempo:3200
    jsonData:
      tracesToProfiles:
        datasourceUid: "pyroscope"
        tags:
          - key: "service.name"
            value: "service_name"
        profileTypeId: "process_cpu:cpu:nanoseconds:cpu:nanoseconds"
        customQuery: true
        query: '{service_name="$${__span.tags["service.name"]}"}'

  - name: Pyroscope
    type: grafana-pyroscope-datasource
    uid: pyroscope
    url: http://pyroscope:4040
```

This configuration adds a "Profiles for this span" button on spans that include the `pyroscope.profile.id` attribute in the Tempo trace view.

## Wrapping Up

Correlating profiles with traces closes the last mile of performance debugging. Traces show you the slow operation. Profiles show you the slow code. The connection between them is span profile context carried by the OpenTelemetry bridge package. Set up a profiling agent that reads OpenTelemetry context, configure your observability tools to link the data sources, and the next time a span is unexpectedly slow, you will know exactly which line of code to look at.
