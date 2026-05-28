# How to Integrate Datadog with Google Cloud Platform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Datadog, Integration, Cloud Monitoring, Observability, Google Cloud

Description: Step-by-step guide to integrating Datadog with Google Cloud Platform using the GCP integration tile for centralized monitoring and alerting.

---

Many organizations run on Google Cloud but use Datadog as their primary observability platform. The good news is that Datadog has a first-class integration with GCP that pulls in metrics from over 80 Google Cloud services, imports Cloud Logging logs, and correlates everything with your other infrastructure. In this post, I will walk through setting up the integration properly so you get the full value from both platforms.

## What the Integration Provides

The Datadog GCP integration gives you several things. It automatically collects metrics from Google Cloud services like Compute Engine, GKE, Cloud SQL, Cloud Run, Cloud Functions, Pub/Sub, and many more. It can forward Cloud Logging logs to Datadog. It enriches your Datadog infrastructure map with GCP resource information. And it lets you create Datadog monitors and dashboards using GCP metrics alongside metrics from your other cloud providers and on-premises infrastructure.

## Prerequisites

- A Datadog account with an active plan
- A GCP project with the services you want to monitor
- IAM admin permissions on the GCP project
- Access to the Datadog GCP integration tile

## Step 1: Create a GCP Service Account

Datadog needs a service account with specific permissions to read metrics and resource metadata from your GCP project.

```bash
# Create a service account for Datadog

gcloud iam service-accounts create datadog-integration \
    --display-name="Datadog GCP Integration" \
    --project=my-gcp-project
```

Grant the necessary roles. Datadog needs read access to monitoring, compute, and optionally cloud asset inventory.

```bash
# Grant the monitoring viewer role - required for metric collection
gcloud projects add-iam-policy-binding my-gcp-project \
    --member="serviceAccount:datadog-integration@my-gcp-project.iam.gserviceaccount.com" \
    --role="roles/monitoring.viewer"

# Grant the compute viewer role - required for host metadata
gcloud projects add-iam-policy-binding my-gcp-project \
    --member="serviceAccount:datadog-integration@my-gcp-project.iam.gserviceaccount.com" \
    --role="roles/compute.viewer"

# Grant the Cloud Asset Viewer role - for resource discovery
gcloud projects add-iam-policy-binding my-gcp-project \
    --member="serviceAccount:datadog-integration@my-gcp-project.iam.gserviceaccount.com" \
    --role="roles/cloudasset.viewer"

# Grant the Browser role - for basic project info
gcloud projects add-iam-policy-binding my-gcp-project \
    --member="serviceAccount:datadog-integration@my-gcp-project.iam.gserviceaccount.com" \
    --role="roles/browser"
```

## Step 2: Allow Datadog to Impersonate the Service Account

Datadog now recommends service account impersonation instead of uploading a long-lived JSON key. In the Datadog integration tile, click "Add GCP Account", generate the Datadog principal, and copy it. Then grant that principal permission to create short-lived tokens for the service account.

```bash
# Replace this with the Datadog principal copied from the integration tile
DATADOG_PRINCIPAL="principal://iam.googleapis.com/..."

gcloud iam service-accounts add-iam-policy-binding \
    datadog-integration@my-gcp-project.iam.gserviceaccount.com \
    --member="${DATADOG_PRINCIPAL}" \
    --role="roles/iam.serviceAccountTokenCreator" \
    --project=my-gcp-project
```

This avoids storing or rotating a service account key file.

## Step 3: Configure the Integration in Datadog

Open the Datadog web console and navigate to Integrations, then search for "Google Cloud Platform" and click on the integration tile.

Click "Add GCP Account", paste the service account email, and save the account. Datadog will validate impersonation access and begin collecting metrics.

You can also configure this via the Datadog API.

```bash
# Create the integration via the Datadog API
curl -X POST "https://api.datadoghq.com/api/v2/integration/gcp/accounts" \
    -H "Accept: application/json" \
    -H "Content-Type: application/json" \
    -H "DD-API-KEY: ${DD_API_KEY}" \
    -H "DD-APPLICATION-KEY: ${DD_APP_KEY}" \
    -d '{
        "data": {
            "attributes": {
                "client_email": "datadog-integration@my-gcp-project.iam.gserviceaccount.com",
                "host_filters": []
            },
            "type": "gcp_service_account"
        }
    }'
```

