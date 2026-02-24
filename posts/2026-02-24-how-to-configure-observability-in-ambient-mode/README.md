# How to Configure Observability in Ambient Mode

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Observability, Ambient Mesh, Prometheus, Grafana, Kubernetes

Description: Step-by-step guide to setting up metrics, tracing, and logging for Istio ambient mode workloads using Prometheus, Grafana, and Jaeger.

---

Observability in Istio ambient mode works differently from the sidecar model. With sidecars, every pod reported its own metrics and traces. In ambient mode, ztunnel reports L4 telemetry and waypoint proxies report L7 telemetry. You need to collect from both sources to get the full picture.

The split actually has some benefits. L4 metrics come automatically for every pod in the mesh without any extra configuration. L7 metrics only appear where you deploy waypoint proxies, which means you can be selective about where you pay the overhead.

## L4 Metrics from ztunnel

Every ztunnel instance exposes TCP-level metrics. These are available as soon as you enroll a namespace in ambient mode:

```bash
kubectl label namespace default istio.io/dataplane-mode=ambient
```

The ztunnel metrics endpoint is on port 15020. Key L4 metrics include:

- `istio_tcp_connections_opened_total` - New connections
- `istio_tcp_connections_closed_total` - Closed connections
- `istio_tcp_sent_bytes_total` - Outbound bytes
- `istio_tcp_received_bytes_total` - Inbound bytes
- `istio_tcp_connection_duration_milliseconds` - Connection duration

These metrics have labels for source and destination workload, namespace, and security principal, giving you a clear view of who is talking to whom.

## Scraping ztunnel with Prometheus

If you're using the Prometheus Operator, set up a PodMonitor:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: ztunnel
  namespace: istio-system
  labels:
    release: prometheus
spec:
  selector:
    matchLabels:
      app: ztunnel
  podMetricsEndpoints:
  - port: http-monitoring
    path: /metrics
    interval: 15s
    relabelings:
    - sourceLabels: [__meta_kubernetes_pod_node_name]
      targetLabel: node
```

For vanilla Prometheus, add the scrape config to your prometheus.yml:

```yaml
scrape_configs:
- job_name: 'ztunnel'
  kubernetes_sd_configs:
  - role: pod
    namespaces:
      names:
      - istio-system
  relabel_configs:
  - source_labels: [__meta_kubernetes_pod_label_app]
    action: keep
    regex: ztunnel
  - source_labels: [__meta_kubernetes_pod_ip]
    action: replace
    target_label: __address__
    regex: (.+)
    replacement: ${1}:15020
```

Verify metrics are being scraped by checking Prometheus targets:

```bash
kubectl port-forward -n monitoring svc/prometheus 9090:9090 &
curl -s localhost:9090/api/v1/targets | python3 -m json.tool | grep ztunnel
```

## L7 Metrics from Waypoint Proxies

To get HTTP-level metrics (request count, latency, response codes), you need a waypoint proxy:

```bash
istioctl waypoint apply --namespace default --enroll-namespace
```

Once deployed, waypoint proxies expose the standard Istio HTTP metrics:

- `istio_requests_total` - Request count with response code labels
- `istio_request_duration_milliseconds` - Request duration histogram
- `istio_request_bytes` - Request body size
- `istio_response_bytes` - Response body size

Scrape waypoint proxy metrics with another PodMonitor:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: waypoint-proxies
  namespace: default
spec:
  selector:
    matchLabels:
      gateway.networking.k8s.io/gateway-name: waypoint
  podMetricsEndpoints:
  - port: http-envoy-prom
    path: /stats/prometheus
    interval: 15s
```

## Setting Up Grafana Dashboards

Istio provides pre-built Grafana dashboards, but they're designed for the sidecar model. You'll need to adapt them for ambient mode. Here are some useful PromQL queries:

**TCP connections per service:**

