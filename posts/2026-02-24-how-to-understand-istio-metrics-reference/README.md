# How to Understand Istio Metrics Reference

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Metrics, Prometheus, Observability, Monitoring, Kubernetes

Description: A practical reference for all standard Istio metrics including request counts, durations, TCP metrics, labels, and how to query them with Prometheus.

---

Istio generates a rich set of metrics from every sidecar proxy in your mesh. These metrics cover HTTP requests, TCP connections, gRPC calls, and more. Understanding what each metric means and what labels are available is essential for building effective dashboards and alerts. This post covers every standard metric Istio produces.

## How Istio Metrics Work

Each Envoy sidecar collects metrics about traffic flowing through it. These metrics are exposed on port 15020 at the `/stats/prometheus` endpoint and scraped by Prometheus. Istio generates metrics on both the client side (outbound) and server side (inbound) of every request, giving you visibility from both perspectives.

The metrics follow Prometheus naming conventions and use labels (also called dimensions or tags) to add context like source service, destination service, response code, and more.

## HTTP/gRPC Metrics

### istio_requests_total

```text
istio_requests_total{
  reporter="source",
  source_workload="productpage-v1",
  source_workload_namespace="bookinfo",
  source_principal="cluster.local/ns/bookinfo/sa/bookinfo-productpage",
  source_app="productpage",
  source_version="v1",
  source_cluster="Kubernetes",
  destination_workload="reviews-v1",
  destination_workload_namespace="bookinfo",
  destination_principal="cluster.local/ns/bookinfo/sa/bookinfo-reviews",
  destination_app="reviews",
  destination_version="v1",
  destination_service="reviews.bookinfo.svc.cluster.local",
  destination_service_name="reviews",
  destination_service_namespace="bookinfo",
  destination_cluster="Kubernetes",
  request_protocol="http",
  response_code="200",
  grpc_response_status="",
  response_flags="-",
  connection_security_policy="mutual_tls"
}
```

This is a counter that increments for every request. It is the most commonly used Istio metric.

Useful Prometheus queries:

```promql
# Request rate per service
rate(istio_requests_total{reporter="source"}[5m])

# Error rate (5xx)
sum(rate(istio_requests_total{reporter="source",response_code=~"5.."}[5m]))
  /
sum(rate(istio_requests_total{reporter="source"}[5m]))

# Requests per second by destination
sum(rate(istio_requests_total{reporter="destination"}[5m])) by (destination_service_name)
```

### istio_request_duration_milliseconds

A histogram of request durations in milliseconds. This tracks how long it takes for the upstream to respond.

```promql
# P50 latency
histogram_quantile(0.50,
  sum(rate(istio_request_duration_milliseconds_bucket{reporter="source"}[5m])) by (le, destination_service_name)
)

# P99 latency
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{reporter="destination"}[5m])) by (le, destination_service_name)
)

# Average latency
sum(rate(istio_request_duration_milliseconds_sum{reporter="source"}[5m])) by (destination_service_name)
  /
sum(rate(istio_request_duration_milliseconds_count{reporter="source"}[5m])) by (destination_service_name)
```

### istio_request_bytes

A histogram of request body sizes in bytes.

```promql
# Average request size
sum(rate(istio_request_bytes_sum{reporter="source"}[5m])) by (destination_service_name)
  /
sum(rate(istio_request_bytes_count{reporter="source"}[5m])) by (destination_service_name)
```

### istio_response_bytes

A histogram of response body sizes in bytes.

```promql
# Average response size
sum(rate(istio_response_bytes_sum{reporter="destination"}[5m])) by (destination_service_name)
  /
sum(rate(istio_response_bytes_count{reporter="destination"}[5m])) by (destination_service_name)
```

### istio_request_messages_total

A counter for gRPC request messages (streaming). Each message in a gRPC stream increments this counter.

### istio_response_messages_total

A counter for gRPC response messages (streaming).

## TCP Metrics

### istio_tcp_connections_opened_total

```text
istio_tcp_connections_opened_total{
  reporter="source",
  source_workload="backend-v1",
  destination_service="database.default.svc.cluster.local",
  ...
}
```

Counts new TCP connections opened. Useful for monitoring connection patterns.

```promql
# New connections per second
rate(istio_tcp_connections_opened_total{reporter="source"}[5m])
```

### istio_tcp_connections_closed_total

Counts TCP connections that have been closed.

```promql
# Connection churn rate
rate(istio_tcp_connections_opened_total[5m]) + rate(istio_tcp_connections_closed_total[5m])
```

### istio_tcp_sent_bytes_total

Total bytes sent over TCP connections.

