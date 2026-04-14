# How to Send Dapr Metrics to InfluxDB and Grafana

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, InfluxDB, Grafana, Metric, Time Series

Description: Learn how to collect Dapr Prometheus metrics and forward them to InfluxDB using Telegraf, then visualize them in Grafana dashboards.

---

## Overview

InfluxDB is a high-performance time series database optimized for metrics workloads. Combined with Telegraf for collection and Grafana for visualization, it provides a powerful open-source metrics stack for Dapr microservices. This is a common choice for teams already using the TICK stack or InfluxDB Cloud.

## Enabling Dapr Metrics

Enable the Prometheus metrics endpoint on your Dapr sidecars:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-metrics-config
spec:
  metric:
    enabled: true
    port: 9090
```

```yaml
annotations:
  dapr.io/config: "dapr-metrics-config"
  dapr.io/enable-metrics: "true"
  dapr.io/metrics-port: "9090"
```

## Installing InfluxDB

Deploy InfluxDB in your Kubernetes cluster:

```bash
helm repo add influxdata https://helm.influxdata.com/
helm repo update

helm install influxdb influxdata/influxdb2 \
  --namespace monitoring \
  --create-namespace \
  --set adminUser.password=my-secure-password \
  --set persistence.enabled=true \
  --set persistence.size=10Gi
```

Create the Dapr metrics bucket:

```bash
influx bucket create \
  --name dapr-metrics \
  --retention 7d \
  --org my-org \
  --token my-operator-token
```

## Configuring Telegraf to Scrape Dapr

Deploy Telegraf as a DaemonSet or static pod to scrape Dapr metrics and forward to InfluxDB:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: telegraf-config
  namespace: monitoring
data:
  telegraf.conf: |
    [agent]
      interval = "15s"
      round_interval = true
      metric_batch_size = 1000
      flush_interval = "10s"

    [[inputs.prometheus]]
      urls = ["http://order-service.default.svc:9090/metrics",
              "http://payment-service.default.svc:9090/metrics"]
      metric_version = 2
      tagexclude = ["le"]

    [[inputs.prometheus]]
      monitor_kubernetes_pods = true
      monitor_kubernetes_pods_namespace = "default"
      kubernetes_label_selector = "dapr.io/enabled=true"
      pod_scrape_path = "/metrics"
      pod_scrape_port = "9090"

    [[outputs.influxdb_v2]]
      urls = ["http://influxdb.monitoring.svc:8086"]
      token = "${INFLUXDB_TOKEN}"
      organization = "my-org"
      bucket = "dapr-metrics"
```

## Querying Dapr Metrics with Flux

Use Flux query language to analyze Dapr metrics in InfluxDB:

```flux
// Request rate over the last 10 minutes
from(bucket: "dapr-metrics")
  |> range(start: -10m)
  |> filter(fn: (r) => r._measurement == "dapr_http_server_request_count")
  |> aggregateWindow(every: 1m, fn: sum, createEmpty: false)
  |> yield(name: "request_rate")

// P99 latency by service
from(bucket: "dapr-metrics")
  |> range(start: -30m)
  |> filter(fn: (r) => r._measurement == "dapr_http_server_latency_bucket")
  |> group(columns: ["app_id"])
  |> histogramQuantile(quantile: 0.99)
  |> yield(name: "p99_latency")
```

## Connecting Grafana to InfluxDB

Add InfluxDB as a Grafana data source:

```bash
curl -X POST http://admin:admin@grafana.monitoring.svc:3000/api/datasources \
  -H "Content-Type: application/json" \
  -d '{
    "name": "InfluxDB-Dapr",
    "type": "influxdb",
    "url": "http://influxdb.monitoring.svc:8086",
    "access": "proxy",
    "jsonData": {
      "version": "Flux",
      "organization": "my-org",
      "defaultBucket": "dapr-metrics",
      "tlsSkipVerify": false
    },
    "secureJsonData": {
      "token": "my-influxdb-token"
    }
  }'
```

## Creating a Grafana Panel with Flux

Build a Grafana panel using Flux against InfluxDB:

```flux
from(bucket: "dapr-metrics")
  |> range(start: v.timeRangeStart, stop: v.timeRangeStop)
  |> filter(fn: (r) => r._measurement == "dapr_resiliency_activations_total")
  |> group(columns: ["app_id"])
  |> aggregateWindow(every: v.windowPeriod, fn: increase, createEmpty: false)
```

## Summary

The InfluxDB and Grafana stack for Dapr metrics uses Telegraf to scrape Dapr's Prometheus endpoint and forward data to InfluxDB. Flux queries provide powerful time series analysis capabilities, and Grafana connects to InfluxDB natively. This stack is an excellent choice for teams running the full TICK stack or preferring a dedicated time series database for metrics retention and analysis.
