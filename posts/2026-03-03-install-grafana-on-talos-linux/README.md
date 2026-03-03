# How to Install Grafana on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Grafana, Monitoring, Dashboards, Kubernetes, Observability

Description: A practical guide to deploying Grafana on Talos Linux for building monitoring dashboards and visualizing metrics from Prometheus and other data sources.

---

Grafana is the most popular open-source dashboarding and visualization tool in the cloud-native ecosystem. While Prometheus collects and stores metrics, Grafana turns those metrics into visual dashboards that make it easy to understand the health and performance of your systems at a glance. On Talos Linux, Grafana runs as a standard Kubernetes deployment and pairs naturally with Prometheus to give you a complete monitoring solution.

This guide covers installing Grafana on a Talos Linux cluster, connecting it to Prometheus, building useful dashboards, and configuring it for production use.

## Why Grafana?

Grafana is more than just a charting tool. It supports over 150 data sources including Prometheus, Loki, Elasticsearch, InfluxDB, and PostgreSQL. It provides a rich library of community-built dashboards that you can import with a single click. Its alerting system can send notifications to Slack, email, PagerDuty, and many other channels. And its dashboard-as-code support through JSON models and provisioning makes it a good fit for GitOps workflows on Talos Linux.

## Prerequisites

You need:

- A Talos Linux cluster with Prometheus already running
- `kubectl` configured for the cluster
- Helm 3 installed

```bash
# Verify Prometheus is running
kubectl get pods -n monitoring -l app.kubernetes.io/name=prometheus
```

## Installing Grafana with Helm

```bash
# Add the Grafana Helm repository
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update
```

Create a values file:

```yaml
# grafana-values.yaml
# Persistent storage for dashboards and settings
persistence:
  enabled: true
  size: 10Gi

# Service configuration
service:
  type: NodePort
  nodePort: 31300

# Admin credentials
adminUser: admin
adminPassword: changeme-in-production

# Resource limits
resources:
  requests:
    cpu: 100m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 512Mi

# Auto-configure Prometheus as a data source
datasources:
  datasources.yaml:
    apiVersion: 1
    datasources:
    - name: Prometheus
      type: prometheus
      url: http://prometheus-server.monitoring.svc.cluster.local
      access: proxy
      isDefault: true

# Provision dashboards automatically
dashboardProviders:
  dashboardproviders.yaml:
    apiVersion: 1
    providers:
    - name: default
      orgId: 1
      folder: ''
      type: file
      disableDeletion: false
      editable: true
      options:
        path: /var/lib/grafana/dashboards/default

# Import community dashboards by ID
dashboards:
  default:
    kubernetes-cluster:
      gnetId: 6417
      revision: 1
      datasource: Prometheus
    node-exporter:
      gnetId: 1860
      revision: 37
      datasource: Prometheus
    kubernetes-pods:
      gnetId: 6336
      revision: 1
      datasource: Prometheus
```

Install Grafana:

```bash
helm install grafana grafana/grafana \
  --namespace monitoring \
  -f grafana-values.yaml
```

## Accessing Grafana

```bash
# Get the admin password (if you didn't set one in values)
kubectl get secret -n monitoring grafana -o jsonpath="{.data.admin-password}" | base64 -d

# Port-forward for local access
kubectl port-forward -n monitoring svc/grafana 3000:80

# Or access via NodePort
echo "http://<NODE_IP>:31300"
```

Open Grafana in your browser and log in with the admin credentials.

## Connecting Data Sources

If you did not configure the data source in the Helm values, add it manually:

1. Go to Configuration > Data Sources
2. Click "Add data source"
3. Select "Prometheus"
4. Set the URL to `http://prometheus-server.monitoring.svc.cluster.local`
5. Click "Save & Test"

You can also add other data sources:

```yaml
# Additional data sources in grafana-values.yaml
datasources:
  datasources.yaml:
    apiVersion: 1
    datasources:
    - name: Prometheus
      type: prometheus
      url: http://prometheus-server.monitoring.svc.cluster.local
      isDefault: true
    - name: Loki
      type: loki
      url: http://loki.monitoring.svc.cluster.local:3100
    - name: Alertmanager
      type: alertmanager
      url: http://prometheus-alertmanager.monitoring.svc.cluster.local
      jsonData:
        implementation: prometheus
```

## Building Custom Dashboards

Here are some practical dashboard panels for a Talos Linux cluster:

### Cluster Overview Panel

Create a stat panel with this query:

```promql
# Number of healthy nodes
count(kube_node_status_condition{condition="Ready",status="true"})
```

