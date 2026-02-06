# How to Set Up Telepresence with OpenTelemetry for Debugging Remote Services Locally

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Telepresence, Kubernetes, Remote Debugging, Distributed Systems

Description: Use Telepresence to intercept traffic from a remote Kubernetes cluster and debug services locally with full OpenTelemetry tracing.

Debugging a service running in a remote Kubernetes cluster is hard. You cannot easily attach a debugger, and reproducing the issue locally often fails because other services are not available. Telepresence solves this by routing cluster traffic to your local machine. Combined with OpenTelemetry, you get full distributed tracing while debugging the service on your laptop.

## How Telepresence Works

Telepresence installs a traffic agent alongside your service in the cluster. When you create an intercept, the agent forwards incoming requests to your local machine instead of the pod. Your local service can reach other cluster services through a network bridge that Telepresence maintains.

The result is that your local process becomes a drop-in replacement for the remote pod, receiving real traffic and participating in the cluster's service mesh.

## Installing Telepresence

Install Telepresence on your machine:

```bash
# macOS
brew install datawire/blackbird/telepresence

# Linux
sudo curl -fL https://app.getambassador.io/download/tel2/linux/amd64/latest/telepresence -o /usr/local/bin/telepresence
sudo chmod a+x /usr/local/bin/telepresence
```

Connect to your cluster:

```bash
# Make sure kubectl is pointing at your cluster
kubectl config current-context

# Connect Telepresence to the cluster
telepresence connect
```

## Creating an Intercept

Let's say you want to debug `order-service` running in the `default` namespace:

```bash
# List available services
telepresence list

# Intercept traffic for order-service
telepresence intercept order-service --port 8080:8080
```

This tells Telepresence to forward traffic that was going to `order-service` on port 8080 to your local port 8080.

## Setting Up OpenTelemetry Locally

Now configure your local service to export traces. The important thing is to send traces to the same collector the cluster uses. Since Telepresence bridges the network, you can reach the cluster's collector directly:

```python
# local_tracing.py
import os
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

def setup_tracing():
    resource = Resource.create({
        "service.name": "order-service",
        "service.version": "local-debug",
        "deployment.environment": "debug"
    })

    provider = TracerProvider(resource=resource)

    # The collector is reachable via its cluster DNS name
    # thanks to Telepresence network bridging
    collector_endpoint = os.environ.get(
        "OTEL_EXPORTER_OTLP_ENDPOINT",
        "otel-collector.observability.svc.cluster.local:4317"
    )

    exporter = OTLPSpanExporter(
        endpoint=collector_endpoint,
        insecure=True
    )
    provider.add_span_processor(BatchSpanProcessor(exporter))
    trace.set_tracer_provider(provider)

    return provider
```

Notice the `service.version` is set to `local-debug`. This makes it easy to filter traces in Jaeger and distinguish them from the production version of the service.

## Running Your Service Locally

Start your service with tracing enabled:

```python
# app.py
from flask import Flask, request, jsonify
from opentelemetry import trace
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from local_tracing import setup_tracing
import requests as http_requests

# Initialize tracing before anything else
provider = setup_tracing()

app = Flask(__name__)
FlaskInstrumentor().instrument_app(app)
RequestsInstrumentor().instrument()

tracer = trace.get_tracer(__name__)

@app.route("/api/orders", methods=["POST"])
def create_order():
    with tracer.start_as_current_span("create-order") as span:
        data = request.json
        span.setAttribute("order.customer_id", data.get("customer_id"))

        # This call reaches the actual inventory-service in the cluster
        inventory = http_requests.get(
            "http://inventory-service:8080/api/check",
            params={"sku": data.get("sku")}
        )
        span.setAttribute("inventory.available", inventory.json().get("available"))

        # Process the order locally with your debug code
        result = process_order(data)
        return jsonify(result)

def process_order(data):
    # Your business logic here - set breakpoints as needed
    return {"order_id": "debug-123", "status": "created"}

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)
```

Run it:

```bash
python app.py
```

Now when a request hits `order-service` in the cluster, Telepresence routes it to your local Flask app. Your app calls `inventory-service` through the Telepresence network bridge, and the request reaches the actual cluster service. The trace spans from your local service join the same distributed trace as the cluster services.

## Viewing the Traces

Open Jaeger (or whatever trace viewer your cluster uses). Search for traces from `order-service`. You will see traces with `service.version: local-debug` which come from your local machine. The child spans calling `inventory-service` connect to the cluster service's spans, giving you a complete picture of the request flow.

## Debugging with Breakpoints

Since the service runs locally, you can use any debugger. In VS Code, create a launch configuration:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Order Service",
      "type": "debugpy",
      "request": "launch",
      "program": "${workspaceFolder}/app.py",
      "env": {
        "OTEL_EXPORTER_OTLP_ENDPOINT": "otel-collector.observability.svc.cluster.local:4317"
      }
    }
  ]
}
```

Set a breakpoint in `process_order`, send a request, and step through the code. While you are paused at the breakpoint, the span is still open. When you continue, the span completes and the trace reflects the actual time spent (including your debugging pause). You can filter these out by looking at the `service.version` attribute.

## Cleaning Up

When you finish debugging, disconnect the intercept:

```bash
# Stop the intercept
telepresence leave order-service

# Disconnect from the cluster
telepresence quit
```

Traffic resumes flowing to the pod in the cluster.

Telepresence with OpenTelemetry gives you the best of both worlds: you debug with local tools and a local debugger while participating in the real distributed system with full trace context propagation.
