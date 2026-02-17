# How to Configure Splunk Add-On for Google Cloud Platform Data Ingestion

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Splunk, Data Ingestion, Cloud Logging, Google Cloud, SIEM

Description: Step-by-step instructions for configuring the Splunk Add-on for Google Cloud Platform to ingest logs, metrics, and audit data from your GCP environment.

---

If your organization runs Splunk as its central logging and security platform, getting Google Cloud data into Splunk is essential for maintaining visibility across your infrastructure. The Splunk Add-on for Google Cloud Platform provides a supported, maintained integration that pulls logs, metrics, and billing data from GCP into Splunk indexes.

This guide covers the full configuration process, from setting up GCP-side prerequisites to configuring the add-on in Splunk and verifying data flow.

## Architecture Overview

The data flow works like this: GCP services generate logs and metrics. These get routed through Cloud Logging and Cloud Monitoring. The Splunk Add-on uses a Pub/Sub subscription to pull log data and the Cloud Monitoring API to pull metrics. A service account authenticates the add-on to your GCP project.

The Pub/Sub approach is preferred over direct API polling because it scales better and provides at-least-once delivery guarantees. You create a log sink that routes logs to a Pub/Sub topic, and the Splunk Add-on subscribes to that topic.

## GCP-Side Setup

Start by creating the infrastructure on the Google Cloud side.

### Create a Service Account

The Splunk Add-on needs a service account with permissions to read from Pub/Sub and Cloud Monitoring.

```bash
# Create the service account for Splunk integration
gcloud iam service-accounts create splunk-integration \
  --display-name="Splunk GCP Integration" \
  --project=my-project

# Grant Pub/Sub subscriber role for log ingestion
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:splunk-integration@my-project.iam.gserviceaccount.com" \
  --role="roles/pubsub.subscriber"

# Grant Monitoring viewer role for metrics ingestion
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:splunk-integration@my-project.iam.gserviceaccount.com" \
  --role="roles/monitoring.viewer"

# Grant Pub/Sub viewer to list topics and subscriptions
gcloud projects add-iam-policy-binding my-project \
  --member="serviceAccount:splunk-integration@my-project.iam.gserviceaccount.com" \
  --role="roles/pubsub.viewer"

# Create a JSON key for the service account
gcloud iam service-accounts keys create splunk-sa-key.json \
  --iam-account=splunk-integration@my-project.iam.gserviceaccount.com
```

### Create the Pub/Sub Topic and Subscription

Set up a dedicated topic for Splunk ingestion and create a pull subscription.

```bash
# Create a Pub/Sub topic for Splunk log ingestion
gcloud pubsub topics create splunk-logs \
  --project=my-project

# Create a pull subscription that the Splunk Add-on will consume from
# Set a reasonable ack deadline and message retention
gcloud pubsub subscriptions create splunk-logs-subscription \
  --topic=splunk-logs \
  --ack-deadline=60 \
  --message-retention-duration=7d \
  --project=my-project
```

### Create Log Sinks

Route the logs you want in Splunk to the Pub/Sub topic using log sinks. You can be selective about which logs to send.

```bash
# Create a log sink that routes all audit logs to the Splunk topic
gcloud logging sinks create splunk-audit-sink \
  pubsub.googleapis.com/projects/my-project/topics/splunk-logs \
  --log-filter='logName:"cloudaudit.googleapis.com"' \
  --project=my-project

# Get the sink's writer identity and grant it publish access
WRITER_IDENTITY=$(gcloud logging sinks describe splunk-audit-sink \
  --project=my-project \
  --format='value(writerIdentity)')

gcloud pubsub topics add-iam-policy-binding splunk-logs \
  --member="${WRITER_IDENTITY}" \
  --role="roles/pubsub.publisher" \
  --project=my-project
```

You can create additional sinks for different log types.

```bash
# Route VPC flow logs to Splunk
gcloud logging sinks create splunk-vpc-flow-sink \
  pubsub.googleapis.com/projects/my-project/topics/splunk-logs \
  --log-filter='resource.type="gce_subnetwork" AND logName:"compute.googleapis.com%2Fvpc_flows"' \
  --project=my-project

# Route Cloud Run request logs to Splunk
gcloud logging sinks create splunk-cloudrun-sink \
  pubsub.googleapis.com/projects/my-project/topics/splunk-logs \
  --log-filter='resource.type="cloud_run_revision"' \
  --project=my-project
```

Remember to grant publish access for each new sink's writer identity.

## Installing the Splunk Add-On

Install the Splunk Add-on for Google Cloud Platform from Splunkbase or use the Splunk CLI.

