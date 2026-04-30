# How to Configure Harvester Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Kubernetes, Virtualization, HCI, Monitoring, Prometheus, Grafana

Description: Learn how to set up and configure Harvester's built-in monitoring stack with Prometheus and Grafana for comprehensive cluster observability.

## Introduction

Harvester includes a built-in monitoring stack based on Prometheus and Grafana. This monitoring solution collects metrics from all cluster components - nodes, VMs, storage, and networking - and provides pre-built dashboards for visualization. This guide covers enabling monitoring, accessing Grafana dashboards, configuring alerting rules, and integrating with external monitoring systems.

## Harvester Monitoring Components

- **Prometheus**: Time-series metrics collection and storage
- **Grafana**: Visualization and dashboarding
- **Alertmanager**: Alert routing and notification
- **node-exporter**: Node-level OS metrics
- **KubeVirt metrics**: VM-specific metrics
- **Longhorn metrics**: Storage metrics

## Step 1: Enable Monitoring via the UI

1. Navigate to **Advanced** → **Add-ons**
2. Find **rancher-monitoring** and click **⋮** → **Enable**
3. Open the **rancher-monitoring** add-on page
4. From the **Prometheus** tab, adjust Prometheus and Prometheus Node Exporter resource requests and limits as needed
5. Click **Save**

## Step 2: Enable Monitoring via kubectl

```bash
# Enable the built-in rancher-monitoring add-on
kubectl patch addons.harvesterhci.io rancher-monitoring \
    -n cattle-monitoring-system \
    --type merge \
    -p '{"spec":{"enabled":true}}'

# Edit the add-on values
kubectl edit addons.harvesterhci.io -n cattle-monitoring-system rancher-monitoring
```

```yaml
# rancher-monitoring values excerpt

spec:
  valuesContent: |
    prometheus:
      prometheusSpec:
        evaluationInterval: 1m
        scrapeInterval: 1m
        retention: 5d
        retentionSize: 50GB
        resources:
          limits:
            cpu: 1000m
            memory: 2500Mi
          requests:
            cpu: 850m
            memory: 1750Mi
    prometheus-node-exporter:
      resources:
        limits:
          cpu: 200m
          memory: 50Mi
        requests:
          cpu: 100m
          memory: 30Mi
    grafana:
      enabled: true
    alertmanager:
      enabled: true
```

## Step 3: Access the Grafana Dashboard

```bash
# Get the Grafana service URL
kubectl get svc -n cattle-monitoring-system rancher-monitoring-grafana

# Forward the Grafana port to your local machine
kubectl port-forward -n cattle-monitoring-system \
    svc/rancher-monitoring-grafana 3000:80

# Access Grafana at http://localhost:3000
# Default credentials: admin / prom-operator
```

## Step 4: Key Grafana Dashboards for Harvester

Navigate to these dashboards and views in Harvester and Grafana:

### Node Dashboards
- **Kubernetes / Nodes**: CPU, memory, disk, network per node

### VM Dashboards

For per-VM metrics in Harvester, go to **VM details page** → **VM Metrics**.

```bash
# Create the namespace watched by the Grafana dashboard sidecar, if needed
kubectl create namespace cattle-dashboards --dry-run=client -o yaml | kubectl apply -f -

# Import a custom KubeVirt dashboard
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: kubevirt-grafana-dashboard
  namespace: cattle-dashboards
  labels:
    grafana_dashboard: "1"
data:
  kubevirt-dashboard.json: |
    {
      "title": "KubeVirt VM Metrics",
      "uid": "kubevirt-vms",
      "panels": [
        {
          "title": "VM CPU Usage",
          "type": "timeseries",
          "datasource": "Prometheus",
          "targets": [
            {
              "expr": "sum by (name, namespace) (rate(kubevirt_vmi_cpu_usage_seconds_total[5m]))",
              "legendFormat": "{{namespace}}/{{name}}"
            }
          ]
        }
      ]
    }
EOF
```

### Storage Dashboards
- **Kubernetes / Persistent Volumes**: Persistent volume usage and capacity
- Use Longhorn metrics in custom panels for volume health, replica status, and disk utilization

## Step 5: Configure Prometheus Alerting Rules

Create custom alert rules for Harvester-specific conditions:

