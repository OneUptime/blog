# How to Monitor Dapr on GCP with Cloud Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, GCP, Monitoring, Observability, Kubernetes

Description: Set up Dapr telemetry export to Google Cloud Monitoring using the OpenTelemetry Collector to monitor microservices metrics and traces on GKE.

---

## Overview

Google Cloud Monitoring (formerly Stackdriver) provides metrics, dashboards, and alerting for GCP workloads. By integrating Dapr's built-in telemetry with Cloud Monitoring, you gain visibility into request rates, latencies, and error rates across your microservice mesh.

## Prerequisites

- GKE cluster with Dapr installed
- Cloud Monitoring API enabled
- OpenTelemetry Collector deployed on the cluster

## Enabling Dapr Metrics and Tracing

Configure Dapr to emit telemetry:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-config
  namespace: default
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: "http://otel-collector-svc:9411/api/v2/spans"
  metrics:
    enabled: true
```

## Deploying the OpenTelemetry Collector

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-config
  namespace: monitoring
data:
  config.yaml: |
    receivers:
      zipkin:
        endpoint: 0.0.0.0:9411
      prometheus:
        config:
          scrape_configs:
          - job_name: dapr-sidecar
            kubernetes_sd_configs:
            - role: pod
            relabel_configs:
            - source_labels: [__meta_kubernetes_pod_annotation_dapr_io_enabled]
              action: keep
              regex: "true"
            - source_labels: [__address__]
              action: replace
              regex: ([^:]+)(?::\d+)?
              replacement: $1:9090
              target_label: __address__
    exporters:
      googlecloud:
        project: my-gcp-project
        metric:
          prefix: "custom.googleapis.com/dapr"
    service:
      pipelines:
        traces:
          receivers: [zipkin]
          exporters: [googlecloud]
        metrics:
          receivers: [prometheus]
          exporters: [googlecloud]
```

## Creating Cloud Monitoring Dashboards

Use gcloud to create a custom dashboard for Dapr metrics:

```bash
gcloud monitoring dashboards create --config-from-file=dapr-dashboard.json
```

Example dashboard JSON for request rate:

```json
{
  "displayName": "Dapr Microservices",
  "gridLayout": {
    "widgets": [
      {
        "title": "Request Rate",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"custom.googleapis.com/dapr/dapr_http_server_request_count\""
                }
              }
            }
          ]
        }
      }
    ]
  }
}
```

## Setting Up Alerting Policies

Create an alert for high non-2xx request count:

```bash
gcloud alpha monitoring policies create \
  --notification-channels=my-channel \
  --display-name="Dapr High Error Rate" \
  --condition-display-name="Non-2xx request count > 5" \
  --condition-filter='metric.type="custom.googleapis.com/dapr/dapr_http_server_request_count" AND NOT metric.labels.status = monitoring.regex.full_match("2..")' \
  --condition-threshold-value=5 \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-threshold-duration=60s
```

## Viewing Traces in Cloud Trace

Dapr traces exported via the OpenTelemetry Collector appear in Google Cloud Trace automatically. You can browse and filter traces using the Trace Explorer in the Google Cloud Console, or query them programmatically via the Cloud Trace API:

```bash
curl -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  "https://cloudtrace.googleapis.com/v2/projects/my-gcp-project/traces?filter=+root:/order-service"
```

## Summary

Google Cloud Monitoring provides comprehensive observability for Dapr microservices on GKE. By routing Dapr's Prometheus metrics and Zipkin traces through the OpenTelemetry Collector, you gain custom dashboards, alert policies, and distributed trace analysis without modifying application code.
