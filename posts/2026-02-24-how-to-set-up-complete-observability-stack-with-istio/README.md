# How to Set Up Complete Observability Stack with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Observability, Prometheus, Grafana, OpenTelemetry, Jaeger

Description: Deploy a full observability stack with Istio including metrics, traces, and logs using open source tools and OpenTelemetry.

---

Istio generates metrics, traces, and logs for every request in your mesh. But generating telemetry data is only useful if you have the infrastructure to collect, store, and query it. Here's how to set up a complete observability stack that captures everything Istio produces.

## The Three Pillars

A complete observability stack covers three signal types:

1. **Metrics**: Numerical measurements over time (request rates, latency percentiles, error counts)
2. **Traces**: End-to-end request journeys across services (latency per hop, call graphs)
3. **Logs**: Individual event records (access logs, error messages, debug output)

We'll use the OpenTelemetry Collector as the central hub that receives all three signal types and routes them to appropriate backends.

## Architecture Overview

```
Istio Proxies ──> OpenTelemetry Collector ──> Prometheus (metrics)
                                          ──> Jaeger (traces)
                                          ──> Loki (logs)

                  Grafana ──> Prometheus
                          ──> Jaeger
                          ──> Loki
```

## Step 1: Install Prometheus for Metrics

Prometheus scrapes Istio metrics from the sidecar proxies and istiod:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
      evaluation_interval: 15s

    scrape_configs:
      - job_name: 'istiod'
        kubernetes_sd_configs:
          - role: pod
            namespaces:
              names:
                - istio-system
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_label_app]
            regex: istiod
            action: keep
          - source_labels: [__meta_kubernetes_pod_ip]
            regex: (.+)
            target_label: __address__
            replacement: ${1}:15014

      - job_name: 'envoy-stats'
        metrics_path: /stats/prometheus
        kubernetes_sd_configs:
          - role: pod
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_container_name]
            action: keep
            regex: istio-proxy
          - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
            action: replace
            regex: ([^:]+)(?::\d+)?;(\d+)
            replacement: $1:15090
            target_label: __address__
          - source_labels: [__meta_kubernetes_namespace]
            action: replace
            target_label: namespace
          - source_labels: [__meta_kubernetes_pod_name]
            action: replace
            target_label: pod_name
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: prometheus
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: prometheus
  template:
    metadata:
      labels:
        app: prometheus
      annotations:
        sidecar.istio.io/inject: "false"
    spec:
      serviceAccountName: prometheus
      containers:
      - name: prometheus
        image: prom/prometheus:v2.51.0
        args:
        - "--config.file=/etc/prometheus/prometheus.yml"
        - "--storage.tsdb.path=/prometheus"
        - "--storage.tsdb.retention.time=15d"
        ports:
        - containerPort: 9090
        volumeMounts:
        - name: config
          mountPath: /etc/prometheus
        - name: data
          mountPath: /prometheus
      volumes:
      - name: config
        configMap:
          name: prometheus-config
      - name: data
        emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: prometheus
  namespace: monitoring
spec:
  selector:
    app: prometheus
  ports:
  - port: 9090
    targetPort: 9090
```

Don't forget the RBAC:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: prometheus
  namespace: monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: prometheus
rules:
- apiGroups: [""]
  resources: ["nodes", "pods", "services", "endpoints"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["nodes/metrics"]
  verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: prometheus
subjects:
- kind: ServiceAccount
  name: prometheus
  namespace: monitoring
roleRef:
  kind: ClusterRole
  name: prometheus
  apiGroup: rbac.authorization.k8s.io
```

## Step 2: Install Jaeger for Tracing

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jaeger
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: jaeger
  template:
    metadata:
      labels:
        app: jaeger
      annotations:
        sidecar.istio.io/inject: "false"
    spec:
      containers:
      - name: jaeger
        image: jaegertracing/all-in-one:1.55
        ports:
        - containerPort: 16686  # UI
        - containerPort: 4317   # OTLP gRPC
        - containerPort: 4318   # OTLP HTTP
        env:
        - name: COLLECTOR_OTLP_ENABLED
          value: "true"
---
apiVersion: v1
kind: Service
metadata:
  name: jaeger
  namespace: monitoring
spec:
  selector:
    app: jaeger
  ports:
  - name: ui
    port: 16686
    targetPort: 16686
  - name: otlp-grpc
    port: 4317
    targetPort: 4317
  - name: otlp-http
    port: 4318
    targetPort: 4318
```

Configure Istio to send traces to Jaeger:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
    - name: otel-tracing
      opentelemetry:
        port: 4317
        service: jaeger.monitoring.svc.cluster.local
---
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-tracing
  namespace: istio-system
spec:
  tracing:
  - providers:
    - name: otel-tracing
    randomSamplingPercentage: 5
```

## Step 3: Install Loki for Logs

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: loki
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: loki
  template:
    metadata:
      labels:
        app: loki
      annotations:
        sidecar.istio.io/inject: "false"
    spec:
      containers:
      - name: loki
        image: grafana/loki:2.9.4
        args:
        - "-config.file=/etc/loki/config.yaml"
        ports:
        - containerPort: 3100
        volumeMounts:
        - name: config
          mountPath: /etc/loki
      volumes:
      - name: config
        configMap:
          name: loki-config
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: loki-config
  namespace: monitoring
