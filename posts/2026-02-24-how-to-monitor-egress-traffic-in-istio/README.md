# How to Monitor Egress Traffic in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Egress, Monitoring, Prometheus, Observability

Description: How to monitor outbound traffic from your Istio service mesh using Prometheus metrics, access logs, and Grafana dashboards for egress visibility.

---

Knowing what your mesh is talking to on the outside is just as important as monitoring internal traffic. Egress monitoring helps you detect unauthorized external connections, track API usage, spot performance degradation with third-party services, and maintain compliance audit trails.

Istio provides several mechanisms for egress traffic visibility: sidecar proxy metrics, access logging, and egress gateway telemetry. This guide covers how to use each one effectively.

## What Istio Reports About Egress Traffic

When a pod makes an outbound connection, its sidecar proxy generates metrics and logs for that traffic. The level of detail depends on how the external service is configured:

- **With a ServiceEntry:** Istio knows the hostname, port, and protocol. You get full HTTP metrics (request count, latency, response codes) for HTTP/TLS services.
- **Without a ServiceEntry (ALLOW_ANY mode):** Istio still reports the traffic but the destination shows as `PassthroughCluster`. You get basic TCP metrics but limited HTTP-level detail.
- **Through an egress gateway:** You get metrics from both the sidecar and the egress gateway, giving you two points of visibility.

## Enabling Access Logging

Access logs are the most detailed source of egress information. Each outbound request gets a log entry with the destination, response code, latency, and bytes transferred.

Enable access logging mesh-wide:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: mesh-logging
  namespace: istio-system
spec:
  accessLogging:
  - providers:
    - name: envoy
```

Or enable it only for specific workloads:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: app-logging
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-app
  accessLogging:
  - providers:
    - name: envoy
```

Check the sidecar logs for outbound connections:

```bash
kubectl logs deploy/my-app -c istio-proxy | grep "outbound"
```

Each log line includes:
- Timestamp
- Source and destination IPs
- HTTP method, path, and status code (for HTTP traffic)
- Response duration
- Bytes sent and received
- Upstream cluster name (which tells you the destination)

## Key Prometheus Metrics for Egress

### Total Request Count by External Service

```promql
sum(rate(istio_requests_total{
  reporter="source",
  destination_service_namespace!~"default|kube-system|istio-system"
}[5m])) by (destination_service_name, source_workload)
```

This shows which internal workloads are making requests to which external services.

### Error Rate for External Services

```promql
sum(rate(istio_requests_total{
  reporter="source",
  destination_service=~".*external.*|.*api\\..*",
  response_code=~"5.."
}[5m])) by (destination_service_name)
/
sum(rate(istio_requests_total{
  reporter="source",
  destination_service=~".*external.*|.*api\\..*"
}[5m])) by (destination_service_name)
```

### Latency to External Services

```promql
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{
    reporter="source",
    destination_service_namespace="unknown"
  }[5m])) by (le, destination_service_name)
)
```

External services typically show `destination_service_namespace` as the namespace where the ServiceEntry lives, or `unknown` for passthrough traffic.

### Passthrough Traffic (Unregistered External Services)

```promql
sum(rate(istio_requests_total{
  reporter="source",
  destination_service_name="PassthroughCluster"
}[5m])) by (source_workload)
```

If you see traffic to `PassthroughCluster`, it means pods are reaching external services that don't have a ServiceEntry. In ALLOW_ANY mode, this is normal. In REGISTRY_ONLY mode, this should be zero.

### TCP Connection Metrics

For non-HTTP egress traffic (databases, Redis, etc.), use TCP metrics:

```promql
sum(rate(istio_tcp_connections_opened_total{
  reporter="source",
  destination_service_namespace!~"default|kube-system|istio-system"
}[5m])) by (destination_service_name, source_workload)
```

```promql
sum(rate(istio_tcp_sent_bytes_total{
  reporter="source",
  destination_service=~".*rds.*|.*redis.*"
}[5m])) by (destination_service_name)
```

## Monitoring Through the Egress Gateway

If you use an egress gateway, it generates its own set of metrics. This gives you centralized egress visibility:

```promql
# All traffic through the egress gateway
sum(rate(istio_requests_total{
  source_workload="istio-egressgateway"
}[5m])) by (destination_service_name, response_code)

# Egress gateway latency
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{
    source_workload="istio-egressgateway"
  }[5m])) by (le, destination_service_name)
)
```

