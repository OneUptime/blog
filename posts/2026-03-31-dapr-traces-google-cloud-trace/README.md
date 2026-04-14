# How to Send Dapr Traces to Google Cloud Trace

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Tracing, Google Cloud, OpenTelemetry, Observability, GKE

Description: Configure Dapr distributed tracing to send spans to Google Cloud Trace using the OpenTelemetry Collector with GCP exporter on GKE or any Kubernetes cluster.

---

## Overview

Google Cloud Trace provides managed distributed tracing for applications running on GCP. Dapr emits OpenTelemetry spans that can be forwarded to Cloud Trace via the OpenTelemetry Collector's Google Cloud exporter. This works on GKE with Workload Identity or on any cluster using a service account key.

## Prerequisites

```bash
# Enable Cloud Trace API
gcloud services enable cloudtrace.googleapis.com

# Create a service account with Trace writer role
gcloud iam service-accounts create dapr-tracing \
  --display-name "Dapr Tracing SA"

gcloud projects add-iam-policy-binding YOUR_PROJECT \
  --member "serviceAccount:dapr-tracing@YOUR_PROJECT.iam.gserviceaccount.com" \
  --role "roles/cloudtrace.agent"
```

## Workload Identity on GKE

Bind the Kubernetes service account to the GCP service account:

```bash
gcloud iam service-accounts add-iam-policy-binding \
  dapr-tracing@YOUR_PROJECT.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:YOUR_PROJECT.svc.id.goog[monitoring/otel-collector]"

kubectl annotate serviceaccount otel-collector \
  -n monitoring \
  iam.gke.io/gcp-service-account=dapr-tracing@YOUR_PROJECT.iam.gserviceaccount.com
```

## OpenTelemetry Collector Configuration

Deploy the collector with the googlecloud exporter:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
  namespace: monitoring
data:
  config.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317

    processors:
      batch:
        timeout: 5s
      resourcedetection:
        detectors: [gcp]

    exporters:
      googlecloud:
        project: YOUR_PROJECT_ID

    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [batch, resourcedetection]
          exporters: [googlecloud]
```

Use the contrib collector image which includes the GCP exporter:

```bash
kubectl set image deployment/otel-collector \
  otel-collector=otel/opentelemetry-collector-contrib:0.96.0 \
  -n monitoring
```

## Dapr Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: dapr-gcloud-trace
  namespace: default
spec:
  tracing:
    samplingRate: "1"
    otel:
      endpointAddress: "otel-collector.monitoring:4317"
      isSecure: false
      protocol: grpc
```

Annotate your services:

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "order-service"
  dapr.io/config: "dapr-gcloud-trace"
```

## Verifying Traces in Cloud Trace

```bash
# Trigger a Dapr service call
curl -X POST http://localhost:3500/v1.0/invoke/order-service/method/create \
  -H "Content-Type: application/json" \
  -d '{"orderId": "123"}'

# View traces in the GCP Console
# Navigate to: https://console.cloud.google.com/traces/list?project=YOUR_PROJECT_ID
```

Navigate to Cloud Trace in the GCP Console and filter by `app_id` label to view Dapr service spans.

## Adding Custom Attributes

Add service-level resource attributes that appear as labels in Cloud Trace:

```yaml
annotations:
  dapr.io/env: "OTEL_RESOURCE_ATTRIBUTES=service.name=order-service,service.version=1.2.0,environment=production"
```

## Summary

Sending Dapr traces to Google Cloud Trace requires the OpenTelemetry Collector with the `googlecloud` exporter, Workload Identity or a service account key for authentication, and a Dapr Configuration resource pointing to the collector's OTLP endpoint. The `resourcedetection` processor automatically enriches spans with GKE cluster and node metadata, making traces easy to correlate with Cloud Monitoring metrics.
