# How to Monitor Istio Health During an Upgrade

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Monitoring, Service Mesh, Prometheus, Upgrade

Description: Essential metrics, dashboards, and monitoring strategies to track Istio health during control plane and data plane upgrades in real time.

---

Performing an Istio upgrade without monitoring is like driving with your eyes closed. You might arrive safely, but you will not know if you ran over something along the way. Real-time monitoring during an upgrade tells you whether things are going well or whether you need to stop and roll back before more workloads are affected.

This guide covers which metrics to watch, how to set up dashboards, and what patterns indicate problems during an Istio upgrade.

## Key Metrics to Monitor

### Control Plane Metrics

The istiod process exposes metrics at port 15014. These tell you whether the control plane is healthy and doing its job.

**pilot_xds_pushes** - The number of configuration pushes to sidecar proxies. During an upgrade, you should see a spike as proxies reconnect to the new control plane and receive updated configuration. If pushes stop entirely, the control plane may be stuck.

```
sum(rate(pilot_xds_pushes{type="cds"}[1m]))
```

**pilot_proxy_convergence_time** - How long it takes for a config change to reach all proxies. This should stay under a few seconds. If it spikes during the upgrade, proxies are having trouble syncing.

```
histogram_quantile(0.99, sum(rate(pilot_proxy_convergence_time_bucket[5m])) by (le))
```

**pilot_xds_push_errors** - Push errors indicate the control plane failed to send configuration to one or more proxies. Any non-zero value during an upgrade needs investigation.

```
sum(rate(pilot_xds_push_errors[5m]))
```

**pilot_conflict_inbound_listener** and **pilot_conflict_outbound_listener_tcp_over_current_tcp** - Configuration conflicts between resources. If these appear during an upgrade, a resource incompatibility was introduced.

```
pilot_conflict_inbound_listener
pilot_conflict_outbound_listener_tcp_over_current_tcp
```

**istiod CPU and memory usage** - Resource consumption should be monitored to catch OOM situations:

```bash
kubectl top pods -n istio-system -l app=istiod
```

### Data Plane Metrics

These metrics come from the sidecar proxies and tell you whether application traffic is healthy.

**istio_requests_total** - The total number of requests, broken down by response code. Watch for increases in 5xx responses:

```
sum(rate(istio_requests_total{response_code=~"5.*"}[5m])) by (destination_workload, destination_workload_namespace)
```

**istio_request_duration_milliseconds** - Request latency. Watch for latency increases at the p99 level:

```
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (le, destination_workload))
```

**istio_tcp_connections_opened_total** and **istio_tcp_connections_closed_total** - TCP connection churn. A spike in closed connections without a corresponding spike in opened connections indicates connection drops:

```
sum(rate(istio_tcp_connections_opened_total[5m])) by (destination_workload)
sum(rate(istio_tcp_connections_closed_total[5m])) by (destination_workload)
```

**envoy_cluster_upstream_cx_connect_fail** - Failed connection attempts from the proxy to upstream services:

```
sum(rate(envoy_cluster_upstream_cx_connect_fail[5m])) by (cluster_name)
```

## Setting Up a Monitoring Dashboard

Create a Grafana dashboard specifically for Istio upgrades. Here is a layout that works well:

### Row 1: Control Plane Health

- Panel 1: istiod CPU and memory usage (time series)
- Panel 2: XDS push rate by type (time series)
- Panel 3: XDS push errors (time series)
- Panel 4: Proxy convergence time p99 (time series)

### Row 2: Data Plane Health

- Panel 5: HTTP request success rate overall (gauge - should be >99.9%)
- Panel 6: 5xx error rate by service (time series)
- Panel 7: Request latency p99 by service (time series)
- Panel 8: Active connections (time series)

### Row 3: Upgrade Progress

- Panel 9: Proxy version distribution (pie chart)
- Panel 10: Number of proxies by version over time (time series)
- Panel 11: STALE proxies count (stat)
- Panel 12: Namespaces migrated (table)

For the proxy version distribution, use this PromQL:

```
count(istio_build{component="proxy"}) by (tag)
```

