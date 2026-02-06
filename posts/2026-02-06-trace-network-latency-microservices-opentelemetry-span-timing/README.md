# How to Trace Network Latency Between Microservices Using OpenTelemetry Span Timing Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Microservices, Network Latency, Distributed Tracing

Description: Learn how to use OpenTelemetry span timing data to measure and trace network latency between microservices in distributed systems.

When you run a distributed system with dozens of microservices talking to each other over the network, identifying where latency creeps in becomes a real challenge. A request might take 800ms end-to-end, but is that because the database query was slow, or because the network hop between Service A and Service B added 200ms of overhead? OpenTelemetry's distributed tracing gives you the tools to answer that question precisely.

In this post, we will walk through how to instrument your services to capture span timing data and then use that data to calculate the actual network latency between service boundaries.

## Understanding Span Timing and Network Gaps

Every OpenTelemetry span records a start time and an end time. When Service A calls Service B, you get two spans: a client span on Service A and a server span on Service B. The gap between when the client span starts and when the server span starts represents the network transit time (plus any queuing on the receiving end).

Here is a simplified timeline:

```
Service A (client span):  |-------- request --------|
                              ^ client sends request
Network transit:              |====|
Service B (server span):           |--- processing ---|
Network transit (response):                           |====|
```

The network latency for the request leg is roughly: `server_span.start_time - client_span.start_time`. For this to work, clock synchronization between hosts matters. NTP should be configured properly across your infrastructure.

## Instrumenting Services with OpenTelemetry

Let's set up a Python service that makes HTTP calls to another service. We will use the OpenTelemetry SDK with automatic instrumentation for HTTP clients and servers.

First, install the necessary packages:

```bash
pip install opentelemetry-api opentelemetry-sdk opentelemetry-instrumentation-flask opentelemetry-instrumentation-requests opentelemetry-exporter-otlp
```

Here is the tracing setup code that both services will share. This configures the tracer provider and OTLP exporter:

```python
# tracing_setup.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

def setup_tracing(service_name: str):
    # Create a resource that identifies this service
    resource = Resource.create({"service.name": service_name})

    # Set up the tracer provider with OTLP export
    provider = TracerProvider(resource=resource)
    exporter = OTLPSpanExporter(endpoint="http://otel-collector:4317")
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)
```

Now here is Service A, which receives an incoming request and calls Service B:

```python
# service_a.py
from flask import Flask, jsonify
import requests
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from tracing_setup import setup_tracing

setup_tracing("service-a")

app = Flask(__name__)
FlaskInstrumentor().instrument_app(app)
RequestsInstrumentor().instrument()

@app.route("/process")
def process():
    # This outbound call generates a client span
    response = requests.get("http://service-b:5001/compute")
    return jsonify({"result": response.json(), "source": "service-a"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
```

Service B is straightforward. It just handles the request and does some work:

```python
# service_b.py
from flask import Flask, jsonify
import time
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from tracing_setup import setup_tracing

setup_tracing("service-b")

app = Flask(__name__)
FlaskInstrumentor().instrument_app(app)

@app.route("/compute")
def compute():
    # Simulate some processing time
    time.sleep(0.05)
    return jsonify({"value": 42})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001)
```

## Configuring the Collector to Export Span Data

The OpenTelemetry Collector receives spans from both services and exports them to your backend. Here is a collector config that works for this setup:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    # Send spans in batches every 5 seconds or when 512 spans accumulate
    timeout: 5s
    send_batch_size: 512

exporters:
  otlp:
    endpoint: "https://your-backend.example.com:4317"
    tls:
      insecure: false

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
```

## Calculating Network Latency from Spans

Once spans are flowing into your backend, you can query for traces and compute the network latency. The key is matching the client span from Service A with the server span from Service B within the same trace.

Here is a Python script that pulls spans from an OTLP-compatible backend and calculates the network gap:

```python
# calculate_latency.py
def compute_network_latency(client_span, server_span):
    """
    Compute the estimated one-way network latency between two services.
    Both spans must belong to the same trace and have a parent-child relationship.
    """
    # Span times are in nanoseconds
    request_latency_ns = server_span.start_time - client_span.start_time
    response_latency_ns = client_span.end_time - server_span.end_time

    request_latency_ms = request_latency_ns / 1_000_000
    response_latency_ms = response_latency_ns / 1_000_000

    return {
        "request_network_ms": round(request_latency_ms, 2),
        "response_network_ms": round(response_latency_ms, 2),
        "total_network_overhead_ms": round(request_latency_ms + response_latency_ms, 2),
    }
```

## Things to Watch Out For

Clock skew is the biggest practical issue. If Service A's clock is 10ms ahead of Service B's clock, your network latency calculation will be off by 10ms. Use NTP with a tight sync interval, and consider running `chrony` instead of `ntpd` for better accuracy on cloud VMs.

Negative values in your calculations are a strong signal of clock skew. If you see `server_span.start_time` appearing before `client_span.start_time`, that is almost certainly a clock issue, not time travel.

Another consideration is that the auto-instrumentation libraries measure at the application layer, not the TCP layer. The "network latency" you compute includes HTTP parsing overhead, thread scheduling delays, and connection pool wait times. For pure network measurements, combine this approach with infrastructure-level metrics from tools like `ping` or TCP connection timing.

## Wrapping Up

OpenTelemetry span timing gives you a practical way to decompose end-to-end latency into its component parts. By comparing client and server span timestamps across service boundaries, you can identify which network hops are contributing the most latency and focus your optimization efforts accordingly. Pair this with proper clock synchronization and you will have a reliable view into your inter-service communication performance.
