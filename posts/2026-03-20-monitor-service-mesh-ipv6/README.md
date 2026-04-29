# How to Monitor IPv6 Traffic in Service Meshes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Service Mesh, IPv6, Monitoring, Prometheus, Grafana, Istio, Observability

Description: A guide to monitoring IPv6 traffic in service meshes using Prometheus metrics, Grafana dashboards, and distributed tracing to observe dual-stack service communication.

Service meshes expose rich telemetry for all traffic, including IPv6. This guide covers setting up monitoring for IPv6 service mesh traffic using Prometheus and Grafana, with specific guidance for Istio and Linkerd.

## Istio Metrics for IPv6 Traffic

Istio's Envoy sidecars expose Prometheus metrics at port 15090. These metrics are IP-version agnostic - they count all traffic regardless of IPv4 or IPv6:

```bash
# Check available metrics from a sidecar

kubectl exec <pod-name> -c istio-proxy -- \
  curl -s http://localhost:15090/stats/prometheus | \
  grep -E "istio_requests_total|istio_tcp_connections" | head -20

# Key metrics:
# istio_requests_total{connection_security_policy="mutual_tls",...}
# istio_request_duration_milliseconds_bucket{...}
# istio_tcp_connections_opened_total{...}
```

## Prometheus Queries for Dual-Stack Monitoring

```promql
# Total HTTP requests across all services (IPv4 + IPv6)
sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service_name)

# Request success rate per service
sum(rate(istio_requests_total{reporter="destination",response_code=~"2.*"}[5m])) by (destination_service_name)
/
sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service_name)

# P99 latency per service
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m]))
  by (destination_service_name, le)
)

# TCP connections opened (useful for IPv6 services)
sum(rate(istio_tcp_connections_opened_total[5m])) by (destination_service_name)
```

## Adding IPv6 Source Labels to Metrics

To distinguish IPv6 from IPv4 traffic, you can add a source IP dimension to Istio's Prometheus metrics using the Telemetry API. Note that the new tag must also be allow-listed in the mesh config's `extraStatTags` before it appears in Prometheus, and high-cardinality labels like raw IPs should be used carefully:

```yaml
# Telemetry API to add source IP as a metric dimension
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: add-source-ip-dimension
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-service
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_COUNT
          tagOverrides:
            source_ip:
              value: "string(source.address)"
```

## Grafana Dashboard for Dual-Stack Service Mesh

```json
// Grafana panel: IPv6 vs IPv4 connection count
// (Using node_exporter network metrics as proxy)
{
  "title": "Active Connections by IP Version",
  "type": "stat",
  "targets": [
    {
      "expr": "sum(node_sockstat_TCP6_inuse)",
      "legendFormat": "IPv6 TCP"
    },
    {
      "expr": "sum(node_sockstat_TCP_inuse)",
      "legendFormat": "IPv4 TCP"
    }
  ]
}
```

```bash
# Install Istio addons (Prometheus + Grafana + Kiali)
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/prometheus.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/grafana.yaml
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/kiali.yaml

# Access Grafana
istioctl dashboard grafana

# Access Kiali (shows service graph including dual-stack)
istioctl dashboard kiali
```

## Linkerd Metrics for IPv6

```bash
# Linkerd's golden metrics (success rate, RPS, latency) per service
linkerd viz stat deploy

# Edge-level metrics (includes direction and identity)
linkerd viz edges deploy/my-app

# Check if IPv6-sourced traffic appears
linkerd viz top deploy/my-app

# Tap traffic from a specific source workload
linkerd viz tap deploy/my-app --from deploy/client-app

# Route-level metrics (HTTPRoute)
linkerd viz stat httproutes -n default
```

## Linkerd Prometheus Queries

```promql
# Linkerd success rate per deployment
sum(
  rate(response_total{classification="success", namespace="default"}[1m])
) by (deployment)
/
sum(
  rate(response_total{namespace="default"}[1m])
) by (deployment)

# Linkerd P95 latency
histogram_quantile(0.95,
  sum(rate(response_latency_ms_bucket{namespace="default"}[1m]))
  by (deployment, le)
)
```

## Distributed Tracing for IPv6 Service Calls

```bash
# Install Jaeger for Istio
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/jaeger.yaml

# Access Jaeger dashboard
istioctl dashboard jaeger

# Traces show service calls including IPv6 connections
# Look for "x-forwarded-for" header with IPv6 addresses in trace attributes
```

## Alerting on IPv6 Service Mesh Issues

```yaml
# Prometheus AlertManager rules
groups:
  - name: service-mesh-ipv6
    interval: 30s
    rules:
      - alert: ServiceHighErrorRate
        expr: |
          sum(rate(istio_requests_total{response_code!~"2.*",reporter="destination"}[5m])) by (destination_service_name)
          /
          sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service_name)
          > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate on {{ $labels.destination_service_name }}"

      - alert: ServiceMeshIPv6HighLatency
        expr: |
          histogram_quantile(0.99,
            sum(rate(istio_request_duration_milliseconds_bucket[5m]))
            by (destination_service_name, le)
          ) > 1000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "P99 latency > 1s for {{ $labels.destination_service_name }}"
```

## Node-Level IPv6 Metrics

```bash
# Check IPv6 socket statistics on Kubernetes nodes
# (via node_exporter metrics)

# Active IPv6 TCP connections
curl -s http://localhost:9100/metrics | grep "node_sockstat_TCP6"

# IPv6 packet statistics
curl -s http://localhost:9100/metrics | grep "node_network_receive_packets_total" | \
  grep "eth0"

# Check IPv6 address assignment rate (SLAAC performance)
kubectl debug node/<node> -it --image=nicolaka/netshoot -- \
  chroot /host ip -6 -s neigh show
```

Monitoring IPv6 service mesh traffic is largely the same as monitoring IPv4 - the same Prometheus metrics, Grafana dashboards, and distributed traces capture all traffic regardless of IP version. The key is ensuring metrics cardinality doesn't increase excessively by adding source IP labels, and using node-level socket statistics to verify IPv6 connections are actually being established.