## Step 4: Configure Host Filters (Optional)

If you only want to monitor specific GCE instances, use host filters to limit the scope.

In the Datadog GCP integration tile, you can set filters like:

```text
# Only monitor instances with specific labels
env:production

# Use wildcards to match label values
instance-type:c1.*

# Exclude development instances
!env:development
```

## Step 5: Set Up Log Forwarding

To forward Google Cloud logs to Datadog, set up a Pub/Sub topic, a pull subscription, and a Dataflow job using the Pub/Sub to Datadog template. Pub/Sub push subscriptions to external endpoints are a legacy path for this integration. Make sure the Dataflow API is enabled and that the Cloud Storage staging bucket already exists.

```bash
# Create a Pub/Sub topic for Datadog log forwarding
gcloud pubsub topics create datadog-logs-export \
    --project=my-gcp-project

# Create a pull subscription for Dataflow to read from
gcloud pubsub subscriptions create datadog-logs-subscription \
    --topic=datadog-logs-export \
    --project=my-gcp-project

# Create a dead-letter topic for messages Dataflow cannot deliver
gcloud pubsub topics create datadog-logs-deadletter \
    --project=my-gcp-project

# Create a log sink that exports logs to the Pub/Sub topic
gcloud logging sinks create datadog-sink \
    pubsub.googleapis.com/projects/my-gcp-project/topics/datadog-logs-export \
    --log-filter='resource.type="gce_instance" OR resource.type="k8s_container" OR resource.type="cloud_run_revision"' \
    --project=my-gcp-project
```

The log sink's service account needs publish permission on the Pub/Sub topic.

```bash
# Get the sink's writer identity
SINK_SA=$(gcloud logging sinks describe datadog-sink \
    --project=my-gcp-project \
    --format="value(writerIdentity)")

# Grant publish permission to the sink's service account
gcloud pubsub topics add-iam-policy-binding datadog-logs-export \
    --member="$SINK_SA" \
    --role="roles/pubsub.publisher" \
    --project=my-gcp-project

# Start the Dataflow pipeline that forwards logs to Datadog
gcloud dataflow jobs run datadog-log-forwarder \
    --gcs-location gs://dataflow-templates-us-central1/latest/Cloud_PubSub_to_Datadog \
    --region us-central1 \
    --staging-location gs://my-gcp-project-dataflow-staging/staging \
    --parameters \
inputSubscription=projects/my-gcp-project/subscriptions/datadog-logs-subscription,\
apiKey=${DD_API_KEY},\
url=https://http-intake.logs.datadoghq.com,\
outputDeadletterTopic=projects/my-gcp-project/topics/datadog-logs-deadletter
```

## Integration Architecture

Here is how the data flows.

```mermaid
graph TD
    subgraph "Google Cloud"
        A[GCE Instances] -->|Metrics API| B[Cloud Monitoring]
        C[GKE Clusters] -->|Metrics API| B
        D[Cloud SQL] -->|Metrics API| B
        E[Cloud Run] -->|Metrics API| B

        A -->|Logs| F[Cloud Logging]
        C -->|Logs| F
        F -->|Log Sink| G[Pub/Sub Topic]
    end

    subgraph "Datadog"
        B -->|Service Account Auth| H[Datadog GCP Integration]
        G -->|Pull Subscription + Dataflow| I[Datadog Log Intake]
        H --> J[Datadog Metrics]
        I --> K[Datadog Logs]
        J --> L[Dashboards]
        K --> L
        J --> M[Monitors/Alerts]
        K --> M
    end
```

## Step 6: Verify the Integration

After setting up the integration, verify that metrics are flowing.

```bash
# Use the Datadog API to check GCP metrics are available
curl -G "https://api.datadoghq.com/api/v1/metrics" \
    -H "DD-API-KEY: ${DD_API_KEY}" \
    -H "DD-APPLICATION-KEY: ${DD_APP_KEY}" \
    --data-urlencode "from=$(($(date +%s) - 3600))" \
    --data-urlencode "host=my-gcp-instance"
```

In the Datadog console, navigate to Metrics Explorer and search for `gcp.` prefix metrics. You should see metrics like `gcp.gce.instance.cpu.utilization`, `gcp.gke.container.cpu.core_usage_time`, and others appearing within about 15 minutes of configuring the integration.

