# How to Ingest Google Cloud Telemetry into New Relic Using the GCP Integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, New Relic, Telemetry, Cloud Monitoring, Observability, Google Cloud

Description: Configure the New Relic Google Cloud integration to ingest metrics, logs, and traces from your GCP environment for unified observability.

---

If your team uses New Relic for application performance monitoring and you run infrastructure on Google Cloud, connecting the two gives you a single place to correlate application behavior with infrastructure health. The New Relic GCP integration pulls metrics from Cloud Monitoring, and with some additional configuration, you can also send logs.

This guide walks through setting up the integration, configuring what gets ingested, and making the data useful in New Relic.

## Integration Overview

New Relic's GCP integration works by polling the Cloud Monitoring API at regular intervals to fetch metric data for your GCP services. It supports over 30 GCP services out of the box, including Compute Engine, Cloud SQL, GKE, Cloud Run, Pub/Sub, Cloud Storage, and many more.

The data appears in New Relic as infrastructure metrics, which you can query with NRQL, build dashboards around, and create alert conditions on.

## Setting Up Authentication

New Relic uses a New Relic-managed service account to read metrics from your GCP project. In the New Relic onboarding wizard or NerdGraph provider query, get the New Relic service account ID, then grant it access in your project.

```bash
# Enable the Cloud Monitoring API if it is not already enabled
gcloud services enable monitoring.googleapis.com \
  --project=my-project

# Grant the standard roles required by New Relic's service account authorization
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:NEW_RELIC_SERVICE_ACCOUNT_ID" \
  --role="roles/viewer"

gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:NEW_RELIC_SERVICE_ACCOUNT_ID" \
  --role="roles/serviceusage.serviceUsageConsumer"
```

## Configuring the Integration in New Relic

You can set up the integration through the New Relic UI or through their API.

### Through the UI

Navigate to Infrastructure > GCP in the New Relic UI. Click "Add a GCP account", choose service account authorization, grant the displayed New Relic service account the required roles in GCP, and select the GCP services you want to monitor.

### Through the NerdGraph API

For automation, use New Relic's NerdGraph API.

```bash
# Create the GCP integration using NerdGraph API
curl -X POST 'https://api.newrelic.com/graphql' \
  -H 'Content-Type: application/json' \
  -H 'API-Key: YOUR_NEWRELIC_USER_API_KEY' \
  -d '{
    "query": "mutation { cloudLinkAccount(accountId: YOUR_NR_ACCOUNT_ID, accounts: { gcp: [{ name: \"My GCP Project\", projectId: \"my-project\" }] }) { linkedAccounts { id name } errors { message } } }"
  }'
```

After linking the account, enable the specific integrations you want. The input field names are the provider and integration slugs from NerdGraph.

```bash
# Enable the GCP Compute Engine integration
curl -X POST 'https://api.newrelic.com/graphql' \
  -H 'Content-Type: application/json' \
  -H 'API-Key: YOUR_NEWRELIC_USER_API_KEY' \
  -d '{
    "query": "mutation { cloudConfigureIntegration(accountId: YOUR_NR_ACCOUNT_ID, integrations: { gcp: { computeEngine: [{ linkedAccountId: LINKED_ACCOUNT_ID }] } }) { integrations { id name } errors { message } } }"
  }'
```

## Polling Interval Configuration

New Relic polls most GCP integrations every 5 minutes, with a 1-minute metric resolution. You can change the polling interval for supported integrations, for example to poll less often and reduce API usage.

```bash
# Update polling interval for a specific integration
curl -X POST 'https://api.newrelic.com/graphql' \
  -H 'Content-Type: application/json' \
  -H 'API-Key: YOUR_NEWRELIC_USER_API_KEY' \
  -d '{
    "query": "mutation { cloudConfigureIntegration(accountId: YOUR_NR_ACCOUNT_ID, integrations: { gcp: { computeEngine: [{ linkedAccountId: LINKED_ACCOUNT_ID, metricsPollingInterval: 600 }] } }) { integrations { id } errors { message } } }"
  }'
```

## Sending GCP Logs to New Relic

For log ingestion, route logs from Cloud Logging to New Relic using a Pub/Sub-based pipeline. Generate a GCP Pub/Sub ingest URL in the New Relic Google Cloud Platform logging setup, then use that generated URL as the push endpoint.

```bash
# Create a Pub/Sub topic and subscription for New Relic log forwarding
gcloud pubsub topics create newrelic-logs --project=my-project
gcloud pubsub subscriptions create newrelic-logs-sub \
  --topic=newrelic-logs \
  --push-endpoint="YOUR_NEW_RELIC_GENERATED_PUBSUB_INGEST_URL" \
  --project=my-project

# Create a log sink that routes application logs to the topic
gcloud logging sinks create newrelic-log-sink \
  pubsub.googleapis.com/projects/my-project/topics/newrelic-logs \
  --log-filter='resource.type="cloud_run_revision" OR resource.type="gce_instance" OR resource.type="k8s_container"' \
  --project=my-project

# Grant the sink's writer identity permission to publish
WRITER=$(gcloud logging sinks describe newrelic-log-sink --project=my-project --format='value(writerIdentity)')
gcloud pubsub topics add-iam-policy-binding newrelic-logs \
  --member="${WRITER}" \
  --role="roles/pubsub.publisher" \
  --project=my-project
```

