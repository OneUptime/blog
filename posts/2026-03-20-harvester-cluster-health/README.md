# How to Monitor Harvester Cluster Health

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Monitoring, Kubernetes, Cluster Health, HCI, Prometheus, SUSE Rancher

Description: Learn how to monitor Harvester HCI cluster health including node status, VM health, storage capacity, and network connectivity using Harvester's built-in monitoring stack and Prometheus.

---

Harvester provides a built-in monitoring stack based on Prometheus and Grafana through the `rancher-monitoring` add-on. On new installations, ensure the add-on is enabled before following this guide. This guide covers how to use and extend it to monitor overall cluster health.

---

## Step 1: Access the Harvester Monitoring Dashboard

Harvester's monitoring system is accessible from the Harvester UI, including when Harvester is opened inside Rancher through `Virtualization Management`:

1. In Rancher UI, go to **Virtualization Management > [Your Harvester Cluster]**
2. Open the **Dashboard**
3. Click the **Grafana** dashboard link

Or access it directly:

```bash
# Port-forward Grafana locally

kubectl port-forward svc/rancher-monitoring-grafana \
  -n cattle-monitoring-system 3000:80

# Open http://localhost:3000
# Default username is admin
# Default password is prom-operator unless you changed it
```

---

## Step 2: Key Metrics to Monitor

### Node Health

```promql
# Harvester node CPU utilization by instance
100 * (1 - avg by (instance) (rate(node_cpu_seconds_total{job="node-exporter", mode="idle"}[5m])))

# Harvester node memory pressure
100 * (1 - (node_memory_MemAvailable_bytes{job="node-exporter"} / node_memory_MemTotal_bytes{job="node-exporter"}))

# Node disk usage for the root filesystem
100 * (1 - (node_filesystem_avail_bytes{job="node-exporter", mountpoint="/"} / node_filesystem_size_bytes{job="node-exporter", mountpoint="/"}))
```

### VM Health

```promql
# Count of running VM instances
sum(node:kubevirt_vmi_phase:sum{phase="Running"})

# Count of error-state VM instances
sum(node:kubevirt_vmi_phase:sum{phase=~"Failed|Unknown"})
```

### Storage Health

```promql
# Longhorn volumes currently in a healthy robustness state
longhorn_volume_robustness{state="healthy"} == 1

# Storage utilization per node
longhorn_node_storage_usage_bytes / longhorn_node_storage_capacity_bytes
```

---

## Step 3: Configure Alerting Rules

```yaml
# harvester-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: harvester-health-alerts
  namespace: cattle-monitoring-system
  labels:
    release: rancher-monitoring
spec:
  groups:
    - name: harvester.nodes
      rules:
        - alert: HarvesterNodeDown
          expr: up{job="node-exporter"} == 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Harvester node {{ $labels.instance }} is down"

        - alert: HarvesterNodeHighCPU
          expr: |
            100 * (1 - avg by(instance) (rate(node_cpu_seconds_total{job="node-exporter", mode="idle"}[5m]))) > 90
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Harvester node {{ $labels.instance }} CPU > 90%"

        - alert: HarvesterVMFailed
          expr: sum(node:kubevirt_vmi_phase:sum{phase="Failed"}) > 0
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "{{ $value }} VMs in Failed state in Harvester"
```

---

## Step 4: Check Harvester Component Health via kubectl

```bash
# Check all Harvester system pods
kubectl get pods -n harvester-system
kubectl get pods -n longhorn-system
kubectl get pods -n cattle-monitoring-system

# Check Harvester node status
kubectl get nodes -o wide

# Check VM instances
kubectl get vmi -A

# Check storage volume health
kubectl get volumes.longhorn.io -n longhorn-system | grep -v healthy
```

---

## Step 5: View Health from Rancher Dashboard

When Harvester is imported into Rancher, the Rancher dashboard shows:

- Node count and status
- VM count and status
- CPU, memory, and storage utilization summaries
- Event stream for recent changes

---

## Best Practices

- Set up alerts for disk usage above 80% - Longhorn needs headroom for replica rebuilds.
- Monitor VM density (VMs per node) to identify over-committed nodes.
- Enable Harvester's built-in **support bundle** feature to collect diagnostics when issues arise.
- Use Rancher's global alerting to route critical Harvester alerts to on-call via PagerDuty.
