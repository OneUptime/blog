# How to Set Up Flux CD Dashboards in Grafana Cloud

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Grafana Cloud, Monitoring, Dashboard, Prometheus

Description: Learn how to set up Grafana Cloud dashboards for Flux CD to visualize reconciliation metrics, controller performance, and GitOps pipeline health.

---

Grafana Cloud provides a managed monitoring stack that includes Prometheus metrics ingestion, Grafana dashboards, and alerting. By forwarding Flux CD metrics to Grafana Cloud, you get rich visualizations of your GitOps pipeline health without managing your own monitoring infrastructure. This guide covers setting up metric collection from Flux controllers and importing dashboards into Grafana Cloud.

## Prerequisites

- Kubernetes cluster with Flux CD installed
- A Grafana Cloud account (free tier works)
- Prometheus or Grafana Agent running in your cluster for metric collection

## Step 1: Configure Metric Collection

Flux CD controllers expose Prometheus metrics on port 8080. You need to collect these metrics and forward them to Grafana Cloud.

### Using Grafana Agent with Flux

Deploy Grafana Agent via Flux to scrape and forward metrics:

```yaml
# infrastructure/monitoring/grafana-agent-helmrepo.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: grafana
  namespace: flux-system
spec:
  interval: 1h
  url: https://grafana.github.io/helm-charts
```

```yaml
# infrastructure/monitoring/grafana-agent-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: grafana-agent
  namespace: monitoring
spec:
  interval: 30m
  chart:
    spec:
      chart: grafana-agent
      version: "0.40.x"
      sourceRef:
        kind: HelmRepository
        name: grafana
        namespace: flux-system
  install:
    createNamespace: true
  values:
    agent:
      mode: flow
      configMap:
        content: |
          prometheus.scrape "flux_controllers" {
            targets = [
              {"__address__" = "source-controller.flux-system:8080", "job" = "flux-source-controller"},
              {"__address__" = "kustomize-controller.flux-system:8080", "job" = "flux-kustomize-controller"},
              {"__address__" = "helm-controller.flux-system:8080", "job" = "flux-helm-controller"},
              {"__address__" = "notification-controller.flux-system:8080", "job" = "flux-notification-controller"},
            ]
            forward_to = [prometheus.remote_write.grafana_cloud.receiver]
            scrape_interval = "30s"
          }

          prometheus.remote_write "grafana_cloud" {
            endpoint {
              url = "https://prometheus-prod-01-eu-west-0.grafana.net/api/prom/push"
              basic_auth {
                username = env("GRAFANA_CLOUD_PROMETHEUS_USERNAME")
                password = env("GRAFANA_CLOUD_PROMETHEUS_PASSWORD")
              }
            }
          }
    extraEnvFrom:
      - secretRef:
          name: grafana-cloud-credentials
```

Create the credentials secret:

```bash
kubectl create secret generic grafana-cloud-credentials \
  --namespace=monitoring \
  --from-literal=GRAFANA_CLOUD_PROMETHEUS_USERNAME=YOUR_USERNAME \
  --from-literal=GRAFANA_CLOUD_PROMETHEUS_PASSWORD=YOUR_API_KEY
```

### Using Prometheus with Remote Write

If you already have Prometheus running, add remote write configuration:

```yaml
# In your Prometheus values
prometheus:
  prometheusSpec:
    remoteWrite:
      - url: https://prometheus-prod-01-eu-west-0.grafana.net/api/prom/push
        basicAuth:
          username:
            name: grafana-cloud-credentials
            key: username
          password:
            name: grafana-cloud-credentials
            key: password
    serviceMonitorSelector:
      matchLabels:
        app.kubernetes.io/part-of: flux
```

## Step 2: Create ServiceMonitors for Flux

If using the Prometheus Operator, create ServiceMonitors:

```yaml
# infrastructure/monitoring/flux-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: flux-system
  namespace: flux-system
  labels:
    app.kubernetes.io/part-of: flux
spec:
  selector:
    matchLabels:
      app.kubernetes.io/part-of: flux
  namespaceSelector:
    matchNames:
      - flux-system
  endpoints:
    - port: http-prom
      interval: 30s
      path: /metrics
```

## Step 3: Import Flux CD Dashboards

Flux CD provides official Grafana dashboards. Import them into Grafana Cloud.

Log into your Grafana Cloud instance and navigate to Dashboards > Import. Use these dashboard IDs:

- **Flux Cluster Stats** - Dashboard ID: `16714` - Overview of all Flux resources and their status
- **Flux Control Plane** - Dashboard ID: `16715` - Controller performance metrics

Alternatively, download the dashboard JSON files from the Flux CD repository and import them:

```bash
# Download dashboard JSON files
curl -sL https://raw.githubusercontent.com/fluxcd/flux2-monitoring-example/main/monitoring/configs/dashboards/cluster.json -o flux-cluster.json
curl -sL https://raw.githubusercontent.com/fluxcd/flux2-monitoring-example/main/monitoring/configs/dashboards/control-plane.json -o flux-control-plane.json
```

Import each JSON file through the Grafana Cloud UI under Dashboards > Import > Upload JSON file.

## Step 4: Key Metrics to Monitor

The imported dashboards visualize these important metrics:

**Reconciliation Status:**
- `gotk_reconcile_condition` - Shows Ready/Not Ready/Stalled status per resource
- Number of resources in each state across the cluster

**Reconciliation Performance:**
- `gotk_reconcile_duration_seconds` - How long reconciliations take
- p50, p90, and p99 reconciliation latency

**Controller Health:**
- `controller_runtime_reconcile_total` - Total reconciliation count
- `controller_runtime_reconcile_errors_total` - Error rate
- `workqueue_depth` - Queue backlog indicating controller load

**Source Fetching:**
- `gotk_reconcile_duration_seconds{kind="GitRepository"}` - Git fetch duration
- Source artifact size and fetch frequency

## Step 5: Create Custom Dashboard Panels

Add custom panels for your specific needs. Example PromQL queries:

Failed resources count:

```promql
count(gotk_reconcile_condition{status="False", type="Ready"}) by (kind)
```

Average reconciliation time by kind:

```promql
avg(rate(gotk_reconcile_duration_seconds_sum[5m]) / rate(gotk_reconcile_duration_seconds_count[5m])) by (kind)
```

Reconciliation error rate:

```promql
sum(rate(controller_runtime_reconcile_errors_total[5m])) by (controller)
```

## Step 6: Set Up Grafana Cloud Alerting

Create alert rules in Grafana Cloud based on Flux metrics:

1. Navigate to Alerting > Alert Rules > Create
2. Set the query to detect failed reconciliations:
   ```promql
   gotk_reconcile_condition{status="False", type="Ready"} == 1
   ```
3. Configure evaluation interval and pending period
4. Add notification channels (email, Slack, PagerDuty)

## Summary

Setting up Flux CD dashboards in Grafana Cloud gives you managed, always-available visibility into your GitOps pipeline. The setup involves forwarding Flux controller metrics via Grafana Agent or Prometheus remote write, then importing the official Flux dashboards. Key metrics to watch include reconciliation status, duration, and error rates. Combine dashboards with Grafana Cloud alerting for a complete monitoring solution that requires no self-hosted infrastructure.
