# How to Set Up OpenTelemetry Pipeline for Istio Telemetry

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, OpenTelemetry, Telemetry Pipeline, Observability, Kubernetes

Description: End-to-end guide for building a complete OpenTelemetry pipeline that handles metrics, traces, and logs from an Istio service mesh in production.

---

Building a complete telemetry pipeline for Istio means handling three types of data: metrics from every proxy in the mesh, distributed traces that show request flows, and access logs that record individual requests. With OpenTelemetry, you can build a single pipeline that collects all three and routes them to the right backends. This post covers the full setup from Istio configuration through the collector to backend integration.

## Pipeline Architecture Overview

The pipeline has three layers:

1. **Data generation** - Istio Envoy proxies generate metrics, traces, and access logs for every request
2. **Collection and processing** - OpenTelemetry Collectors receive the data, process it, and prepare it for export
3. **Backend storage and visualization** - Backends like Prometheus, Tempo/Jaeger, and Loki store the data for querying

The data flow looks like this:

```text
Envoy Proxies --> OTel Collector Agent (per node) --> OTel Collector Gateway --> Backends
```

Or for simpler setups:

```text
Envoy Proxies --> OTel Collector Gateway --> Backends
```

## Step 1: Install Istio with OpenTelemetry Configuration

Install Istio with tracing and telemetry configured for OpenTelemetry:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio-otel
spec:
  profile: default
  meshConfig:
    enableTracing: true
    defaultConfig:
      tracing:
        sampling: 10.0
    extensionProviders:
    - name: otel-tracing
      opentelemetry:
        service: otel-collector.observability.svc.cluster.local
        port: 4317
    - name: otel-access-log
      envoyOtelAls:
        service: otel-collector.observability.svc.cluster.local
        port: 4317
    defaultProviders:
      tracing:
      - otel-tracing
```

```bash
istioctl install -f istio-otel.yaml
```

## Step 2: Create the Observability Namespace

Keep all observability components in their own namespace:

```bash
kubectl create namespace observability
kubectl label namespace observability istio-injection=disabled
```

Disabling injection for the observability namespace prevents circular dependencies where the collector's own sidecar would try to send telemetry to itself.

## Step 3: Deploy the Collector Agent (Per-Node)

The agent runs as a DaemonSet on every node, providing a local endpoint for proxies to send data to. This reduces cross-node network traffic:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-agent-config
  namespace: observability
data:
  config.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
    processors:
      memory_limiter:
        check_interval: 5s
        limit_mib: 256
        spike_limit_mib: 64
      batch:
        timeout: 5s
        send_batch_size: 256
    exporters:
      otlp:
        endpoint: "otel-gateway.observability:4317"
        tls:
          insecure: true
    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [memory_limiter, batch]
          exporters: [otlp]
        metrics:
          receivers: [otlp]
          processors: [memory_limiter, batch]
          exporters: [otlp]
        logs:
          receivers: [otlp]
          processors: [memory_limiter, batch]
          exporters: [otlp]
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: otel-agent
  namespace: observability
spec:
  selector:
    matchLabels:
      app: otel-agent
  template:
    metadata:
      labels:
        app: otel-agent
    spec:
      containers:
      - name: collector
        image: otel/opentelemetry-collector-contrib:0.96.0
        args: ["--config=/etc/otel/config.yaml"]
        resources:
          requests:
            cpu: "100m"
            memory: "128Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
        ports:
        - containerPort: 4317
          hostPort: 4317
          name: otlp-grpc
        volumeMounts:
        - name: config
          mountPath: /etc/otel
      volumes:
      - name: config
        configMap:
          name: otel-agent-config
---
apiVersion: v1
kind: Service
metadata:
  name: otel-collector
  namespace: observability
spec:
  selector:
    app: otel-agent
  ports:
  - port: 4317
    name: otlp-grpc
```

## Step 4: Deploy the Collector Gateway

The gateway receives data from agents, does the heavy processing, and exports to backends:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-gateway-config
  namespace: observability
data:
  config.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
      prometheus:
        config:
          scrape_configs:
          - job_name: 'istiod'
            kubernetes_sd_configs:
            - role: pod
              namespaces:
                names: [istio-system]
            relabel_configs:
            - source_labels: [__meta_kubernetes_pod_label_app]
              action: keep
              regex: istiod
            - source_labels: [__address__]
              regex: ([^:]+)(?::\d+)?
              replacement: ${1}:15014
              target_label: __address__

    processors:
      memory_limiter:
        check_interval: 5s
        limit_mib: 1024
        spike_limit_mib: 256

      batch:
        timeout: 10s
        send_batch_size: 1024

      resource:
        attributes:
        - key: k8s.cluster.name
          value: "production"
          action: upsert

      filter/traces:
        traces:
          span:
          - 'attributes["http.target"] == "/healthz"'
          - 'attributes["http.target"] == "/ready"'
          - 'attributes["http.target"] == "/metrics"'
          - 'attributes["http.target"] == "/stats/prometheus"'

      tail_sampling:
        decision_wait: 10s
        num_traces: 50000
        policies:
        - name: keep-errors
          type: status_code
          status_code:
            status_codes: [ERROR]
        - name: keep-slow
          type: latency
          latency:
            threshold_ms: 2000
        - name: sample-normal
          type: probabilistic
          probabilistic:
            sampling_percentage: 5

    exporters:
      otlp/tempo:
        endpoint: "tempo.observability:4317"
        tls:
          insecure: true

      prometheus:
        endpoint: "0.0.0.0:8889"
        resource_to_telemetry_conversion:
          enabled: true

      loki:
        endpoint: "http://loki.observability:3100/loki/api/v1/push"

    extensions:
      health_check:
        endpoint: 0.0.0.0:13133

    service:
      extensions: [health_check]
      pipelines:
        traces:
          receivers: [otlp]
          processors: [memory_limiter, filter/traces, tail_sampling, resource, batch]
          exporters: [otlp/tempo]
        metrics:
          receivers: [otlp, prometheus]
          processors: [memory_limiter, resource, batch]
          exporters: [prometheus]
        logs:
          receivers: [otlp]
          processors: [memory_limiter, resource, batch]
          exporters: [loki]
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-gateway
  namespace: observability
