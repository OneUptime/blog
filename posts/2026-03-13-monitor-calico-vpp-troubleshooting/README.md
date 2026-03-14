# How to Monitor Calico VPP for Troubleshooting Signals

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, VPP, Kubernetes, Networking, Troubleshooting, Monitoring

Description: Monitor Calico VPP error counters, interface statistics, and process health using Prometheus metrics and VPP's built-in stats socket to detect issues before they affect application traffic.

---

## Introduction

VPP exposes runtime statistics through two channels: a stats socket (high-frequency interface counters) and the `vppctl show error` command (per-node-graph drop counters). Monitoring these signals surfaces packet drops, interface errors, and DPDK driver failures before they escalate to visible application issues. The Calico VPP manager also exposes a Prometheus metrics endpoint that tracks VPP API call success/failure rates.

## VPP Prometheus Metrics (calico-vpp-manager)

```bash
# calico-vpp-manager exposes metrics on port 9098 by default
kubectl get pod -n calico-vpp-dataplane -l app=calico-vpp-node \
  -o jsonpath='{.items[0].metadata.name}' | xargs -I{} \
  kubectl exec -n calico-vpp-dataplane {} -c calico-vpp-manager -- \
  wget -qO- http://localhost:9098/metrics | grep -E "^(calico_vpp|go_)"
```

## ServiceMonitor for VPP Manager Metrics

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: calico-vpp-manager
  namespace: calico-vpp-dataplane
spec:
  selector:
    matchLabels:
      app: calico-vpp-node
  endpoints:
    - port: metrics
      path: /metrics
      interval: 30s
```

## Continuous VPP Error Counter Monitor

```bash
#!/bin/bash
# monitor-vpp-errors.sh - Poll VPP error counters across all nodes
VPP_NAMESPACE="${VPP_NAMESPACE:-calico-vpp-dataplane}"

while true; do
  echo "=== VPP Error Counters $(date) ==="
  for pod in $(kubectl get pods -n "${VPP_NAMESPACE}" \
    -l app=calico-vpp-node -o jsonpath='{.items[*].metadata.name}'); do

    NODE=$(kubectl get pod -n "${VPP_NAMESPACE}" "${pod}" \
      -o jsonpath='{.spec.nodeName}')
    ERRORS=$(kubectl exec -n "${VPP_NAMESPACE}" "${pod}" -c vpp -- \
      vppctl show error 2>/dev/null | grep -v " 0 " | grep -v "^$" | wc -l)

    if [ "${ERRORS}" -gt 0 ]; then
      echo "NODE ${NODE}: ${ERRORS} non-zero error counters"
      kubectl exec -n "${VPP_NAMESPACE}" "${pod}" -c vpp -- \
        vppctl show error | grep -v " 0 " | grep -v "^$"
    else
      echo "NODE ${NODE}: OK"
    fi
  done
  sleep 30
done
```

## Monitoring Architecture

```mermaid
flowchart LR
    A[VPP Stats Socket] -->|interface counters| B[calico-vpp-manager]
    B -->|/metrics port 9098| C[Prometheus]
    C --> D[Alertmanager]
    D -->|PagerDuty/Slack| E[On-call Engineer]
    F[vppctl show error] -->|manual poll| G[Monitor Script]
    G --> D
```

## Alert Rules for VPP Health

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: calico-vpp-alerts
  namespace: calico-vpp-dataplane
spec:
  groups:
    - name: calico.vpp
      rules:
        - alert: CalicoVPPManagerDown
          expr: up{job="calico-vpp-manager"} == 0
          for: 2m
          annotations:
            summary: "calico-vpp-manager metrics endpoint is unreachable"
        - alert: CalicoVPPPodNotRunning
          expr: kube_pod_status_phase{namespace="calico-vpp-dataplane",phase!="Running"} > 0
          for: 5m
          annotations:
            summary: "VPP pod {{ $labels.pod }} is not running"
```

## Conclusion

Monitoring Calico VPP requires polling VPP error counters (which track per-node-graph packet drops) and scraping the calico-vpp-manager Prometheus endpoint. The error counter monitor script is the fastest way to detect active forwarding issues across all VPP nodes. Combine it with Prometheus alerts on manager availability and pod health to catch VPP issues in the first few minutes rather than waiting for application teams to report connectivity failures.
