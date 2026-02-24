# How to Set Up Grafana Dashboards for Istio Control Plane

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Grafana, Control Plane, Monitoring, Istiod

Description: Build Grafana dashboards to monitor the Istio control plane including istiod performance, configuration push latency, and xDS sync status.

---

The Istio data plane gets most of the monitoring attention, but the control plane is what keeps everything running. If istiod goes down or becomes slow at pushing configuration, your entire mesh can become stale or misconfigured. Monitoring the control plane gives you early warning of problems before they cascade to your services.

## What to Monitor in the Istio Control Plane

The Istio control plane (istiod) is responsible for:

- Watching Kubernetes resources and converting them to Envoy configuration
- Pushing configuration updates to all sidecar proxies
- Managing certificates for mTLS
- Handling service discovery

Each of these functions has associated metrics that you should track.

## Installing and Accessing Grafana

If you haven't set up Grafana yet:

```bash
kubectl apply -f https://raw.githubusercontent.com/istio/istio/release-1.20/samples/addons/grafana.yaml
kubectl rollout status deployment/grafana -n istio-system
istioctl dashboard grafana
```

Istio ships with an "Istio Control Plane Dashboard" that covers the basics. Find it under Dashboards -> Browse -> Istio.

## Istiod Resource Usage

Start with the basics. Track CPU and memory usage of istiod:

```promql
# istiod CPU usage
sum(rate(container_cpu_usage_seconds_total{
  namespace="istio-system",
  container="discovery"
}[5m]))

# istiod memory usage
sum(container_memory_working_set_bytes{
  namespace="istio-system",
  container="discovery"
})
```

Create a time series panel with both metrics. Rising memory over time could indicate a memory leak or growing configuration size. CPU spikes correlate with configuration changes that trigger pushes to all proxies.

## Configuration Push Metrics

One of the most important things to monitor is how quickly istiod pushes configuration to Envoy proxies:

```promql
# Configuration push time (P99)
histogram_quantile(0.99, sum(rate(pilot_proxy_convergence_time_bucket[5m])) by (le))

# Configuration push time (P50)
histogram_quantile(0.50, sum(rate(pilot_proxy_convergence_time_bucket[5m])) by (le))
```

Convergence time is the total time from when a configuration change is detected to when all affected proxies receive the update. High convergence time means your proxies are running on stale configuration, which can cause routing errors.

## xDS Push Metrics

Istio uses the xDS protocol to push configuration to Envoy. Monitor the push rate and errors:

```promql
# Total xDS pushes per second
sum(rate(pilot_xds_pushes[5m])) by (type)

# xDS push errors
sum(rate(pilot_xds_push_errors[5m])) by (type)
```

The `type` label breaks this down by xDS resource type: CDS (clusters), EDS (endpoints), LDS (listeners), and RDS (routes). If push errors are increasing, istiod is generating invalid configuration or proxies are rejecting updates.

```promql
# Push queue size
pilot_push_triggers

# Number of connected proxies
pilot_xds
```

The `pilot_xds` metric tells you how many proxies are connected to istiod. If this number drops, proxies might be disconnecting or failing to reconnect.

## Sidecar Injection Metrics

Track sidecar injection to catch injection failures:

```promql
# Total injection attempts
sum(rate(sidecar_injection_requests_total[5m])) by (success)

# Injection failures
sum(rate(sidecar_injection_failure_total[5m]))
```

Injection failures mean new pods are starting without an Istio sidecar, which breaks mTLS and removes them from the mesh.

## Certificate Management Metrics

Istio manages certificates for mTLS communication. Monitor certificate operations:

```promql
# Certificate signing requests
sum(rate(citadel_server_csr_count[5m]))

# Certificate signing errors
sum(rate(citadel_server_csr_parsing_err_count[5m]))

# Certificate rotation success rate
sum(rate(citadel_server_success_cert_issuance_count[5m]))
```

