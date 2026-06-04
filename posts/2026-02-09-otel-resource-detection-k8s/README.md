# How to configure OpenTelemetry resource detection for Kubernetes attributes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Kubernetes, Resource Detection, Observability, Metadata

Description: Learn how to configure OpenTelemetry resource detection processors to automatically enrich telemetry data with Kubernetes pod, node, and cluster attributes for better observability context.

---

Resource detection in OpenTelemetry automatically enriches telemetry data with metadata about the environment where your application runs. For Kubernetes deployments, this includes pod names, namespaces, node information, and cluster identifiers that provide essential context for troubleshooting and analysis.

## Understanding Resource Detection

Resources in OpenTelemetry represent the source of telemetry data. A resource contains attributes that describe the entity producing telemetry, such as service name, host information, and Kubernetes metadata.

Resource detection automatically discovers and adds these attributes without requiring manual configuration. The OpenTelemetry Collector includes processors that detect Kubernetes resources, and SDKs include resource detectors for runtime environment information.

## Collector Resource Detection Configuration

Configure the resource detection processor in the OpenTelemetry Collector to automatically add Kubernetes attributes to telemetry data passing through the collector.

```yaml
# collector-config.yaml

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  # Resource detection processor for Kubernetes
  resource_detection/k8s:
    detectors:
      - env          # Detect from environment variables
      - system       # Detect system information
      - docker       # Detect Docker container info
      - k8s_api      # Detect Kubernetes node and cluster information
    timeout: 5s
    override: false

  # Kubernetes attributes processor
  k8sattributes:
    auth_type: serviceAccount
    passthrough: false
    extract:
      metadata:
        - k8s.namespace.name
        - k8s.deployment.name
        - k8s.statefulset.name
        - k8s.daemonset.name
        - k8s.cronjob.name
        - k8s.job.name
        - k8s.node.name
        - k8s.pod.name
        - k8s.pod.uid
        - k8s.pod.start_time
      annotations:
        - tag_name: app.version
          key: app.version
          from: pod
      labels:
        - tag_name: app.label.team
          key: team
          from: pod
    pod_association:
      - sources:
        - from: resource_attribute
          name: k8s.pod.ip
      - sources:
        - from: resource_attribute
          name: k8s.pod.uid
      - sources:
        - from: connection

  batch:
    timeout: 10s
    send_batch_size: 1024

exporters:
  otlp:
    endpoint: tempo:4317
    tls:
      insecure: true
  debug:
    verbosity: detailed

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource_detection/k8s, k8sattributes, batch]
      exporters: [otlp, debug]
    metrics:
      receivers: [otlp]
      processors: [resource_detection/k8s, k8sattributes, batch]
      exporters: [otlp, debug]
```

This configuration adds comprehensive Kubernetes metadata to all telemetry data.

## Deploying the Collector with RBAC

Deploy the collector with appropriate RBAC permissions to access Kubernetes API for resource detection.

```yaml
# collector-rbac.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: otel-collector
  namespace: observability

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: otel-collector
rules:
  - apiGroups: [""]
    resources:
      - pods
      - namespaces
      - nodes
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources:
      - replicasets
      - deployments
      - daemonsets
      - statefulsets
    verbs: ["get", "list", "watch"]
  - apiGroups: ["batch"]
    resources:
      - jobs
      - cronjobs
    verbs: ["get", "list", "watch"]

---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: otel-collector
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: otel-collector
subjects:
  - kind: ServiceAccount
    name: otel-collector
    namespace: observability
```

Apply the RBAC configuration before deploying the collector.

```bash
# Create observability namespace
kubectl create namespace observability

# Apply RBAC permissions
kubectl apply -f collector-rbac.yaml
```

## Collector Deployment with Resource Detection

Deploy the collector as a DaemonSet or Deployment with the resource detection configuration.

```yaml
# collector-deployment.yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: otel-collector
  namespace: observability
spec:
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
    spec:
      serviceAccountName: otel-collector
      containers:
      - name: collector
        image: otel/opentelemetry-collector-contrib:latest
        command:
          - /otelcol-contrib
          - --config=/conf/collector-config.yaml
        env:
          # Environment variable for k8s_api resource detection
          - name: K8S_NODE_NAME
            valueFrom:
              fieldRef:
                fieldPath: spec.nodeName
        volumeMounts:
        - name: config
          mountPath: /conf
        ports:
        - containerPort: 4317
          name: otlp-grpc
        - containerPort: 4318
          name: otlp-http
      volumes:
      - name: config
        configMap:
          name: otel-collector-config
```

