# How to Set Up Jaeger for Distributed Tracing on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Jaeger, Distributed Tracing, Kubernetes, Observability, Microservices

Description: Deploy Jaeger on Talos Linux for distributed tracing across your Kubernetes microservices with this step-by-step guide.

---

When your applications grow from a single service to dozens of microservices running on Kubernetes, debugging performance problems becomes exponentially harder. A slow API response might involve calls to five different services, two databases, and a message queue. Without distributed tracing, finding the bottleneck is like searching for a needle in a haystack. Jaeger solves this by collecting and visualizing trace data across your entire service mesh. In this guide, we will deploy Jaeger on a Talos Linux Kubernetes cluster and instrument applications to send traces.

## What is Distributed Tracing

Distributed tracing follows a request as it moves through multiple services. Each service creates a "span" with timing information, and these spans are linked together into a "trace" that shows the complete journey of a request. You can see exactly where time was spent and which service caused a slowdown.

Jaeger is one of the most popular open-source tracing systems. Originally built by Uber, it is now a graduated CNCF project. It supports multiple storage backends, has a clean web UI, and integrates with the OpenTelemetry ecosystem.

## Architecture

A production Jaeger deployment on Talos Linux consists of:

- **Jaeger Collector**: Receives spans from applications and writes them to storage
- **Jaeger Query**: Serves the UI and handles trace queries
- **Jaeger Agent** (optional): A local daemon that batches and forwards spans to the collector
- **Storage backend**: Elasticsearch or Cassandra for production, in-memory for development

## Prerequisites

- A running Talos Linux Kubernetes cluster
- kubectl and Helm 3 configured
- A storage backend (we will use Elasticsearch in this guide)

## Step 1: Deploy Elasticsearch for Trace Storage

For production use, Jaeger needs a persistent storage backend. Elasticsearch is the most common choice:

```bash
# Add the Elastic Helm repository
helm repo add elastic https://helm.elastic.co
helm repo update
```

```yaml
# elasticsearch-values.yaml
replicas: 3
minimumMasterNodes: 2

# Resource allocation for Talos Linux nodes
resources:
  requests:
    cpu: 500m
    memory: 2Gi
  limits:
    cpu: 2000m
    memory: 4Gi

# Persistent storage
volumeClaimTemplate:
  accessModes: ["ReadWriteOnce"]
  resources:
    requests:
      storage: 50Gi

# Elasticsearch configuration
esConfig:
  elasticsearch.yml: |
    cluster.name: "jaeger-es"
    network.host: 0.0.0.0
    # Optimize for time-series data
    indices.query.bool.max_clause_count: 4096

# Security - disable for internal use, enable for production
protocol: http
```

```bash
# Create namespace and deploy Elasticsearch
kubectl create namespace tracing

helm install elasticsearch elastic/elasticsearch \
  --namespace tracing \
  --values elasticsearch-values.yaml
```

Wait for Elasticsearch to be ready:

```bash
# Watch until all pods are running
kubectl get pods -n tracing -l app=elasticsearch-master -w
```

## Step 2: Deploy Jaeger Using the Jaeger Operator

The Jaeger Operator simplifies deployment and management. First, install the operator:

```bash
# Install cert-manager if not already present (required by the operator)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/latest/download/cert-manager.yaml

# Wait for cert-manager to be ready
kubectl wait --for=condition=Available --timeout=300s deployment/cert-manager -n cert-manager
kubectl wait --for=condition=Available --timeout=300s deployment/cert-manager-webhook -n cert-manager

# Install the Jaeger Operator
kubectl create namespace observability
kubectl apply -f https://github.com/jaegertracing/jaeger-operator/releases/latest/download/jaeger-operator.yaml -n observability
```

Now create a Jaeger instance:

```yaml
# jaeger-production.yaml
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: jaeger-production
  namespace: tracing
spec:
  strategy: production
  collector:
    replicas: 2
    maxReplicas: 5
    resources:
      requests:
        cpu: 250m
        memory: 256Mi
      limits:
        cpu: 1000m
        memory: 1Gi
    options:
      # Collector configuration
      collector:
        num-workers: 100
        queue-size: 10000
  query:
    replicas: 2
    resources:
      requests:
        cpu: 250m
        memory: 256Mi
      limits:
        cpu: 500m
        memory: 512Mi
    options:
      query:
        # Base path for the UI
        base-path: /jaeger
  storage:
    type: elasticsearch
    options:
      es:
        server-urls: http://elasticsearch-master.tracing.svc.cluster.local:9200
        index-prefix: jaeger
        # Create daily indices
        create-index-templates: true
    # Automatic index cleanup
    esIndexCleaner:
      enabled: true
      numberOfDays: 14
      schedule: "55 23 * * *"
```

