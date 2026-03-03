# How to Configure Envoy Stats Collection in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Envoy, Stats, Prometheus, Configuration

Description: Configure which Envoy proxy statistics are collected and exposed to Prometheus in Istio using proxyStatsMatcher and stat prefix customization.

---

Every Envoy sidecar in your Istio mesh generates thousands of internal statistics. These stats cover everything from connection pool sizes to TLS handshake counts to HTTP codec details. By default, Istio only exposes a small subset to Prometheus to keep cardinality manageable. But when you're debugging connection issues, circuit breaker behavior, or proxy performance, you need access to those hidden Envoy stats. Configuring which stats get collected and exported gives you the observability you need without overwhelming your monitoring stack.

## The Default Behavior

By default, Istio exposes these Envoy stats to Prometheus:

- The standard `istio_*` metrics (requests total, duration, bytes, TCP)
- Basic `envoy_server_*` metrics (uptime, memory, live status)

Most of the detailed `envoy_cluster_*`, `envoy_listener_*`, and `envoy_http_*` stats are not exposed by default. You can see all of them by querying the Envoy admin interface directly:

```bash
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15000/stats | wc -l
```

Depending on how many upstream services the pod communicates with, you might see 5000+ stats. Compare that to what Prometheus actually scrapes:

```bash
kubectl exec <pod-name> -c istio-proxy -- curl -s localhost:15020/stats/prometheus | wc -l
```

The difference is the stats that Istio is filtering out.

## Enabling Specific Stats with proxyStatsMatcher

The `proxyStatsMatcher` field in the mesh config or pod annotations controls which Envoy-native stats get exposed to Prometheus. You can specify stats by prefix, suffix, or regex.

### Mesh-Wide Configuration

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      proxyStatsMatcher:
        inclusionPrefixes:
          - cluster.outbound
          - cluster.inbound
          - listener
          - server.memory
          - component
        inclusionSuffixes:
          - upstream_cx_active
          - upstream_cx_total
          - upstream_rq_active
          - upstream_rq_total
          - upstream_rq_pending_active
        inclusionRegexps:
          - ".*circuit_breakers.*"
          - ".*upstream_rq_retry.*"
          - ".*ssl.*handshake.*"
```

After applying this, new pods will expose the matching stats. Existing pods need to be restarted.

### Per-Pod Configuration

For debugging specific workloads without affecting the entire mesh:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: problematic-service
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          proxyStatsMatcher:
            inclusionPrefixes:
              - cluster.outbound
              - listener.0.0.0.0
            inclusionRegexps:
              - ".*upstream_cx.*"
              - ".*upstream_rq.*"
              - ".*circuit_breakers.*"
              - ".*retry.*"
              - ".*timeout.*"
    spec:
      containers:
        - name: app
          image: my-app:latest
```

This is great for temporary debugging. Add the annotation, restart the pod, collect data, then remove the annotation.

## Common Stats Categories

### Connection Pool Stats

These are critical for debugging connection issues:

```yaml
proxyStatsMatcher:
  inclusionPrefixes:
    - cluster.outbound
  inclusionSuffixes:
    - upstream_cx_active
    - upstream_cx_total
    - upstream_cx_connect_fail
    - upstream_cx_connect_timeout
    - upstream_cx_destroy
    - upstream_cx_destroy_with_active_rq
    - upstream_cx_overflow
    - upstream_cx_pool_overflow
```

Query examples:

```promql
# Active connections per upstream cluster
envoy_cluster_upstream_cx_active

# Connection failures
rate(envoy_cluster_upstream_cx_connect_fail[5m])

# Connection pool overflow (no connections available)
rate(envoy_cluster_upstream_cx_overflow[5m])
```

### Circuit Breaker Stats

```yaml
proxyStatsMatcher:
  inclusionRegexps:
    - ".*circuit_breakers.*"
```

This exposes:

```promql
# Is the max connections circuit breaker open?
envoy_cluster_circuit_breakers_default_cx_open

# Is the max pending requests circuit breaker open?
envoy_cluster_circuit_breakers_default_rq_pending_open

# Is the max requests circuit breaker open?
envoy_cluster_circuit_breakers_default_rq_open

# Remaining capacity before circuit breaker trips
envoy_cluster_circuit_breakers_default_remaining_cx
envoy_cluster_circuit_breakers_default_remaining_pending
envoy_cluster_circuit_breakers_default_remaining_rq
```

### Request Stats

```yaml
proxyStatsMatcher:
  inclusionSuffixes:
    - upstream_rq_active
    - upstream_rq_total
    - upstream_rq_pending_active
    - upstream_rq_pending_overflow
    - upstream_rq_timeout
    - upstream_rq_retry
    - upstream_rq_retry_success
    - upstream_rq_retry_overflow
    - upstream_rq_cancelled
```

