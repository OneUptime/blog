# How to Apply Kubernetes Resource Semantic Conventions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Kubernetes, Semantic Conventions, Observability, Resource Attributes, Container Orchestration

Description: Learn how to apply OpenTelemetry Kubernetes resource semantic conventions to enrich telemetry data with pod, node, and cluster metadata.

---

## Introduction

When you run applications on Kubernetes, your telemetry data needs context. A raw trace or metric without information about which pod, node, or namespace produced it is nearly useless for debugging. OpenTelemetry's Kubernetes resource semantic conventions provide a standardized way to attach this context so that every signal from your cluster carries the metadata you need.

This guide walks through the practical steps for applying these conventions. You will learn which attributes matter, how to populate them automatically, and how to configure your OpenTelemetry setup so that Kubernetes metadata flows through your entire observability pipeline.

## Why Kubernetes Resource Attributes Matter

Kubernetes environments are dynamic. Pods come and go, nodes scale up and down, and deployments roll out new versions continuously. Without proper resource attribution, correlating a spike in latency to a specific pod or a failing node becomes a guessing game.

```mermaid
graph TD
    A[Telemetry Signal] --> B{Has K8s Resource Attributes?}
    B -->|Yes| C[Filter by namespace]
    C --> D[Identify pod]
    D --> E[Check node health]
    E --> F[Resolve issue quickly]
    B -->|No| G[Search through logs manually]
    G --> H[Guess which pod]
    H --> I[Slow resolution]
```

The semantic conventions standardize attribute names across all services running in your cluster. Whether your application is written in Go, Python, Java, or Node.js, the telemetry it produces will use the same vocabulary for describing Kubernetes resources.

## Core Kubernetes Resource Attributes

The OpenTelemetry specification defines several groups of Kubernetes resource attributes. Each group targets a different layer of the Kubernetes object model.

### Pod Attributes

Pods are the fundamental unit of deployment. The following attributes identify the pod that produced a telemetry signal.

| Attribute | Type | Description |
|-----------|------|-------------|
| `k8s.pod.name` | string | The name of the pod |
| `k8s.pod.uid` | string | The UID of the pod |
| `k8s.pod.label.<key>` | string | Value of a pod label |
| `k8s.pod.annotation.<key>` | string | Value of a pod annotation |

### Node Attributes

Node attributes describe the machine where the pod is scheduled.

| Attribute | Type | Description |
|-----------|------|-------------|
| `k8s.node.name` | string | The name of the node |
| `k8s.node.uid` | string | The UID of the node |

### Namespace, Cluster, and Deployment Attributes

These higher-level attributes provide organizational context.

| Attribute | Type | Description |
|-----------|------|-------------|
| `k8s.namespace.name` | string | Namespace of the resource |
| `k8s.cluster.name` | string | Name of the cluster |
| `k8s.cluster.uid` | string | UID of the cluster |
| `k8s.deployment.name` | string | Name of the deployment |
| `k8s.replicaset.name` | string | Name of the replica set |
| `k8s.daemonset.name` | string | Name of the daemon set |
| `k8s.statefulset.name` | string | Name of the stateful set |
| `k8s.job.name` | string | Name of the job |
| `k8s.cronjob.name` | string | Name of the cron job |

## Setting Up Resource Attributes in Application Code

The most direct way to apply Kubernetes resource attributes is to configure them in your application's OpenTelemetry SDK setup. Kubernetes makes pod and node information available through the Downward API, which you can expose as environment variables.

Here is a Kubernetes deployment manifest that injects the necessary metadata into environment variables using the Downward API:

```yaml
# Deployment manifest exposing Kubernetes metadata as environment variables.
# The fieldRef entries pull values from the pod spec at runtime,
# making them available to the OpenTelemetry SDK inside the container.
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
        version: v2.1.0
    spec:
      containers:
        - name: order-service
          image: myregistry/order-service:v2.1.0
          env:
            # Pod name from the Downward API
            - name: K8S_POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            # Pod UID from the Downward API
            - name: K8S_POD_UID
              valueFrom:
                fieldRef:
                  fieldPath: metadata.uid
            # Namespace from the Downward API
            - name: K8S_NAMESPACE
              valueFrom:
                fieldRef:
                  fieldPath: metadata.namespace
            # Node name from the Downward API
            - name: K8S_NODE_NAME
              valueFrom:
                fieldRef:
                  fieldPath: spec.nodeName
            # Cluster name set as a plain value
            - name: K8S_CLUSTER_NAME
              value: "production-us-east-1"
```

Once those environment variables are available, your application can read them during SDK initialization. The following Python example builds a resource with all the Kubernetes attributes:

```python
# Initialize the OpenTelemetry SDK with Kubernetes resource attributes.
# Each attribute is read from the environment variables that the
# Downward API populates inside the pod.
import os
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.resources import Resource
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace.export import BatchSpanProcessor

# Build the resource by reading environment variables
resource = Resource.create({
    "service.name": "order-service",
    "service.version": "2.1.0",
    "k8s.pod.name": os.environ.get("K8S_POD_NAME", "unknown"),
    "k8s.pod.uid": os.environ.get("K8S_POD_UID", "unknown"),
    "k8s.namespace.name": os.environ.get("K8S_NAMESPACE", "default"),
    "k8s.node.name": os.environ.get("K8S_NODE_NAME", "unknown"),
    "k8s.cluster.name": os.environ.get("K8S_CLUSTER_NAME", "unknown"),
    "k8s.deployment.name": "order-service",
})

# Create the tracer provider with the enriched resource
provider = TracerProvider(resource=resource)
provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint="http://otel-collector:4317"))
)
trace.set_tracer_provider(provider)
```