```promql
# Throughput (bytes per second)
rate(istio_tcp_sent_bytes_total{reporter="source"}[5m])
```

### istio_tcp_received_bytes_total

Total bytes received over TCP connections.

## Standard Labels

Every Istio metric includes a set of standard labels. Here is what each one means:

### Reporter

```text
reporter="source"   # Metric reported by the client-side proxy
reporter="destination"  # Metric reported by the server-side proxy
```

Every request generates metrics on both sides. The source reporter measures from the caller's perspective, the destination reporter from the receiver's perspective. The difference in latency between the two is roughly the network latency plus sidecar processing overhead.

### Source Labels

- `source_workload` - the name of the source workload (deployment name)
- `source_workload_namespace` - namespace of the source
- `source_principal` - SPIFFE identity of the source (from mTLS cert)
- `source_app` - the `app` label on the source pod
- `source_version` - the `version` label on the source pod
- `source_cluster` - the cluster name the source belongs to

### Destination Labels

- `destination_workload` - name of the destination workload
- `destination_workload_namespace` - namespace of the destination
- `destination_principal` - SPIFFE identity of the destination
- `destination_app` - the `app` label on the destination pod
- `destination_version` - the `version` label on the destination pod
- `destination_service` - FQDN of the destination service
- `destination_service_name` - short name of the destination service
- `destination_service_namespace` - namespace of the destination service
- `destination_cluster` - cluster of the destination

### Request Labels

- `request_protocol` - HTTP, gRPC, or tcp
- `response_code` - HTTP status code (200, 404, 503, etc.)
- `grpc_response_status` - gRPC status code (0 for OK, etc.)
- `connection_security_policy` - `mutual_tls`, `none`, or `unknown`

### Response Flags

The `response_flags` label indicates special handling by Envoy:

- `-` - no flags (normal response)
- `DC` - downstream connection termination
- `DI` - delay injection
- `FI` - fault injection
- `LH` - local service failed health check
- `LR` - local reset
- `NR` - no route configured
- `RL` - rate limited
- `UAEX` - unauthorized external service
- `UC` - upstream connection termination
- `UF` - upstream connection failure
- `UH` - no healthy upstream
- `UO` - upstream overflow (circuit breaking)
- `UR` - upstream remote reset
- `URX` - upstream retry limit exceeded
- `UT` - upstream request timeout

These flags are invaluable for debugging. For example, if you see a lot of `UO` flags, your circuit breaker settings are too aggressive.

```promql
# Requests hitting circuit breaker
sum(rate(istio_requests_total{response_flags="UO"}[5m])) by (destination_service_name)
```

## Control Plane Metrics

Istio also exposes control plane metrics from istiod:

### pilot_xds_pushes

Counts configuration pushes to proxies.

```promql
rate(pilot_xds_pushes[5m])
```

### pilot_proxy_convergence_time

How long it takes for configuration changes to reach all proxies.

### pilot_conflict_inbound_listener and pilot_conflict_outbound_listener_tcp_over_current_tcp

Indicate configuration conflicts detected by istiod.

### pilot_xds

Number of connected proxies by type (CDS, LDS, RDS, EDS).

```promql
pilot_xds{type="cds"}
```

## Customizing Metrics

You can add, remove, or modify metric labels using the Telemetry API:

```yaml
apiVersion: telemetry.istio.io/v1alpha1
kind: Telemetry
metadata:
  name: custom-metrics
  namespace: default
spec:
  metrics:
    - providers:
        - name: prometheus
      overrides:
        - match:
            metric: REQUEST_COUNT
          tagOverrides:
            request_host:
              operation: UPSERT
              value: "request.host"
        - match:
            metric: REQUEST_DURATION
          tagOverrides:
            source_version:
              operation: REMOVE
```

Be careful when adding labels because they increase metric cardinality, which affects Prometheus storage and query performance.

## Building Useful Dashboards

The golden signals for a service mesh are:

1. Request rate
2. Error rate
3. Latency (P50, P95, P99)
4. Saturation (connections, active requests)

```promql
# RED metrics for a service
# Rate
sum(rate(istio_requests_total{destination_service_name="reviews",reporter="destination"}[5m]))

# Errors
sum(rate(istio_requests_total{destination_service_name="reviews",reporter="destination",response_code=~"5.."}[5m]))

# Duration (P99)
histogram_quantile(0.99,
  sum(rate(istio_request_duration_milliseconds_bucket{destination_service_name="reviews",reporter="destination"}[5m])) by (le)
)
```

Understanding these metrics thoroughly is the foundation for observability in your Istio mesh. Build your monitoring around the standard metrics, customize with the Telemetry API when needed, and use response flags to quickly identify the root cause of issues.
