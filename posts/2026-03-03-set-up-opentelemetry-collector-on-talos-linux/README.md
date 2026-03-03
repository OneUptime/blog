# How to Set Up OpenTelemetry Collector on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, OpenTelemetry, Observability, Kubernetes, Metrics

Description: A hands-on guide to deploying and configuring the OpenTelemetry Collector on a Talos Linux Kubernetes cluster.

---

The OpenTelemetry Collector is a vendor-neutral component that receives, processes, and exports telemetry data including traces, metrics, and logs. Running it on a Talos Linux cluster gives you a flexible observability pipeline that can send data to any backend - Prometheus, Jaeger, Zipkin, Datadog, Grafana Cloud, or dozens of other platforms. Instead of locking yourself into one vendor's agent, the OpenTelemetry Collector acts as a universal adapter.

This guide walks through deploying the OpenTelemetry Collector on Talos Linux, configuring it for common use cases, and integrating it with the rest of your observability stack.

## Why OpenTelemetry on Talos Linux

Talos Linux's minimal, immutable design means you cannot install traditional monitoring agents on the host. Everything runs inside Kubernetes. The OpenTelemetry Collector fits this model perfectly because it deploys as a Kubernetes workload and collects telemetry from both your applications and the infrastructure.

The Collector supports three deployment patterns: as a DaemonSet (one per node), as a Deployment (centralized), or as a Sidecar (one per pod). On Talos Linux, the DaemonSet pattern is the most common for infrastructure monitoring, while a centralized Deployment works well as an aggregation point.

## Installing the OpenTelemetry Operator

The easiest way to manage the OpenTelemetry Collector on Kubernetes is through the OpenTelemetry Operator. It provides custom resources that simplify configuration and lifecycle management.

First, install cert-manager, which the operator requires:

```bash
# Install cert-manager (required by the OpenTelemetry Operator)
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.0/cert-manager.yaml

# Wait for cert-manager to be ready
kubectl wait --for=condition=Available deployment/cert-manager -n cert-manager --timeout=120s
kubectl wait --for=condition=Available deployment/cert-manager-webhook -n cert-manager --timeout=120s
```

Then install the OpenTelemetry Operator:

```bash
# Install the OpenTelemetry Operator
kubectl apply -f https://github.com/open-telemetry/opentelemetry-operator/releases/latest/download/opentelemetry-operator.yaml

# Wait for the operator to be ready
kubectl wait --for=condition=Available deployment/opentelemetry-operator-controller-manager \
  -n opentelemetry-operator-system --timeout=120s
```

## Deploying the Collector as a DaemonSet

A DaemonSet deployment places one Collector instance on every node. This is ideal for collecting node-level metrics, container logs, and receiving traces from applications on the same node.

```yaml
# otel-collector-daemonset.yaml
# OpenTelemetry Collector DaemonSet for node-level collection
apiVersion: opentelemetry.io/v1beta1
kind: OpenTelemetryCollector
metadata:
  name: otel-node-collector
  namespace: observability
spec:
  mode: daemonset
  tolerations:
    - operator: Exists
      effect: NoSchedule
  config:
    receivers:
      # Receive OTLP data from applications
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318

      # Collect node and pod metrics
      kubeletstats:
        collection_interval: 30s
        auth_type: serviceAccount
        endpoint: "https://${env:K8S_NODE_NAME}:10250"
        insecure_skip_verify: true
        metric_groups:
          - node
          - pod
          - container

      # Collect host metrics
      hostmetrics:
        collection_interval: 30s
        scrapers:
          cpu: {}
          memory: {}
          disk: {}
          filesystem: {}
          network: {}
          load: {}

    processors:
      # Add Kubernetes metadata to telemetry
      k8sattributes:
        auth_type: serviceAccount
        extract:
          metadata:
            - k8s.pod.name
            - k8s.namespace.name
            - k8s.node.name
            - k8s.deployment.name

      # Batch data for efficient export
      batch:
        send_batch_size: 1000
        timeout: 10s

      # Add memory limits to prevent OOM
      memory_limiter:
        check_interval: 5s
        limit_mib: 512
        spike_limit_mib: 128

    exporters:
      # Export to Prometheus
      prometheus:
        endpoint: 0.0.0.0:8889
        resource_to_telemetry_conversion:
          enabled: true

      # Export traces to Jaeger
      otlp/jaeger:
        endpoint: jaeger-collector.observability.svc:4317
        tls:
          insecure: true

      # Debug output (remove in production)
      debug:
        verbosity: basic

    service:
      pipelines:
        metrics:
          receivers: [kubeletstats, hostmetrics, otlp]
          processors: [memory_limiter, k8sattributes, batch]
          exporters: [prometheus]
        traces:
          receivers: [otlp]
          processors: [memory_limiter, k8sattributes, batch]
          exporters: [otlp/jaeger]
```