### CPU Usage Graph

```promql
# CPU usage per node
100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)
```

### Memory Usage Graph

```promql
# Memory usage per node
(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100
```

### Pod Status Table

```promql
# Running pods per namespace
count(kube_pod_status_phase{phase="Running"}) by (namespace)
```

### Network Traffic Graph

```promql
# Network bytes received per node
sum(rate(node_network_receive_bytes_total{device!="lo"}[5m])) by (instance)
```

### Disk I/O Graph

```promql
# Disk read throughput
sum(rate(node_disk_read_bytes_total[5m])) by (instance)

# Disk write throughput
sum(rate(node_disk_written_bytes_total[5m])) by (instance)
```

## Importing Community Dashboards

The Grafana community has thousands of pre-built dashboards. Here are some essential ones for Kubernetes:

```bash
# Import a dashboard through the Grafana UI:
# 1. Go to Dashboards > Import
# 2. Enter the dashboard ID
# 3. Select the Prometheus data source
```

Recommended dashboard IDs:
- **1860** - Node Exporter Full (detailed node metrics)
- **6417** - Kubernetes Cluster monitoring
- **12740** - Kubernetes Monitoring by kube-state-metrics
- **315** - Kubernetes cluster monitoring (via Prometheus)
- **13770** - kube-state-metrics v2

## Configuring Grafana Alerts

Grafana can send alerts based on dashboard queries:

```yaml
# Alert contact point configuration
# In grafana-values.yaml
alerting:
  contactpoints.yaml:
    apiVersion: 1
    contactPoints:
    - orgId: 1
      name: slack-notifications
      receivers:
      - uid: slack-1
        type: slack
        settings:
          url: https://hooks.slack.com/services/YOUR/WEBHOOK/URL
          recipient: "#alerts"
  policies.yaml:
    apiVersion: 1
    policies:
    - orgId: 1
      receiver: slack-notifications
      group_by: ['alertname', 'namespace']
      group_wait: 30s
      group_interval: 5m
      repeat_interval: 4h
```

Create an alert rule in a dashboard:

1. Edit a panel and switch to the Alert tab
2. Click "Create alert rule from this panel"
3. Set the condition (for example, "when avg() of query A is above 85")
4. Set the evaluation interval and pending period
5. Configure labels and annotations
6. Save the dashboard

## Dashboard as Code

For GitOps workflows on Talos Linux, define dashboards as JSON:

```yaml
# grafana-dashboard-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: custom-dashboards
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  cluster-overview.json: |
    {
      "dashboard": {
        "title": "Cluster Overview",
        "panels": [
          {
            "title": "Node Count",
            "type": "stat",
            "targets": [
              {
                "expr": "count(kube_node_status_condition{condition=\"Ready\",status=\"true\"})",
                "legendFormat": "Ready Nodes"
              }
            ]
          }
        ]
      }
    }
```

Enable dashboard sidecar to auto-load ConfigMap dashboards:

```yaml
# In grafana-values.yaml
sidecar:
  dashboards:
    enabled: true
    label: grafana_dashboard
    labelValue: "1"
    searchNamespace: ALL
```

## Securing Grafana

For production environments:

```yaml
# grafana-values.yaml security settings
grafana.ini:
  server:
    root_url: https://grafana.example.com
  security:
    admin_password: "${ADMIN_PASSWORD}"
    disable_gravatar: true
    cookie_secure: true
    strict_transport_security: true
  auth:
    disable_login_form: false
  auth.anonymous:
    enabled: false
  users:
    allow_sign_up: false
```

## Talos Linux Tips

On Talos Linux, all Grafana data lives in Kubernetes persistent volumes. Make sure you:

1. Have a reliable StorageClass configured
2. Back up Grafana's persistent volume regularly
3. Use dashboard provisioning (ConfigMaps or dashboard-as-code) so dashboards can be recreated
4. Store datasource and dashboard configurations in Git

```bash
# Check Grafana storage
kubectl get pvc -n monitoring -l app.kubernetes.io/name=grafana

# Check Grafana logs
kubectl logs -n monitoring -l app.kubernetes.io/name=grafana
```

## Conclusion

Grafana on Talos Linux provides the visualization layer that makes your monitoring data actionable. With Prometheus as its primary data source, you can build dashboards that show everything from cluster-wide health to individual pod performance. The dashboard-as-code approach through Helm values, ConfigMaps, and JSON provisioning fits naturally with the GitOps workflows that Talos Linux encourages. Once set up, Grafana becomes the single pane of glass where your team goes to understand what is happening in your infrastructure.