spec:
  replicas: 2
  selector:
    matchLabels:
      app: otel-gateway
  template:
    metadata:
      labels:
        app: otel-gateway
    spec:
      containers:
      - name: collector
        image: otel/opentelemetry-collector-contrib:0.96.0
        args: ["--config=/etc/otel/config.yaml"]
        resources:
          requests:
            cpu: "500m"
            memory: "1Gi"
          limits:
            cpu: "2000m"
            memory: "4Gi"
        ports:
        - containerPort: 4317
        - containerPort: 8889
        - containerPort: 13133
        volumeMounts:
        - name: config
          mountPath: /etc/otel
      volumes:
      - name: config
        configMap:
          name: otel-gateway-config
---
apiVersion: v1
kind: Service
metadata:
  name: otel-gateway
  namespace: observability
spec:
  selector:
    app: otel-gateway
  ports:
  - port: 4317
    name: otlp-grpc
  - port: 8889
    name: prometheus
  - port: 13133
    name: health
```

## Step 5: Configure Telemetry API

Use Istio's Telemetry API for fine-grained control:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-telemetry
  namespace: istio-system
spec:
  tracing:
  - providers:
    - name: otel-tracing
    randomSamplingPercentage: 10.0
    customTags:
      mesh.id:
        literal:
          value: "production-mesh"
  accessLogging:
  - providers:
    - name: otel-access-log
```

## Step 6: Deploy Backend Services

Deploy the backends that store and visualize telemetry:

```bash
# Install Prometheus for metrics
helm install prometheus prometheus-community/prometheus \
  -n observability \
  --set server.persistentVolume.size=50Gi

# Install Tempo for traces
helm install tempo grafana/tempo \
  -n observability \
  --set persistence.enabled=true \
  --set persistence.size=50Gi

# Install Grafana for visualization
helm install grafana grafana/grafana \
  -n observability \
  --set persistence.enabled=true
```

## Step 7: Verify the Full Pipeline

Generate test traffic and verify data flows end to end:

```bash
# Deploy test services
kubectl create namespace test-app
kubectl label namespace test-app istio-injection=enabled

kubectl apply -n test-app -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/bookinfo/platform/kube/bookinfo.yaml

# Generate traffic
kubectl run loadgen -n test-app --image=curlimages/curl:7.85.0 --command -- \
  sh -c "while true; do curl -s http://productpage:9080/productpage; sleep 0.5; done"

# Check traces in collector
kubectl logs -n observability -l app=otel-gateway --tail=20

# Check metrics are available
kubectl port-forward -n observability svc/prometheus-server 9090:80
# Query: istio_requests_total

# Check traces
kubectl port-forward -n observability svc/tempo 3200:3200
# Query the Tempo API
```

## Pipeline Health Dashboard

Create a Grafana dashboard to monitor the pipeline itself:

```promql
# Agent receive rate
sum(rate(otelcol_receiver_accepted_spans{job="otel-agent"}[5m]))

# Gateway processing rate
sum(rate(otelcol_processor_batch_batch_send_size{job="otel-gateway"}[5m]))

# Export success rate
sum(rate(otelcol_exporter_sent_spans{job="otel-gateway"}[5m]))

# Pipeline latency (receive to export)
histogram_quantile(0.99, rate(otelcol_processor_batch_timeout_trigger_send{job="otel-gateway"}[5m]))

# Memory pressure
process_resident_memory_bytes{job=~"otel-.*"} / on(pod) kube_pod_container_resource_limits{resource="memory"}
```

## Cost Optimization Tips

Telemetry data can be expensive to store. Optimize costs with:

1. **Sample traces aggressively** - keep all errors, sample normal requests at 1-5%
2. **Reduce metric cardinality** - remove high-cardinality labels you don't need
3. **Filter health check spans** - they add noise without value
4. **Set retention policies** - don't keep raw traces longer than 7-14 days
5. **Use the collector's filter processor** - drop data you don't need before it reaches storage

A well-designed pipeline gives you the observability you need from Istio without breaking the bank on storage costs or overwhelming your backends with data you never look at.