Apply the configuration:

```bash
# Create the namespace
kubectl create namespace observability

# Deploy the collector
kubectl apply -f otel-collector-daemonset.yaml
```

## Deploying a Centralized Collector Gateway

In addition to the DaemonSet collectors, deploy a centralized Collector as a Deployment. This acts as an aggregation and routing layer:

```yaml
# otel-collector-gateway.yaml
# Centralized OpenTelemetry Collector for aggregation
apiVersion: opentelemetry.io/v1beta1
kind: OpenTelemetryCollector
metadata:
  name: otel-gateway
  namespace: observability
spec:
  mode: deployment
  replicas: 2
  config:
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318

    processors:
      batch:
        send_batch_size: 2000
        timeout: 15s

      memory_limiter:
        check_interval: 5s
        limit_mib: 1024
        spike_limit_mib: 256

      # Filter out low-value traces
      filter:
        traces:
          span:
            - 'attributes["http.target"] == "/healthz"'
            - 'attributes["http.target"] == "/readyz"'

    exporters:
      otlp/backend:
        endpoint: "your-backend.example.com:4317"
        headers:
          authorization: "Bearer ${env:API_TOKEN}"

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [memory_limiter, filter, batch]
          exporters: [otlp/backend]
        metrics:
          receivers: [otlp]
          processors: [memory_limiter, batch]
          exporters: [otlp/backend]
```

## Configuring Applications to Send Telemetry

With the Collector running, configure your applications to send data to it. The DaemonSet Collector is accessible via the node's IP on ports 4317 (gRPC) and 4318 (HTTP).

Set environment variables on your application pods:

```yaml
# app-deployment.yaml
# Application configured to send telemetry to the OTel Collector
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
        - name: app
          image: my-app:latest
          env:
            # Point to the node-local OTel Collector
            - name: OTEL_EXPORTER_OTLP_ENDPOINT
              value: "http://otel-node-collector-collector.observability.svc:4317"
            - name: OTEL_SERVICE_NAME
              value: "my-app"
            - name: OTEL_RESOURCE_ATTRIBUTES
              value: "deployment.environment=production"
```

## RBAC Configuration for Talos Linux

The Collector needs RBAC permissions to access kubelet stats and Kubernetes metadata. Create the necessary service account and roles:

```yaml
# otel-rbac.yaml
# RBAC for OpenTelemetry Collector on Talos Linux
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
    resources: ["pods", "nodes", "nodes/stats", "nodes/proxy", "services", "endpoints"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets", "statefulsets", "daemonsets"]
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

## Verifying the Deployment

Check that everything is running correctly:

```bash
# Verify collector pods are running on all nodes
kubectl get pods -n observability -o wide

# Check collector logs for errors
kubectl logs -n observability -l app.kubernetes.io/name=otel-node-collector-collector --tail=20

# Verify the Prometheus metrics endpoint
kubectl port-forward -n observability svc/otel-node-collector-collector-monitoring 8889:8889
# Then visit http://localhost:8889/metrics in your browser
```

## Monitoring the Collector Itself

The OpenTelemetry Collector exposes its own metrics that you should monitor to ensure it is healthy:

```yaml
# collector-monitoring.yaml
# ServiceMonitor for scraping OTel Collector metrics
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: otel-collector
  namespace: observability
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: otel-node-collector-collector
  endpoints:
    - port: monitoring
      interval: 30s
```

Key metrics to watch include `otelcol_receiver_accepted_spans`, `otelcol_exporter_sent_spans`, `otelcol_processor_dropped_spans`, and `otelcol_exporter_send_failed_spans`. A growing number of failed exports indicates a problem with your backend connection.

The OpenTelemetry Collector is the backbone of modern observability on Kubernetes. Running it on Talos Linux follows the same Kubernetes-native patterns you would use on any other distribution, with the main consideration being proper RBAC and tolerations for the immutable host environment. Once deployed, it gives you complete flexibility to route telemetry data wherever you need it without being locked into any single vendor.
