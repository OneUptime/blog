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

We'll use Prometheus for metrics, Jaeger for OpenTelemetry Protocol (OTLP) traces, and Loki for logs.

## Architecture Overview

```text
Istio Proxies ──> Prometheus (metrics)
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
          - role: endpoints
            namespaces:
              names:
                - istio-system
        relabel_configs:
          - source_labels: [__meta_kubernetes_service_name, __meta_kubernetes_endpoint_port_name]
            action: keep
            regex: istiod;http-monitoring

      - job_name: 'envoy-stats'
        metrics_path: /stats/prometheus
        kubernetes_sd_configs:
          - role: pod
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_container_port_name]
            action: keep
            regex: '.*-envoy-prom'
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
    enableTracing: true
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

Deploy Grafana Alloy to ship logs to Loki:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: alloy
  namespace: monitoring
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: alloy
rules:
- apiGroups: [""]
  resources: ["pods", "pods/log", "namespaces"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: alloy
subjects:
- kind: ServiceAccount
  name: alloy
  namespace: monitoring
roleRef:
  kind: ClusterRole
  name: alloy
  apiGroup: rbac.authorization.k8s.io
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: alloy
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: alloy
  template:
    metadata:
      labels:
        app: alloy
      annotations:
        sidecar.istio.io/inject: "false"
    spec:
      serviceAccountName: alloy
      containers:
      - name: alloy
        image: grafana/alloy:v1.16.1
        args:
        - "run"
        - "--server.http.listen-addr=0.0.0.0:12345"
        - "--storage.path=/var/lib/alloy/data"
        - "/etc/alloy/config.alloy"
        ports:
        - containerPort: 12345
        volumeMounts:
        - name: config
          mountPath: /etc/alloy
      volumes:
      - name: config
        configMap:
          name: alloy-config
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: alloy-config
  namespace: monitoring
data:
  config.alloy: |
    discovery.kubernetes "pods" {
      role = "pod"
    }

    discovery.relabel "pod_logs" {
      targets = discovery.kubernetes.pods.targets

      rule {
        source_labels = ["__meta_kubernetes_pod_container_name"]
        target_label  = "container"
      }

      rule {
        source_labels = ["__meta_kubernetes_namespace"]
        target_label  = "namespace"
      }

      rule {
        source_labels = ["__meta_kubernetes_pod_name"]
        target_label  = "pod"
      }
    }

    loki.source.kubernetes "pods" {
      targets    = discovery.relabel.pod_logs.output
      forward_to = [loki.write.local.receiver]
    }

    loki.write "local" {
      endpoint {
        url = "http://loki.monitoring.svc.cluster.local:3100/loki/api/v1/push"
      }
    }
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
  -d "$(jq -n \
    --argjson dashboard "$(curl -s http://localhost:3000/api/gnet/dashboards/7639 | jq '.json')" \
    '{dashboard: $dashboard, overwrite: true, inputs: [{"name": "DS_PROMETHEUS", "type": "datasource", "pluginId": "prometheus", "value": "Prometheus"}]}')"
```

With this stack in place, you have complete visibility into your Istio mesh. Metrics tell you what's happening, traces show you why, and logs give you the details. The three signals complement each other, and having them all in one place through Grafana means you can investigate issues without switching between tools.
