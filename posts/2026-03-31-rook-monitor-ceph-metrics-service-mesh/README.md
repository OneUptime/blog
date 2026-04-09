# How to Monitor Ceph Storage Metrics Through Service Mesh

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Monitoring, Service Mesh, Prometheus, Observability, Kubernetes

Description: Learn how to collect and correlate Ceph storage metrics with service mesh telemetry to gain end-to-end visibility from application to storage layer.

---

## Combining Ceph and Service Mesh Observability

Running Ceph alongside a service mesh like Istio or Linkerd gives you an opportunity to correlate storage-level metrics with application-level metrics. You can see how storage latency affects application response times, which services are heaviest storage consumers, and trace slow requests end-to-end from the application through the mesh to the storage layer.

## Ceph Prometheus Metrics

Rook exposes Ceph metrics via the MGR Prometheus module. Enable it in the CephCluster:

```yaml
spec:
  monitoring:
    enabled: true
```

Verify metrics are accessible:

```bash
kubectl -n rook-ceph get svc rook-ceph-mgr
# Default port is 9283
curl http://<mgr-svc-ip>:9283/metrics | head -30
```

## Enabling Istio Metrics for Storage Traffic

Configure the Prometheus scrape config to collect both Ceph and Istio metrics:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: ceph-mgr-metrics
  namespace: rook-ceph
spec:
  selector:
    matchLabels:
      app: rook-ceph-mgr
  endpoints:
  - port: http-metrics
    interval: 30s
    path: /metrics
```

For Istio sidecar metrics from application pods:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: istio-sidecar-metrics
  namespace: my-app
spec:
  selector:
    matchLabels:
      security.istio.io/tlsMode: istio
  podMetricsEndpoints:
  - port: http-envoy-prom
    path: /stats/prometheus
```

## Correlating Application and Storage Metrics

Use PromQL to join service mesh and Ceph metrics:

```promql
# RGW request rate joined with pool write rate
sum(rate(istio_requests_total{destination_service="rook-ceph-rgw-my-store.rook-ceph.svc.cluster.local"}[5m]))
  * on() group_left
sum(rate(ceph_pool_wr[5m]))
```

Track P99 latency for S3 requests through the mesh:

```promql
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{
    destination_service=~".*rgw.*"
  }[5m])) by (le, destination_service))
```

## Setting Up Distributed Tracing

With Jaeger and Istio, you can trace requests from application to RGW:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: tracing-for-storage
  namespace: my-app
spec:
  tracing:
  - providers:
    - name: jaeger
    randomSamplingPercentage: 10.0
```

## Grafana Dashboard Configuration

Import both the Rook Ceph dashboard and the Istio service dashboard side by side. Create a custom dashboard that includes:

```json
{
  "panels": [
    {
      "title": "RGW Request Latency (P99)",
      "targets": [{"expr": "histogram_quantile(0.99, rate(istio_request_duration_milliseconds_bucket{destination_service=~\".*rgw.*\"}[5m]))"}]
    },
    {
      "title": "Ceph Pool Write Throughput",
      "targets": [{"expr": "rate(ceph_pool_wr_bytes[5m])"}]
    }
  ]
}
```

## Key Correlation Metrics

| Application Metric | Storage Metric | Correlation |
|---|---|---|
| `istio_request_duration` to RGW | `ceph_pool_wr_bytes` | Storage write latency |
| `istio_requests_total` errors | `ceph_health_status` | Cluster health impact |
| `istio_tcp_connections_opened_total` | `ceph_mds_sessions_sessions_open` | CephFS client load |

## Summary

Monitoring Ceph through a service mesh lens provides end-to-end visibility that neither Ceph nor the mesh alone can offer. Configure ServiceMonitors to scrape both the Ceph MGR Prometheus endpoint and Istio sidecar metrics, then use PromQL joins to correlate application-level latency with storage-layer performance. This allows you to quickly determine whether application slowdowns originate in the service mesh, the storage layer, or the application itself.
