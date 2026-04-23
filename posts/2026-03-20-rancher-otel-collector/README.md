# How to Deploy OpenTelemetry Collector on Rancher - Otel

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, OpenTelemetry, Observability, Tracing, Metric

Description: Deploy and configure the OpenTelemetry Collector on Rancher as a central telemetry pipeline for collecting, processing, and exporting metrics, traces, and logs.

## Introduction

The OpenTelemetry Collector is a vendor-agnostic agent for receiving, processing, and exporting telemetry data (traces, metrics, and logs). Deploying it on Rancher creates a centralized observability pipeline that decouples your applications from specific backends, enabling you to change observability tools without redeploying applications.

## Prerequisites

- Rancher-managed Kubernetes cluster
- Helm 3.x installed
- kubectl access
- Backend services (Jaeger, Prometheus, Loki, etc.)

## Step 1: Install the OpenTelemetry Operator

```bash
# Add OpenTelemetry Helm repository

helm repo add open-telemetry https://open-telemetry.github.io/opentelemetry-helm-charts
helm repo update

# Install the OpenTelemetry Operator
helm install opentelemetry-operator open-telemetry/opentelemetry-operator \
  --namespace observability \
  --create-namespace \
  --set "manager.collectorImage.repository=otel/opentelemetry-collector-contrib" \
  --set admissionWebhooks.certManager.enabled=false \
  --set admissionWebhooks.autoGenerateCert.enabled=true \
  --wait

# Verify operator installation
kubectl get pods -n observability -l app.kubernetes.io/name=opentelemetry-operator
```

## Step 2: Deploy OpenTelemetry Collector

```yaml
# otel-collector.yaml - Comprehensive OTel Collector configuration
apiVersion: opentelemetry.io/v1beta1
kind: OpenTelemetryCollector
metadata:
  name: otel-collector
  namespace: observability
spec:
  mode: deployment  # Or 'daemonset' for node-level collection
  replicas: 1  # Use a single replica when scraping Prometheus targets or watching Kubernetes events
  resources:
    requests:
      cpu: 200m
      memory: 256Mi
    limits:
      cpu: 1000m
      memory: 1Gi

  config:
    receivers:
      # OTLP receiver (for OpenTelemetry SDK instrumented apps)
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318

      # Prometheus receiver (for scraping metrics)
      prometheus:
        config:
          scrape_configs:
            - job_name: 'kubernetes-pods'
              kubernetes_sd_configs:
                - role: pod
              relabel_configs:
                - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
                  action: keep
                  regex: "true"
                - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
                  action: replace
                  target_label: __metrics_path__
                  regex: (.+)

      # Jaeger receiver (for legacy Jaeger-instrumented apps)
      jaeger:
        protocols:
          grpc:
            endpoint: 0.0.0.0:14250
          thrift_http:
            endpoint: 0.0.0.0:14268

      # Kubernetes events
      k8s_events:
        auth_type: serviceAccount
        namespaces: []  # Empty = all namespaces

    processors:
      # Batch processor for efficiency
      batch:
        timeout: 10s
        send_batch_size: 512
        send_batch_max_size: 1024

      # Memory limiter to prevent OOM
      memory_limiter:
        check_interval: 1s
        limit_mib: 768
        spike_limit_mib: 256

      # Add Kubernetes resource attributes
      k8sattributes:
        auth_type: serviceAccount
        passthrough: false
        extract:
          metadata:
            - k8s.pod.name
            - k8s.pod.uid
            - k8s.deployment.name
            - k8s.namespace.name
            - k8s.node.name
            - k8s.pod.start_time

      # Resource processor to add environment-specific attributes
      resource:
        attributes:
          - key: service.cluster
            value: rancher-prod
            action: upsert
          - key: deployment.environment
            value: production
            action: upsert

    exporters:
      # Export traces to Jaeger
      otlp/jaeger:
        endpoint: jaeger-collector.observability.svc.cluster.local:4317
        tls:
          insecure: true

      # Export metrics to a Prometheus remote-write endpoint
      prometheusremotewrite:
        # Prometheus must have the remote-write receiver enabled to accept this traffic.
        endpoint: http://rancher-monitoring-prometheus.cattle-monitoring-system.svc.cluster.local:9090/api/v1/write
        tls:
          insecure_skip_verify: true

      # Export logs to Loki over its native OTLP HTTP endpoint
      otlphttp/loki:
        endpoint: http://loki.observability.svc.cluster.local:3100/otlp

      # Debug exporter for troubleshooting (disable in production)
      debug:
        verbosity: basic

    extensions:
      health_check:
        endpoint: 0.0.0.0:13133
      pprof:
        endpoint: 0.0.0.0:1777
      zpages:
        endpoint: 0.0.0.0:55679

    service:
      extensions: [health_check, pprof, zpages]
      pipelines:
        traces:
          receivers: [otlp, jaeger]
          processors: [memory_limiter, k8sattributes, batch]
          exporters: [otlp/jaeger]
        metrics:
          receivers: [otlp, prometheus]
          processors: [memory_limiter, k8sattributes, resource, batch]
          exporters: [prometheusremotewrite]
        logs:
          receivers: [otlp, k8s_events]
          processors: [memory_limiter, k8sattributes, batch]
          exporters: [otlphttp/loki]
```