The `K8S_NODE_NAME` environment variable provides the node name required by the `k8s_api` detector.

```bash
# Create ConfigMap with collector configuration
kubectl create configmap otel-collector-config \
  --from-file=collector-config.yaml \
  -n observability

# Deploy collector
kubectl apply -f collector-deployment.yaml
```

## SDK Resource Detection

Configure resource detection in application SDKs to add Kubernetes attributes at the source.

```python
# kubernetes_resource_detection.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import get_aggregated_resources
from opentelemetry_resourcedetector_kubernetes import KubernetesDownwardAPIEnvironmentResourceDetector
import os

def configure_tracing():
    """Configure tracing with Kubernetes resource detection"""

    # Create base resource with service information
    base_resource = Resource.create({
        "service.name": os.getenv("OTEL_SERVICE_NAME", "python-app"),
        "service.version": os.getenv("SERVICE_VERSION", "1.0.0"),
        "deployment.environment.name": os.getenv("DEPLOYMENT_ENV", "production"),
    })

    # Detect Kubernetes resources from Downward API environment variables
    detected_resource = get_aggregated_resources([
        KubernetesDownwardAPIEnvironmentResourceDetector(prefix="OTEL_RD")
    ])

    # Merge resources
    resource = base_resource.merge(detected_resource)

    # Create tracer provider with merged resource
    provider = TracerProvider(resource=resource)

    # Configure OTLP exporter
    otlp_exporter = OTLPSpanExporter(
        endpoint=os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317"),
        insecure=True,
    )

    # Add span processor
    provider.add_span_processor(BatchSpanProcessor(otlp_exporter))

    # Set as global tracer provider
    trace.set_tracer_provider(provider)

    return trace.get_tracer(__name__)

# Initialize tracing
tracer = configure_tracing()

# Use tracer in application
@app.route('/api/data')
def get_data():
    with tracer.start_as_current_span("get_data") as span:
        # Span automatically includes Kubernetes resource attributes
        span.set_attribute("custom.attribute", "value")
        return {"data": "example"}
```

The SDK resource configuration adds detected Kubernetes attributes to all spans.

## Java SDK Resource Detection

Configure Kubernetes resource detection in Java applications using the OpenTelemetry Java SDK.

```java
// KubernetesResourceConfiguration.java
package com.example.tracing;

import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.sdk.OpenTelemetrySdk;
import io.opentelemetry.sdk.resources.Resource;
import io.opentelemetry.sdk.resources.ResourceBuilder;
import io.opentelemetry.sdk.trace.SdkTracerProvider;
import io.opentelemetry.sdk.trace.export.BatchSpanProcessor;
import io.opentelemetry.exporter.otlp.trace.OtlpGrpcSpanExporter;

public class KubernetesResourceConfiguration {

    public static Tracer configureTracing() {
        ResourceBuilder resourceBuilder = Resource.builder()
            .put("service.name",
                 System.getenv().getOrDefault("OTEL_SERVICE_NAME", "java-app"))
            .put("service.version", "1.0.0")
            .put("deployment.environment.name",
                 System.getenv().getOrDefault("DEPLOYMENT_ENV", "production"));

        // Kubernetes attributes are added from Downward API environment variables.
        putIfPresent(resourceBuilder, "k8s.namespace.name", "OTEL_RD_K8S_NAMESPACE_NAME");
        putIfPresent(resourceBuilder, "k8s.pod.name", "OTEL_RD_K8S_POD_NAME");
        putIfPresent(resourceBuilder, "k8s.pod.uid", "OTEL_RD_K8S_POD_UID");
        putIfPresent(resourceBuilder, "k8s.node.name", "OTEL_RD_K8S_NODE_NAME");
        putIfPresent(resourceBuilder, "k8s.pod.ip", "OTEL_RD_K8S_POD_IP");

        Resource baseResource = Resource.getDefault().merge(resourceBuilder.build());

        // Configure OTLP exporter
        OtlpGrpcSpanExporter spanExporter = OtlpGrpcSpanExporter.builder()
            .setEndpoint(System.getenv().getOrDefault(
                "OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4317"))
            .build();

        // Create tracer provider
        SdkTracerProvider tracerProvider = SdkTracerProvider.builder()
            .setResource(baseResource)
            .addSpanProcessor(BatchSpanProcessor.builder(spanExporter).build())
            .build();

        // Initialize OpenTelemetry SDK
        OpenTelemetrySdk openTelemetry = OpenTelemetrySdk.builder()
            .setTracerProvider(tracerProvider)
            .buildAndRegisterGlobal();

        // Return tracer
        return openTelemetry.getTracer("com.example.app");
    }

    private static void putIfPresent(ResourceBuilder builder, String attributeName, String envName) {
        String value = System.getenv(envName);
        if (value != null && !value.isEmpty()) {
            builder.put(attributeName, value);
        }
    }
}
```

