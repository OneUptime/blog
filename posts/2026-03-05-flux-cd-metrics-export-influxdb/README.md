# How to Configure Flux CD Metrics Export to InfluxDB

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Monitoring, InfluxDB, Metrics, Telegraf

Description: Learn how to export Flux CD reconciliation and controller metrics to InfluxDB using Telegraf for time-series storage and analysis.

---

While Prometheus is the most common metrics backend for Kubernetes workloads, many organizations use InfluxDB as their time-series database. InfluxDB offers strong support for downsampling, retention policies, and integrates well with visualization tools like Grafana and Chronograf. Exporting Flux CD metrics to InfluxDB allows you to incorporate GitOps monitoring into your existing InfluxDB-based observability stack.

This guide walks through setting up Telegraf to scrape Flux CD Prometheus metrics and write them to InfluxDB.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- An InfluxDB instance (v2.x recommended) accessible from the cluster
- Helm CLI installed
- `kubectl` access to the cluster

## Architecture Overview

Flux CD controllers expose metrics in Prometheus format on their metrics endpoints. Since InfluxDB does not natively scrape Prometheus endpoints, you need an intermediary. Telegraf, the data collection agent from InfluxData, can scrape Prometheus metrics and write them to InfluxDB.

The data flow is: Flux Controllers -> Telegraf (Prometheus input plugin) -> InfluxDB.

## Step 1: Set Up InfluxDB

If you do not have InfluxDB running, deploy it in your cluster:

```bash
helm repo add influxdata https://helm.influxdata.com
helm repo update

helm install influxdb influxdata/influxdb2 \
  --namespace monitoring \
  --create-namespace \
  --set persistence.enabled=true \
  --set persistence.size=50Gi
```

After installation, access the InfluxDB UI to create an organization, a bucket for Flux metrics, and an API token:

```bash
kubectl port-forward -n monitoring svc/influxdb-influxdb2 8086:8086
```

Navigate to `http://localhost:8086` and complete the setup. Create a bucket named `flux-metrics` with a retention period appropriate for your needs (for example, 30 days).

## Step 2: Deploy Telegraf with Prometheus Input

Create a Telegraf configuration that scrapes Flux controller metrics and writes to InfluxDB. First, create a ConfigMap with the Telegraf configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: telegraf-config
  namespace: monitoring
data:
  telegraf.conf: |
    [global_tags]
      cluster = "production"

    [agent]
      interval = "30s"
      round_interval = true
      flush_interval = "30s"

    [[inputs.prometheus]]
      urls = [
        "http://source-controller.flux-system.svc:8080/metrics",
        "http://kustomize-controller.flux-system.svc:8080/metrics",
        "http://helm-controller.flux-system.svc:8080/metrics",
        "http://notification-controller.flux-system.svc:8080/metrics"
      ]
      metric_version = 2
      url_tag = "controller"

    [[outputs.influxdb_v2]]
      urls = ["http://influxdb-influxdb2.monitoring.svc:8086"]
      token = "${INFLUXDB_TOKEN}"
      organization = "my-org"
      bucket = "flux-metrics"
```

## Step 3: Deploy Telegraf

Create a Deployment for Telegraf that uses the configuration above:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: telegraf-flux
  namespace: monitoring
spec:
  replicas: 1
  selector:
    matchLabels:
      app: telegraf-flux
  template:
    metadata:
      labels:
        app: telegraf-flux
    spec:
      containers:
        - name: telegraf
          image: telegraf:1.29
          env:
            - name: INFLUXDB_TOKEN
              valueFrom:
                secretKeyRef:
                  name: influxdb-token
                  key: token
          volumeMounts:
            - name: config
              mountPath: /etc/telegraf
      volumes:
        - name: config
          configMap:
            name: telegraf-config
```

Create the InfluxDB token secret:

```bash
kubectl create secret generic influxdb-token \
  --namespace monitoring \
  --from-literal=token=your-influxdb-api-token
```

Apply the manifests:

```bash
kubectl apply -f telegraf-config.yaml
kubectl apply -f telegraf-deployment.yaml
```

## Step 4: Verify Metrics Are Flowing

Check that Telegraf is running and successfully writing metrics:

```bash
kubectl logs -n monitoring deployment/telegraf-flux --tail=20
```

You should see output indicating successful writes to InfluxDB without errors. Then verify in InfluxDB by querying the bucket:

```flux
from(bucket: "flux-metrics")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement =~ /gotk_.*/)
  |> limit(n: 10)
```

This Flux query (InfluxDB's query language, not to be confused with Flux CD) should return recent metrics from the Flux controllers.

## Step 5: Create InfluxDB Dashboards

Build dashboards in InfluxDB's built-in UI or connect Grafana with an InfluxDB data source. Key queries for monitoring Flux:

**Reconciliation success rate**:

```flux
from(bucket: "flux-metrics")
  |> range(start: -24h)
  |> filter(fn: (r) => r._measurement == "gotk_reconcile_condition")
  |> filter(fn: (r) => r.type == "Ready")
  |> group(columns: ["status", "kind"])
  |> count()
```

**Reconciliation duration over time**:

```flux
from(bucket: "flux-metrics")
  |> range(start: -6h)
  |> filter(fn: (r) => r._measurement == "gotk_reconcile_duration_seconds")
  |> filter(fn: (r) => r.kind == "Kustomization")
  |> aggregateWindow(every: 5m, fn: mean)
```

**Source artifact staleness**:

```flux
from(bucket: "flux-metrics")
  |> range(start: -1h)
  |> filter(fn: (r) => r._measurement == "gotk_reconcile_condition")
  |> filter(fn: (r) => r.kind == "GitRepository")
  |> last()
```

## Step 6: Configure Retention and Downsampling

InfluxDB v2 supports retention policies and tasks for downsampling. Create a downsampling task to aggregate Flux metrics for long-term storage:

```flux
option task = {name: "downsample-flux-metrics", every: 1h}

from(bucket: "flux-metrics")
  |> range(start: -task.every)
  |> filter(fn: (r) => r._measurement =~ /gotk_.*/)
  |> aggregateWindow(every: 5m, fn: mean, createEmpty: false)
  |> to(bucket: "flux-metrics-downsampled", org: "my-org")
```

Set the `flux-metrics` bucket to 30 days retention and `flux-metrics-downsampled` to 1 year for long-term trend analysis.

## Step 7: Set Up InfluxDB Alerts

Create InfluxDB checks and notification rules for Flux metrics. In the InfluxDB UI, navigate to **Alerts** and create a threshold check:

- **Name**: Flux Reconciliation Failure
- **Query**: Filter `gotk_reconcile_condition` where `status=False`
- **Threshold**: Critical when count is above 0
- **Every**: 5 minutes

Configure a notification endpoint (Slack, PagerDuty, or HTTP webhook) and create a notification rule that triggers when the check enters a critical state.

## Summary

Exporting Flux CD metrics to InfluxDB through Telegraf allows you to integrate GitOps monitoring into an InfluxDB-based observability stack. Telegraf's Prometheus input plugin handles the format translation seamlessly, and InfluxDB's retention policies and downsampling tasks help manage data at scale. Whether you use InfluxDB's built-in dashboards or connect Grafana as a visualization layer, you get full visibility into Flux reconciliation health, source fetch performance, and controller behavior.
