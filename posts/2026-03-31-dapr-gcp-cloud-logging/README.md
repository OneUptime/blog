# How to Use Dapr with GCP Cloud Logging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, GCP, Logging, Observability, Kubernetes

Description: Configure Dapr structured logging to integrate with Google Cloud Logging for centralized log management and analysis of microservices on GKE.

---

## Overview

Google Cloud Logging (formerly Stackdriver Logging) aggregates logs from all your GKE workloads. Dapr can be configured to emit structured JSON logs, which Cloud Logging parses automatically. By enabling JSON log format and tuning Dapr's log level, you can filter, analyze, and alert on microservice log events.

## Prerequisites

- GKE cluster with Dapr installed
- Cloud Logging API enabled (enabled by default on GKE)
- Fluent Bit or Cloud Logging agent running (default on GKE)

## Configuring Dapr Log Format

Set Dapr to emit JSON logs via Helm values:

```bash
helm upgrade dapr dapr/dapr \
  --namespace dapr-system \
  --set global.logAsJson=true
```

Or set per-app via annotations:

```yaml
annotations:
  dapr.io/log-as-json: "true"
  dapr.io/log-level: "info"
```

## Dapr Log Structure

Dapr JSON logs include structured fields:

```json
{
  "level": "info",
  "msg": "HTTP API called",
  "app_id": "order-service",
  "instance": "order-service-7f9b8d4c-xyz",
  "scope": "dapr.runtime",
  "time": "2026-03-31T10:00:00.000Z",
  "ver": "1.13.0",
  "type": "log"
}
```

## Querying Logs in Cloud Logging

Use the Log Explorer with structured queries:

```text
resource.type="k8s_container"
resource.labels.cluster_name="dapr-cluster"
jsonPayload.app_id="order-service"
jsonPayload.level="error"
```

Find slow requests:

```text
resource.type="k8s_container"
jsonPayload.scope="dapr.runtime.http"
jsonPayload.msg=~".*latency.*"
```

## Setting Up Log-Based Metrics

Create a metric from Dapr error logs:

```bash
gcloud logging metrics create dapr-errors \
  --description="Dapr error log count" \
  --log-filter='resource.type="k8s_container" jsonPayload.level="error" jsonPayload.app_id=~".*"'
```

## Creating Log-Based Alerts

Alert when error rate spikes:

```bash
gcloud alpha monitoring policies create \
  --display-name="Dapr Error Spike" \
  --condition-display-name="Error log count > 10" \
  --condition-filter='metric.type="logging.googleapis.com/user/dapr-errors"' \
  --if="> 10" \
  --duration=60s \
  --notification-channels=my-channel
```

## Centralized Log Sink

Export Dapr logs to BigQuery for long-term analysis:

```bash
gcloud logging sinks create dapr-logs-bq \
  bigquery.googleapis.com/projects/my-project/datasets/dapr_logs \
  --log-filter='resource.type="k8s_container" jsonPayload.app_id=~".*"' \
  --use-partitioned-tables
```

Query from BigQuery:

```sql
SELECT
  jsonPayload.app_id,
  jsonPayload.level,
  COUNT(*) as count
FROM `my-project.dapr_logs.stdout`
WHERE DATE(_PARTITIONTIME) = CURRENT_DATE()
GROUP BY 1, 2
ORDER BY 3 DESC;
```

## Summary

GCP Cloud Logging integrates seamlessly with Dapr's structured JSON logs on GKE. By enabling JSON log format and using Cloud Logging's filtering and alerting capabilities, you gain centralized visibility into all Dapr sidecar and application activity, with options to archive to BigQuery for trend analysis.
