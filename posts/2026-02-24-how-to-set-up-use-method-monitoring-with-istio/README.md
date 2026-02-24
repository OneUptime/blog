# How to Set Up USE Method Monitoring with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, USE Method, Monitoring, Resource Monitoring, SRE

Description: Implement USE method monitoring (Utilization, Saturation, Errors) for your Istio service mesh infrastructure, covering proxy resources, connection pools, and system-level metrics.

---

The USE method, created by Brendan Gregg, focuses on monitoring resources rather than requests. For every resource in your system, you track Utilization (how busy it is), Saturation (how much excess work is queued), and Errors (how many error events occurred). While the RED method monitors service behavior, USE monitors the infrastructure underneath.

## USE vs RED

RED answers "how are my services doing?" while USE answers "how are my resources doing?" In an Istio mesh, the resources you care about include:

- Envoy proxy CPU and memory
- Connection pools
- Circuit breaker state
- Thread pools
- Network bandwidth
- Listener connections

Monitoring both RED and USE gives you complete coverage. RED catches service-level problems, and USE catches the infrastructure problems that cause them.

## Proxy CPU Utilization

Each Envoy sidecar consumes CPU. Track it:

```promql
# CPU utilization per sidecar
sum(rate(container_cpu_usage_seconds_total{container="istio-proxy"}[5m])) by (pod, namespace)

# CPU utilization as a percentage of the limit
sum(rate(container_cpu_usage_seconds_total{container="istio-proxy"}[5m])) by (pod, namespace)
/
sum(kube_pod_container_resource_limits{container="istio-proxy", resource="cpu"}) by (pod, namespace)
* 100
```

High proxy CPU utilization means the sidecar is struggling to process traffic. This can happen with high request rates, large request/response bodies, or complex Lua/Wasm filters.

## Proxy Memory Utilization

```promql
# Memory usage per sidecar
sum(container_memory_working_set_bytes{container="istio-proxy"}) by (pod, namespace)

# Memory as percentage of limit
sum(container_memory_working_set_bytes{container="istio-proxy"}) by (pod, namespace)
/
sum(kube_pod_container_resource_limits{container="istio-proxy", resource="memory"}) by (pod, namespace)
* 100
```

Memory growth in the sidecar is often caused by high cardinality metrics, large routing tables, or many active connections.

## Connection Pool Utilization

Istio's connection pool settings (configured in DestinationRule) are a critical resource:

```promql
# Active connections per cluster
sum(envoy_cluster_upstream_cx_active{}) by (cluster_name)

# Connection utilization (active vs max)
# You need to know your configured maxConnections to calculate this
envoy_cluster_upstream_cx_active{cluster_name="outbound|8080||my-api.default.svc.cluster.local"}
```

Check your configured limits:

```bash
kubectl get destinationrule my-api -o yaml | grep -A 10 connectionPool
```

## Connection Pool Saturation

Saturation occurs when requests are waiting because the connection pool is full:

```promql
# Pending requests (saturation indicator)
sum(envoy_cluster_upstream_rq_pending_active{}) by (cluster_name)

# Connection pool overflow (requests rejected because pool is full)
sum(rate(envoy_cluster_upstream_cx_overflow{} [5m])) by (cluster_name)

# Pending request overflow
sum(rate(envoy_cluster_upstream_rq_pending_overflow{}[5m])) by (cluster_name)
```

When `upstream_cx_overflow` is increasing, your connection pool is too small or the upstream service is too slow.

## Listener Connection Utilization

Envoy listeners accept incoming connections:

```promql
# Active downstream connections
sum(envoy_listener_downstream_cx_active{}) by (pod)

# New connections per second
sum(rate(envoy_listener_downstream_cx_total{}[5m])) by (pod)
```

## Circuit Breaker Saturation

Circuit breakers create their own form of saturation:

```promql
# Requests rejected by circuit breaker
sum(rate(envoy_cluster_upstream_rq_retry_overflow{}[5m])) by (cluster_name)

# Outlier detection ejections
sum(rate(envoy_cluster_outlier_detection_ejections_total{}[5m])) by (cluster_name)

# Hosts currently ejected
sum(envoy_cluster_outlier_detection_ejections_active{}) by (cluster_name)
```

If ejections are high, your backends are unhealthy. If retry overflow is high, there are too many retries happening.