## Prometheus Recording Rules

For large clusters, some of these queries can be expensive. Set up recording rules:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-upgrade-monitoring
  namespace: monitoring
spec:
  groups:
  - name: istio-upgrade
    interval: 30s
    rules:
    - record: istio:request_error_rate:5m
      expr: sum(rate(istio_requests_total{response_code=~"5.*"}[5m])) / sum(rate(istio_requests_total[5m]))

    - record: istio:request_latency_p99:5m
      expr: histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (le))

    - record: istio:xds_push_error_rate:5m
      expr: sum(rate(pilot_xds_push_errors[5m]))

    - record: istio:proxy_convergence_p99:5m
      expr: histogram_quantile(0.99, sum(rate(pilot_proxy_convergence_time_bucket[5m])) by (le))
```

## Alerting During Upgrades

Set up temporary alerts specifically for the upgrade window:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-upgrade-alerts
  namespace: monitoring
spec:
  groups:
  - name: istio-upgrade-alerts
    rules:
    - alert: IstioUpgradeHighErrorRate
      expr: istio:request_error_rate:5m > 0.01
      for: 2m
      labels:
        severity: critical
      annotations:
        summary: "Error rate above 1% during Istio upgrade"
        description: "The mesh-wide error rate is {{ $value | humanizePercentage }}. Consider pausing or rolling back."

    - alert: IstioUpgradeHighLatency
      expr: istio:request_latency_p99:5m > 5000
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "p99 latency above 5s during Istio upgrade"

    - alert: IstioUpgradeStaleProxies
      expr: count(envoy_server_live{} unless on(pod) kube_pod_status_ready{condition="true"}) > 10
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "More than 10 proxies are not ready"

    - alert: IstiodCrashLooping
      expr: rate(kube_pod_container_status_restarts_total{container="discovery",namespace="istio-system"}[5m]) > 0
      for: 1m
      labels:
        severity: critical
      annotations:
        summary: "istiod is crash-looping during upgrade"
```

## Real-Time Command-Line Monitoring

If you prefer the terminal over dashboards:

```bash
# Watch proxy status in real time
watch -n 10 'istioctl proxy-status 2>/dev/null | tail -5; echo "---"; istioctl proxy-status 2>/dev/null | grep -c SYNCED; echo "SYNCED proxies"'
```

Check istiod logs for errors in real time:

```bash
kubectl logs -f -n istio-system -l app=istiod | grep -i "error\|warn\|fatal"
```

Monitor pod restarts:

```bash
watch -n 5 'kubectl get pods -n istio-system'
```

Quick error rate check using proxy logs:

```bash
kubectl logs -n my-app -l app=my-service -c istio-proxy --tail=1000 | awk '{print $NF}' | sort | uniq -c | sort -rn | head
```

## What Normal Looks Like During an Upgrade

During a healthy upgrade, expect to see:

- A brief spike in XDS pushes when proxies reconnect to the new control plane
- Proxy convergence time may increase slightly during reconnection
- Connection reset counts may tick up slightly as pods restart
- The proxy version distribution gradually shifts from old to new

What is NOT normal:

- Sustained push errors
- Error rate above your baseline
- Latency significantly above baseline
- STALE proxies that do not resolve within a few minutes
- istiod restarts or OOM kills

## Monitoring After the Upgrade

Do not stop monitoring once the upgrade is "done". Keep watching for at least 24 hours after the last workload is migrated. Some issues only appear under specific conditions:

- Peak traffic hours may reveal latency issues not visible during low traffic
- Scheduled jobs that run at specific times might hit compatibility problems
- Long-lived connections may not be affected until they are recycled

Keep your upgrade-specific alerts active for a week after the upgrade. Disable them only after you are confident everything is stable.

## Summary

Monitoring during an Istio upgrade requires tracking both control plane metrics (XDS pushes, convergence time, push errors) and data plane metrics (error rates, latency, connection failures). Set up dedicated dashboards before the upgrade, configure temporary alerts, and keep watching for at least 24 hours after completion. The metrics tell you whether to proceed, pause, or roll back - but only if you are looking at them.