Check the egress gateway logs directly:

```bash
kubectl logs -n istio-system deploy/istio-egressgateway --tail=50
```

## Grafana Dashboard for Egress Monitoring

Create a Grafana dashboard with these panels:

### Panel 1: Top External Services by Request Rate

```promql
topk(10, sum(rate(istio_requests_total{
  reporter="source",
  destination_service_namespace!~"default|kube-system|istio-system"
}[5m])) by (destination_service_name))
```

Visualization: bar chart or table, showing the most-accessed external services.

### Panel 2: External Service Error Rates

```promql
sum(rate(istio_requests_total{
  reporter="source",
  destination_service_namespace!~"default|kube-system|istio-system",
  response_code=~"5.."
}[5m])) by (destination_service_name)
```

Visualization: time series with threshold markers.

### Panel 3: Egress Traffic by Source Workload

```promql
sum(rate(istio_requests_total{
  reporter="source",
  destination_service_namespace!~"default|kube-system|istio-system"
}[5m])) by (source_workload)
```

Visualization: pie chart showing which services generate the most outbound traffic.

### Panel 4: Passthrough Traffic Alerts

```promql
sum(rate(istio_requests_total{
  destination_service_name="PassthroughCluster"
}[5m])) by (source_workload)
```

This should be zero if you are in REGISTRY_ONLY mode. Any non-zero value means something is misconfigured.

### Panel 5: Egress Bandwidth

```promql
sum(rate(istio_response_bytes_sum{
  reporter="source",
  destination_service_namespace!~"default|kube-system|istio-system"
}[5m])) by (destination_service_name)
```

This tracks how much data is being downloaded from external services.

## Alerting on Egress Anomalies

Set up alerts for unusual egress patterns:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: egress-alerts
  namespace: istio-system
spec:
  groups:
  - name: egress-monitoring
    rules:
    - alert: UnexpectedPassthroughTraffic
      expr: |
        sum(rate(istio_requests_total{destination_service_name="PassthroughCluster"}[5m])) > 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Traffic to unregistered external services detected"

    - alert: ExternalServiceHighErrorRate
      expr: |
        sum(rate(istio_requests_total{reporter="source", destination_service_namespace!~"default|kube-system|istio-system", response_code=~"5.."}[5m])) by (destination_service_name)
        /
        sum(rate(istio_requests_total{reporter="source", destination_service_namespace!~"default|kube-system|istio-system"}[5m])) by (destination_service_name)
        > 0.1
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "External service {{ $labels.destination_service_name }} has >10% error rate"

    - alert: EgressBandwidthSpike
      expr: |
        sum(rate(istio_response_bytes_sum{reporter="source", destination_service_namespace!~"default|kube-system|istio-system"}[5m]))
        > 100000000
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Egress bandwidth exceeds 100MB/s - possible data exfiltration"
```

## Distributed Tracing for Egress

If you have Jaeger or Zipkin configured with Istio, external service calls appear in traces. This helps you understand the latency impact of external dependencies:

```bash
kubectl port-forward svc/jaeger-query -n istio-system 16686:16686
```

In the Jaeger UI, look for spans with `upstream_cluster` containing `outbound|443||api.stripe.com`. The span duration shows the total time spent waiting for the external service.

## Exporting Egress Logs

For compliance or long-term analysis, export egress logs to a central logging system. Configure the Envoy access log format to include relevant fields:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: custom-logging
  namespace: istio-system
spec:
  accessLogging:
  - providers:
    - name: envoy
    filter:
      expression: "response.code >= 400 || connection.mtls == false"
```

This logs only errors and non-mTLS connections, reducing log volume while keeping the important events.

## Summary

Monitoring egress traffic in Istio uses Prometheus metrics, access logs, and egress gateway telemetry. Create ServiceEntries for external services to get detailed metrics with proper service names. Use Prometheus queries to track request rates, error rates, and latency for each external dependency. Set up alerts for unexpected passthrough traffic, high error rates, and bandwidth spikes. The egress gateway provides centralized visibility, while sidecar logs give per-workload detail. Together, these tools give you complete visibility into what your mesh is communicating with externally.