If certificate issuance fails, mTLS connections between services will break when current certificates expire.

## Configuration Validation Metrics

Track how many configuration objects are being rejected:

```promql
# Configuration validation errors
sum(rate(galley_validation_failed[5m])) by (reason)

# Successful validations
sum(rate(galley_validation_passed[5m]))
```

A spike in validation failures usually means someone is applying malformed Istio resources.

## Building the Dashboard

Here is a complete dashboard layout for the control plane:

**Row 1: Resource Usage**
- Panel: istiod CPU (time series)
- Panel: istiod Memory (time series)
- Panel: Connected Proxies (stat)

**Row 2: Configuration Distribution**
- Panel: Push Convergence Time P50/P99 (time series)
- Panel: xDS Pushes by Type (stacked bar)
- Panel: xDS Push Errors (time series)

**Row 3: Operations**
- Panel: Sidecar Injection Rate (time series)
- Panel: Certificate Issuance Rate (time series)
- Panel: Configuration Validation Errors (time series)

## Example Panel Configuration

Here is the JSON for a push convergence time panel:

```json
{
  "title": "Config Push Convergence Time",
  "type": "timeseries",
  "fieldConfig": {
    "defaults": {
      "unit": "s"
    }
  },
  "targets": [
    {
      "expr": "histogram_quantile(0.99, sum(rate(pilot_proxy_convergence_time_bucket[5m])) by (le))",
      "legendFormat": "P99"
    },
    {
      "expr": "histogram_quantile(0.50, sum(rate(pilot_proxy_convergence_time_bucket[5m])) by (le))",
      "legendFormat": "P50"
    }
  ]
}
```

## Setting Up Alerts for the Control Plane

Critical alerts you should have:

```yaml
groups:
  - name: istio-control-plane
    rules:
      - alert: IstiodHighMemory
        expr: |
          sum(container_memory_working_set_bytes{namespace="istio-system", container="discovery"})
          > 2e9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "istiod memory usage above 2GB"

      - alert: IstiodPushErrors
        expr: |
          sum(rate(pilot_xds_push_errors[5m])) > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "istiod is experiencing xDS push errors"

      - alert: HighConvergenceTime
        expr: |
          histogram_quantile(0.99, sum(rate(pilot_proxy_convergence_time_bucket[5m])) by (le)) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Configuration convergence time is above 10 seconds"

      - alert: ProxyDisconnections
        expr: |
          delta(pilot_xds[5m]) < -5
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Multiple proxies have disconnected from istiod"
```

## Scaling Considerations

As your mesh grows, istiod resource usage increases. Track the relationship between mesh size and control plane resource consumption:

```promql
# Number of services in the mesh
pilot_services

# Number of endpoints
pilot_endpoints

# Resource usage per endpoint ratio
sum(container_memory_working_set_bytes{namespace="istio-system", container="discovery"})
/
pilot_endpoints
```

If the memory-per-endpoint ratio keeps growing, you might need to optimize your Istio configuration (reduce the scope of sidecar configuration with Sidecar resources) or scale istiod horizontally.

## Verifying Control Plane Health

Beyond dashboards, you can quickly check control plane health from the command line:

```bash
# Check istiod pods
kubectl get pods -n istio-system -l app=istiod

# Check istiod logs for errors
kubectl logs -n istio-system -l app=istiod --tail=50 | grep -i error

# Check sync status of all proxies
istioctl proxy-status
```

The `proxy-status` command shows whether each proxy's configuration is SYNCED, NOT SENT, or STALE. Any STALE entries mean the proxy missed an update and might be running on old configuration.

## Summary

Monitoring the Istio control plane through Grafana dashboards covers three main areas: istiod resource usage, configuration push performance, and operational metrics like sidecar injection and certificate management. The most critical metric to watch is push convergence time, as slow convergence means your proxies are running on stale configuration. Set up alerts for push errors, high memory usage, and proxy disconnections to catch control plane problems before they affect your services.