Alternatively, deploy a small Cloud Function to read from Pub/Sub and forward logs to the New Relic Log API.

```python
# main.py
# Cloud Function to forward GCP logs to New Relic
import json
import os
import requests
import base64

NR_LICENSE_KEY = os.environ["NEW_RELIC_LICENSE_KEY"]
NR_LOGS_ENDPOINT = "https://log-api.newrelic.com/log/v1"


def forward_logs_to_newrelic(event, context):
    """Forward Pub/Sub log messages to New Relic Logs API."""

    # Decode the Pub/Sub message
    if "data" in event:
        log_data = json.loads(base64.b64decode(event["data"]).decode("utf-8"))
    else:
        return

    # Transform to New Relic log format
    nr_log_entry = {
        "timestamp": log_data.get("timestamp", ""),
        "message": log_data.get("textPayload", json.dumps(log_data.get("jsonPayload", {}))),
        "attributes": {
            "gcp.project": log_data.get("resource", {}).get("labels", {}).get("project_id", ""),
            "gcp.resource.type": log_data.get("resource", {}).get("type", ""),
            "gcp.logName": log_data.get("logName", ""),
            "gcp.severity": log_data.get("severity", ""),
            "service.name": extract_service_name(log_data)
        }
    }

    # Send to New Relic
    headers = {
        "Content-Type": "application/json",
        "Api-Key": NR_LICENSE_KEY
    }

    payload = [{"logs": [nr_log_entry]}]
    response = requests.post(NR_LOGS_ENDPOINT, json=payload, headers=headers)

    if response.status_code != 202:
        print(f"Failed to send log to New Relic: {response.status_code} {response.text}")


def extract_service_name(log_data):
    """Extract a meaningful service name from GCP log entry."""
    resource = log_data.get("resource", {})
    labels = resource.get("labels", {})
    resource_type = resource.get("type", "")

    if resource_type == "cloud_run_revision":
        return labels.get("service_name", "unknown")
    elif resource_type == "k8s_container":
        return labels.get("container_name", "unknown")
    elif resource_type == "gce_instance":
        return labels.get("instance_id", "unknown")
    return resource_type
```

## Querying GCP Data in New Relic

Once data flows in, you can query it using NRQL.

```sql
-- Query Compute Engine CPU utilization across all instances
SELECT average(`gcp.compute.instance.cpu.utilization`)
FROM Metric
FACET entity.name
SINCE 1 hour ago
TIMESERIES

-- Query Cloud SQL connections and disk usage
SELECT average(`gcp.cloudsql.database.disk.utilization`), average(`gcp.cloudsql.database.network.connections`)
FROM Metric
FACET entity.name
SINCE 6 hours ago
TIMESERIES

-- Query Cloud Run request latency
SELECT percentile(`gcp.run.request_latencies`, 50, 95, 99)
FROM Metric
FACET entity.name
SINCE 1 hour ago
TIMESERIES
```

## Creating Alert Conditions

Set up New Relic alerts based on GCP metrics.

```bash
# Create a NRQL alert condition for high Cloud SQL CPU
curl -X POST "https://api.newrelic.com/graphql" \
  -H "Api-Key: YOUR_NEWRELIC_USER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "mutation { alertsNrqlConditionStaticCreate(accountId: YOUR_NR_ACCOUNT_ID, policyId: YOUR_POLICY_ID, condition: { name: \"High Cloud SQL CPU\", enabled: true, nrql: { query: \"SELECT average(`gcp.cloudsql.database.cpu.utilization`) FROM Metric FACET entity.name\" }, signal: { aggregationWindow: 60, aggregationMethod: EVENT_FLOW, aggregationDelay: 120 }, terms: { threshold: 0.8, operator: ABOVE, thresholdDuration: 300, thresholdOccurrences: ALL, priority: CRITICAL }, valueFunction: SINGLE_VALUE, violationTimeLimitSeconds: 86400 }) { id name } }"
  }'
```

## Filtering and Cost Management

New Relic charges based on data ingested. Be selective about what you send.

Use the available data collection and filtering settings when configuring the integration to limit what is collected. For logs, use specific log filters in your sink rather than sending everything.

```bash
# Only send production logs, not debug or info level
gcloud logging sinks update newrelic-log-sink \
  pubsub.googleapis.com/projects/my-project/topics/newrelic-logs \
  --log-filter='severity>="WARNING" AND (resource.type="cloud_run_revision" OR resource.type="k8s_container")' \
  --project=my-project
```

## Verifying the Integration

After setup, verify data is flowing by checking the Infrastructure section in New Relic. You should see your GCP entities listed under the appropriate service categories. If data is missing, check the integration status page in New Relic for error messages, and verify the service account permissions in GCP.

The New Relic GCP integration gives you a unified view of your cloud infrastructure alongside your application performance data. The setup is straightforward, and once running, it requires minimal maintenance as you add new GCP services.
