# How to Send Dapr Traces to AWS X-Ray

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AWS X-Ray, Distributed Tracing, OpenTelemetry, Observability, AWS

Description: Learn how to send Dapr distributed traces to AWS X-Ray using the OpenTelemetry Collector as a bridge, enabling end-to-end request tracing in AWS-hosted microservices.

---

Dapr supports multiple tracing backends through its OpenTelemetry integration. For teams running Dapr on AWS EKS or ECS, AWS X-Ray is a natural choice: it integrates with other AWS services (Lambda, API Gateway, RDS), provides service maps in the AWS Console, and works with IAM for access control. This guide covers configuring Dapr to export traces via OTLP to an OpenTelemetry Collector that forwards them to X-Ray.

## Architecture

Dapr does not have a native X-Ray exporter, but the OpenTelemetry Collector does via its `awsxray` exporter. The flow is:

```text
Dapr Sidecar
    | OTLP (gRPC port 4317)
    v
OpenTelemetry Collector
    | X-Ray API (HTTPS)
    v
AWS X-Ray Service
    |
AWS Console (Service Map, Traces)
```

## Configuring Dapr to Export OTLP Traces

```yaml
# components/config.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
  namespace: default
spec:
  tracing:
    samplingRate: "0.1"    # 10% sampling in production to control X-Ray costs
    otel:
      endpointAddress: "otel-collector:4317"
      isSecure: false
      protocol: grpc
  metrics:
    enabled: true
```

Apply to your apps via annotation:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "order-service"
  dapr.io/config: "appconfig"
```

## Deploying the OpenTelemetry Collector with X-Ray Exporter

Create an IAM policy for the collector to write to X-Ray:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "xray:PutTraceSegments",
        "xray:PutTelemetryRecords",
        "xray:GetSamplingRules",
        "xray:GetSamplingTargets"
      ],
      "Resource": "*"
    }
  ]
}
```

Attach the policy to the EKS node IAM role or use IRSA (IAM Roles for Service Accounts):

```bash
# Create IRSA for the collector
eksctl create iamserviceaccount \
  --name otel-collector \
  --namespace monitoring \
  --cluster my-eks-cluster \
  --attach-policy-arn arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess \
  --approve
```

Create the OpenTelemetry Collector configuration:

```yaml
# otel-collector-config.yaml
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
            endpoint: "0.0.0.0:4317"
          http:
            endpoint: "0.0.0.0:4318"

    processors:
      batch:
        timeout: 1s
        send_batch_size: 512
      
      # Required for X-Ray: add aws.region attribute
      resource:
        attributes:
        - key: aws.region
          value: "us-east-1"
          action: upsert
        - key: deployment.environment
          value: "production"
          action: upsert

    exporters:
      awsxray:
        region: "us-east-1"
        no_verify_ssl: false
        local_mode: false
        endpoint: ""                    # Use default X-Ray endpoint
        
      # Optional: also export to CloudWatch for metrics correlation
      awscloudwatchlogs:
        log_group_name: "/aws/dapr/traces"
        log_stream_name: "otel-traces"
        region: "us-east-1"

      debug:
        verbosity: basic

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [resource, batch]
          exporters: [awsxray]
```

Deploy the collector:

```yaml
# otel-collector-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: monitoring
spec:
  replicas: 2
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
    spec:
      serviceAccountName: otel-collector   # IRSA service account
      containers:
      - name: otel-collector
        image: otel/opentelemetry-collector-contrib:0.92.0
        args: ["--config=/etc/otel/config.yaml"]
        ports:
        - name: otlp-grpc
          containerPort: 4317
        - name: otlp-http
          containerPort: 4318
        volumeMounts:
        - name: config
          mountPath: /etc/otel
        resources:
          requests:
            cpu: "100m"
            memory: "256Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
      volumes:
      - name: config
        configMap:
          name: otel-collector-config
---
apiVersion: v1
kind: Service
metadata:
  name: otel-collector
  namespace: monitoring
spec:
  selector:
    app: otel-collector
  ports:
  - name: otlp-grpc
    port: 4317
    targetPort: 4317
  - name: otlp-http
    port: 4318
    targetPort: 4318
```

