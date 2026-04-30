# How to Configure Harvester Monitoring - Setup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Monitoring, Prometheus, Grafana, Kubernetes, HCI, SUSE Rancher

Description: Learn how to enable and configure the Harvester monitoring stack including Prometheus, Alertmanager, and Grafana dashboards for comprehensive HCI visibility.

---

Harvester includes a built-in monitoring system based on the Rancher `rancher-monitoring` add-on, which closely tracks the kube-prometheus-stack. This guide covers enabling it, customizing retention, and accessing Grafana dashboards.

---

## Step 1: Enable Monitoring in Harvester

In the Harvester UI:

1. Go to **Advanced > Addons**
2. Select **rancher-monitoring**
3. Enable the add-on and adjust the Prometheus resource settings as needed

Or via `kubectl`:

```bash
kubectl edit addons.harvesterhci.io -n cattle-monitoring-system rancher-monitoring
```

---

## Step 2: Configure Prometheus Retention

Edit `spec.valuesContent` in the `rancher-monitoring` add-on to persist retention and storage changes:

```yaml
prometheus:
  prometheusSpec:
    retention: 30d
    retentionSize: 45GB
    storageSpec:
      volumeClaimTemplate:
        spec:
          storageClassName: longhorn
          resources:
            requests:
              storage: 50Gi
```

---

## Step 3: Configure Alertmanager

Create the `AlertmanagerConfig` in the namespace whose alerts you want to route:

```yaml
# alertmanager-config.yaml
apiVersion: monitoring.coreos.com/v1alpha1
kind: AlertmanagerConfig
metadata:
  name: harvester-alerts
  namespace: your-namespace
spec:
  route:
    receiver: default
    groupBy: [alertname, cluster]
    routes:
      - receiver: slack-ops
        matchers:
          - name: severity
            value: warning
      - receiver: pagerduty-critical
        matchers:
          - name: severity
            value: critical

  receivers:
    - name: default
    - name: slack-ops
      slackConfigs:
        - apiURL:
            name: slack-webhook-secret
            key: url
          channel: '#harvester-alerts'
          title: 'Harvester Alert: {{ .GroupLabels.alertname }}'
    - name: pagerduty-critical
      pagerdutyConfigs:
        - routingKey:
            name: pagerduty-secret
            key: key
```

---

## Step 4: Access Grafana

```bash
# Get Grafana credentials
kubectl get secret rancher-monitoring-grafana \
  -n cattle-monitoring-system \
  -o jsonpath='{.data.admin-password}' | base64 -d

# Port-forward Grafana
kubectl port-forward svc/rancher-monitoring-grafana \
  -n cattle-monitoring-system 3000:80

# Access at http://localhost:3000
```

Harvester also exposes built-in dashboards from the Dashboard page via the Grafana link.

---

## Step 5: Import Additional Dashboards

Use Grafana's import flow to add optional dashboards from Grafana.com:

| Dashboard | ID | Description |
|---|---|---|
| Longhorn Example v1.4.0 | 17626 | Storage health |
| Node Exporter Full | 1860 | Per-node system metrics |
| KubeVirt VM Info | 11748 | VM performance metrics |

From Grafana, go to **Dashboards > New > Import dashboard** and paste one of the IDs above.

---

## Best Practices

- Use Longhorn-backed persistent volumes for Prometheus data to survive node failures.
- Size Prometheus retention and storage based on your series count and available disk; Prometheus is not intended for long-term metrics retention.
- Configure separate Alertmanager routes for node-level alerts vs. VM-level alerts.
- Add custom dashboards for your specific VM workloads alongside the default Harvester dashboards.
