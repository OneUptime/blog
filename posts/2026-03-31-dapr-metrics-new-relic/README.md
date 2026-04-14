# How to Send Dapr Metrics to New Relic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, New Relic, Metric, Observability, Kubernetes

Description: Forward Dapr sidecar and control plane metrics to New Relic using the Prometheus Remote Write integration for centralized monitoring.

---

New Relic supports Prometheus Remote Write, which lets you forward metrics from your Dapr-enabled Kubernetes cluster without replacing your existing Prometheus setup. This guide covers both the Prometheus Remote Write approach and using the New Relic Kubernetes integration.

## Option 1 - Prometheus Remote Write

If you already run Prometheus, add a remote write configuration to forward Dapr metrics to New Relic.

### Configure Remote Write in Prometheus

```yaml
global:
  scrape_interval: 15s

remote_write:
  - url: https://metric-api.newrelic.com/prometheus/v1/write?prometheus_server=dapr-cluster
    authorization:
      credentials: <YOUR_NEW_RELIC_LICENSE_KEY>
    write_relabel_configs:
      - source_labels: [__name__]
        regex: "dapr_.*"
        action: keep

scrape_configs:
  - job_name: 'dapr-sidecars'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_dapr_io_enabled]
        action: keep
        regex: "true"
      - source_labels: [__meta_kubernetes_pod_ip]
        target_label: __address__
        replacement: "$1:9090"
```

Apply the updated Prometheus config:

```bash
kubectl create configmap prometheus-config \
  --from-file=prometheus.yml=prometheus.yml \
  -n monitoring --dry-run=client -o yaml | kubectl apply -f -
```

## Option 2 - New Relic Kubernetes Integration

The New Relic Kubernetes integration auto-discovers and scrapes Prometheus endpoints:

```bash
helm repo add newrelic https://helm-charts.newrelic.com
helm repo update

helm install newrelic-bundle newrelic/nri-bundle \
  --namespace newrelic \
  --create-namespace \
  --set global.licenseKey=<YOUR_LICENSE_KEY> \
  --set global.cluster=my-cluster \
  --set newrelic-infrastructure.enabled=true \
  --set nri-prometheus.enabled=true \
  --set nri-metadata-injection.enabled=true
```

## Annotating Dapr Pods for NRI Prometheus

```yaml
metadata:
  annotations:
    dapr.io/enabled: "true"
    dapr.io/app-id: "payment-service"
    dapr.io/metrics-port: "9090"
    prometheus.io/scrape: "true"
    prometheus.io/port: "9090"
```

## Querying Dapr Metrics in New Relic

Use NRQL to query Dapr metrics in the New Relic Query Builder:

```sql
SELECT rate(sum(dapr_http_server_request_count), 1 minute)
FROM Metric
WHERE app_id IS NOT NULL
FACET app_id
SINCE 30 minutes ago
TIMESERIES
```

```sql
SELECT percentile(dapr_http_server_latency, 99)
FROM Metric
FACET app_id
SINCE 1 hour ago
```

## Creating a New Relic Dashboard

Use the New Relic UI to create a dashboard, or use the Terraform provider:

```hcl
resource "newrelic_one_dashboard" "dapr_dashboard" {
  name = "Dapr Service Metrics"

  page {
    name = "Overview"

    widget_line {
      title  = "Request Rate by App"
      row    = 1
      column = 1
      width  = 6
      height = 3

      nrql_query {
        query = "SELECT rate(sum(dapr_http_server_request_count), 1 minute) FROM Metric FACET app_id TIMESERIES"
      }
    }
  }
}
```

## Setting Up Alerts in New Relic

```bash
# Use New Relic CLI to create an NRQL alert condition
newrelic nrql alertscondition create \
  --accountId <ACCOUNT_ID> \
  --policy-id <POLICY_ID> \
  --name "Dapr High Error Rate" \
  --type "static" \
  --nrql "SELECT count(*) FROM Metric WHERE metricName = 'dapr_http_server_request_count' AND error = 'true'" \
  --critical-threshold 50 \
  --critical-threshold-duration 300 \
  --critical-threshold-occurrences "all"
```

## Summary

Sending Dapr metrics to New Relic works best through Prometheus Remote Write if you already have Prometheus, or through the New Relic Kubernetes integration for a more automated setup. Use NRQL to build dashboards that surface request rates, latency percentiles, and error rates per Dapr app ID. Alert on error rate thresholds to catch service degradation early.
