# How to Monitor for CIDRNotAvailable Errors with Calico and kubeadm

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubeadm, CIDR, IPAM, Kubernetes, Monitoring, Prometheus, Alerting

Description: How to set up monitoring and alerting for CIDRNotAvailable errors in Calico-based Kubernetes clusters to catch IP exhaustion before it impacts workloads.

---

## Introduction

CIDRNotAvailable errors can bring pod scheduling to a halt, but they rarely happen without warning. IP address utilization grows gradually as clusters scale, and IPAM block allocation patterns become visible well before exhaustion occurs. By monitoring the right metrics and events, operators can detect problems early and take corrective action before workloads are affected.

Effective monitoring for CIDR issues combines Calico IPAM metrics, Kubernetes events, and node-level checks into a comprehensive alerting strategy. This guide covers how to set up each layer of monitoring using Prometheus, Kubernetes event watches, and periodic IPAM health checks.

This approach works for any kubeadm-provisioned cluster running Calico as the CNI plugin.

## Prerequisites

- Kubernetes cluster with Calico v3.25+ and kubeadm
- Prometheus and Alertmanager deployed (or compatible monitoring stack)
- Grafana for dashboard visualization (optional)
- `kubectl` and `calicoctl` CLI access
- `kube-state-metrics` deployed

## Exposing Calico IPAM Metrics

Verify that Calico components expose Prometheus metrics:

```bash
# Check if calico-node metrics are enabled
kubectl get daemonset -n calico-system calico-node -o yaml | grep -i "prometheus\|metrics"

# Verify metrics endpoint is accessible
kubectl exec -n calico-system $(kubectl get pod -n calico-system -l k8s-app=calico-node -o name | head -1) -c calico-node -- wget -qO- http://localhost:9091/metrics | head -20
```

If metrics are not enabled, configure Felix to expose them:

```bash
# Enable Prometheus metrics on Felix
calicoctl patch felixconfiguration default --patch '{"spec":{"prometheusMetricsEnabled": true}}'
```

## Key Metrics to Monitor

### IPAM Allocation Metrics

```bash
# Check available IPAM metrics
kubectl exec -n calico-system $(kubectl get pod -n calico-system -l k8s-app=calico-node -o name | head -1) -c calico-node -- wget -qO- http://localhost:9091/metrics 2>/dev/null | grep -i "ipam\|ip_pool\|block"
```

Key metrics to track:

```yaml
# Total IPs allocated per node
felix_ipam_ips_in_use

# Total IPs available in pools
felix_ipam_ips_total

# Number of IPAM blocks allocated
felix_ipam_blocks_per_node
```

### Pod Scheduling Metrics

```yaml
# From kube-state-metrics
kube_pod_status_phase{phase="Pending"}

# From kube-scheduler
scheduler_pending_pods
```

## Creating Prometheus Alerting Rules

Define alerts that fire before CIDR exhaustion:

```yaml
# calico-ipam-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: calico-ipam-alerts
  namespace: monitoring
spec:
  groups:
  - name: calico-ipam
    rules:
    - alert: CalicoIPAMHighUtilization
      expr: |
        sum(felix_ipam_ips_in_use) / sum(felix_ipam_ips_total) > 0.8
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Calico IPAM utilization above 80%"
        description: "IPAM IP utilization is at {{ $value | humanizePercentage }}. Consider expanding the IP pool."

    - alert: CalicoIPAMCriticalUtilization
      expr: |
        sum(felix_ipam_ips_in_use) / sum(felix_ipam_ips_total) > 0.95
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Calico IPAM utilization above 95%"
        description: "IPAM is nearly exhausted. Immediate action required to prevent CIDRNotAvailable errors."

    - alert: CalicoNodeNoIPAMBlock
      expr: |
        felix_ipam_blocks_per_node == 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Node has no IPAM blocks allocated"
        description: "Node {{ $labels.instance }} has no IPAM blocks. New pods on this node will fail."
```

```bash
# Apply the alerting rules
kubectl apply -f calico-ipam-alerts.yaml
```

## Monitoring Kubernetes Events

Set up a watcher for CIDR-related events:

