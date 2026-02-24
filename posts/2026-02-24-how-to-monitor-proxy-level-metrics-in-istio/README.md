# How to Monitor Proxy-Level Metrics in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Proxy Metrics, Monitoring, Kubernetes

Description: Monitor Envoy proxy-level metrics in Istio to track connection pools, circuit breakers, memory usage, and sidecar health across your service mesh.

---

Istio's service-level metrics (like `istio_requests_total`) get most of the attention, but underneath those are thousands of Envoy proxy-level metrics that give you much deeper insight into what's happening at the network layer. These proxy metrics tell you about connection pool health, circuit breaker state, memory usage, TLS handshake performance, and more. When service-level metrics show a problem, proxy metrics help you figure out why.

## Where Proxy Metrics Come From

Every Envoy sidecar in your mesh exposes its own stats. You can see them raw by hitting the admin endpoint:

```bash
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/stats
```

This dumps thousands of lines of metrics. The Prometheus-formatted version is available on port 15020:

```bash
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15020/stats/prometheus | wc -l
```

Don't be surprised if you see 5000+ lines. Envoy is very thorough about what it tracks.

## Categories of Proxy Metrics

Envoy metrics fall into several categories:

- **Server metrics** (`envoy_server_*`) - Envoy process health
- **Cluster metrics** (`envoy_cluster_*`) - upstream connection stats per destination
- **Listener metrics** (`envoy_listener_*`) - inbound connection stats
- **HTTP connection manager metrics** (`envoy_http_*`) - HTTP-specific stats
- **TLS metrics** - certificate and handshake stats

## Server Metrics

These tell you about the Envoy process itself:

```promql
# Is the proxy alive? (1 = live, 0 = not)
envoy_server_live{pod="my-service-abc123"}

# Memory allocated by Envoy
envoy_server_memory_allocated{pod="my-service-abc123"}

# Memory reserved (heap size)
envoy_server_memory_heap_size{pod="my-service-abc123"}

# How long the proxy has been running (uptime in seconds)
envoy_server_uptime{pod="my-service-abc123"}

# Number of hot restarts
envoy_server_hot_restart_epoch{pod="my-service-abc123"}

# Total connections
envoy_server_total_connections{pod="my-service-abc123"}
```

Track memory usage across all sidecars to spot memory leaks or services that need more sidecar resources:

```promql
# Top 10 sidecars by memory usage
topk(10,
  envoy_server_memory_allocated
)
```

## Cluster (Upstream) Metrics

Cluster metrics are some of the most useful for debugging. In Envoy terminology, a "cluster" is an upstream service. Each destination your service talks to gets its own set of cluster metrics.

### Connection Pool Health

```promql
# Active connections to upstream
envoy_cluster_upstream_cx_active{
  cluster_name="outbound|8080||payment-service.production.svc.cluster.local"
}

# Total connections created over time
rate(envoy_cluster_upstream_cx_total{
  cluster_name=~"outbound.*payment-service.*"
}[5m])

# Connection failures
rate(envoy_cluster_upstream_cx_connect_fail{
  cluster_name=~"outbound.*payment-service.*"
}[5m])

# Connection timeouts
rate(envoy_cluster_upstream_cx_connect_timeout{
  cluster_name=~"outbound.*payment-service.*"
}[5m])
```

### Request Metrics Per Upstream

```promql
# Active requests to upstream
envoy_cluster_upstream_rq_active{
  cluster_name=~"outbound.*payment-service.*"
}

# Request timeouts
rate(envoy_cluster_upstream_rq_timeout{
  cluster_name=~"outbound.*payment-service.*"
}[5m])

# Pending requests (queued, waiting for a connection)
envoy_cluster_upstream_rq_pending_active{
  cluster_name=~"outbound.*payment-service.*"
}

# Requests that overflowed (exceeded pending limit)
rate(envoy_cluster_upstream_rq_pending_overflow{
  cluster_name=~"outbound.*payment-service.*"
}[5m])
```

Pending request overflow is a key indicator that your connection pool is too small or the upstream is too slow.

### Circuit Breaker Metrics

If you've configured circuit breakers in DestinationRules, these metrics show when they're tripping:

```promql
# Requests rejected by circuit breaker
rate(envoy_cluster_upstream_rq_pending_overflow{
  cluster_name=~"outbound.*"
}[5m])

# Max connections circuit breaker
envoy_cluster_circuit_breakers_default_cx_open{
  cluster_name=~"outbound.*payment-service.*"
}

# Max pending requests circuit breaker
envoy_cluster_circuit_breakers_default_rq_pending_open{
  cluster_name=~"outbound.*payment-service.*"
}

# Max requests circuit breaker
envoy_cluster_circuit_breakers_default_rq_open{
  cluster_name=~"outbound.*payment-service.*"
}
```

