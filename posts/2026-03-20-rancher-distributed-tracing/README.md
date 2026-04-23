# How to Configure Distributed Tracing in Rancher - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Distributed Tracing, OpenTelemetry, Observability

Description: Configure end-to-end distributed tracing in Rancher to track requests across microservices and identify performance bottlenecks using OpenTelemetry.

## Introduction

Distributed tracing provides visibility into the complete journey of a request across multiple microservices. This guide covers instrumenting applications with OpenTelemetry, configuring trace context propagation, deploying a tracing backend, and creating meaningful dashboards to identify performance bottlenecks in Rancher-managed clusters.

## Prerequisites

- Rancher-managed Kubernetes cluster
- OpenTelemetry Collector deployed
- A tracing backend (Jaeger or Tempo)
- kubectl access

## Step 1: Instrument Applications with OpenTelemetry

### Java Application

```java
// Java app with OpenTelemetry auto-instrumentation
// Add -javaagent:/opentelemetry-javaagent.jar to your Java command
// or use the OTel Operator

// Manual instrumentation example
import io.opentelemetry.api.OpenTelemetry;
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.StatusCode;
import io.opentelemetry.context.Scope;
import io.opentelemetry.exporter.otlp.trace.OtlpGrpcSpanExporter;
import io.opentelemetry.sdk.OpenTelemetrySdk;
import io.opentelemetry.sdk.resources.Resource;
import io.opentelemetry.sdk.trace.SdkTracerProvider;
import io.opentelemetry.sdk.trace.export.BatchSpanProcessor;
import io.opentelemetry.semconv.ServiceAttributes;

// Configure OpenTelemetry
OtlpGrpcSpanExporter exporter = OtlpGrpcSpanExporter.builder()
    .setEndpoint("http://otel-collector.observability.svc.cluster.local:4317")
    .build();

SdkTracerProvider provider = SdkTracerProvider.builder()
    .setResource(
        Resource.getDefault().toBuilder()
            .put(ServiceAttributes.SERVICE_NAME, "order-service")
            .build())
    .addSpanProcessor(BatchSpanProcessor.builder(exporter).build())
    .build();

OpenTelemetry openTelemetry = OpenTelemetrySdk.builder()
    .setTracerProvider(provider)
    .build();

Tracer tracer = openTelemetry.getTracer("order-service-instrumentation");

// Instrument an operation
public OrderResponse processOrder(OrderRequest request) {
    Span span = tracer.spanBuilder("process-order")
        .setAttribute("order.id", request.getOrderId())
        .setAttribute("order.amount", request.getAmount())
        .startSpan();

    try (Scope scope = span.makeCurrent()) {
        // Call inventory service - trace context propagated automatically
        InventoryResponse inventory = inventoryClient.checkInventory(request);

        if (!inventory.isAvailable()) {
            span.setStatus(StatusCode.ERROR, "Inventory not available");
            throw new InsufficientInventoryException();
        }

        span.setAttribute("order.status", "confirmed");
        return confirmOrder(request);
    } catch (Exception e) {
        span.recordException(e);
        span.setStatus(StatusCode.ERROR);
        throw e;
    } finally {
        span.end();
    }
}
```

### Python Application

```python
# Python app with OpenTelemetry

import requests
from flask import Flask, jsonify, request
from sqlalchemy import create_engine
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

app = Flask(__name__)
engine = create_engine("postgresql+psycopg2://user:password@postgres/orders")

# Configure tracer
provider = TracerProvider(
    resource=Resource.create({"service.name": "order-service"})
)
provider.add_span_processor(
    BatchSpanProcessor(
        OTLPSpanExporter(
            endpoint="http://otel-collector.observability.svc.cluster.local:4317",
            insecure=True,
        )
    )
)
trace.set_tracer_provider(provider)

# Auto-instrument Flask, HTTP requests, and SQLAlchemy
FlaskInstrumentor().instrument_app(app)
RequestsInstrumentor().instrument()
SQLAlchemyInstrumentor().instrument(engine=engine)

# Manual span creation
tracer = trace.get_tracer(__name__)

@app.route('/orders', methods=['POST'])
def create_order():
    with tracer.start_as_current_span("create-order") as span:
        order_data = request.json
        span.set_attribute("order.customer_id", order_data.get('customer_id'))

        # This HTTP call will automatically get trace context injected
        payment_response = requests.post(
            "http://payment-service/charge",
            json={"amount": order_data['amount']}
        )

        if payment_response.status_code != 200:
            span.set_status(Status(StatusCode.ERROR))
            return jsonify({"error": "Payment failed"}), 500

        order_id = save_order(order_data)
        span.set_attribute("order.id", order_id)
        return jsonify({"order_id": order_id})
```