```yaml
# harvester-alert-rules.yaml
# Custom Prometheus alerting rules for Harvester

apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: harvester-alerts
  namespace: cattle-monitoring-system
  labels:
    release: rancher-monitoring
spec:
  groups:
    - name: harvester.node
      interval: 30s
      rules:
        # Alert when a node is not ready
        - alert: HarvesterNodeNotReady
          expr: kube_node_status_condition{condition="Ready",status="true"} == 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Harvester node {{ $labels.node }} is not ready"
            description: "Node {{ $labels.node }} has been not ready for 5 minutes"

        # Alert when node memory is critical
        - alert: HarvesterNodeMemoryCritical
          expr: |
            (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)) > 0.95
          for: 10m
          labels:
            severity: critical
          annotations:
            summary: "Node {{ $labels.instance }} memory is critically full"
            description: "Node memory usage exceeds 95%"

        # Alert when node disk is nearly full
        - alert: HarvesterNodeDiskFull
          expr: |
            max by (instance) (
              1 - (
                node_filesystem_free_bytes{mountpoint="/",fstype!=""} /
                node_filesystem_size_bytes{mountpoint="/",fstype!=""}
              )
            ) > 0.85
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Node {{ $labels.instance }} root disk is nearly full"

    - name: harvester.storage
      rules:
        # Alert when a Longhorn volume is degraded
        - alert: LonghornVolumeDegraded
          expr: longhorn_volume_robustness{state="degraded"} == 1
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Longhorn volume {{ $labels.volume }} is degraded"

        # Alert when a Longhorn volume is faulted
        - alert: LonghornVolumeFaulted
          expr: longhorn_volume_robustness{state="faulted"} == 1
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "Longhorn volume {{ $labels.volume }} is FAULTED - data may be at risk"

        # Alert when storage utilization > 80%
        - alert: LonghornStorageAlmostFull
          expr: |
            (longhorn_node_storage_usage_bytes / longhorn_node_storage_capacity_bytes) > 0.80
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Longhorn storage on node {{ $labels.node }} is > 80% full"

    - name: harvester.vms
      rules:
        # Alert on VM in errored state
        - alert: HarvesterVMFailed
          expr: kubevirt_vmi_info{phase="Failed"} > 0
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "VM {{ $labels.name }} in namespace {{ $labels.namespace }} has failed"
```

```bash
kubectl apply -f harvester-alert-rules.yaml

# Verify the rules are loaded
kubectl get prometheusrule -n cattle-monitoring-system harvester-alerts
kubectl describe prometheusrule harvester-alerts -n cattle-monitoring-system
```

## Step 6: Configure Alertmanager for Notifications

```yaml
# alertmanager-config.yaml
# Update the Alertmanager configuration secret used by rancher-monitoring

apiVersion: v1
kind: Secret
metadata:
  name: alertmanager-rancher-monitoring-alertmanager
  namespace: cattle-monitoring-system
stringData:
  alertmanager.yaml: |
    global:
      resolve_timeout: 5m
      # Slack webhook URL
      slack_api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'

    route:
      group_by: ['alertname', 'cluster', 'service']
      group_wait: 30s
      group_interval: 5m
      repeat_interval: 12h
      receiver: 'default'
      routes:
        # Critical alerts go to PagerDuty
        - matchers:
            - severity="critical"
          receiver: pagerduty
        # Warnings go to Slack
        - matchers:
            - severity="warning"
          receiver: slack

    receivers:
      - name: 'default'
        slack_configs:
          - channel: '#harvester-alerts'
            title: 'Harvester Alert'
            text: '{{ .CommonAnnotations.summary }}'

      - name: 'slack'
        slack_configs:
          - channel: '#harvester-alerts'
            send_resolved: true
            title: '{{ .CommonLabels.alertname }}'
            text: '{{ .CommonAnnotations.description }}'

      - name: 'pagerduty'
        pagerduty_configs:
          - routing_key: 'YOUR_PAGERDUTY_ROUTING_KEY'
            description: '{{ .CommonAnnotations.summary }}'
```

```bash
kubectl apply -f alertmanager-config.yaml
```

## Step 7: Key Prometheus Queries for Harvester

```promql
# Total VMs by state
count by (phase) (kubevirt_vmi_info)

# VM CPU usage per VM (cores)
sum by (name, namespace) (rate(kubevirt_vmi_cpu_usage_seconds_total[5m]))

# VM memory usage
(1 - (kubevirt_vmi_memory_available_bytes / kubevirt_vmi_memory_domain_bytes)) * 100

# Longhorn volume IOPS
sum by (volume, pvc_namespace) (longhorn_volume_read_iops)
sum by (volume, pvc_namespace) (longhorn_volume_write_iops)

# Node disk I/O utilization
rate(node_disk_io_time_seconds_total[5m]) * 100

# Cluster-wide storage usage
sum(longhorn_node_storage_usage_bytes) / sum(longhorn_node_storage_capacity_bytes) * 100
```

## Conclusion

Harvester's built-in monitoring stack provides comprehensive visibility into your entire HCI infrastructure. By configuring custom alert rules for VM failures, storage degradation, and resource exhaustion, you ensure your operations team is notified before problems impact users. The integration between Prometheus, Grafana, and Alertmanager creates a complete observability solution. For organizations using existing monitoring infrastructure (Datadog, New Relic, etc.), Prometheus federation allows Harvester metrics to be scraped and included in your centralized monitoring platform.