A value of `1` for any of these means the circuit breaker is currently open (tripped).

### Health Check Metrics

```promql
# Healthy hosts in the upstream cluster
envoy_cluster_membership_healthy{
  cluster_name=~"outbound.*payment-service.*"
}

# Total hosts in the upstream cluster
envoy_cluster_membership_total{
  cluster_name=~"outbound.*payment-service.*"
}

# Healthy percentage
envoy_cluster_membership_healthy / envoy_cluster_membership_total
```

## Listener Metrics

Listener metrics tell you about inbound connections:

```promql
# Active inbound connections
envoy_listener_downstream_cx_active{
  listener_address=~".*:8080"
}

# New connections per second
rate(envoy_listener_downstream_cx_total{
  listener_address=~".*:8080"
}[5m])

# Rejected connections (listener overflow)
rate(envoy_listener_downstream_cx_overflow{
  listener_address=~".*:8080"
}[5m])
```

## HTTP Connection Manager Metrics

These provide HTTP-specific stats:

```promql
# Active HTTP requests being processed
envoy_http_downstream_rq_active

# Request rate by response code class
rate(envoy_http_downstream_rq_xx{envoy_response_code_class="5"}[5m])

# Websocket connections
envoy_http_downstream_cx_websocket_active
```

## TLS Metrics

Track TLS handshake performance and errors:

```promql
# TLS handshake count
rate(envoy_listener_ssl_handshake{listener_address=~".*:8080"}[5m])

# TLS handshake errors
rate(envoy_listener_ssl_connection_error{listener_address=~".*:8080"}[5m])

# Certificate expiration (days remaining)
envoy_server_days_until_first_cert_expiring
```

The certificate expiration metric is particularly useful for alerting. Set an alert when it drops below a threshold:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: envoy-cert-expiry
  namespace: monitoring
spec:
  groups:
    - name: envoy-tls
      rules:
        - alert: EnvoyCertExpiringSoon
          expr: envoy_server_days_until_first_cert_expiring < 7
          for: 1h
          labels:
            severity: warning
          annotations:
            summary: "Envoy certificate expiring in {{ $value }} days on {{ $labels.pod }}"
```

## Controlling Which Proxy Metrics Are Collected

By default, Istio only exposes a subset of Envoy metrics to Prometheus. This keeps metric cardinality manageable. You can control which metrics get exposed:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyStatsMatcher:
        inclusionRegexps:
          - ".*circuit_breakers.*"
          - ".*upstream_cx.*"
          - ".*upstream_rq.*"
        inclusionPrefixes:
          - "envoy.cluster.upstream_cx"
          - "envoy.cluster.upstream_rq"
```

Or on a per-pod basis using annotations:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          proxyStatsMatcher:
            inclusionRegexps:
              - ".*circuit_breakers.*"
              - ".*upstream_rq_pending.*"
```

## Useful Debugging Queries

When things go wrong, these proxy-level queries help pinpoint the issue:

```promql
# Which services have upstream connection failures?
sum(rate(envoy_cluster_upstream_cx_connect_fail[5m])) by (cluster_name) > 0

# Which sidecars are using the most memory?
topk(10, envoy_server_memory_allocated)

# Are any circuit breakers open right now?
envoy_cluster_circuit_breakers_default_cx_open == 1
or
envoy_cluster_circuit_breakers_default_rq_open == 1
or
envoy_cluster_circuit_breakers_default_rq_pending_open == 1

# Which listeners are overflowing?
rate(envoy_listener_downstream_cx_overflow[5m]) > 0
```

## Building a Proxy Health Dashboard

Create a Grafana dashboard specifically for proxy health with these panels:

1. **Sidecar Memory Usage** - bar gauge showing memory per pod
2. **Connection Pool Status** - table showing active connections, pending requests, and overflow counts per upstream
3. **Circuit Breaker State** - stat panel showing open/closed state per upstream
4. **TLS Certificate Expiry** - gauge showing days until expiry
5. **Connection Errors** - time series of connection failures by destination

Proxy-level metrics are your second line of investigation after service-level metrics. When you see high latency or errors at the service level, dive into proxy metrics to understand whether it's connection pool exhaustion, circuit breaker activation, or something else at the network layer.
