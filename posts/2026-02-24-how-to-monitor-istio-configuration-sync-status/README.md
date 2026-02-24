# How to Monitor Istio Configuration Sync Status

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Configuration, xDS, Monitoring, Envoy, Troubleshooting

Description: A hands-on guide to monitoring whether Istio configuration is properly synced across all proxies in your service mesh.

---

One of the trickiest problems in Istio is when configuration changes do not make it to all your proxies. You apply a VirtualService or DestinationRule, everything looks fine from kubectl's perspective, but some pods are still running with old configuration. Monitoring configuration sync status helps you catch these issues before they cause real problems.

## How Configuration Sync Works in Istio

When you create or update an Istio resource, here is what happens behind the scenes:

1. The resource is stored in the Kubernetes API server
2. Istiod watches for changes and translates the Istio config into Envoy configuration
3. Istiod pushes the configuration to each proxy using the xDS protocol (specifically ADS - Aggregated Discovery Service)
4. Each Envoy proxy acknowledges receipt and applies the configuration

Problems can occur at any of these steps. The proxy might be disconnected from Istiod, configuration translation might fail, or the proxy might reject the configuration.

## Using istioctl proxy-status

The quickest way to check sync status is with istioctl:

```bash
istioctl proxy-status
```

The output looks something like this:

```
NAME                          CDS        LDS        EDS        RDS        ECDS       ISTIOD
my-app-7b8d4f-abc12.default  SYNCED     SYNCED     SYNCED     SYNCED     IGNORED    istiod-6b8c5d-xyz
my-app-7b8d4f-def34.default  STALE      SYNCED     SYNCED     SYNCED     IGNORED    istiod-6b8c5d-xyz
```

The columns represent different xDS configuration types:

- **CDS** (Cluster Discovery Service) - upstream cluster configuration
- **LDS** (Listener Discovery Service) - listener configuration
- **EDS** (Endpoint Discovery Service) - endpoint/host configuration
- **RDS** (Route Discovery Service) - routing configuration
- **ECDS** (Extension Configuration Discovery Service) - extension configs

You want everything to show `SYNCED`. `STALE` means the proxy has not acknowledged the latest config, and `NOT SENT` means Istiod has not pushed config to that proxy at all.

## Key Metrics for Configuration Sync

Istiod exposes several Prometheus metrics that track configuration distribution:

### Push Metrics

```promql
# Total number of xDS pushes
pilot_xds_pushes

# Number of push errors
pilot_total_xds_internal_errors

# Push duration
pilot_proxy_convergence_time_bucket

# Number of connected proxies
pilot_xds_connected_endpoints
```

### Configuration Conflict Metrics

```promql
# Configuration validation errors
galley_validation_failed

# Duplicate listener conflicts
pilot_conflict_inbound_listener
pilot_conflict_outbound_listener_http_over_current_tcp
pilot_conflict_outbound_listener_tcp_over_current_http
pilot_conflict_outbound_listener_tcp_over_current_tcp
```

## Setting Up Prometheus Alerts

Here are the critical alert rules for configuration sync:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: istio-config-sync-alerts
  namespace: istio-system
spec:
  groups:
  - name: istio-config-sync
    rules:
    - alert: IstioPushErrors
      expr: |
        rate(pilot_total_xds_internal_errors[5m]) > 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Istio xDS push errors detected"
        description: "Istiod is experiencing configuration push errors at {{ $value }} per second"
    - alert: IstioSlowConfigPush
      expr: |
        histogram_quantile(0.99, sum(rate(pilot_proxy_convergence_time_bucket[5m])) by (le)) > 10
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Istio configuration push is slow"
        description: "P99 config push convergence time is {{ $value }}s (threshold: 10s)"
    - alert: IstioConfigConflicts
      expr: |
        pilot_conflict_inbound_listener > 0
        or pilot_conflict_outbound_listener_http_over_current_tcp > 0
        or pilot_conflict_outbound_listener_tcp_over_current_http > 0
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Istio configuration conflicts detected"
        description: "There are listener conflicts in the Istio configuration"
    - alert: IstioProxyDisconnected
      expr: |
        pilot_xds_connected_endpoints < kube_pod_container_status_running{container="istio-proxy"}
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Some Istio proxies are disconnected from the control plane"
```

## Comparing Configuration Between Proxies

When you suspect configuration drift, compare the config between two instances of the same service:

```bash
# Dump config from pod 1
istioctl proxy-config all my-app-pod-1 -n default -o json > /tmp/proxy1.json