data:
  config.yaml: |
    auth_enabled: false
    server:
      http_listen_port: 3100
    common:
      path_prefix: /loki
      storage:
        filesystem:
          chunks_directory: /loki/chunks
          rules_directory: /loki/rules
      replication_factor: 1
      ring:
        kvstore:
          store: inmemory
    schema_config:
      configs:
        - from: 2020-10-24
          store: tsdb
          object_store: filesystem
          schema: v13
          index:
            prefix: index_
            period: 24h
---
apiVersion: v1
kind: Service
metadata:
  name: loki
  namespace: monitoring
spec:
  selector:
    app: loki
  ports:
  - port: 3100
    targetPort: 3100
```

Deploy Promtail as a DaemonSet to ship logs to Loki:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: promtail
  namespace: monitoring
spec:
  selector:
    matchLabels:
      app: promtail
  template:
    metadata:
      labels:
        app: promtail
      annotations:
        sidecar.istio.io/inject: "false"
    spec:
      containers:
      - name: promtail
        image: grafana/promtail:2.9.4
        args:
        - "-config.file=/etc/promtail/config.yaml"
        volumeMounts:
        - name: config
          mountPath: /etc/promtail
        - name: varlog
          mountPath: /var/log
          readOnly: true
      volumes:
      - name: config
        configMap:
          name: promtail-config
      - name: varlog
        hostPath:
          path: /var/log
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: promtail-config
  namespace: monitoring
data:
  config.yaml: |
    server:
      http_listen_port: 9080
    positions:
      filename: /tmp/positions.yaml
    clients:
      - url: http://loki.monitoring.svc.cluster.local:3100/loki/api/v1/push
    scrape_configs:
      - job_name: kubernetes-pods
        kubernetes_sd_configs:
          - role: pod
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_container_name]
            target_label: container
          - source_labels: [__meta_kubernetes_namespace]
            target_label: namespace
          - source_labels: [__meta_kubernetes_pod_name]
            target_label: pod
        pipeline_stages:
          - docker: {}
```

## Step 4: Install Grafana

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: grafana
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: grafana
  template:
    metadata:
      labels:
        app: grafana
      annotations:
        sidecar.istio.io/inject: "false"
    spec:
      containers:
      - name: grafana
        image: grafana/grafana:10.3.1
        ports:
        - containerPort: 3000
        env:
        - name: GF_SECURITY_ADMIN_PASSWORD
          value: "admin"  # Change this in production
        volumeMounts:
        - name: datasources
          mountPath: /etc/grafana/provisioning/datasources
      volumes:
      - name: datasources
        configMap:
          name: grafana-datasources
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasources
  namespace: monitoring
data:
  datasources.yaml: |
    apiVersion: 1
    datasources:
      - name: Prometheus
        type: prometheus
        url: http://prometheus.monitoring.svc.cluster.local:9090
        isDefault: true
      - name: Jaeger
        type: jaeger
        url: http://jaeger.monitoring.svc.cluster.local:16686
      - name: Loki
        type: loki
        url: http://loki.monitoring.svc.cluster.local:3100
---
apiVersion: v1
kind: Service
metadata:
  name: grafana
  namespace: monitoring
spec:
  selector:
    app: grafana
  ports:
  - port: 3000
    targetPort: 3000
```

## Step 5: Enable Istio Access Logs

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    accessLogFile: /dev/stdout
    accessLogEncoding: JSON
    enableTracing: true
```

```bash
istioctl install -f observability-config.yaml -y
```

## Step 6: Verify Everything Works

```bash
# Check all monitoring pods are running
kubectl get pods -n monitoring

# Generate test traffic
kubectl exec deploy/sleep -- curl -s http://httpbin:8000/get

# Verify metrics in Prometheus
kubectl port-forward -n monitoring svc/prometheus 9090:9090 &
# Visit http://localhost:9090 and query: istio_requests_total

# Verify traces in Jaeger
kubectl port-forward -n monitoring svc/jaeger 16686:16686 &
# Visit http://localhost:16686

# Verify logs in Grafana via Loki
kubectl port-forward -n monitoring svc/grafana 3000:3000 &
# Visit http://localhost:3000 (admin/admin)
# Go to Explore -> Select Loki -> Query: {container="istio-proxy"}
```

## Key Grafana Dashboards

Import these community dashboards for instant visibility:

- **Istio Mesh Dashboard** (ID: 7639): Overall mesh health
- **Istio Service Dashboard** (ID: 7636): Per-service metrics
- **Istio Workload Dashboard** (ID: 7630): Per-workload metrics
- **Istio Control Plane** (ID: 7645): istiod health

```bash
# Import dashboards via Grafana API
curl -X POST http://localhost:3000/api/dashboards/import \
  -H "Content-Type: application/json" \
  -u admin:admin \
  -d '{"dashboard": {"id": 7639}, "overwrite": true, "inputs": [{"name": "DS_PROMETHEUS", "type": "datasource", "pluginId": "prometheus", "value": "Prometheus"}]}'
```

With this stack in place, you have complete visibility into your Istio mesh. Metrics tell you what's happening, traces show you why, and logs give you the details. The three signals complement each other, and having them all in one place through Grafana means you can investigate issues without switching between tools.
