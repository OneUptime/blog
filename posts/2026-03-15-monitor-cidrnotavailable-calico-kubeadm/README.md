# How to Monitor for CIDRNotAvailable Errors with Calico and kubeadm

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubeadm, CIDR, IPAM, Kubernetes, Monitoring, Prometheus, Alerting

Description: How to set up monitoring and alerting for CIDRNotAvailable errors in Calico-based Kubernetes clusters to catch IP exhaustion before it impacts workloads.

---

## Introduction

CIDRNotAvailable events can point to Kubernetes node CIDR allocation exhaustion or misconfiguration, while Calico IPAM exhaustion can bring pod creation to a halt. These problems rarely happen without warning. IP address utilization grows gradually as clusters scale, and IPAM block allocation patterns become visible well before exhaustion occurs. By monitoring the right metrics and events, operators can detect problems early and take corrective action before workloads are affected.

Effective monitoring for CIDR issues combines Calico IPAM metrics, Kubernetes events, and node-level checks into a comprehensive alerting strategy. This guide covers how to set up each layer of monitoring using Prometheus, Kubernetes event watches, and periodic IPAM health checks.

This approach works for any kubeadm-provisioned cluster running Calico as the CNI plugin with Calico IPAM.

## Prerequisites

- Kubernetes cluster with Calico v3.25+ and kubeadm
- Prometheus and Alertmanager deployed (or compatible monitoring stack)
- Grafana for dashboard visualization (optional)
- `kubectl` and `calicoctl` CLI access
- `kube-state-metrics` deployed

## Exposing Calico IPAM Metrics

Verify that Calico components expose Prometheus metrics:

```bash
# Check if calico-kube-controllers metrics are exposed
kubectl get svc -n calico-system | grep calico-kube-controllers-metrics

# Verify metrics endpoint is accessible
kubectl run -n calico-system metrics-check --rm -i --restart=Never --image=curlimages/curl -- http://calico-kube-controllers-metrics:9094/metrics | head -20
```

Calico kube-controllers metrics are enabled by default on port 9094. If the metrics port was disabled or changed, configure the `KubeControllersConfiguration` resource:

```bash
# Enable Prometheus metrics on calico-kube-controllers
calicoctl patch kubecontrollersconfiguration default --patch '{"spec":{"prometheusMetricsPort": 9094}}'
```

## Key Metrics to Monitor

### IPAM Allocation Metrics

```bash
# Check available IPAM metrics
kubectl run -n calico-system metrics-check --rm -i --restart=Never --image=curlimages/curl -- http://calico-kube-controllers-metrics:9094/metrics 2>/dev/null | grep -i "ipam\|ippool\|block"
```

Key metrics to track:

```yaml
# Total IPs allocated per node
ipam_allocations_in_use

# Total IPs available in pools
ipam_ippool_size

# Number of IPAM blocks allocated
ipam_blocks
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
        sum(ipam_allocations_in_use) / sum(ipam_ippool_size) > 0.8
      for: 10m
      labels:
        severity: warning
      annotations:
        summary: "Calico IPAM utilization above 80%"
        description: "IPAM IP utilization is at {{ $value | humanizePercentage }}. Consider expanding the IP pool."

    - alert: CalicoIPAMCriticalUtilization
      expr: |
        sum(ipam_allocations_in_use) / sum(ipam_ippool_size) > 0.95
      for: 5m
      labels:
        severity: critical
      annotations:
        summary: "Calico IPAM utilization above 95%"
        description: "IPAM is nearly exhausted. Immediate action required to prevent pod sandbox creation failures."

    - alert: CalicoIPAMLeakCandidates
      expr: |
        sum(ipam_allocations_gc_candidates) > 0
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Calico IPAM has potential leaked allocations"
        description: "Calico IPAM is reporting potential leaked allocations. Run calicoctl ipam check before releasing addresses."
```

```bash
# Apply the alerting rules
kubectl apply -f calico-ipam-alerts.yaml
```

## Monitoring Kubernetes Events

Set up a watcher for CIDR-related events:

```bash
# Watch for CIDR-related events in real time
kubectl get events --all-namespaces --watch --field-selector reason=CIDRNotAvailable
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
              reason: "CIDRNotAvailable"
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
          "expr": "sum(ipam_allocations_in_use) / sum(ipam_ippool_size) * 100"
        }
      ]
    },
    {
      "title": "IPs In Use Per Node",
      "type": "timeseries",
      "targets": [
        {
          "expr": "ipam_allocations_in_use",
          "legendFormat": "{{ node }}"
        }
      ]
    },
    {
      "title": "IPAM Blocks Per Node",
      "type": "timeseries",
      "targets": [
        {
          "expr": "ipam_blocks",
          "legendFormat": "{{ node }}"
        }
      ]
    },
    {
      "title": "Pending Pods",
      "type": "stat",
      "targets": [
        {
          "expr": "sum(kube_pod_status_phase{phase='Pending'})"
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

# Check for Kubernetes node CIDR allocation events
CIDR_EVENTS=$(kubectl get events --all-namespaces --field-selector=reason=CIDRNotAvailable --no-headers 2>/dev/null | wc -l)
if [ "$CIDR_EVENTS" -gt 0 ]; then
  echo "WARNING: $CIDR_EVENTS CIDRNotAvailable events detected"
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
kubectl exec -n monitoring $(kubectl get pod -n monitoring -l app=prometheus -o name | head -1) -- wget -qO- 'http://localhost:9090/api/v1/query?query=ipam_allocations_in_use'
```

## Troubleshooting

**Metrics not appearing in Prometheus**: Verify that ServiceMonitor or PodMonitor resources exist for Calico components and that Prometheus is configured to discover them.

**Alerts not firing**: Check that Alertmanager is properly connected to Prometheus and that the alert rules are syntactically valid.

**Event exporter missing events**: Kubernetes events have a default TTL of 1 hour. Ensure the event exporter is running continuously to capture transient events.

## Conclusion

Monitoring for CIDRNotAvailable events and Calico IPAM exhaustion is about catching trends before they become incidents. By combining Calico IPAM metrics in Prometheus, Kubernetes event monitoring, and periodic health checks, operators gain early visibility into IP address utilization and CIDR allocation issues. Set alert thresholds that give your team enough lead time to expand IP pools, fix node CIDR allocation, or clean up stale allocations before pods start failing.