## Step 7: Create a GCP Dashboard in Datadog

Here is a Terraform example for creating a Datadog dashboard with GCP metrics.

```hcl
resource "datadog_dashboard" "gcp_overview" {
  title       = "GCP Infrastructure Overview"
  description = "Overview of Google Cloud resources"
  layout_type = "ordered"

  widget {
    group_definition {
      title       = "Compute Engine"
      layout_type = "ordered"

      widget {
        timeseries_definition {
          title = "CPU Utilization by Instance"
          request {
            q = "avg:gcp.gce.instance.cpu.utilization{project_id:my-gcp-project} by {instance_name}"
            display_type = "line"
          }
        }
      }

      widget {
        timeseries_definition {
          title = "Network Traffic"
          request {
            q = "sum:gcp.gce.instance.network.received_bytes_count{project_id:my-gcp-project} by {instance_name}.as_rate()"
            display_type = "area"
          }
        }
      }
    }
  }

  widget {
    group_definition {
      title       = "GKE"
      layout_type = "ordered"

      widget {
        timeseries_definition {
          title = "Container CPU Usage"
          request {
            q = "avg:gcp.gke.container.cpu.core_usage_time{project_id:my-gcp-project} by {container_name}.as_rate()"
            display_type = "line"
          }
        }
      }

      widget {
        timeseries_definition {
          title = "Container Memory Usage"
          request {
            q = "avg:gcp.gke.container.memory.used_bytes{project_id:my-gcp-project} by {container_name}"
            display_type = "line"
          }
        }
      }
    }
  }
}
```

## Step 8: Create Monitors on GCP Metrics

Set up Datadog monitors that alert on GCP metric thresholds.

```bash
# Create a Datadog monitor for GCE CPU utilization
curl -X POST "https://api.datadoghq.com/api/v1/monitor" \
    -H "Content-Type: application/json" \
    -H "DD-API-KEY: ${DD_API_KEY}" \
    -H "DD-APPLICATION-KEY: ${DD_APP_KEY}" \
    -d '{
        "type": "metric alert",
        "query": "avg(last_5m):avg:gcp.gce.instance.cpu.utilization{project_id:my-gcp-project} by {instance_name} > 0.8",
        "name": "GCP: High CPU Utilization",
        "message": "CPU utilization on {{instance_name.name}} is above 80%. Current value: {{value}}",
        "tags": ["env:production", "cloud:gcp"],
        "options": {
            "thresholds": {
                "critical": 0.8,
                "warning": 0.7
            },
            "notify_no_data": false,
            "renotify_interval": 60
        }
    }'
```

## Multi-Project Setup

If you have multiple GCP projects, add each one to the integration. You can also use organization-level service accounts.

```bash
# For organization-wide monitoring, create a service account in an admin project
gcloud iam service-accounts create datadog-org-integration \
    --display-name="Datadog Org Integration" \
    --project=my-admin-project

# Grant the documented organization-level roles
gcloud organizations add-iam-policy-binding $ORG_ID \
    --member="serviceAccount:datadog-org-integration@my-admin-project.iam.gserviceaccount.com" \
    --role="roles/monitoring.viewer"

gcloud organizations add-iam-policy-binding $ORG_ID \
    --member="serviceAccount:datadog-org-integration@my-admin-project.iam.gserviceaccount.com" \
    --role="roles/compute.viewer"

gcloud organizations add-iam-policy-binding $ORG_ID \
    --member="serviceAccount:datadog-org-integration@my-admin-project.iam.gserviceaccount.com" \
    --role="roles/cloudasset.viewer"

gcloud organizations add-iam-policy-binding $ORG_ID \
    --member="serviceAccount:datadog-org-integration@my-admin-project.iam.gserviceaccount.com" \
    --role="roles/browser"
```

## Wrapping Up

The Datadog GCP integration gives you a unified view of your Google Cloud infrastructure alongside everything else Datadog monitors. The setup involves creating a service account with the right permissions, configuring the integration tile in Datadog, and optionally setting up log forwarding via Pub/Sub and Dataflow. Once connected, you get automatic metric collection from supported GCP services, host maps with GCP metadata, and the ability to build dashboards and alerts that span your entire infrastructure - not just Google Cloud. The whole process takes about 30 minutes and the metrics start flowing within about 15 minutes of configuration.