### TLS/SSL Stats

```yaml
proxyStatsMatcher:
  inclusionRegexps:
    - ".*ssl.*"
    - ".*handshake.*"
```

Query TLS handshake information:

```promql
# TLS handshake count
rate(envoy_listener_ssl_handshake[5m])

# TLS connection errors
rate(envoy_listener_ssl_connection_error[5m])

# Certificate days until expiry
envoy_server_days_until_first_cert_expiring
```

### HTTP Connection Manager Stats

```yaml
proxyStatsMatcher:
  inclusionPrefixes:
    - http.inbound
    - http.outbound
```

These give you HTTP-layer details:

```promql
# Active downstream requests
envoy_http_downstream_rq_active

# Downstream request timeouts
rate(envoy_http_downstream_rq_timeout[5m])

# Response code breakdown
rate(envoy_http_downstream_rq_xx{envoy_response_code_class="5"}[5m])
```

### Listener Stats

```yaml
proxyStatsMatcher:
  inclusionPrefixes:
    - listener
```

Track inbound connection behavior:

```promql
# Active downstream connections
envoy_listener_downstream_cx_active

# Connection overflow (too many connections)
rate(envoy_listener_downstream_cx_overflow[5m])
```

## Stat Name Format

Understanding Envoy's stat naming helps you write better matchers. Stats follow this pattern:

```text
<prefix>.<qualifier>.<stat_name>
```

For cluster (upstream) stats:
```text
cluster.outbound|8080||api-service.production.svc.cluster.local.upstream_cx_active
```

For listener (downstream) stats:
```text
listener.0.0.0.0_15006.downstream_cx_active
```

When these are exported to Prometheus, dots become underscores and pipes become dots:
```text
envoy_cluster_upstream_cx_active{cluster_name="outbound|8080||api-service.production.svc.cluster.local"}
```

## Customizing Stat Tags

You can add custom tags (labels) to Envoy stats using `extraStatTags` in the mesh config:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      extraStatTags:
        - "request_method"
```

This only works if the tag is already being extracted somewhere in the Envoy configuration (like through a stats tag specifier in the bootstrap config). For most custom labeling needs, the Telemetry API is a better choice.

## Using EnvoyFilter for Advanced Stats

For complete control, use an EnvoyFilter to configure the stats sink directly:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: stats-config
  namespace: istio-system
spec:
  configPatches:
    - applyTo: BOOTSTRAP
      patch:
        operation: MERGE
        value:
          stats_config:
            stats_tags:
              - tag_name: destination_service
                regex: "(.*?)\\."
            use_all_default_tags: true
```

## Prometheus Configuration for Envoy Stats

When you enable more Envoy stats, make sure Prometheus is configured to handle the increase. Consider adding metric relabeling to drop stats you don't actually need:

```yaml
podMetricsEndpoints:
  - path: /stats/prometheus
    port: http-envoy-prom
    interval: 30s
    metricRelabelings:
      # Only keep specific envoy metrics
      - sourceLabels: [__name__]
        regex: "envoy_(cluster|listener|server|http)_.*"
        action: keep
      # Drop high-cardinality cluster name label values we don't need
      - sourceLabels: [cluster_name]
        regex: "outbound.*BlackHoleCluster.*"
        action: drop
```

## Debugging with Stats

When you need to debug a specific issue, temporarily enable all relevant stats and then look for anomalies:

```bash
# Enable all stats for a pod (temporary, revert when done)
kubectl annotate pod <pod-name> \
  proxy.istio.io/config='{"proxyStatsMatcher":{"inclusionRegexps":[".*"]}}' \
  --overwrite

# Restart the pod to pick up the annotation
kubectl delete pod <pod-name>

# After it's back up, dump all stats
kubectl exec <pod-name> -c istio-proxy -- \
  curl -s localhost:15000/stats | grep -i "error\|fail\|timeout\|overflow\|reject"
```

Remember to remove the annotation when you're done or the sidecar will export thousands of extra time series.

## Storage Impact

Each additional stat pattern you enable translates to more Prometheus time series. A rough estimate:

- Connection pool stats per upstream cluster: ~20 time series per cluster
- Circuit breaker stats per cluster: ~10 time series per cluster
- TLS stats per listener: ~5 time series per listener
- A pod with 50 upstream clusters and all stats enabled: ~1500+ additional time series

Multiply by the number of pods in your mesh, and it adds up fast. Start with the stats you actually need for your debugging or monitoring use case, and expand only when necessary.

Envoy stats are the deepest layer of observability in your Istio mesh. The default Istio metrics cover most day-to-day monitoring needs, but when you're troubleshooting connection pool exhaustion, circuit breaker behavior, or TLS issues, enabling the right Envoy stats is the fastest path to answers.
