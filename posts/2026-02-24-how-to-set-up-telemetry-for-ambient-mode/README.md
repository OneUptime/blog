# How to Set Up Telemetry for Ambient Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ambient Mesh, Telemetry, Observability, Kubernetes

Description: How to configure telemetry collection for Istio ambient mode, including ztunnel and waypoint proxy observability.

---

Istio's ambient mode fundamentally changes how the mesh works. Instead of injecting sidecar proxies into every pod, ambient mode uses a shared ztunnel (zero-trust tunnel) DaemonSet for L4 traffic and optional waypoint proxies for L7 processing. This architectural shift has real implications for how you collect and configure telemetry.

If you are running ambient mode or evaluating it, here is how to get proper observability set up.

## How Ambient Mode Telemetry Differs

In the traditional sidecar model, every pod has its own Envoy proxy that generates metrics, traces, and access logs. The proxy sees all traffic in and out of the pod.

Ambient mode splits this into two layers:

1. **ztunnel** - Runs as a DaemonSet on every node. Handles L4 traffic (TCP connections, mTLS). Generates L4 metrics.
2. **Waypoint proxies** - Optional per-namespace or per-service Envoy instances that handle L7 traffic (HTTP routing, retries, etc.). Generate L7 metrics.

This means your telemetry comes from different sources depending on the layer:

- L4 metrics (connection counts, bytes transferred) come from ztunnel
- L7 metrics (request counts, latencies, HTTP status codes) come from waypoint proxies
- If you do not deploy waypoint proxies, you only get L4 telemetry

## Enabling Ambient Mode

First, make sure your Istio installation has ambient mode enabled:

```bash
istioctl install --set profile=ambient
```

Or with an IstioOperator:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: ambient
  meshConfig:
    defaultConfig:
      discoveryAddress: istiod.istio-system.svc:15012
```

Add namespaces to the ambient mesh:

```bash
kubectl label namespace my-app istio.io/dataplane-mode=ambient
```

## Collecting ztunnel Metrics

The ztunnel component exposes Prometheus metrics by default. To scrape them, you need to make sure your Prometheus instance can reach the ztunnel pods.

Check what metrics ztunnel exposes:

```bash
kubectl exec -n istio-system ds/ztunnel -- curl -s localhost:15020/stats/prometheus | head -50
```

Key ztunnel metrics include:

- `istio_tcp_connections_opened_total` - TCP connections opened
- `istio_tcp_connections_closed_total` - TCP connections closed
- `istio_tcp_sent_bytes_total` - Bytes sent
- `istio_tcp_received_bytes_total` - Bytes received

These metrics include standard Istio labels like `source_workload`, `destination_workload`, `source_namespace`, and `destination_namespace`.

Set up Prometheus scraping for ztunnel:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: observability
data:
  prometheus.yml: |
    scrape_configs:
      - job_name: 'ztunnel'
        kubernetes_sd_configs:
          - role: pod
        relabel_configs:
          - source_labels: [__meta_kubernetes_pod_label_app]
            regex: ztunnel
            action: keep
          - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_port]
            action: replace
            target_label: __address__
            regex: (.+)
            replacement: ${1}:15020
```

## Deploying Waypoint Proxies

To get L7 telemetry, you need waypoint proxies. Deploy them per namespace:

```bash
istioctl waypoint apply -n my-app --enroll-namespace
```

Or with Kubernetes Gateway API resources:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: waypoint
  namespace: my-app
  labels:
    istio.io/waypoint-for: service
spec:
  gatewayClassName: istio-waypoint
  listeners:
    - name: mesh
      port: 15008
      protocol: HBONE
```

Once the waypoint proxy is running, it generates the standard Istio L7 metrics:

```bash
kubectl exec -n my-app deploy/waypoint -- curl -s localhost:15000/stats/prometheus | grep istio_requests
```

## Configuring Telemetry Resources for Ambient

The Telemetry API works the same way in ambient mode, but you need to be aware of which component will actually process the configuration.

For L4 metrics (ztunnel handles these):

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: l4-metrics
  namespace: istio-system
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: TCP_OPENED_CONNECTIONS
          tagOverrides:
            custom_label:
              operation: UPSERT
              value: "connection.id"
```

For L7 metrics (waypoint proxies handle these):

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: l7-metrics
  namespace: my-app
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_COUNT
          tagOverrides:
            request_protocol:
              operation: UPSERT
              value: "request.protocol"
```

## Setting Up Tracing in Ambient Mode

Distributed tracing in ambient mode works through waypoint proxies. The ztunnel does not generate trace spans since it operates at L4.

Configure tracing the same way as with sidecars:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  profile: ambient
  meshConfig:
    extensionProviders:
      - name: otel-tracing
        opentelemetry:
          service: otel-collector.observability.svc.cluster.local
          port: 4317
```

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: ambient-tracing
  namespace: istio-system
spec:
  tracing:
    - providers:
        - name: otel-tracing
      randomSamplingPercentage: 10.0
```

Keep in mind that without waypoint proxies, you will not get any trace spans from the mesh layer. The ztunnel operates below the HTTP layer and does not participate in distributed tracing.

## Access Logging in Ambient Mode

Access logs work through both ztunnel (L4 logs) and waypoint proxies (L7 logs):

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: ambient-access-logs
  namespace: istio-system
spec:
  accessLogging:
    - providers:
        - name: envoy
```

For ztunnel logs, check the ztunnel pod logs directly:

```bash
kubectl logs -n istio-system ds/ztunnel | tail -20
```

For waypoint proxy logs:

```bash
kubectl logs -n my-app deploy/waypoint | tail -20
```

## Monitoring ztunnel Health

Since ztunnel is shared across all pods on a node, its health is critical. Monitor these metrics:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: ztunnel-monitoring
  namespace: istio-system
spec:
  metrics:
    - providers:
        - name: prometheus
```

Key things to watch:

```bash
# Check ztunnel resource usage
kubectl top pods -n istio-system -l app=ztunnel

# Check ztunnel logs for errors
kubectl logs -n istio-system ds/ztunnel --tail=50

# Check ztunnel connections
kubectl exec -n istio-system ds/ztunnel -- curl -s localhost:15020/stats | grep "cx_active"
```

## Grafana Dashboards for Ambient

Istio provides updated Grafana dashboards for ambient mode. Import them from the Istio addons:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.24/samples/addons/grafana.yaml
```

The ambient-specific dashboards show:

- ztunnel connection metrics per node
- Waypoint proxy request metrics
- L4 vs L7 traffic breakdown
- mTLS connection status

## Troubleshooting Telemetry in Ambient Mode

When metrics are missing:

1. Check if the namespace is enrolled:
```bash
kubectl get namespace my-app --show-labels | grep dataplane-mode
```

2. Check if waypoint proxies are running (for L7 metrics):
```bash
kubectl get pods -n my-app -l gateway.networking.k8s.io/gateway-name=waypoint
```

3. Verify ztunnel is healthy on the node:
```bash
kubectl get pods -n istio-system -l app=ztunnel -o wide
```

4. Check the ztunnel admin interface:
```bash
kubectl exec -n istio-system ds/ztunnel -- curl -s localhost:15000/config_dump
```

Ambient mode telemetry gives you a cleaner separation between L4 and L7 observability. The tradeoff is that you need to understand which component generates which telemetry and deploy waypoint proxies for namespaces where you need full L7 visibility.
