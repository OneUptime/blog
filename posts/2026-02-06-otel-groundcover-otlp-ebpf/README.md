# How to Send OpenTelemetry Data to Groundcover via OTLP for Kubernetes-Native eBPF-Enhanced Observability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Groundcover, Kubernetes, eBPF

Description: Configure OpenTelemetry to send traces, metrics, and logs to Groundcover for eBPF-enhanced observability in Kubernetes clusters.

Groundcover is a Kubernetes-native observability platform that uses eBPF to automatically capture network-level telemetry without code instrumentation. When you combine this with OpenTelemetry's application-level instrumentation, you get visibility at both the network and application layers. Groundcover accepts data via standard OTLP endpoints, making the integration straightforward.

## How Groundcover and OpenTelemetry Complement Each Other

Groundcover's eBPF sensors capture every network request between pods, giving you infrastructure-level metrics like connection counts, retransmissions, and DNS latency. OpenTelemetry adds the application context: business logic spans, custom attributes, and application-specific metrics. Together, they provide full-stack observability.

## Deploying the Collector in Kubernetes

The recommended setup deploys the OpenTelemetry Collector as a DaemonSet alongside Groundcover's agents. Here is the Kubernetes manifest:

```yaml
# otel-collector-daemonset.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: otel-collector
  namespace: groundcover
spec:
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
    spec:
      containers:
        - name: collector
          image: otel/opentelemetry-collector-contrib:latest
          ports:
            - containerPort: 4317
              hostPort: 4317
              protocol: TCP
            - containerPort: 4318
              hostPort: 4318
              protocol: TCP
          env:
            - name: GROUNDCOVER_API_KEY
              valueFrom:
                secretKeyRef:
                  name: groundcover-credentials
                  key: api-key
            - name: NODE_NAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
          volumeMounts:
            - name: config
              mountPath: /etc/otelcol
      volumes:
        - name: config
          configMap:
            name: otel-collector-config
---
apiVersion: v1
kind: Service
metadata:
  name: otel-collector
  namespace: groundcover
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

## Collector Configuration

```yaml
# collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

  # Collect Kubernetes events as logs
  k8s_events:
    namespaces: []  # Empty means all namespaces

processors:
  batch:
    send_batch_size: 512
    timeout: 5s

  # Enrich telemetry with Kubernetes metadata
  k8s_attributes:
    auth_type: serviceAccount
    extract:
      metadata:
        - k8s.pod.name
        - k8s.pod.uid
        - k8s.namespace.name
        - k8s.node.name
        - k8s.deployment.name
        - k8s.container.name
    pod_association:
      - sources:
          - from: resource_attribute
            name: k8s.pod.ip

  # Add memory limits to prevent OOM in the Collector pod
  memory_limiter:
    check_interval: 5s
    limit_mib: 512
    spike_limit_mib: 128

exporters:
  otlp/groundcover:
    endpoint: ingest.groundcover.com:443
    headers:
      x-groundcover-api-key: "${GROUNDCOVER_API_KEY}"
    tls:
      insecure: false
    compression: gzip

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, k8s_attributes, batch]
      exporters: [otlp/groundcover]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, k8s_attributes, batch]
      exporters: [otlp/groundcover]
    logs:
      receivers: [otlp, k8s_events]
      processors: [memory_limiter, k8s_attributes, batch]
      exporters: [otlp/groundcover]
```

## Instrumenting Your Application

With the Collector running as a DaemonSet, your application pods send telemetry to the Collector on the same node. Configure your OpenTelemetry SDK to point at the node-local Collector:

```python
# app.py
import os
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource

# Use the node's host IP to reach the DaemonSet Collector
collector_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://otel-collector.groundcover:4317")

resource = Resource.create({
    "service.name": os.getenv("OTEL_SERVICE_NAME", "my-service"),
    "k8s.pod.name": os.getenv("HOSTNAME", "unknown"),
    "k8s.namespace.name": os.getenv("POD_NAMESPACE", "default"),
})

# Configure the exporter to send to the local Collector
exporter = OTLPSpanExporter(endpoint=collector_endpoint, insecure=True)

provider = TracerProvider(resource=resource)
provider.add_span_processor(BatchSpanProcessor(exporter))
trace.set_tracer_provider(provider)

tracer = trace.get_tracer("my-service")
```

## eBPF and OTel Data Correlation

Groundcover correlates eBPF-captured network data with OpenTelemetry spans using shared identifiers like pod name, namespace, and node. When a span shows high latency, you can check the eBPF data to see if the cause was network-level (retransmissions, DNS delays) or application-level (slow database queries, CPU contention).

The `k8s_attributes` processor in the Collector adds the Kubernetes metadata that makes this correlation possible. Without it, Groundcover cannot map OTel spans to the correct pod-level eBPF data.

## RBAC for the Collector

The `k8s_attributes` processor needs permissions to query the Kubernetes API:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: otel-collector
rules:
  - apiGroups: [""]
    resources: ["pods", "namespaces", "nodes"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets"]
    verbs: ["get", "list", "watch"]
```

Bind this role to the Collector's service account, and the metadata enrichment will work across all namespaces.

## Validating the Setup

Once deployed, verify that both eBPF and OTel data appear in the Groundcover dashboard. You should see spans correlated with network-level metrics for the same pods. If spans appear but lack Kubernetes labels, check the `k8s_attributes` processor configuration and the RBAC permissions.