```bash
# Watch for CIDR-related events in real time
kubectl get events --all-namespaces --watch --field-selector reason=FailedCreatePodSandBox | grep -i "cidr\|ipam"
```

For persistent event monitoring, deploy an event exporter:

```yaml
# event-exporter-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: event-exporter-config
  namespace: monitoring
data:
  config.yaml: |
    route:
      routes:
        - match:
            - receiver: "dump"
              reason: "FailedCreatePodSandBox"
    receivers:
      - name: "dump"
        stdout: {}
```

## Building a Grafana Dashboard

Create a dashboard that visualizes IPAM health:

```json
{
  "panels": [
    {
      "title": "IPAM IP Utilization",
      "type": "gauge",
      "targets": [
        {
          "expr": "sum(felix_ipam_ips_in_use) / sum(felix_ipam_ips_total) * 100"
        }
      ]
    },
    {
      "title": "IPs In Use Per Node",
      "type": "timeseries",
      "targets": [
        {
          "expr": "felix_ipam_ips_in_use",
          "legendFormat": "{{ instance }}"
        }
      ]
    },
    {
      "title": "IPAM Blocks Per Node",
      "type": "timeseries",
      "targets": [
        {
          "expr": "felix_ipam_blocks_per_node",
          "legendFormat": "{{ instance }}"
        }
      ]
    },
    {
      "title": "Pending Pods",
      "type": "stat",
      "targets": [
        {
          "expr": "count(kube_pod_status_phase{phase='Pending'})"
        }
      ]
    }
  ]
}
```

## Periodic IPAM Health Checks

Supplement metrics-based monitoring with periodic IPAM consistency checks:

```bash
#!/bin/bash
# ipam-health-check.sh - Run periodically via CronJob

echo "=== IPAM Health Check $(date) ==="

# Check for leaked IPs
calicoctl ipam check 2>&1

# Check utilization
calicoctl ipam show

# Check for nodes without CIDR assignments
NO_CIDR=$(kubectl get nodes -o json | jq '[.items[] | select(.spec.podCIDR == null)] | length')
if [ "$NO_CIDR" -gt 0 ]; then
  echo "WARNING: $NO_CIDR nodes without CIDR assignment"
fi

# Check for pending pods
PENDING=$(kubectl get pods --all-namespaces --field-selector=status.phase=Pending --no-headers 2>/dev/null | wc -l)
if [ "$PENDING" -gt 0 ]; then
  echo "WARNING: $PENDING pending pods detected"
fi
```

## Verification

Verify your monitoring setup is working:

```bash
# Confirm Prometheus is scraping Calico metrics
kubectl exec -n monitoring $(kubectl get pod -n monitoring -l app=prometheus -o name | head -1) -- wget -qO- 'http://localhost:9090/api/v1/targets' | grep calico

# Test alerting by checking the alert rules are loaded
kubectl exec -n monitoring $(kubectl get pod -n monitoring -l app=prometheus -o name | head -1) -- wget -qO- 'http://localhost:9090/api/v1/rules' | grep CalicoIPAM

# Verify metrics are being collected
kubectl exec -n monitoring $(kubectl get pod -n monitoring -l app=prometheus -o name | head -1) -- wget -qO- 'http://localhost:9090/api/v1/query?query=felix_ipam_ips_in_use'
```

## Troubleshooting

**Metrics not appearing in Prometheus**: Verify that ServiceMonitor or PodMonitor resources exist for Calico components and that Prometheus is configured to discover them.

**Alerts not firing**: Check that Alertmanager is properly connected to Prometheus and that the alert rules are syntactically valid.

**Event exporter missing events**: Kubernetes events have a default TTL of 1 hour. Ensure the event exporter is running continuously to capture transient events.

## Conclusion

Monitoring for CIDRNotAvailable errors is about catching trends before they become incidents. By combining Calico IPAM metrics in Prometheus, Kubernetes event monitoring, and periodic health checks, operators gain early visibility into IP address utilization and CIDR allocation issues. Set alert thresholds that give your team enough lead time to expand IP pools or clean up stale allocations before pods start failing.
