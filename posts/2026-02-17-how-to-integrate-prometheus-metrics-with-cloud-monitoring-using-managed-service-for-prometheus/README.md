# How to Integrate Prometheus Metrics with Cloud Monitoring Using Managed Service for Prometheus

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Prometheus, Cloud Monitoring, GKE, Observability

Description: Set up Google Cloud Managed Service for Prometheus to collect Prometheus metrics from your GKE workloads and query them alongside native Cloud Monitoring data.

---

If you are running workloads on GKE, chances are you already have Prometheus metrics. Your applications expose `/metrics` endpoints, and you might be running a self-managed Prometheus server. Google Cloud Managed Service for Prometheus (GMP) lets you keep your existing Prometheus instrumentation while offloading the infrastructure to Google. Your metrics flow into Cloud Monitoring where you can query them with PromQL, build dashboards, and set up alerts alongside your other GCP metrics.

This guide shows you how to set up GMP and start collecting Prometheus metrics.

## What Is Managed Service for Prometheus?

GMP is a fully managed, multi-cloud Prometheus-compatible monitoring service. It runs Prometheus collectors on your GKE clusters that scrape metrics from your workloads and ship them to Cloud Monitoring's backend. You get:

- No need to manage Prometheus servers, storage, or high availability
- Global query across all your clusters
- PromQL support in Cloud Monitoring
- Integration with Cloud Monitoring alerting and dashboards
- Essentially unlimited metric retention

## Enabling Managed Collection on GKE

GMP can run in two modes: managed collection (Google runs the collectors) or self-deployed collection (you run the collectors). Managed collection is the simpler option.

```bash
# Enable managed collection on an existing GKE cluster
gcloud container clusters update my-cluster \
  --region=us-central1 \
  --enable-managed-prometheus

# For a new cluster, enable it at creation time
gcloud container clusters create my-cluster \
  --region=us-central1 \
  --enable-managed-prometheus \
  --num-nodes=3
```

This deploys the GMP collector components in the `gmp-system` namespace. They automatically start collecting cluster and node metrics.

## Configuring Scrape Targets with PodMonitoring

To scrape metrics from your own applications, create PodMonitoring resources. These are similar to Prometheus ServiceMonitor resources.

```yaml
# pod-monitoring.yaml - Scrape metrics from your application pods
apiVersion: monitoring.googleapis.com/v1
kind: PodMonitoring
metadata:
  name: my-app-metrics
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-app
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
```

Apply the PodMonitoring resource.

```bash
# Apply the scrape configuration
kubectl apply -f pod-monitoring.yaml
```

This tells the GMP collector to scrape the `/metrics` endpoint on port named `metrics` from all pods matching the `app: my-app` label every 30 seconds.

## Scraping Metrics from a Specific Port Number

If your pods expose metrics on a specific port number rather than a named port, use the port number directly.

```yaml
# pod-monitoring-port.yaml - Scrape by port number
apiVersion: monitoring.googleapis.com/v1
kind: PodMonitoring
metadata:
  name: my-app-metrics
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-app
  endpoints:
  - port: 9090
    interval: 15s
    path: /metrics
```

## Cluster-Wide Scraping with ClusterPodMonitoring

If you want to scrape pods across all namespaces, use ClusterPodMonitoring instead.

```yaml
# cluster-pod-monitoring.yaml - Scrape across all namespaces
apiVersion: monitoring.googleapis.com/v1
kind: ClusterPodMonitoring
metadata:
  name: all-apps-metrics
spec:
  selector:
    matchLabels:
      monitoring: enabled
  endpoints:
  - port: metrics
    interval: 30s
    path: /metrics
```

Any pod in any namespace with the `monitoring: enabled` label will be scraped.

## Verifying Metrics Are Flowing

After configuring scraping, verify that metrics are arriving in Cloud Monitoring.

```bash
# Check the status of PodMonitoring resources
kubectl get podmonitorings -A

# Check the GMP collector pods are running
kubectl get pods -n gmp-system

# Query a metric using the Cloud Monitoring API
gcloud monitoring time-series list \
  --filter='metric.type = starts_with("prometheus.googleapis.com")' \
  --limit=10
```

In the Cloud Monitoring console, go to Metrics Explorer and search for your Prometheus metric name. Prometheus metrics appear under the `prometheus.googleapis.com` prefix.

## Querying Prometheus Metrics with PromQL

One of the biggest advantages of GMP is native PromQL support. You can query your metrics using the same PromQL you already know.

In the Cloud Monitoring console, open Metrics Explorer and switch to the PromQL tab. Then run queries like you would against a Prometheus server.

