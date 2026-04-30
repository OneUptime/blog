# How to Configure Harvester Monitoring - Config

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Monitoring, Prometheus, Grafana, Kubernetes, Observability, SUSE Rancher, HCI

Description: Learn how to configure and customize monitoring for Harvester clusters including Prometheus metrics, Grafana dashboards, alerting rules, and integration with external monitoring systems.

---

Harvester includes built-in Prometheus and Grafana for monitoring cluster infrastructure, virtual machines, and storage. This guide covers how to configure, extend, and integrate Harvester monitoring.

---

## Harvester Monitoring Architecture

```text
┌─────────────────────────────────────┐
│           Harvester Cluster         │
│                                     │
│  ┌──────────┐   ┌────────────────┐  │
│  │ Rancher  │   │   Longhorn     │  │
│  │ Monitoring│  │   Monitoring   │  │
│  └────┬─────┘   └───────┬────────┘  │
│       │                 │           │
│  ┌────▼─────────────────▼──────┐    │
│  │         Prometheus          │    │
│  └──────────────┬──────────────┘    │
│                 │                   │
│  ┌──────────────▼──────────────┐    │
│  │           Grafana           │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

---

## Step 1: Enable Harvester Monitoring

Harvester monitoring is deployed via the built-in Rancher monitoring stack:

```bash
# Check if the rancher-monitoring addon is running

kubectl get pods -n cattle-monitoring-system

# If the addon is disabled, enable it via Harvester UI:
# Advanced → Addons → rancher-monitoring
```

---

## Step 2: Access Grafana Dashboard

```bash
# Get the Grafana service URL
kubectl get svc -n cattle-monitoring-system | grep grafana

# Port-forward to Grafana
kubectl port-forward -n cattle-monitoring-system \
  svc/rancher-monitoring-grafana 3000:80 &

# Or open the Grafana dashboard link from the Harvester Dashboard page
```

Typical dashboards include:
- **Cluster overview** - cluster-wide resource usage
- **Node exporter** - per-node CPU, memory, disk, network
- **Longhorn** - volume and replica health
- **KubeVirt** - VM resource usage

---

## Step 3: Create Custom Alerting Rules

```yaml
# harvester-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: harvester-custom-alerts
  namespace: cattle-monitoring-system
  labels:
    app: kube-prometheus-stack
    release: rancher-monitoring
spec:
  groups:
    - name: harvester.node
      rules:
        - alert: HarvesterNodeHighMemory
          expr: |
            (1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) > 0.90
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Node {{ $labels.instance }} memory usage > 90%"

        - alert: HarvesterNodeHighCPU
          expr: |
            100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 95
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Node {{ $labels.instance }} CPU usage > 95%"

        - alert: HarvesterDiskSpaceLow
          expr: |
            node_filesystem_avail_bytes{mountpoint="/var/lib/longhorn"} /
            node_filesystem_size_bytes{mountpoint="/var/lib/longhorn"} < 0.20
          for: 10m
          labels:
            severity: critical
          annotations:
            summary: "Harvester node {{ $labels.instance }} storage < 20%"
```

```bash
kubectl apply -f harvester-alerts.yaml
```

---

## Step 4: Configure Alertmanager for Notifications

```yaml
# alertmanager-config.yaml
apiVersion: monitoring.coreos.com/v1alpha1
kind: AlertmanagerConfig
metadata:
  name: harvester-notifications
  namespace: cattle-monitoring-system
spec:
  route:
    receiver: slack-notifications
    groupBy: ['alertname', 'instance']
    groupWait: 30s
    groupInterval: 5m
    repeatInterval: 12h
  receivers:
    - name: slack-notifications
      slackConfigs:
        - apiURL:
            name: slack-webhook-secret
            key: webhook-url
          channel: '#harvester-alerts'
          title: '[{{ .Status | toUpper }}] {{ .CommonLabels.alertname }}'
          text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'
```

---

## Step 5: Monitor VM Resource Usage

```promql
# VM CPU usage
sum by (name, namespace) (
  rate(kubevirt_vmi_cpu_usage_seconds_total[5m])
)

# VM memory usage
vmi:kubevirt_vmi_memory_used_bytes:sum

# VM network traffic
rate(kubevirt_vmi_network_receive_bytes_total[5m])
rate(kubevirt_vmi_network_transmit_bytes_total[5m])

# VM disk I/O
rate(kubevirt_vmi_storage_read_times_seconds_total[5m])
rate(kubevirt_vmi_storage_write_times_seconds_total[5m])
```

---

## Step 6: Integrate with an External Remote-Write Endpoint

```yaml
# Patch the existing Prometheus CR to add a remote-write-compatible endpoint
apiVersion: monitoring.coreos.com/v1
kind: Prometheus
metadata:
  name: rancher-monitoring-prometheus
  namespace: cattle-monitoring-system
spec:
  remoteWrite:
    # The receiver must support the Prometheus remote-write API.
    - url: https://external-prometheus.example.com/api/v1/write
      basicAuth:
        username:
          name: remote-write-secret
          key: username
        password:
          name: remote-write-secret
          key: password
```

---

## Best Practices

- Create alerts for Longhorn disk space (< 20% free) and VM memory pressure to catch capacity-related issues early.
- Export metrics to a long-term storage system (Thanos, Cortex, or Mimir) if you need retention beyond the local Prometheus instance.
- Use the KubeVirt Grafana dashboard to track VM resource utilization over time and plan capacity for new VMs.