```
sum(rate(istio_tcp_connections_opened_total{reporter="destination"}[5m])) by (destination_workload, destination_workload_namespace)
```

**Bytes transferred between services:**

```
sum(rate(istio_tcp_sent_bytes_total{reporter="source"}[5m])) by (source_workload, destination_workload)
```

**HTTP request rate (requires waypoint):**

```
sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_workload, response_code)
```

**P99 latency (requires waypoint):**

```
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m])) by (destination_workload, le))
```

**Error rate:**

```
sum(rate(istio_requests_total{reporter="destination", response_code=~"5.."}[5m])) by (destination_workload) / sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_workload)
```

To import these into Grafana, create a ConfigMap-based dashboard or use Grafana's UI to add panels with these queries.

## Distributed Tracing

Tracing in ambient mode works through the waypoint proxy. The waypoint injects trace headers into HTTP traffic, similar to how sidecars did it.

First, install Jaeger or your preferred tracing backend:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.24/samples/addons/jaeger.yaml
```

Configure the mesh to send traces. In your Istio installation:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      tracing:
        sampling: 100
    extensionProviders:
    - name: jaeger
      opentelemetry:
        port: 4317
        service: jaeger-collector.istio-system.svc.cluster.local
```

Or use the Telemetry API for more fine-grained control:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: tracing-config
  namespace: istio-system
spec:
  tracing:
  - providers:
    - name: jaeger
    randomSamplingPercentage: 10
```

Note that ztunnel does not generate traces since it operates at L4. Traces are only generated by waypoint proxies for L7 traffic.

## Access Logging

You can configure access logging for both ztunnel and waypoint proxies.

For waypoint proxy access logs, use the Telemetry API:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: access-logging
  namespace: default
spec:
  accessLogging:
  - providers:
    - name: envoy
```

This produces access logs in the waypoint proxy that show HTTP request details:

```bash
kubectl logs -n default -l gateway.networking.k8s.io/gateway-name=waypoint -c istio-proxy --tail=50
```

For ztunnel logs, you can adjust the verbosity:

```bash
ZTUNNEL_POD=$(kubectl get pods -n istio-system -l app=ztunnel -o jsonpath='{.items[0].metadata.name}')
istioctl ztunnel-config log $ZTUNNEL_POD --level info
```

## OpenTelemetry Integration

If you're using OpenTelemetry Collector, you can route both metrics and traces through it:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    extensionProviders:
    - name: otel
      opentelemetry:
        port: 4317
        service: otel-collector.observability.svc.cluster.local
```

Then configure the Telemetry resource to use it:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: otel-config
  namespace: istio-system
spec:
  tracing:
  - providers:
    - name: otel
    randomSamplingPercentage: 5
  metrics:
  - providers:
    - name: prometheus
```

## Verifying Everything Works

After setting up observability, run a quick test to make sure data flows through:

```bash
# Generate some traffic
kubectl run test-client -n default --image=curlimages/curl --rm -it -- sh -c 'for i in $(seq 1 100); do curl -s http://my-app.default.svc.cluster.local:8080/health; done'

# Check ztunnel metrics
kubectl exec -n istio-system $ZTUNNEL_POD -- curl -s localhost:15020/metrics | grep istio_tcp

# Check waypoint metrics
WAYPOINT_POD=$(kubectl get pods -n default -l gateway.networking.k8s.io/gateway-name=waypoint -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n default $WAYPOINT_POD -c istio-proxy -- curl -s localhost:15020/stats/prometheus | grep istio_requests
```

If ztunnel metrics show TCP connections but waypoint metrics are empty, either the waypoint isn't processing traffic or the metrics endpoint is misconfigured. Double-check that the namespace waypoint enrollment is correct.

Setting up observability in ambient mode takes a bit more work than with sidecars, but the result is actually cleaner: L4 metrics everywhere for free, and L7 metrics only where you choose to deploy waypoint proxies. That gives you the right balance of visibility and resource efficiency.