### Node.js Application

```javascript
// Node.js app with OpenTelemetry
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { resourceFromAttributes } = require('@opentelemetry/resources');
const {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} = require('@opentelemetry/semantic-conventions');

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'payment-service',
    [ATTR_SERVICE_VERSION]: '1.0.0',
    'deployment.environment.name': 'production',
  }),
  traceExporter: new OTLPTraceExporter({
    url: 'http://otel-collector.observability.svc.cluster.local:4317',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

## Step 2: Configure Context Propagation

```yaml
# ingress-tracing.yaml - Trust and propagate W3C trace context at ingress
# Requires ingress-nginx OpenTelemetry support to be enabled on the controller.
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: api-ingress
  namespace: production
  annotations:
    nginx.ingress.kubernetes.io/enable-opentelemetry: "true"
    nginx.ingress.kubernetes.io/opentelemetry-trust-incoming-span: "true"
spec:
  ingressClassName: nginx
  rules:
    - host: api.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: api-gateway
                port:
                  number: 80
```

## Step 3: Configure Sampling Strategies

```yaml
# sampling-deployment.yaml - OTel Collector with tail-based sampling
apiVersion: opentelemetry.io/v1beta1
kind: OpenTelemetryCollector
metadata:
  name: otel-sampler
  namespace: observability
spec:
  config:
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317

    processors:
      # Tail-based sampling: make sampling decisions after trace completion.
      # All spans for a trace must reach the same collector instance.
      tail_sampling:
        decision_wait: 10s
        num_traces: 100000
        policies:
          # Always sample error traces
          - name: errors-policy
            type: status_code
            status_code:
              status_codes: [ERROR]
          # Always sample slow traces (> 2 seconds)
          - name: slow-traces-policy
            type: latency
            latency:
              threshold_ms: 2000
          # Sample 10% of other traces
          - name: probabilistic-policy
            type: probabilistic
            probabilistic:
              sampling_percentage: 10
          # Always sample payment traces
          - name: payment-service-policy
            type: string_attribute
            string_attribute:
              key: service.name
              values:
                - payment-service
              enabled_regex_matching: false
              invert_match: false

    exporters:
      otlp/tempo:
        endpoint: tempo-distributor.observability.svc.cluster.local:4317
        tls:
          insecure: true

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [tail_sampling]
          exporters: [otlp/tempo]
```

## Step 4: Create Grafana Service Graph Dashboard

```bash
# Open the built-in service graph
# In Grafana: Explore > select the Tempo data source > Service Graph

# Create a custom dashboard panel for trace latency
# Dashboard JSON snippet for P99 latency from Tempo-generated metrics
cat > /tmp/trace-dashboard.json << 'EOF'
{
  "targets": [{
    "datasource": {"type": "prometheus"},
    "expr": "1000 * histogram_quantile(0.99, sum(rate(traces_spanmetrics_duration_seconds_bucket[5m])) by (service, le))",
    "legendFormat": "{{service}} P99 (ms)"
  }]
}
EOF
```

## Step 5: Monitor Tracing Pipeline Health

```yaml
# tracing-alerts.yaml - Alerts for tracing pipeline
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: tracing-alerts
  namespace: cattle-monitoring-system
  labels:
    release: rancher-monitoring
spec:
  groups:
    - name: distributed-tracing
      rules:
        # Alert if the Collector cannot queue or export spans
        - alert: TracingExporterFailures
          expr: |
            sum(rate(otelcol_exporter_enqueue_failed_spans[5m])) +
            sum(rate(otelcol_exporter_send_failed_spans[5m])) > 0
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "OpenTelemetry Collector is failing to queue or send {{ $value }} spans per second"

        # Alert on high trace latency
        - alert: ServiceHighTraceLatency
          expr: |
            1000 * histogram_quantile(0.99,
              sum(rate(traces_spanmetrics_duration_seconds_bucket[5m])) by (service, le)
            ) > 2000
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Service {{ $labels.service }} P99 trace latency is {{ $value }}ms"
```

## Conclusion

Distributed tracing in Rancher provides the missing context needed to debug complex multi-service issues. By instrumenting applications with OpenTelemetry and using tail-based sampling to focus on error and slow traces, you get actionable observability without drowning in trace data. The service graph and trace search capabilities in Grafana Tempo enable rapid root cause analysis for latency and error rate spikes across your microservices.
