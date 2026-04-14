# How to Send Dapr Metrics to Dynatrace

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Dynatrace, Metric, Observability, Kubernetes

Description: Learn how to ingest Dapr Prometheus metrics into Dynatrace using the Dynatrace Operator with Prometheus scraping on Kubernetes for AI-powered analysis.

---

## Overview

Dynatrace provides AI-powered full-stack observability. Integrating Dapr metrics with Dynatrace enables automatic anomaly detection, root cause analysis using Davis AI, and service flow mapping for your Dapr microservices alongside infrastructure and application performance data.

## Enabling Dapr Prometheus Metrics

Configure the Dapr sidecar metrics endpoint:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-metrics-config
spec:
  metric:
    enabled: true
```

```yaml
annotations:
  dapr.io/config: "dapr-metrics-config"
  dapr.io/enable-metrics: "true"
  dapr.io/metrics-port: "9090"
```

## Installing the Dynatrace Operator

Deploy the Dynatrace Operator in your Kubernetes cluster:

```bash
kubectl create namespace dynatrace

kubectl apply -f https://github.com/Dynatrace/dynatrace-operator/releases/latest/download/kubernetes.yaml

kubectl apply -f - <<EOF
apiVersion: dynatrace.com/v1beta6
kind: DynaKube
metadata:
  name: dynakube
  namespace: dynatrace
spec:
  apiUrl: https://your-tenant.live.dynatrace.com/api
  tokens: dynatrace-tokens
  oneAgent:
    cloudNativeFullStack: {}
  activeGate:
    capabilities:
      - routing
      - kubernetes-monitoring
      - metrics-ingest
  extensions:
    prometheus: {}
EOF
```

## Configuring Prometheus Scraping in Dynatrace

Enable Prometheus scraping using the Dynatrace Operator annotation on Dapr pods:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "shipping-service"
  dapr.io/app-port: "8080"
  dapr.io/enable-metrics: "true"
  dapr.io/metrics-port: "9090"
  metrics.dynatrace.com/scrape: "true"
  metrics.dynatrace.com/port: "9090"
  metrics.dynatrace.com/path: "/metrics"
```

## Using the Dynatrace Extensions Framework

For more control, define a Dynatrace extension for Dapr metrics scraping:

```yaml
name: custom:dapr.metrics
version: "1.0.0"
minDynatraceVersion: "1.250"
metrics:
  - key: dapr.http.server.request.count
    metadata:
      displayName: Dapr HTTP Request Count
      description: Total HTTP requests processed by the Dapr sidecar
      unit: Count
  - key: dapr.resiliency.activations.total
    metadata:
      displayName: Dapr Resiliency Activations
      description: Number of resiliency policy activations
      unit: Count
  - key: dapr.http.server.latency
    metadata:
      displayName: Dapr HTTP Latency
      description: Dapr sidecar request processing latency
      unit: MilliSecond

prometheus:
  enabled: true
  scrapeInterval: 15s
  endpoints:
    - url: http://shipping-service.default.svc:9090/metrics
      labels:
        app_id: shipping-service
```

## Querying Dapr Metrics with DQL

Use Dynatrace Query Language (DQL) in Notebooks or Dashboards:

```sql
-- Request rate by Dapr service
timeseries requests = rate(sum(dapr.http.server.request.count)), by:{app_id}

-- P95 latency
timeseries p95_latency = percentile(dapr.http.server.latency, 95), by:{app_id}

-- Resiliency activations
timeseries activations = sum(dapr.resiliency.activations.total), by:{app_id}
```

## Creating a Dynatrace Dashboard for Dapr

Use the Dynatrace API to create a dashboard:

```bash
curl -X POST "https://your-tenant.live.dynatrace.com/api/config/v1/dashboards" \
  -H "Authorization: Api-Token ${DT_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "dashboardMetadata": {
      "name": "Dapr Microservices Overview",
      "shared": false
    },
    "tiles": [
      {
        "name": "Dapr Request Rate",
        "tileType": "DATA_EXPLORER",
        "configured": true,
        "queries": [
          {
            "metric": "ext:dapr.http.server.request.count",
            "spaceAggregation": "SUM",
            "splitBy": ["app_id"]
          }
        ]
      }
    ]
  }'
```

## Summary

Dynatrace ingests Dapr Prometheus metrics via the Dynatrace Operator's Prometheus scraper configured through pod annotations. Davis AI automatically correlates Dapr metric anomalies with infrastructure problems and traces, reducing mean time to resolution. Use DQL for advanced metric analysis and build dashboards that combine Dapr metrics with OneAgent-collected APM and infrastructure data.
