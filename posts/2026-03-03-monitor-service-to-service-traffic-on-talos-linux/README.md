# How to Monitor Service-to-Service Traffic on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Monitoring, Service Mesh, Observability, Kubernetes, Prometheus

Description: A guide to monitoring and observing service-to-service traffic on Talos Linux using service mesh telemetry, Prometheus, and Grafana dashboards.

---

Understanding how services communicate with each other is critical for running reliable applications in Kubernetes. When something goes wrong, you need to quickly identify which service is failing, where latency is increasing, and how error rates are changing. On Talos Linux, monitoring service-to-service traffic is best accomplished through a combination of service mesh telemetry and standard monitoring tools like Prometheus and Grafana.

This guide covers setting up comprehensive traffic monitoring on a Talos Linux cluster, from collecting metrics to building dashboards that give you real-time visibility into your service interactions.

## Why Monitor Service-to-Service Traffic?

In a microservices architecture, a single user request might pass through five or ten different services. Without visibility into these service-to-service calls, debugging becomes a guessing game. Traffic monitoring helps you:

- Identify which services are experiencing high error rates
- Find the source of latency in request chains
- Detect unusual traffic patterns that might indicate a problem or attack
- Understand dependency relationships between services
- Plan capacity based on actual traffic patterns
- Validate that deployments are working correctly

## The Monitoring Stack

A complete traffic monitoring setup on Talos Linux typically includes:

1. **Service mesh proxy** (Linkerd or Envoy) - collects per-request metrics
2. **Prometheus** - stores and queries time-series metrics
3. **Grafana** - visualizes metrics in dashboards
4. **Optional: Jaeger or Tempo** - provides distributed tracing

## Setting Up Linkerd Viz for Traffic Monitoring

Linkerd Viz is the quickest way to get traffic visibility. Install it:

```bash
# Install Linkerd Viz extension
linkerd viz install | kubectl apply -f -

# Verify installation
linkerd viz check
```

Now you have access to real-time traffic metrics:

```bash
# View traffic statistics for all deployments
linkerd viz stat deployment -n default

# Output shows:
# NAME          MESHED   SUCCESS   RPS    LATENCY_P50  LATENCY_P95  LATENCY_P99
# api-server    2/2      99.50%    45.2   3ms          15ms         50ms
# web-frontend  3/3      100.00%   120.5  1ms          5ms          12ms

# View per-route statistics
linkerd viz routes deployment/api-server -n default

# See live traffic
linkerd viz tap deployment/api-server -n default

# View traffic topology
linkerd viz edges deployment -n default
```

The `stat` command gives you a quick overview of success rates, request rates, and latency percentiles. The `tap` command shows individual requests in real time.

## Deploying Prometheus for Metric Storage

While Linkerd Viz includes its own Prometheus, for production monitoring you should deploy a separate, persistent Prometheus instance:

```bash
# Add the Prometheus community Helm repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install Prometheus
helm install prometheus prometheus-community/prometheus \
  --namespace monitoring \
  --create-namespace \
  --set server.persistentVolume.size=50Gi \
  --set server.retention=30d
```

Configure Prometheus to scrape Linkerd metrics:

```yaml
# prometheus-scrape-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-extra-scrape-configs
  namespace: monitoring
data:
  extra-scrape-configs.yaml: |
    - job_name: 'linkerd-proxies'
      kubernetes_sd_configs:
      - role: pod
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_container_name]
        action: keep
        regex: linkerd-proxy
      - source_labels: [__meta_kubernetes_pod_container_port_name]
        action: keep
        regex: linkerd-admin
      - source_labels: [__meta_kubernetes_namespace]
        action: replace
        target_label: namespace
      - source_labels: [__meta_kubernetes_pod_name]
        action: replace
        target_label: pod
```

## Key Metrics to Monitor

The service mesh proxy exposes several important metrics:

```promql
# Request rate per service
sum(rate(request_total{direction="inbound"}[5m])) by (deployment)

# Error rate (5xx responses)
sum(rate(response_total{status_code=~"5.."}[5m])) by (deployment)
/ sum(rate(response_total[5m])) by (deployment)

# P99 latency
histogram_quantile(0.99,
  sum(rate(response_latency_ms_bucket{direction="inbound"}[5m]))
  by (le, deployment)
)

# Active connections
sum(tcp_open_connections{direction="inbound"}) by (deployment)

# Bytes transferred
sum(rate(tcp_read_bytes_total[5m])) by (deployment)
sum(rate(tcp_write_bytes_total[5m])) by (deployment)
```