# Dump config from pod 2
istioctl proxy-config all my-app-pod-2 -n default -o json > /tmp/proxy2.json

# Compare
diff /tmp/proxy1.json /tmp/proxy2.json
```

You can also compare what Istiod thinks the config should be versus what the proxy actually has:

```bash
istioctl proxy-status deploy/my-app -n default
```

This shows a detailed diff when there is a mismatch.

## Building an Automated Sync Monitor

Here is a script that continuously monitors sync status and reports anomalies:

```bash
#!/bin/bash

while true; do
  STALE_COUNT=$(istioctl proxy-status 2>/dev/null | grep -c "STALE")
  NOT_SENT=$(istioctl proxy-status 2>/dev/null | grep -c "NOT SENT")
  TOTAL=$(istioctl proxy-status 2>/dev/null | tail -n +2 | wc -l)

  echo "$(date): Total=$TOTAL, Stale=$STALE_COUNT, NotSent=$NOT_SENT"

  if [ "$STALE_COUNT" -gt 0 ] || [ "$NOT_SENT" -gt 0 ]; then
    echo "WARNING: Configuration sync issues detected"
    istioctl proxy-status 2>/dev/null | grep -E "STALE|NOT SENT"
  fi

  sleep 30
done
```

## Grafana Dashboard for Config Sync

Create a dashboard that visualizes the configuration distribution pipeline:

```json
{
  "panels": [
    {
      "title": "xDS Push Rate",
      "targets": [
        {
          "expr": "sum(rate(pilot_xds_pushes[5m])) by (type)",
          "legendFormat": "{{ type }}"
        }
      ]
    },
    {
      "title": "Push Convergence Time (P99)",
      "targets": [
        {
          "expr": "histogram_quantile(0.99, sum(rate(pilot_proxy_convergence_time_bucket[5m])) by (le))"
        }
      ]
    },
    {
      "title": "Connected Proxies",
      "targets": [
        {
          "expr": "pilot_xds_connected_endpoints"
        }
      ]
    },
    {
      "title": "Push Errors",
      "targets": [
        {
          "expr": "sum(rate(pilot_total_xds_internal_errors[5m]))"
        }
      ]
    },
    {
      "title": "Config Conflicts",
      "targets": [
        {
          "expr": "pilot_conflict_inbound_listener",
          "legendFormat": "Inbound Listener"
        },
        {
          "expr": "pilot_conflict_outbound_listener_http_over_current_tcp",
          "legendFormat": "HTTP over TCP"
        }
      ]
    }
  ]
}
```

## Troubleshooting Common Sync Issues

When you detect sync problems, here are the common culprits:

**Proxy cannot reach Istiod**: Check that the proxy can connect to Istiod on port 15012. Network policies or service mesh misconfiguration can block this.

```bash
kubectl exec deploy/my-app -c istio-proxy -- curl -s -o /dev/null -w "%{http_code}" https://istiod.istio-system.svc:15012/debug/connections
```

**Invalid configuration**: Istiod might reject your Istio resources. Check the Istiod logs:

```bash
kubectl logs deploy/istiod -n istio-system | grep "error"
```

**Resource constraints**: If Istiod is under-resourced, it may fall behind on pushing configuration. Check its resource usage:

```bash
kubectl top pod -n istio-system -l app=istiod
```

Configuration sync monitoring is one of those things that pays for itself the first time it catches a problem. Set up the alerts, build the dashboard, and you will have much better visibility into the health of your mesh.