## Step 3: Deploy as DaemonSet for Node-Level Collection

```yaml
# otel-daemonset.yaml - DaemonSet for node-level metrics
apiVersion: opentelemetry.io/v1beta1
kind: OpenTelemetryCollector
metadata:
  name: otel-node-collector
  namespace: observability
spec:
  mode: daemonset
  hostNetwork: true
  dnsPolicy: ClusterFirstWithHostNet
  env:
    - name: K8S_NODE_NAME
      valueFrom:
        fieldRef:
          fieldPath: spec.nodeName
  volumeMounts:
    - name: hostfs
      mountPath: /hostfs
      readOnly: true
  volumes:
    - name: hostfs
      hostPath:
        path: /

  config:
    receivers:
      # Collect host metrics from each node
      hostmetrics:
        collection_interval: 30s
        root_path: /hostfs
        scrapers:
          cpu:
          disk:
          filesystem:
          load:
          memory:
          network:
          paging:
          processes:

      # Collect Kubernetes metrics
      kubeletstats:
        collection_interval: 30s
        auth_type: serviceAccount
        endpoint: "https://${env:K8S_NODE_NAME}:10250"
        insecure_skip_verify: true
        metric_groups:
          - node
          - pod
          - container

    processors:
      batch:
        timeout: 10s
      memory_limiter:
        limit_mib: 512

    exporters:
      prometheusremotewrite:
        # Prometheus must have the remote-write receiver enabled to accept this traffic.
        endpoint: http://rancher-monitoring-prometheus.cattle-monitoring-system.svc.cluster.local:9090/api/v1/write

    service:
      pipelines:
        metrics:
          receivers: [hostmetrics, kubeletstats]
          processors: [memory_limiter, batch]
          exporters: [prometheusremotewrite]
```

## Step 4: Configure Auto-Instrumentation

The OTel Operator can automatically inject instrumentation:

```yaml
# auto-instrumentation.yaml - Automatic SDK injection
apiVersion: opentelemetry.io/v1alpha1
kind: Instrumentation
metadata:
  name: java-instrumentation
  namespace: production
spec:
  exporter:
    endpoint: http://otel-collector.observability.svc.cluster.local:4317

  propagators:
    - tracecontext
    - baggage
    - b3

  sampler:
    type: parentbased_traceidratio
    argument: "0.1"  # 10% sampling
```

Annotate pods for auto-instrumentation:

```yaml
# annotated-deployment.yaml - Auto-instrumented Java app
apiVersion: apps/v1
kind: Deployment
metadata:
  name: java-service
  namespace: production
spec:
  selector:
    matchLabels:
      app: java-service
  template:
    metadata:
      labels:
        app: java-service
      annotations:
        # Enable automatic Java instrumentation
        instrumentation.opentelemetry.io/inject-java: "java-instrumentation"
    spec:
      containers:
        - name: java-service
          image: registry.example.com/java-service:v1.0
```

## Step 5: Verify Collector is Working

```bash
# Find a collector pod
kubectl get pods -n observability

# Check collector health
kubectl port-forward -n observability pod/<otel-collector-pod-name> 13133:13133 &
curl http://localhost:13133/

# Check collector metrics (for monitoring the collector itself)
kubectl port-forward -n observability pod/<otel-collector-pod-name> 8888:8888 &
curl http://localhost:8888/metrics | grep otelcol

# View zpages for debugging pipelines
kubectl port-forward -n observability pod/<otel-collector-pod-name> 55679:55679 &
# Access http://localhost:55679/debug/tracez
```

## Conclusion

The OpenTelemetry Collector on Rancher acts as the central hub of your observability pipeline. By decoupling instrumentation from specific backends, you gain the flexibility to evolve your observability stack without changing application code. The operator-based deployment with CRDs makes it easy to manage multiple collectors with different configurations for different use cases (edge collection, central aggregation, etc.). Auto-instrumentation capabilities further reduce the effort required to instrument legacy applications.