## Setting Up Grafana Dashboards

Deploy Grafana and connect it to Prometheus:

```bash
# Install Grafana
helm install grafana grafana/grafana \
  --namespace monitoring \
  --set persistence.enabled=true \
  --set persistence.size=10Gi \
  --set service.type=NodePort \
  --set service.nodePort=31300
```

Add Prometheus as a data source in Grafana, then import the Linkerd dashboard:

```bash
# Get the Grafana admin password
kubectl get secret -n monitoring grafana -o jsonpath="{.data.admin-password}" | base64 -d

# Access Grafana
kubectl port-forward -n monitoring svc/grafana 3000:80
```

Create a custom dashboard with these panels:

### Service Overview Panel

```promql
# Success rate by service
sum(rate(response_total{classification="success"}[5m])) by (deployment)
/ sum(rate(response_total[5m])) by (deployment) * 100
```

### Latency Heatmap

```promql
# Request latency distribution
sum(rate(response_latency_ms_bucket[5m])) by (le)
```

### Service Dependency Graph

Grafana's Node Graph panel can visualize service dependencies using edge data from the mesh:

```promql
# Source and destination pairs
sum(rate(response_total[5m])) by (src_deployment, dst_deployment)
```

## Setting Up Alerts

Create Prometheus alerting rules for traffic anomalies:

```yaml
# traffic-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: service-traffic-alerts
  namespace: monitoring
spec:
  groups:
  - name: service-traffic
    rules:
    - alert: HighErrorRate
      expr: |
        sum(rate(response_total{status_code=~"5.."}[5m])) by (deployment)
        / sum(rate(response_total[5m])) by (deployment) > 0.05
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "High error rate on {{ $labels.deployment }}"
        description: "Error rate is {{ $value | humanizePercentage }}"

    - alert: HighLatency
      expr: |
        histogram_quantile(0.99,
          sum(rate(response_latency_ms_bucket[5m]))
          by (le, deployment)
        ) > 1000
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High P99 latency on {{ $labels.deployment }}"

    - alert: TrafficDrop
      expr: |
        sum(rate(request_total[5m])) by (deployment)
        < sum(rate(request_total[5m] offset 1h)) by (deployment) * 0.5
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Significant traffic drop on {{ $labels.deployment }}"
```

## Distributed Tracing

For deeper visibility into request flows across services, add distributed tracing:

```bash
# Install Jaeger
helm install jaeger jaegertracing/jaeger \
  --namespace monitoring \
  --set provisionDataStore.cassandra=false \
  --set storage.type=memory \
  --set query.service.type=NodePort
```

Configure your services to send traces. If using Linkerd, enable trace context propagation:

```yaml
# Annotate deployments to enable trace propagation
metadata:
  annotations:
    config.linkerd.io/trace-collector: "jaeger-collector.monitoring:14268"
```

## Talos Linux Monitoring Tips

On Talos Linux, a few monitoring considerations are specific to the platform:

```bash
# Check node-level network metrics through talosctl
talosctl get machineconfig -n <NODE_IP>

# Monitor kubelet metrics for network activity
kubectl get --raw /api/v1/nodes/<NODE_NAME>/proxy/metrics | grep network

# Check for DNS issues that might affect service communication
kubectl logs -n kube-system -l k8s-app=kube-dns --tail=50
```

Since Talos does not provide traditional node access, all monitoring must happen through Kubernetes APIs and the tools deployed within the cluster.

## Conclusion

Monitoring service-to-service traffic on Talos Linux gives you the visibility needed to run reliable microservices. A service mesh like Linkerd provides per-request metrics without any code changes, Prometheus stores and queries those metrics, and Grafana makes them visual and actionable. Adding alerting rules catches problems before they affect users, and distributed tracing helps you debug the complex request chains that are common in microservices architectures. The key is to start with the basics - success rate, latency, and request rate - and build more sophisticated monitoring as your needs grow.