Every span, metric, and log produced by this application will now carry Kubernetes context automatically. You do not need to set these attributes on individual spans.

## Using the OpenTelemetry Operator for Automatic Injection

Manually setting environment variables works, but the OpenTelemetry Operator for Kubernetes can automate this entirely. The operator watches for pods with a specific annotation and injects the OpenTelemetry SDK along with resource attributes.

The following OpenTelemetryCollector and Instrumentation custom resources configure automatic injection. The Instrumentation resource tells the operator which attributes to attach and which SDK to inject:

```yaml
# The Instrumentation resource configures automatic SDK injection.
# The operator adds environment variables and init containers
# to any pod that carries the matching annotation.
apiVersion: opentelemetry.io/v1alpha1
kind: Instrumentation
metadata:
  name: otel-instrumentation
  namespace: production
spec:
  exporter:
    endpoint: http://otel-collector.observability:4317
  propagators:
    - tracecontext
    - baggage
  resource:
    addK8sUIDAttributes: true
  python:
    image: ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-python:latest
  java:
    image: ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-java:latest
  nodejs:
    image: ghcr.io/open-telemetry/opentelemetry-operator/autoinstrumentation-nodejs:latest
```

After applying this resource, annotate your pods to opt into injection:

```yaml
# Adding this annotation to a pod template triggers
# the operator to inject the Python auto-instrumentation SDK.
metadata:
  annotations:
    instrumentation.opentelemetry.io/inject-python: "true"
```

The operator will handle resource detection, including pod name, namespace, node, and UID attributes, without any changes to your application code.

## Enriching Telemetry with the k8sattributes Processor

Even when your application sets some Kubernetes attributes, the OpenTelemetry Collector can add more. The `k8sattributes` processor queries the Kubernetes API to resolve pod IP addresses into full metadata.

This Collector configuration demonstrates how to set up the processor. It watches for pod metadata and attaches deployment, replica set, and label information to every telemetry signal that passes through:

```yaml
# Collector configuration that uses the k8sattributes processor
# to enrich telemetry with Kubernetes metadata from the API server.
# The processor matches incoming telemetry by pod IP and adds
# attributes from the pod's metadata.
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  k8sattributes:
    auth_type: "serviceAccount"
    passthrough: false
    extract:
      metadata:
        - k8s.pod.name
        - k8s.pod.uid
        - k8s.namespace.name
        - k8s.node.name
        - k8s.deployment.name
        - k8s.replicaset.name
      labels:
        - tag_name: app.label.team
          key: team
          from: pod
        - tag_name: app.label.version
          key: version
          from: pod
    pod_association:
      - sources:
          - from: resource_attribute
            name: k8s.pod.ip

exporters:
  otlp:
    endpoint: "https://ingest.oneuptime.com:4317"
    headers:
      Authorization: "Bearer YOUR_ONEUPTIME_TOKEN"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [k8sattributes]
      exporters: [otlp]
    metrics:
      receivers: [otlp]
      processors: [k8sattributes]
      exporters: [otlp]
```

The `pod_association` block is important. It tells the processor how to match incoming telemetry to a specific pod. The most common approach is matching on `k8s.pod.ip`, which the SDK typically sets automatically.

## Querying with Kubernetes Attributes

Once your telemetry carries Kubernetes resource attributes, you can write precise queries in your observability platform. Here are some practical examples of how these attributes help during incident response:

```mermaid
flowchart LR
    A[Alert: High Latency] --> B[Filter: k8s.namespace.name = production]
    B --> C[Group by: k8s.deployment.name]
    C --> D[Identify: order-service]
    D --> E[Filter: k8s.node.name]
    E --> F[Found: node-3 has disk pressure]
```

You might filter traces by `k8s.namespace.name` to isolate production issues, group metrics by `k8s.deployment.name` to find which service is misbehaving, or correlate logs by `k8s.pod.uid` to track a specific pod instance across restarts.

## Best Practices

There are a few things worth keeping in mind as you roll out Kubernetes resource attributes across your organization.

First, always set `k8s.cluster.name` explicitly. Kubernetes does not expose a cluster name through the Downward API, so you need to inject it as a plain environment variable or configure it in the Collector. Without this attribute, you cannot distinguish between clusters in a multi-cluster setup.

Second, use the `k8sattributes` processor in the Collector rather than relying solely on application-level configuration. The processor can add attributes that applications cannot easily discover on their own, like the deployment name or replica set name.

Third, be selective with pod labels and annotations. The `k8s.pod.label.<key>` attributes are useful, but attaching every label to telemetry creates high-cardinality data that can increase storage costs. Pick the labels that matter for your queries, such as team ownership, version, and environment.

Fourth, set up proper RBAC for the Collector's service account. The `k8sattributes` processor needs permissions to list and watch pods. Without the right ClusterRole, the processor will fail silently.

## Conclusion

Kubernetes resource semantic conventions bridge the gap between your application telemetry and the infrastructure it runs on. By applying these conventions through environment variables, the OpenTelemetry Operator, or the k8sattributes processor, you ensure that every trace, metric, and log carries the context needed for fast debugging. The investment in proper resource attribution pays off the first time you need to track a latency spike to a specific pod on a specific node in a specific cluster.