```promql
# Get the request rate for your application
rate(http_requests_total{job="my-app"}[5m])

# Calculate the 95th percentile latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job="my-app"}[5m]))

# Get the error rate
sum(rate(http_requests_total{job="my-app", status=~"5.."}[5m]))
/
sum(rate(http_requests_total{job="my-app"}[5m]))
```

## Using PromQL in Alerting Policies

You can create alerting policies that use PromQL conditions.

```json
{
  "displayName": "High Error Rate (PromQL)",
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "Error rate above 5%",
      "conditionPrometheusQueryLanguage": {
        "query": "sum(rate(http_requests_total{job=\"my-app\", status=~\"5..\"}[5m])) / sum(rate(http_requests_total{job=\"my-app\"}[5m])) > 0.05",
        "duration": "120s",
        "alertRule": "AlwaysOn"
      }
    }
  ],
  "notificationChannels": ["projects/my-project/notificationChannels/CHANNEL_ID"]
}
```

## Setting Up Self-Deployed Collection

For more control over the collector configuration, use the self-deployed mode. This involves deploying the Prometheus operator and configuring it to remote-write to Cloud Monitoring.

```bash
# Install the GMP operator
kubectl apply -f https://raw.githubusercontent.com/GoogleCloudPlatform/prometheus-engine/main/manifests/operator.yaml
```

Then configure the operator.

```yaml
# operator-config.yaml - Configure the Prometheus operator for GMP
apiVersion: monitoring.googleapis.com/v1
kind: OperatorConfig
metadata:
  name: config
  namespace: gmp-public
collection:
  filter:
    matchOneOf:
    - '{job="my-app"}'
    - '{__name__=~"go_.*"}'
```

## Sending Metrics from Outside GKE

If you have workloads outside GKE (on VMs or other platforms), you can use the Prometheus sidecar or remote write to send metrics to GMP.

Configure your existing Prometheus server to remote-write to GMP.

```yaml
# prometheus.yml - Remote write configuration for GMP
remote_write:
- url: "https://monitoring.googleapis.com/v1/projects/my-project/location/global/prometheus/api/v1/write"
  headers:
    Authorization: "Bearer <access-token>"
```

For authentication, you can use Workload Identity or a service account key.

## Building Dashboards with Prometheus Metrics

Prometheus metrics work seamlessly in Cloud Monitoring dashboards. You can mix them with native Cloud Monitoring metrics on the same dashboard.

```json
{
  "displayName": "Application Metrics Dashboard",
  "mosaicLayout": {
    "columns": 12,
    "tiles": [
      {
        "xPos": 0,
        "yPos": 0,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Request Rate",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "prometheusQuery": "sum(rate(http_requests_total{job=\"my-app\"}[5m])) by (status)"
                },
                "plotType": "LINE"
              }
            ]
          }
        }
      },
      {
        "xPos": 6,
        "yPos": 0,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "GKE Node CPU (native metric)",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "resource.type = \"k8s_node\" AND metric.type = \"kubernetes.io/node/cpu/core_usage_time\"",
                    "aggregation": {
                      "alignmentPeriod": "60s",
                      "perSeriesAligner": "ALIGN_RATE"
                    }
                  }
                },
                "plotType": "LINE"
              }
            ]
          }
        }
      }
    ]
  }
}
```

## Metric Naming in Cloud Monitoring

Prometheus metrics are stored with the prefix `prometheus.googleapis.com/`. For example, a Prometheus metric `http_requests_total` becomes `prometheus.googleapis.com/http_requests_total/counter` in Cloud Monitoring. The suffix indicates the metric type.

When using PromQL queries, you use the original Prometheus metric names. When using MQL or the filter syntax, you use the prefixed names.

## Cost Considerations

GMP pricing is based on the number of samples ingested. To manage costs:

- Only scrape metrics you actually use
- Use longer scrape intervals for less critical metrics (60s instead of 15s)
- Filter out high-cardinality metrics you do not need
- Use metric relabeling to drop unwanted metrics before they are sent

```yaml
# PodMonitoring with metric relabeling to reduce cardinality
apiVersion: monitoring.googleapis.com/v1
kind: PodMonitoring
metadata:
  name: my-app-metrics
spec:
  selector:
    matchLabels:
      app: my-app
  endpoints:
  - port: metrics
    interval: 30s
    metricRelabeling:
    - sourceLabels: [__name__]
      regex: "go_gc_.*"
      action: drop
```

## Summary

Managed Service for Prometheus bridges the gap between Prometheus-native monitoring and Cloud Monitoring. You keep your existing Prometheus instrumentation and gain fully managed collection, global querying, unlimited retention, and integration with Cloud Monitoring's alerting and dashboarding. For GKE workloads, enabling managed collection and creating PodMonitoring resources is all it takes to get started.
