# How to Monitor Istiod Performance Metrics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Istiod, Monitoring, Prometheus, Performance

Description: A comprehensive guide to the key istiod performance metrics you should monitor, what they mean, and how to set up alerts for control plane health.

---

Istiod is the brain of your service mesh. If it is slow, overloaded, or unresponsive, the entire mesh suffers. Configuration changes take longer to propagate, certificates do not get rotated on time, and new pods do not get their sidecar configuration. Monitoring istiod performance lets you catch problems before they impact your applications.

Istiod exposes a rich set of Prometheus metrics on port 15014. Here are the ones that matter most and how to use them.

## Accessing Istiod Metrics

Metrics are available at `http://istiod:15014/metrics`. To view them directly:

```bash
kubectl exec -n istio-system deploy/istiod -- curl -s localhost:15014/metrics | head -50
```

If you have Prometheus scraping istiod (which you should), query them through Prometheus or Grafana.

## xDS Push Metrics

These tell you how well istiod is distributing configuration to proxies.

### Push Count

```promql
sum(rate(pilot_xds_pushes[5m])) by (type)
```

Shows the rate of xDS pushes by type (CDS, EDS, LDS, RDS). A steady rate during normal operation is expected. Spikes correspond to configuration changes or endpoint updates.

### Push Latency

```promql
histogram_quantile(0.99, sum(rate(pilot_xds_push_time_bucket[5m])) by (le))
```

The time it takes istiod to generate and send a push. Healthy values are under 100ms. If p99 push time exceeds 1 second, istiod is under pressure.

### Push Errors

```promql
sum(rate(pilot_xds_push_errors[5m])) by (type)
```

Non-zero error rates mean pushes are failing. Check istiod logs for the cause.

### Proxy Convergence Time

```promql
histogram_quantile(0.99, sum(rate(pilot_proxy_convergence_time_bucket[5m])) by (le))
```

The end-to-end time from when istiod detects a change to when all affected proxies are updated. This is the metric that tells you how fast your mesh reacts to configuration changes.

## Connection Metrics

### Connected Proxy Count

```promql
pilot_xds_connected
```

The number of Envoy proxies currently connected to istiod. This should match the number of sidecar pods in your mesh. If it drops, proxies are disconnecting.

### Connection Terminations

```promql
sum(rate(pilot_xds_connection_terminations[5m]))
```

The rate of proxy disconnections. Some disconnections are normal (pod restarts, rolling updates), but a high rate could indicate network issues or istiod instability.

## Configuration Metrics

### Config Updates

```promql
sum(rate(pilot_k8s_cfg_events[5m])) by (type)
```

The rate of Kubernetes configuration events istiod is processing. High rates during deployments are expected. Continuously high rates without deployments could indicate a controller loop or API server issue.

### Config Rejections

```promql
pilot_total_xds_rejects
```

The number of times proxies rejected (NACKed) configuration from istiod. Any non-zero value warrants investigation because it means istiod generated invalid Envoy configuration.

## Certificate Authority Metrics

### Certificate Issuance

```promql
sum(rate(citadel_server_success_cert_issuance_count[5m]))
```

The rate of successful certificate issuances. Should correlate with pod creation rate and certificate rotation rate.

### CSR Errors

```promql
sum(rate(citadel_server_csr_sign_error_count[5m]))
```

Signing errors are bad. If this is non-zero, workloads cannot get certificates and mTLS will break for new connections.

### Root Certificate Expiry

```promql
citadel_server_root_cert_expiry_timestamp
```

When the root CA certificate expires. Set an alert well in advance:

```promql
(citadel_server_root_cert_expiry_timestamp - time()) / 86400 < 30
```

This fires when the root cert is less than 30 days from expiry.

## Resource Usage Metrics

### CPU and Memory

```promql
# CPU usage
rate(container_cpu_usage_seconds_total{pod=~"istiod-.*", namespace="istio-system"}[5m])

# Memory usage
container_memory_working_set_bytes{pod=~"istiod-.*", namespace="istio-system"}
```

### Go Runtime Metrics

```promql
# Goroutine count
go_goroutines{app="istiod"}

# GC pause time
rate(go_gc_duration_seconds_sum{app="istiod"}[5m])
```

A steadily increasing goroutine count might indicate a goroutine leak. High GC pause times mean memory pressure.

## Webhook Metrics

### Injection Latency

```promql
histogram_quantile(0.99, sum(rate(sidecar_injection_time_seconds_bucket[5m])) by (le))
```

### Injection Errors

```promql
sum(rate(sidecar_injection_requests_total{success="false"}[5m]))
```

## Setting Up Alerts

Here is a PrometheusRule with essential istiod alerts:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istiod-alerts
  namespace: istio-system
spec:
  groups:
  - name: istiod
    rules:
    - alert: IstiodPushLatencyHigh
      expr: histogram_quantile(0.99, sum(rate(pilot_xds_push_time_bucket[5m])) by (le)) > 1
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Istiod push latency p99 is above 1 second"

    - alert: IstiodPushErrors
      expr: sum(rate(pilot_xds_push_errors[5m])) > 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Istiod is experiencing push errors"

    - alert: IstiodProxyDisconnections
      expr: sum(rate(pilot_xds_connection_terminations[5m])) > 10
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High rate of proxy disconnections from istiod"

    - alert: IstiodConfigRejections
      expr: increase(pilot_total_xds_rejects[5m]) > 0
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "Proxies are rejecting configuration from istiod"

    - alert: IstiodCertSignErrors
      expr: sum(rate(citadel_server_csr_sign_error_count[5m])) > 0
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "Istiod CA is failing to sign certificates"

    - alert: IstiodHighMemory
      expr: container_memory_working_set_bytes{pod=~"istiod-.*"} / container_spec_memory_limit_bytes{pod=~"istiod-.*"} > 0.85
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Istiod memory usage is above 85% of limit"

    - alert: IstiodDown
      expr: absent(up{app="istiod"} == 1)
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "Istiod is not running"
```

## Building a Grafana Dashboard

Key panels for an istiod dashboard:

1. **Push rate** by type (line chart): `sum(rate(pilot_xds_pushes[5m])) by (type)`
2. **Push latency** percentiles (line chart): p50, p95, p99
3. **Connected proxies** (single stat): `pilot_xds_connected`
4. **Push errors** (line chart): `sum(rate(pilot_xds_push_errors[5m]))`
5. **Config events** (line chart): `sum(rate(pilot_k8s_cfg_events[5m])) by (type)`
6. **CPU usage** (line chart)
7. **Memory usage** (line chart with limit line)
8. **Certificate issuance rate** (line chart)
9. **Goroutine count** (line chart)

Istio ships with a pre-built Grafana dashboard for the control plane. Import it from:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/grafana.yaml
```

The built-in dashboard is a good starting point, but add the custom alerts from above since the default dashboards do not include alerting rules.

Monitoring istiod is not optional if you run Istio in production. These metrics give you early warning when the control plane is struggling, long before your users notice any impact.
