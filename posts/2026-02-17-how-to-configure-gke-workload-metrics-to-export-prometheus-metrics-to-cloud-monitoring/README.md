# How to Configure GKE Workload Metrics to Export Prometheus Metrics to Cloud Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, GKE, Prometheus, Cloud Monitoring, Kubernetes, Observability, Metrics

Description: Learn how to configure GKE managed Prometheus to scrape and export your application's Prometheus metrics directly into Google Cloud Monitoring.

---

Most modern applications expose Prometheus metrics. Whether you are running a Go service with the Prometheus client library, a Java app with Micrometer, or a Python service with the prometheus_client package, the pattern is the same: expose a `/metrics` endpoint and let a scraper collect the data.

On GKE, you have two main options for collecting these metrics. You can run your own Prometheus server, or you can use Google Cloud Managed Service for Prometheus (GMP), which is built into GKE. GMP lets you keep using the Prometheus data model and PromQL while storing metrics in Cloud Monitoring. No Prometheus server to manage, no storage to worry about, and you get to query your custom metrics right alongside your GCP infrastructure metrics.

## Enabling Managed Prometheus

GKE clusters running version 1.25 and later have managed collection enabled by default. If you are on an older cluster or it was disabled, enable it:

```bash
# Enable managed Prometheus collection on the cluster
gcloud container clusters update my-cluster \
  --zone us-central1-a \
  --enable-managed-prometheus
```

Verify it is running:

```bash
# Check that the managed collection pods are running
kubectl get pods -n gmp-system
```

You should see pods for the `gmp-operator` and `collector` components.

## Configuring Metric Scraping with PodMonitoring

The primary way to tell GMP what to scrape is through PodMonitoring resources. These are custom resources that define which pods to scrape and how.

Here is a PodMonitoring resource that scrapes all pods with the label `app: my-service` on port 8080 at the `/metrics` path:

```yaml
# pod-monitoring.yaml - Scrape Prometheus metrics from pods matching the selector
apiVersion: monitoring.googleapis.com/v1
kind: PodMonitoring
metadata:
  name: my-service-metrics
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-service
  endpoints:
    - port: 8080
      path: /metrics
      interval: 30s
```

Apply it:

```bash
kubectl apply -f pod-monitoring.yaml
```

GMP will start scraping metrics from matching pods within a minute or two.

## Scraping Across Namespaces with ClusterPodMonitoring

If you want to scrape pods across all namespaces with a single resource, use ClusterPodMonitoring:

```yaml
# cluster-pod-monitoring.yaml - Scrape metrics from pods across all namespaces
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
      path: /metrics
      interval: 30s
```

This scrapes any pod in any namespace that has the label `monitoring: enabled` and a port named `metrics`.

## Exposing Metrics from Your Application

If your application does not already expose Prometheus metrics, here is how to add them. The pattern is the same regardless of language.

A simple Go application with Prometheus metrics:

```go
package main

import (
    "net/http"
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
)

// Define custom metrics
var (
    requestsTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total number of HTTP requests",
        },
        []string{"method", "status"},
    )
    requestDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "http_request_duration_seconds",
            Help:    "HTTP request duration in seconds",
            Buckets: prometheus.DefBuckets,
        },
        []string{"method"},
    )
)

func init() {
    // Register metrics with Prometheus
    prometheus.MustRegister(requestsTotal)
    prometheus.MustRegister(requestDuration)
}

func main() {
    // Expose metrics endpoint
    http.Handle("/metrics", promhttp.Handler())
    http.HandleFunc("/", handler)
    http.ListenAndServe(":8080", nil)
}
```

Make sure your pod spec includes the port definition and label that matches your PodMonitoring:

```yaml
# deployment.yaml - Deployment with metrics port exposed for scraping
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-service
  template:
    metadata:
      labels:
        app: my-service
    spec:
      containers:
        - name: app
          image: us-docker.pkg.dev/my-project/my-repo/my-service:v1.0
          ports:
            # Named port for metrics scraping
            - name: metrics
              containerPort: 8080
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
```

