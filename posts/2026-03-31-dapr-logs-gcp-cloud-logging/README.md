# How to Send Dapr Logs to GCP Cloud Logging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, GCP, Cloud Logging, Kubernetes, GKE

Description: Learn how to forward Dapr sidecar and application logs to GCP Cloud Logging using GKE's built-in log collection or Fluent Bit with the Stackdriver output plugin.

---

## Overview

GCP Cloud Logging (formerly Stackdriver Logging) is the native log management service for workloads on Google Kubernetes Engine (GKE). When running Dapr on GKE, logs are automatically collected and can be enriched with Dapr-specific labels for efficient filtering and alerting.

## GKE Built-In Log Collection

GKE automatically forwards container logs to Cloud Logging when the system node pool logging is enabled. Verify your cluster has logging enabled:

```bash
gcloud container clusters describe my-cluster \
  --zone us-central1-a \
  --format="value(loggingService)"
# Expected output: logging.googleapis.com/kubernetes
```

If not enabled, activate it:

```bash
gcloud container clusters update my-cluster \
  --zone us-central1-a \
  --logging=SYSTEM,WORKLOAD
```

## Enabling Dapr JSON Logging

Configure Dapr to emit structured JSON logs that GCP can auto-parse:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: analytics-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "analytics-service"
        dapr.io/app-port: "8080"
        dapr.io/log-as-json: "true"
        dapr.io/log-level: "info"
```

## Querying Dapr Logs in Cloud Logging

Use the Logs Explorer with filter queries:

```text
# All Dapr sidecar errors
resource.type="k8s_container"
labels.k8s-pod/app="analytics-service"
resource.labels.container_name="daprd"
severity="ERROR"

# Circuit breaker events
resource.type="k8s_container"
resource.labels.container_name="daprd"
jsonPayload.msg=~"circuit breaker"

# Filter by Dapr app_id field
resource.type="k8s_container"
resource.labels.container_name="daprd"
jsonPayload.app_id="analytics-service"
jsonPayload.level="warning"
```

## Using gcloud CLI to Query Logs

Query logs programmatically using the gcloud CLI:

```bash
# Fetch recent Dapr errors
gcloud logging read \
  'resource.type="k8s_container" AND resource.labels.container_name="daprd" AND jsonPayload.level="error"' \
  --project=my-gcp-project \
  --freshness=1h \
  --format="json" | jq '.[] | {time: .timestamp, app_id: .jsonPayload.app_id, msg: .jsonPayload.msg}'
```

## Configuring Fluent Bit with Cloud Logging Output

For more control, deploy Fluent Bit with the Cloud Logging output plugin:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
data:
  fluent-bit.conf: |
    [SERVICE]
        Parsers_File parsers.conf

    [INPUT]
        Name tail
        Path /var/log/containers/*daprd*.log
        Parser cri
        Tag dapr.*

    [FILTER]
        Name kubernetes
        Match dapr.*
        Kube_URL https://kubernetes.default.svc:443
        Merge_Log On

    [OUTPUT]
        Name stackdriver
        Match dapr.*
        export_to_project_id ${GCP_PROJECT_ID}
        resource k8s_container
        k8s_cluster_name my-cluster
        k8s_cluster_location us-central1-a
        labels_key kubernetes
```

## Creating Log-Based Metrics

Create a Cloud Logging log-based metric for Dapr errors:

```bash
gcloud logging metrics create dapr_error_count \
  --project=my-gcp-project \
  --description="Count of Dapr sidecar errors" \
  --log-filter='resource.type="k8s_container" AND resource.labels.container_name="daprd" AND jsonPayload.level="error"'
```

Use this metric in Cloud Monitoring alerts:

```bash
gcloud alpha monitoring policies create \
  --notification-channels=projects/my-project/notificationChannels/12345 \
  --display-name="Dapr High Error Rate" \
  --condition-display-name="Error rate" \
  --condition-filter='metric.type="logging.googleapis.com/user/dapr_error_count"' \
  --condition-threshold-value=10 \
  --condition-threshold-duration=300s
```

## Summary

GKE automatically collects Dapr container logs in Cloud Logging when workload logging is enabled. Enable Dapr JSON logging to produce structured log entries that Cloud Logging can parse into queryable fields. Use the Logs Explorer for interactive investigation, log-based metrics for alerting, and the gcloud CLI for programmatic access to Dapr log data.