Apply the Jaeger instance:

```bash
kubectl apply -f jaeger-production.yaml
```

Verify the deployment:

```bash
# Check all Jaeger components
kubectl get pods -n tracing -l app.kubernetes.io/part-of=jaeger

# Check the Jaeger service
kubectl get svc -n tracing -l app.kubernetes.io/part-of=jaeger
```

## Step 3: Access the Jaeger UI

Port-forward the query service to access the web UI:

```bash
kubectl port-forward -n tracing svc/jaeger-production-query 16686:16686
```

Open http://localhost:16686 in your browser. You should see the Jaeger UI with a search interface for traces.

## Step 4: Instrument Your Applications

Applications need to send trace data to Jaeger. The recommended approach is using OpenTelemetry SDKs, which support Jaeger as an export target.

Here is an example for a Python application:

```python
# tracing_setup.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.sdk.resources import Resource

def setup_tracing(service_name):
    """Initialize OpenTelemetry tracing with Jaeger exporter."""
    resource = Resource.create({
        "service.name": service_name,
        "deployment.environment": "production",
    })

    # Configure the Jaeger exporter
    jaeger_exporter = JaegerExporter(
        # Point to the Jaeger collector service
        agent_host_name="jaeger-production-agent.tracing.svc.cluster.local",
        agent_port=6831,
    )

    # Set up the tracer provider
    provider = TracerProvider(resource=resource)
    processor = BatchSpanProcessor(jaeger_exporter)
    provider.add_span_processor(processor)
    trace.set_tracer_provider(provider)

    return trace.get_tracer(service_name)
```

For a Go application:

```go
// tracing.go
package tracing

import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/jaeger"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.4.0"
)

func InitTracer(serviceName string) (*sdktrace.TracerProvider, error) {
    // Create the Jaeger exporter
    exporter, err := jaeger.New(
        jaeger.WithAgentEndpoint(
            jaeger.WithAgentHost("jaeger-production-agent.tracing.svc.cluster.local"),
            jaeger.WithAgentPort("6831"),
        ),
    )
    if err != nil {
        return nil, err
    }

    // Create the tracer provider
    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceNameKey.String(serviceName),
        )),
        // Sample 10% of traces in production
        sdktrace.WithSampler(sdktrace.TraceIDRatioBased(0.1)),
    )

    otel.SetTracerProvider(tp)
    return tp, nil
}
```

For a Node.js application:

```javascript
// tracing.js
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

function initTracing(serviceName) {
  const provider = new NodeTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    }),
  });

  // Configure the Jaeger exporter
  const exporter = new JaegerExporter({
    endpoint: 'http://jaeger-production-collector.tracing.svc.cluster.local:14268/api/traces',
  });

  provider.addSpanProcessor(new BatchSpanProcessor(exporter));
  provider.register();

  return provider;
}

module.exports = { initTracing };
```

## Step 5: Configure Sampling

In production, you do not want to trace every single request. Sampling lets you collect a representative subset of traces:

```yaml
# Update the Jaeger instance with sampling configuration
spec:
  sampling:
    options:
      default_strategy:
        type: probabilistic
        param: 0.1  # Sample 10% of traces
      per_operation_strategies:
        - type: probabilistic
          param: 1.0  # Sample 100% of health check calls
          operation: "health-check"
```

## Step 6: Set Up Alerts on Trace Data

You can use Prometheus metrics exported by Jaeger to set up alerts:

```yaml
# jaeger-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: jaeger-alerts
  namespace: tracing
spec:
  groups:
    - name: jaeger-health
      rules:
        - alert: JaegerCollectorDroppedSpans
          expr: rate(jaeger_collector_spans_dropped_total[5m]) > 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Jaeger collector is dropping spans"
            description: "The Jaeger collector is dropping {{ $value }} spans per second. Check collector resources and queue configuration."
```

## Conclusion

Jaeger gives you visibility into the interactions between microservices on your Talos Linux cluster. With Elasticsearch as a persistent backend, the Jaeger Operator for easy management, and OpenTelemetry SDKs for instrumentation, you have a complete distributed tracing pipeline. Start with a low sampling rate in production and increase it when investigating specific issues. The ability to see the full journey of a request across your service mesh is invaluable for debugging latency problems and understanding system behavior.