## Querying Metrics in Cloud Monitoring

Once metrics are flowing, you can query them in the Cloud Console under Monitoring > Metrics Explorer. Your Prometheus metrics appear with the prefix `prometheus.googleapis.com/`.

For example, `http_requests_total` becomes `prometheus.googleapis.com/http_requests_total/counter`.

You can also use PromQL directly. In the Cloud Console, go to Monitoring > PromQL and write queries just like you would with a standard Prometheus server:

```promql
# Query the rate of HTTP requests over 5 minutes
rate(http_requests_total[5m])

# Query 95th percentile request duration
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Filter by specific labels
rate(http_requests_total{status="500"}[5m])
```

## Creating Alerting Policies

You can create alerts on your Prometheus metrics using either MQL or PromQL:

```bash
# Create an alert policy for high error rate using gcloud
gcloud alpha monitoring policies create \
  --display-name="High Error Rate" \
  --condition-filter='resource.type="prometheus_target" AND metric.type="prometheus.googleapis.com/http_requests_total/counter"' \
  --condition-threshold-value=10 \
  --condition-threshold-comparison=COMPARISON_GT \
  --notification-channels=projects/my-project/notificationChannels/12345
```

Or define alerts using PromQL in a YAML file:

```yaml
# alert-rules.yaml - Prometheus alert rules for GMP
apiVersion: monitoring.googleapis.com/v1
kind: Rules
metadata:
  name: my-service-alerts
  namespace: default
spec:
  groups:
    - name: my-service
      interval: 30s
      rules:
        # Alert when error rate exceeds 5%
        - alert: HighErrorRate
          expr: |
            rate(http_requests_total{status=~"5.."}[5m])
            / rate(http_requests_total[5m]) > 0.05
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "High error rate on my-service"
```

## Handling High-Cardinality Metrics

One pitfall with Prometheus metrics is cardinality. If you have a metric with labels that have many unique values (like user IDs or request URLs), the number of time series explodes, and you end up paying a lot for storage in Cloud Monitoring.

Filter out high-cardinality metrics at scrape time:

```yaml
# pod-monitoring-filtered.yaml - PodMonitoring with metric filtering
apiVersion: monitoring.googleapis.com/v1
kind: PodMonitoring
metadata:
  name: my-service-filtered
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-service
  endpoints:
    - port: 8080
      path: /metrics
      interval: 30s
      metricRelabeling:
        # Drop metrics with high cardinality labels
        - sourceLabels: [__name__]
          regex: "go_.*"
          action: drop
        # Drop a specific high-cardinality label from all metrics
        - regex: "instance"
          action: labeldrop
```

## Grafana Integration

If your team prefers Grafana for dashboarding, you can connect it to Cloud Monitoring as a data source. Install Grafana on your cluster or use Grafana Cloud:

```yaml
# grafana-datasource.yaml - Grafana data source configuration for GMP
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-datasources
  namespace: monitoring
data:
  prometheus.yaml: |
    apiVersion: 1
    datasources:
      - name: Google Managed Prometheus
        type: prometheus
        url: https://monitoring.googleapis.com/v1/projects/my-project/location/global/prometheus
        access: proxy
        jsonData:
          authenticationType: gce
```

## Monitoring the Monitoring

Keep an eye on the GMP collectors to make sure they are scraping successfully:

```bash
# Check collector logs for scrape errors
kubectl logs -n gmp-system -l app.kubernetes.io/name=collector --tail=50

# Check scrape targets and their status
kubectl get podmonitorings --all-namespaces
```

GKE Managed Prometheus gives you the best of both worlds - the familiar Prometheus metric format and PromQL query language, backed by Google's managed storage and monitoring infrastructure. No more worrying about Prometheus server sizing, retention, or high availability. Just define what to scrape and start building dashboards.