```bash
# Install using the Splunk CLI if you have access
/opt/splunk/bin/splunk install app splunk-add-on-for-google-cloud-platform.tgz -auth admin:password

# Restart Splunk after installation
/opt/splunk/bin/splunk restart
```

## Configuring the Add-On

After installation, configure the add-on through the Splunk web interface or through configuration files.

### Setting Up the GCP Account

Navigate to the Splunk Add-on for Google Cloud Platform configuration page. Add a new GCP account using the service account key file you created earlier.

For configuration file based setup, create the following file.

```ini
# $SPLUNK_HOME/etc/apps/Splunk_TA_google-cloudplatform/local/google_cloud_credentials.conf
# Stores the GCP service account credentials for the add-on

[splunk_gcp_account]
google_credentials = <contents of your JSON key file - base64 encoded>
google_project = my-project
```

### Configuring Pub/Sub Input

Set up the Pub/Sub input to pull logs from your subscription.

```ini
# $SPLUNK_HOME/etc/apps/Splunk_TA_google-cloudplatform/local/inputs.conf
# Configures the Pub/Sub input for log ingestion

[google_cloud_pubsub://gcp_audit_logs]
google_credentials_name = splunk_gcp_account
google_project = my-project
google_subscriptions = splunk-logs-subscription
index = gcp_logs
sourcetype = google:gcp:pubsub:message
disabled = 0

# Number of parallel workers for pulling messages
max_messages = 100
```

### Configuring Cloud Monitoring Input

For metrics ingestion, configure a separate input.

```ini
# Configures Cloud Monitoring metric collection
[google_cloud_monitoring://gcp_metrics]
google_credentials_name = splunk_gcp_account
google_project = my-project
metrics = compute.googleapis.com/instance/cpu/utilization,compute.googleapis.com/instance/disk/read_bytes_count,loadbalancing.googleapis.com/https/request_count
index = gcp_metrics
sourcetype = google:gcp:monitoring
polling_interval = 300
disabled = 0
```

## Creating Splunk Indexes

Create dedicated indexes for GCP data to keep it organized and manageable.

```ini
# $SPLUNK_HOME/etc/system/local/indexes.conf
# Indexes for GCP log and metric data

[gcp_logs]
homePath = $SPLUNK_DB/gcp_logs/db
coldPath = $SPLUNK_DB/gcp_logs/colddb
thawedPath = $SPLUNK_DB/gcp_logs/thaweddb
maxTotalDataSizeMB = 500000

[gcp_metrics]
homePath = $SPLUNK_DB/gcp_metrics/db
coldPath = $SPLUNK_DB/gcp_metrics/colddb
thawedPath = $SPLUNK_DB/gcp_metrics/thaweddb
maxTotalDataSizeMB = 100000
```

## Verifying Data Ingestion

After configuring everything, verify that data is flowing into Splunk.

```spl
# Search for recent GCP audit log events
index=gcp_logs sourcetype="google:gcp:pubsub:message"
| head 10
| table _time, source, data.logName, data.protoPayload.methodName

# Check ingestion rate
index=gcp_logs sourcetype="google:gcp:pubsub:message"
| timechart span=1h count
```

If you see no data, check these common issues:

First, verify the Pub/Sub subscription has messages waiting. If the subscription is empty, your log sink might not be matching any logs.

```bash
# Check if messages are accumulating in the subscription
gcloud pubsub subscriptions pull splunk-logs-subscription \
  --limit=5 \
  --auto-ack=false \
  --project=my-project
```

Second, check the Splunk internal logs for errors from the add-on.

```spl
# Check for errors from the GCP add-on
index=_internal sourcetype="splunkd" component="google_cloud_pubsub"
| head 20
```

## Tuning for Production

For production deployments, consider a few optimizations. Increase the `max_messages` parameter if your log volume is high. The default is conservative, and you might need to go to 500 or 1000 to keep up with high-throughput environments.

Set up dead-letter topics in Pub/Sub for messages that fail to process. This prevents data loss and gives you a way to diagnose issues.

```bash
# Create a dead-letter topic for failed messages
gcloud pubsub topics create splunk-logs-deadletter --project=my-project

# Update the subscription with dead-letter policy
gcloud pubsub subscriptions update splunk-logs-subscription \
  --dead-letter-topic=projects/my-project/topics/splunk-logs-deadletter \
  --max-delivery-attempts=5 \
  --project=my-project
```

If you are ingesting from multiple GCP projects, create separate inputs for each project or use an organization-level log sink that aggregates logs from all projects into a single topic.

The Splunk Add-on for GCP provides a reliable pipeline for getting your cloud data into Splunk. The Pub/Sub-based architecture handles scale well, and the configuration is straightforward once you have the GCP-side plumbing in place.