## Node.js SDK Resource Detection

Configure Kubernetes resource detection in Node.js applications.

```javascript
// kubernetes-resource-config.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { resourceFromAttributes } = require('@opentelemetry/resources');
const {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} = require('@opentelemetry/semantic-conventions');

// Create resource with Kubernetes attributes from environment
const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'nodejs-app',
  [ATTR_SERVICE_VERSION]: '1.0.0',
  'deployment.environment.name': process.env.NODE_ENV || 'production',

  // Kubernetes attributes from downward API
  'k8s.namespace.name': process.env.OTEL_RD_K8S_NAMESPACE_NAME,
  'k8s.pod.name': process.env.OTEL_RD_K8S_POD_NAME,
  'k8s.pod.uid': process.env.OTEL_RD_K8S_POD_UID,
  'k8s.node.name': process.env.OTEL_RD_K8S_NODE_NAME,
  'k8s.pod.ip': process.env.OTEL_RD_K8S_POD_IP,
});

// Initialize SDK with resource
const sdk = new NodeSDK({
  resource: resource,
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4317',
  }),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});
```

## Application Deployment with Resource Detection

Deploy applications configured to provide Kubernetes attributes via environment variables.

```yaml
# app-deployment-with-resources.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: example-app
  namespace: production
  labels:
    app: example-app
    team: backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: example-app
  template:
    metadata:
      labels:
        app: example-app
        team: backend
      annotations:
        app.version: "1.0.0"
    spec:
      containers:
      - name: app
        image: myregistry/example-app:1.0.0
        env:
          # Service identification
          - name: OTEL_SERVICE_NAME
            value: "example-app"
          - name: SERVICE_VERSION
            value: "1.0.0"
          - name: DEPLOYMENT_ENV
            value: "production"

          # Kubernetes metadata from downward API
          - name: OTEL_RD_K8S_NAMESPACE_NAME
            valueFrom:
              fieldRef:
                fieldPath: metadata.namespace
          - name: OTEL_RD_K8S_POD_NAME
            valueFrom:
              fieldRef:
                fieldPath: metadata.name
          - name: OTEL_RD_K8S_POD_UID
            valueFrom:
              fieldRef:
                fieldPath: metadata.uid
          - name: OTEL_RD_K8S_NODE_NAME
            valueFrom:
              fieldRef:
                fieldPath: spec.nodeName
          - name: OTEL_RD_K8S_POD_IP
            valueFrom:
              fieldRef:
                fieldPath: status.podIP

          # Collector endpoint
          - name: OTEL_EXPORTER_OTLP_ENDPOINT
            value: "http://otel-collector.observability.svc.cluster.local:4317"
        ports:
        - containerPort: 8080
```

The downward API provides pod information as environment variables that SDKs can use for resource attributes.

## Verifying Resource Attributes

Check that telemetry data includes Kubernetes resource attributes.

```bash
# View collector logs to see resource attributes
kubectl logs -n observability daemonset/otel-collector | grep -A 20 "resource"

# Expected output includes:
# Resource attributes:
#   k8s.namespace.name: production
#   k8s.pod.name: example-app-7d4f8c9b6-abcde
#   k8s.pod.uid: 12345678-1234-1234-1234-123456789abc
#   k8s.node.name: node-01
#   service.name: example-app
```

Query your backend to verify attributes appear in stored telemetry data.

OpenTelemetry resource detection for Kubernetes automatically enriches telemetry data with essential context about your deployment environment. This metadata makes it easier to filter, analyze, and troubleshoot issues in Kubernetes-based applications.
