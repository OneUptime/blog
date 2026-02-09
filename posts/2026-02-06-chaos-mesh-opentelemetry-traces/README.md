# How to Implement Chaos Testing with Chaos Mesh and Correlate Failures Using OpenTelemetry Traces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Chaos Mesh, Chaos Testing, Kubernetes, Distributed Tracing

Description: Learn how to run chaos experiments with Chaos Mesh in Kubernetes and use OpenTelemetry traces to understand failure propagation.

Chaos testing tells you how your system behaves when things go wrong. The problem is that once you inject a failure, figuring out exactly how it propagated through your distributed system is not straightforward. OpenTelemetry traces give you that visibility. This post shows you how to combine Chaos Mesh experiments with OpenTelemetry to see the full picture of failure propagation.

## Installing Chaos Mesh in Your Cluster

Chaos Mesh runs as a set of Kubernetes operators. Install it using Helm:

```bash
# Add the Chaos Mesh Helm repo
helm repo add chaos-mesh https://charts.chaos-mesh.org
helm repo update

# Install Chaos Mesh into its own namespace
kubectl create namespace chaos-mesh
helm install chaos-mesh chaos-mesh/chaos-mesh \
  --namespace chaos-mesh \
  --set chaosDaemon.runtime=containerd \
  --set chaosDaemon.socketPath=/run/containerd/containerd.sock
```

Verify the installation:

```bash
kubectl get pods -n chaos-mesh
# Should show chaos-controller-manager, chaos-daemon, and chaos-dashboard pods
```

## Defining a Network Chaos Experiment

Let us start with a common scenario: adding network latency to a specific service to simulate a degraded dependency.

```yaml
# network-delay-experiment.yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: payment-service-latency
  namespace: default
spec:
  action: delay
  mode: all
  selector:
    namespaces:
      - default
    labelSelectors:
      app: payment-service
  delay:
    latency: "500ms"
    jitter: "100ms"
    correlation: "50"
  duration: "5m"
  scheduler:
    cron: "@every 10m"
```

Apply it:

```bash
kubectl apply -f network-delay-experiment.yaml
```

## Instrumenting Services to Capture Chaos Impact

Your services should already be instrumented with OpenTelemetry. The key is adding attributes that help you identify chaos-affected spans later. Add middleware that detects degraded conditions:

```python
# middleware.py - Add to your Flask/FastAPI service
import time
from opentelemetry import trace

tracer = trace.get_tracer("chaos-aware-middleware")

class ChaosAwareMiddleware:
    def __init__(self, app):
        self.app = app
        self.baseline_latencies = {}

    def __call__(self, environ, start_response):
        span = trace.get_current_span()

        # Record the start time for upstream calls
        request_start = time.monotonic()

        # Check if there is an active chaos experiment via annotation
        # Chaos Mesh sets annotations on affected pods
        chaos_experiment = self._get_active_experiment()
        if chaos_experiment:
            span.set_attribute("chaos.experiment.active", True)
            span.set_attribute("chaos.experiment.name", chaos_experiment)

        response = self.app(environ, start_response)

        # Record the duration and flag if it deviates from baseline
        duration = time.monotonic() - request_start
        span.set_attribute("request.duration_ms", duration * 1000)

        return response

    def _get_active_experiment(self):
        """Check Kubernetes annotations for active chaos experiments."""
        try:
            with open('/etc/podinfo/annotations', 'r') as f:
                annotations = f.read()
                if 'chaos-mesh' in annotations:
                    return annotations.split('chaos-mesh.org/experiment=')[1].split('\n')[0]
        except (FileNotFoundError, IndexError):
            pass
        return None
```

## Querying Traces During Chaos Experiments

While the chaos experiment is running, send traffic to your system and collect traces. You want to compare traces from the chaos window with your baseline:

```bash
# Start the chaos experiment
kubectl apply -f network-delay-experiment.yaml
CHAOS_START=$(date +%s)

# Run some traffic (using a simple script or load generator)
for i in $(seq 1 100); do
  curl -s -o /dev/null -w "%{http_code} %{time_total}\n" \
    http://api.example.com/checkout
  sleep 0.5
done

CHAOS_END=$(date +%s)

# Query traces that occurred during the chaos window
curl -G "http://your-trace-backend/api/traces" \
  --data-urlencode "service=order-service" \
  --data-urlencode "start=${CHAOS_START}000000" \
  --data-urlencode "end=${CHAOS_END}000000" \
  --data-urlencode "minDuration=1s" \
  | jq '.traces[] | {traceId: .traceID, duration: .spans[0].duration, services: [.spans[].process.serviceName] | unique}'
```

## Creating an OpenTelemetry Collector Pipeline for Chaos Analysis

Configure your collector to tag spans that occur during known chaos windows:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 5s

  # Use the transform processor to enrich spans
  transform:
    trace_statements:
      - context: span
        statements:
          # Flag spans with high latency that might be chaos-related
          - set(attributes["possible_chaos_impact"], true)
            where duration > 500000000 and resource.attributes["k8s.namespace.name"] == "default"

exporters:
  otlp:
    endpoint: your-backend:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch, transform]
      exporters: [otlp]
```

## Analyzing Failure Propagation

The most valuable insight comes from seeing how a single failure propagates. When the payment service has 500ms of added latency, what happens upstream?

Look at the traces and you will typically find:
- The order service times out waiting for the payment response
- The API gateway retries, creating duplicate spans
- Circuit breakers trip, and subsequent requests fail fast

Each of these stages is visible as spans in the trace. You can write automated checks:

```python
# analyze_chaos_traces.py
import requests

def analyze_chaos_impact(trace_backend_url, start_time, end_time):
    """Fetch traces from the chaos window and analyze failure patterns."""
    response = requests.get(f"{trace_backend_url}/api/traces", params={
        "start": start_time,
        "end": end_time,
        "limit": 500,
    })
    traces = response.json()["traces"]

    error_count = 0
    timeout_count = 0
    retry_count = 0

    for t in traces:
        spans = t["spans"]
        for span in spans:
            status = span.get("status", {}).get("code", 0)
            if status == 2:  # ERROR status
                error_count += 1
            # Check for timeout indicators
            if any(tag["value"] == "deadline_exceeded"
                   for tag in span.get("tags", [])
                   if tag["key"] == "rpc.grpc.status_code"):
                timeout_count += 1

        # Count retries by looking for duplicate operation names
        op_names = [s["operationName"] for s in spans]
        retry_count += len(op_names) - len(set(op_names))

    print(f"Errors: {error_count}, Timeouts: {timeout_count}, Retries: {retry_count}")
    return {"errors": error_count, "timeouts": timeout_count, "retries": retry_count}
```

## Cleanup

Always clean up chaos experiments after your analysis:

```bash
kubectl delete networkchaos payment-service-latency
```

By combining Chaos Mesh with OpenTelemetry traces, you move from "we injected a failure and things broke" to "we injected a failure, and here is the exact chain of events that led to user-visible errors." That level of detail is what makes chaos testing actually useful for improving reliability.
