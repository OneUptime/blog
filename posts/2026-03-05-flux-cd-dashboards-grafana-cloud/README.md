# How to Set Up Flux CD Dashboards in Grafana Cloud

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Grafana Cloud, Monitoring, Dashboard, Prometheus

Description: Learn how to set up Grafana Cloud dashboards for Flux CD to visualize reconciliation metrics, controller performance, and GitOps pipeline health.

---

Grafana Cloud provides a managed monitoring stack that includes Prometheus metrics ingestion, Grafana dashboards, and alerting. By forwarding Flux CD metrics to Grafana Cloud, you get rich visualizations of your GitOps pipeline health without managing your own monitoring infrastructure. This guide covers setting up metric collection from Flux controllers and importing dashboards into Grafana Cloud.

## Prerequisites

- Kubernetes cluster with Flux CD installed
- A Grafana Cloud account (free tier works)
- Prometheus or Grafana Alloy running in your cluster for metric collection
- kube-state-metrics configured to export Flux custom resource metrics if you want to use the official Flux resource dashboards

## Step 1: Configure Metric Collection

Flux CD controllers expose Prometheus metrics on port 8080. You need to collect these metrics and forward them to Grafana Cloud.

### Using Grafana Alloy with Flux

Deploy Grafana Alloy via Flux to scrape and forward metrics:

```yaml
# infrastructure/monitoring/grafana-alloy-helmrepo.yaml

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
# infrastructure/monitoring/grafana-alloy-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: alloy
  namespace: flux-system
spec:
  interval: 30m
  targetNamespace: monitoring
  chart:
    spec:
      chart: alloy
      sourceRef:
        kind: HelmRepository
        name: grafana
        namespace: flux-system
  install:
    createNamespace: true
  values:
    alloy:
      configMap:
        content: |
          discovery.kubernetes "flux_controllers" {
            role = "pod"

            namespaces {
              names = ["flux-system"]
            }
          }

          discovery.relabel "flux_controllers" {
            targets = discovery.kubernetes.flux_controllers.targets

            rule {
              source_labels = ["__meta_kubernetes_pod_label_app"]
              action        = "keep"
              regex         = "helm-controller|source-controller|kustomize-controller|notification-controller|image-automation-controller|image-reflector-controller"
            }

            rule {
              source_labels = ["__meta_kubernetes_pod_container_port_name"]
              action        = "keep"
              regex         = "http-prom"
            }
          }

          prometheus.scrape "flux_controllers" {
            targets    = discovery.relabel.flux_controllers.output
            forward_to = [prometheus.remote_write.grafana_cloud.receiver]
            scrape_interval = "30s"
          }

          prometheus.remote_write "grafana_cloud" {
            endpoint {
              url = "https://prometheus-prod-01-eu-west-0.grafana.net/api/prom/push"
              basic_auth {
                username = sys.env("GRAFANA_CLOUD_PROMETHEUS_USERNAME")
                password = sys.env("GRAFANA_CLOUD_PROMETHEUS_PASSWORD")
              }
            }
          }
      envFrom:
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
            key: GRAFANA_CLOUD_PROMETHEUS_USERNAME
          password:
            name: grafana-cloud-credentials
            key: GRAFANA_CLOUD_PROMETHEUS_PASSWORD
    serviceMonitorSelector:
      matchLabels:
        app.kubernetes.io/part-of: flux
    podMonitorSelector:
      matchLabels:
        app.kubernetes.io/part-of: flux
    podMonitorNamespaceSelector:
      matchNames:
        - flux-system
```

## Step 2: Create PodMonitors for Flux

If using the Prometheus Operator, create PodMonitors:

```yaml
# infrastructure/monitoring/flux-podmonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: PodMonitor
metadata:
  name: flux-system
  namespace: flux-system
  labels:
    app.kubernetes.io/part-of: flux
spec:
  selector:
    matchExpressions:
      - key: app
        operator: In
        values:
          - helm-controller
          - source-controller
          - kustomize-controller
          - notification-controller
          - image-automation-controller
          - image-reflector-controller
  namespaceSelector:
    matchNames:
      - flux-system
  podMetricsEndpoints:
    - port: http-prom
      interval: 30s
      path: /metrics
```

## Step 3: Import Flux CD Dashboards

Flux CD provides official Grafana dashboard JSON files. Import them into Grafana Cloud.

Log into your Grafana Cloud instance and navigate to Dashboards > Import. If you prefer Grafana.com dashboard IDs, use these compatible community dashboards:

- **Flux Cluster Stats** - Dashboard ID: `21150` - Overview of all Flux resources and their status
- **Flux Control Plane** - Dashboard ID: `21149` - Controller performance metrics

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
- `gotk_resource_info` - Shows Ready/Not Ready/Suspended status per resource when kube-state-metrics is configured for Flux CRDs
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
- Source readiness, revisions, and fetch frequency

## Step 5: Create Custom Dashboard Panels

Add custom panels for your specific needs. Example PromQL queries:

Failed resources count:

```promql
count(gotk_resource_info{ready="False"}) by (customresource_kind)
```

Average reconciliation time by kind:

```promql
sum(rate(gotk_reconcile_duration_seconds_sum[5m])) by (kind) / sum(rate(gotk_reconcile_duration_seconds_count[5m])) by (kind)
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
   gotk_resource_info{ready="False"} == 1
   ```
3. Configure evaluation interval and pending period
4. Add notification channels (email, Slack, PagerDuty)

## Summary

Setting up Flux CD dashboards in Grafana Cloud gives you managed, always-available visibility into your GitOps pipeline. The setup involves forwarding Flux controller metrics via Grafana Alloy or Prometheus remote write, then importing the official Flux dashboards. Key metrics to watch include reconciliation status, duration, and error rates. Combine dashboards with Grafana Cloud alerting for a complete monitoring solution that requires no self-hosted infrastructure.
