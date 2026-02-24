# How to Send Istio Metrics to OneUptime

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, OneUptime, Metrics, Monitoring, Prometheus, OpenTelemetry

Description: Step-by-step guide to exporting Istio service mesh metrics to OneUptime for centralized monitoring and alerting.

---

Istio generates a rich set of metrics about your service mesh traffic, latency, error rates, and more. Getting those metrics into OneUptime gives you centralized monitoring with alerting, dashboards, and SLO tracking all in one place. Here's how to set up the pipeline.

## How Istio Metrics Work

Every Envoy sidecar proxy in your mesh collects metrics about the traffic flowing through it. These metrics are exposed in Prometheus format on port 15090 of each sidecar. The Istio control plane (istiod) also exposes its own metrics.

The key metrics you'll want to capture include:

- `istio_requests_total`: Total request count by source, destination, response code
- `istio_request_duration_milliseconds`: Request latency distribution
- `istio_request_bytes`: Request body sizes
- `istio_response_bytes`: Response body sizes
- `istio_tcp_connections_opened_total`: TCP connections opened
- `istio_tcp_connections_closed_total`: TCP connections closed

## Option 1: Using OpenTelemetry Collector

The recommended approach is to use the OpenTelemetry Collector as an intermediary. It scrapes Prometheus metrics from Istio and forwards them to OneUptime's OpenTelemetry endpoint.

### Step 1: Deploy the OpenTelemetry Collector

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: istio-system
data:
  config.yaml: |
    receivers:
      prometheus:
        config:
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
                - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
                  regex: '(\d+)'
                  target_label: __address__
                  replacement: '${1}:15014'
                  action: replace
            - job_name: 'envoy-stats'
              metrics_path: /stats/prometheus
              kubernetes_sd_configs:
                - role: pod
              relabel_configs:
                - source_labels: [__meta_kubernetes_pod_container_name]
                  regex: istio-proxy
                  action: keep
                - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
                  action: replace
                  regex: ([^:]+)(?::\d+)?;(\d+)
                  replacement: $1:15090
                  target_label: __address__

    processors:
      batch:
        timeout: 30s
        send_batch_size: 1000
      memory_limiter:
        check_interval: 5s
        limit_mib: 512
      resource:
        attributes:
          - key: service.name
            from_attribute: source_workload
            action: upsert

    exporters:
      otlp:
        endpoint: "https://otlp.oneuptime.com"
        headers:
          x-oneuptime-token: "${ONEUPTIME_TOKEN}"
        tls:
          insecure: false

    service:
      pipelines:
        metrics:
          receivers: [prometheus]
          processors: [memory_limiter, batch, resource]
          exporters: [otlp]
---
apiVersion: v1
kind: Secret
metadata:
  name: oneuptime-credentials
  namespace: istio-system
type: Opaque
stringData:
  token: "your-oneuptime-ingestion-token-here"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
  namespace: istio-system
spec:
  replicas: 1
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
      - name: otel-collector
        image: otel/opentelemetry-collector-contrib:latest
        args:
        - "--config=/etc/otel/config.yaml"
        env:
        - name: ONEUPTIME_TOKEN
          valueFrom:
            secretKeyRef:
              name: oneuptime-credentials
              key: token
        volumeMounts:
        - name: config
          mountPath: /etc/otel
        resources:
          requests:
            cpu: 200m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
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

### Step 2: Set Up RBAC for the Collector

The collector needs permissions to discover pods in the cluster:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: otel-collector
  namespace: istio-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: otel-collector
rules:
- apiGroups: [""]
  resources: ["pods", "nodes", "endpoints"]
  verbs: ["get", "list", "watch"]
- apiGroups: [""]
  resources: ["nodes/metrics"]
  verbs: ["get"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: otel-collector
subjects:
- kind: ServiceAccount
  name: otel-collector
  namespace: istio-system
roleRef:
  kind: ClusterRole
  name: otel-collector
  apiGroup: rbac.authorization.k8s.io
```

Apply these resources:

```bash
kubectl apply -f otel-collector-rbac.yaml
kubectl apply -f otel-collector-deployment.yaml
```

### Step 3: Configure Istio to Expose Metrics

Make sure Istio is configured to expose the metrics you need. The default installation exposes standard metrics, but you can customize them:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    enablePrometheusMerge: true
    defaultConfig:
      proxyStatsMatcher:
        inclusionRegexps:
          - ".*circuit_breakers.*"
          - ".*upstream_rq_retry.*"
          - ".*upstream_cx_.*"
```

Apply the updated configuration:

```bash
istioctl install -f istio-config.yaml -y
```

## Option 2: Using Prometheus with Remote Write

If you already have Prometheus running, you can use remote write to send metrics to OneUptime:

```yaml
# Add to your Prometheus configuration
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s

    scrape_configs:
      - job_name: 'istio-mesh'
        kubernetes_sd_configs:
          - role: pod
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_container_name]
            regex: istio-proxy
            action: keep

    remote_write:
      - url: "https://otlp.oneuptime.com/v1/metrics"
        headers:
          x-oneuptime-token: "your-oneuptime-ingestion-token"
        queue_config:
          max_samples_per_send: 1000
          batch_send_deadline: 30s
```

## Verifying Metrics Are Flowing

After deploying the collector, verify that metrics are being scraped and forwarded:

```bash
# Check the collector logs
kubectl logs -l app=otel-collector -n istio-system

# Verify that Envoy proxies are exposing metrics
kubectl exec -it <any-pod-with-sidecar> -c istio-proxy -- curl -s localhost:15090/stats/prometheus | head -50

# Check istiod metrics
kubectl exec -it -n istio-system deploy/istiod -- curl -s localhost:15014/metrics | head -50

# Generate some test traffic
for i in $(seq 1 100); do
  kubectl exec deploy/sleep -- curl -s http://httpbin:8000/get > /dev/null
done
```

## Important Metrics to Track in OneUptime

Once metrics are flowing, focus on these key indicators in your OneUptime dashboards:

| Metric | What It Tells You |
|---|---|
| `istio_requests_total` | Request volume and error rates |
| `istio_request_duration_milliseconds` | Latency percentiles (p50, p95, p99) |
| `istio_tcp_connections_opened_total` | Connection patterns |
| `pilot_xds_pushes` | Control plane activity |
| `pilot_proxy_convergence_time` | How fast config reaches proxies |

With these metrics in OneUptime, you get full visibility into your mesh performance, error rates, and overall health. From there, you can set up alerts, create dashboards, and track SLOs, which we cover in other posts in this series.