## Network Bandwidth Utilization

Track network throughput through the sidecars:

```promql
# Bytes received per second
sum(rate(istio_request_bytes_sum{reporter="destination"}[5m])) by (destination_service_name)

# Bytes sent per second
sum(rate(istio_response_bytes_sum{reporter="destination"}[5m])) by (destination_service_name)

# Total bandwidth per pod
sum(rate(container_network_receive_bytes_total{}[5m])) by (pod, namespace)
+
sum(rate(container_network_transmit_bytes_total{}[5m])) by (pod, namespace)
```

## Thread Pool and Worker Utilization

Envoy uses a threading model with worker threads:

```promql
# Worker thread count
envoy_server_concurrency{}

# Total connections across all workers
envoy_server_total_connections{}
```

## Errors in the USE Context

USE errors are different from RED errors. USE errors are resource-level failures, not request-level failures:

```promql
# TLS handshake failures (resource error)
sum(rate(envoy_listener_ssl_connection_error{}[5m])) by (pod)

# Connection timeouts (resource error)
sum(rate(envoy_cluster_upstream_cx_connect_timeout{}[5m])) by (cluster_name)

# Connection failures
sum(rate(envoy_cluster_upstream_cx_connect_fail{}[5m])) by (cluster_name)

# Destroyed connections due to overflow
sum(rate(envoy_cluster_upstream_cx_destroy_with_active_rq{}[5m])) by (cluster_name)
```

## istiod Resource Monitoring

Do not forget to monitor istiod itself:

```promql
# istiod CPU utilization
sum(rate(container_cpu_usage_seconds_total{container="discovery", namespace="istio-system"}[5m]))

# istiod memory
container_memory_working_set_bytes{container="discovery", namespace="istio-system"}

# xDS push queue depth (saturation)
pilot_xds_push_queue_time_bucket

# xDS push errors
sum(rate(pilot_xds_push_errors{}[5m]))

# Connected proxies
pilot_xds_pushes{}
```

## Building USE Alerts

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: use-alerts
  namespace: monitoring
spec:
  groups:
  - name: use-method
    rules:
    - alert: HighProxyCPU
      expr: |
        sum(rate(container_cpu_usage_seconds_total{container="istio-proxy"}[5m])) by (pod, namespace)
        /
        sum(kube_pod_container_resource_limits{container="istio-proxy", resource="cpu"}) by (pod, namespace)
        > 0.8
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Proxy CPU above 80% on {{ $labels.pod }}"

    - alert: HighProxyMemory
      expr: |
        sum(container_memory_working_set_bytes{container="istio-proxy"}) by (pod, namespace)
        /
        sum(kube_pod_container_resource_limits{container="istio-proxy", resource="memory"}) by (pod, namespace)
        > 0.85
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Proxy memory above 85% on {{ $labels.pod }}"

    - alert: ConnectionPoolSaturation
      expr: |
        sum(rate(envoy_cluster_upstream_cx_overflow{}[5m])) by (cluster_name) > 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Connection pool overflow on {{ $labels.cluster_name }}"

    - alert: HighConnectionErrors
      expr: |
        sum(rate(envoy_cluster_upstream_cx_connect_fail{}[5m])) by (cluster_name) > 1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Connection failures to {{ $labels.cluster_name }}"

    - alert: IstiodHighMemory
      expr: |
        container_memory_working_set_bytes{container="discovery", namespace="istio-system"} > 2e9
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "istiod memory usage above 2GB"
```

## USE Method Dashboard Layout

Organize your Grafana dashboard with one row per resource:

- Row 1: Proxy CPU (utilization gauge, saturation graph, error count)
- Row 2: Proxy Memory (utilization gauge, trend graph)
- Row 3: Connection Pools (active connections, pending requests, overflow)
- Row 4: Circuit Breakers (ejections, retry overflow)
- Row 5: Network (bandwidth in/out, connection rates)
- Row 6: istiod (CPU, memory, push queue, connected proxies)

Each row follows the USE pattern: utilization on the left, saturation in the middle, errors on the right.

The USE method is particularly valuable for capacity planning. When you see utilization trending upward over weeks, you know you need to increase resources before saturation kicks in. Combined with RED method monitoring, you get a complete picture of both service behavior and infrastructure health.