## Adding X-Ray Segment Annotations from Application Code

X-Ray allows adding custom annotations and metadata to segments. Use the OpenTelemetry SDK to add attributes that X-Ray renders as annotations:

```python
# order_service.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.trace.propagation.tracecontext import TraceContextTextMapPropagator
from flask import Flask, request, jsonify
import os

# OTEL setup - send directly to collector
otel_endpoint = os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT", "http://otel-collector:4317")
provider = TracerProvider(
    resource=Resource.create({
        "service.name": "order-service",
        "service.version": "1.0.0",
        "cloud.provider": "aws",
        "cloud.region": os.environ.get("AWS_REGION", "us-east-1"),
    })
)
provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint=otel_endpoint))
)
trace.set_tracer_provider(provider)
tracer = trace.get_tracer("order-service")

app = Flask(__name__)

@app.route("/orders", methods=["POST"])
def create_order():
    carrier = {
        "traceparent": request.headers.get("traceparent", ""),
        "tracestate": request.headers.get("tracestate", ""),
    }
    ctx = TraceContextTextMapPropagator().extract(carrier=carrier)
    
    with tracer.start_as_current_span("create-order", context=ctx) as span:
        order = request.json
        
        # These attributes become X-Ray annotations (searchable)
        span.set_attribute("order.id", order.get("orderId", ""))
        span.set_attribute("order.customer_id", order.get("customerId", ""))
        span.set_attribute("order.amount", float(order.get("amount", 0)))
        span.set_attribute("order.region", "us-east-1")
        
        # X-Ray annotation: user.id is indexed for filtering
        span.set_attribute("user.id", order.get("customerId", ""))
        
        return jsonify({"status": "created", "orderId": order.get("orderId")}), 201
```

## Verifying Traces in AWS X-Ray

```bash
# Check that the collector is receiving spans
kubectl logs -n monitoring deployment/otel-collector | grep -i "xray\|trace\|export"

# Query X-Ray via AWS CLI
aws xray get-trace-summaries \
  --start-time $(date -d '10 minutes ago' +%s) \
  --end-time $(date +%s) \
  --region us-east-1 \
  --query 'TraceSummaries[*].{Id:Id,Duration:Duration,Service:EntryPoint.Name}'

# Get a specific trace
aws xray batch-get-traces \
  --trace-ids "TRACE_ID" \
  --region us-east-1 | jq '.Traces[0].Segments[*].Document' | python3 -m json.tool

# Open X-Ray Service Map in AWS Console
echo "https://console.aws.amazon.com/xray/home?region=us-east-1#/service-map"
```

## X-Ray Sampling Rules to Control Costs

```bash
# Create a sampling rule to reduce trace volume for high-traffic endpoints
aws xray create-sampling-rule \
  --sampling-rule '{
    "RuleName": "dapr-order-service",
    "Priority": 1000,
    "FixedRate": 0.05,
    "ReservoirSize": 5,
    "ServiceName": "order-service",
    "ServiceType": "*",
    "Host": "*",
    "HTTPMethod": "POST",
    "URLPath": "/orders",
    "ResourceARN": "*",
    "Version": 1
  }' \
  --region us-east-1
```

## Summary

Sending Dapr traces to AWS X-Ray requires the OpenTelemetry Collector as a bridge: configure Dapr to export OTLP to the collector, then configure the collector's `awsxray` exporter to forward to X-Ray. Use IRSA to securely grant the collector permission to write to X-Ray without static credentials. Add OpenTelemetry span attributes in your application code to create searchable X-Ray annotations, and create sampling rules to balance observability coverage with X-Ray ingestion costs.
