# How to Use Dapr with AWS X-Ray for Tracing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AWS, X-Ray, Tracing, Observability, OpenTelemetry

Description: Configure Dapr distributed tracing to export spans to AWS X-Ray using the OpenTelemetry Collector, enabling end-to-end request tracing across microservices.

---

Dapr supports distributed tracing using the OpenTelemetry standard. By routing Dapr trace spans through the OpenTelemetry Collector with the AWS X-Ray exporter, you get end-to-end traces across all Dapr-enabled services in the AWS Console.

## Enable Dapr Tracing

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: daprconfig
  namespace: default
spec:
  tracing:
    samplingRate: "1"
    otel:
      endpointAddress: "otel-collector.monitoring.svc.cluster.local:4317"
      isSecure: false
      protocol: grpc
```

Apply to your deployments:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/app-port: "8080"
        dapr.io/config: "daprconfig"
```

## Deploy the OpenTelemetry Collector with X-Ray Exporter

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: monitoring
data:
  config.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318

    processors:
      batch:
        timeout: 5s
        send_batch_size: 50

    exporters:
      awsxray:
        region: us-east-1
        indexed_attributes:
          - dapr.api
          - dapr.app_id
          - dapr.status_code
          - net.peer.name

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [batch]
          exporters: [awsxray]
```

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: monitoring
spec:
  template:
    spec:
      serviceAccountName: otel-collector
      containers:
      - name: otel-collector
        image: otel/opentelemetry-collector-contrib:latest
        args: ["--config=/conf/config.yaml"]
        volumeMounts:
        - name: config
          mountPath: /conf
      volumes:
      - name: config
        configMap:
          name: otel-collector-config
```

## IAM Policy for X-Ray

```bash
aws iam create-policy \
  --policy-name OTelCollectorXRayPolicy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": [
        "xray:PutTraceSegments",
        "xray:PutTelemetryRecords",
        "xray:GetSamplingRules",
        "xray:GetSamplingTargets"
      ],
      "Resource": "*"
    }]
  }'
```

## Add X-Ray Annotations in Your Application

Dapr propagates W3C trace context headers. Your application can add custom annotations:

```python
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

def process_order(order_id: str):
    with tracer.start_as_current_span("process-order") as span:
        span.set_attribute("order.id", order_id)
        span.set_attribute("order.service", "order-processor")

        # Dapr call - automatically traced
        import requests
        resp = requests.post(
            f"http://localhost:3500/v1.0/invoke/inventory/method/reserve",
            json={"orderId": order_id},
            headers={
                "traceparent": get_trace_parent(span)
            }
        )
        span.set_attribute("inventory.reserved", resp.status_code == 200)
        return resp.json()

def get_trace_parent(span) -> str:
    ctx = span.get_span_context()
    return f"00-{format(ctx.trace_id, '032x')}-{format(ctx.span_id, '016x')}-01"
```

## View Traces in X-Ray Console

```bash
# Retrieve recent traces via CLI
aws xray get-trace-summaries \
  --start-time $(date -d '30 minutes ago' +%s) \
  --end-time $(date +%s) \
  --filter-expression 'annotation[dapr.app_id] = "order-service"' \
  --region us-east-1

# Get detailed trace
aws xray batch-get-traces \
  --trace-ids "1-58406520-a006649127e371903a2de979" \
  --region us-east-1
```

## Summary

Dapr distributed tracing integrates with AWS X-Ray through the OpenTelemetry Collector, which receives Dapr spans over gRPC and exports them to X-Ray. All Dapr service invocations, state operations, and pub/sub calls are automatically traced with propagated context. Adding custom span attributes allows filtering traces in the X-Ray console by order IDs, customer IDs, or any application-specific dimension.
