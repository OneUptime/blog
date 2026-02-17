# How to Set Up Cross-Project Audit Log Aggregation with Organization-Level Log Sinks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Audit Logs, Log Sinks, Organization Management, Security Monitoring

Description: A step-by-step guide to setting up organization-level log sinks on Google Cloud for aggregating audit logs across all projects into a central location for security analysis.

---

When you have dozens or hundreds of GCP projects, looking at audit logs one project at a time is not going to work. You need a single place where all audit logs from every project flow together, so your security team can search across the entire organization, spot cross-project attack patterns, and maintain a complete audit trail for compliance.

Organization-level log sinks solve this by capturing logs from every project under your GCP organization and routing them to a central destination. This guide walks through setting it up properly.

## Why Project-Level Sinks Are Not Enough

You might think you can just create a log sink in each project and call it done. But that approach has real problems. New projects do not automatically get the sink. Someone might delete a project-level sink without you knowing. You end up managing hundreds of individual sinks. And there is no guarantee of consistency across projects.

Organization-level sinks are created once, apply everywhere, and cannot be overridden by project-level admins.

## Step 1: Plan Your Aggregation Architecture

Before creating anything, decide on your destination. You have three main options.

BigQuery is best when you need to run complex analytical queries across logs. It supports SQL, scales to petabytes, and integrates with Looker Studio for dashboards. The downside is cost at high volumes.

Cloud Storage is best for long-term archival and compliance. It is the cheapest option for raw log storage, and you can set retention policies and lifecycle rules. But querying requires loading data into another tool.

Pub/Sub is best when you need real-time processing. Logs flow through Pub/Sub to a subscriber (like a SIEM or a custom analysis pipeline) in near real-time.

For most organizations, the answer is "all three" - BigQuery for analysis, Cloud Storage for archival, and Pub/Sub for real-time alerting.

## Step 2: Set Up the Central Audit Project

Create a dedicated project for log aggregation. This project should have strict access controls - only the security team should have access.

```bash
# Create the central audit project
gcloud projects create org-audit-central \
  --name="Organization Audit Central" \
  --folder=SECURITY_FOLDER_ID

# Link billing
gcloud billing projects link org-audit-central \
  --billing-account=BILLING_ACCOUNT_ID

# Enable required APIs
gcloud services enable bigquery.googleapis.com \
  logging.googleapis.com \
  pubsub.googleapis.com \
  --project=org-audit-central
```

## Step 3: Create the Destination Resources

```bash
# Create BigQuery dataset for audit logs
bq mk --dataset \
  --location=US \
  --description="Centralized organization audit logs" \
  --default_table_expiration=0 \
  org-audit-central:centralized_audit_logs

# Create Cloud Storage bucket for archival
gcloud storage buckets create gs://org-audit-archive-$(date +%Y%m%d) \
  --project=org-audit-central \
  --location=us-central1 \
  --uniform-bucket-level-access \
  --retention-period=31536000 \
  --default-storage-class=NEARLINE

# Create Pub/Sub topic for real-time streaming
gcloud pubsub topics create audit-log-stream \
  --project=org-audit-central

# Create a subscription for the SIEM or custom processor
gcloud pubsub subscriptions create siem-subscription \
  --topic=audit-log-stream \
  --project=org-audit-central \
  --ack-deadline=60 \
  --message-retention-duration=7d
```

## Step 4: Create Organization-Level Log Sinks

Create separate sinks for different log types and destinations. This gives you more control over what goes where.

```bash
# Sink 1: All Admin Activity logs to BigQuery
# These are the most important - they record all configuration changes
gcloud logging sinks create org-admin-to-bigquery \
  --organization=ORG_ID \
  --log-filter='logName:"cloudaudit.googleapis.com/activity"' \
  --destination="bigquery.googleapis.com/projects/org-audit-central/datasets/centralized_audit_logs" \
  --include-children \
  --use-partitioned-tables

# Sink 2: Data Access logs to BigQuery (can be high volume)
gcloud logging sinks create org-data-access-to-bigquery \
  --organization=ORG_ID \
  --log-filter='logName:"cloudaudit.googleapis.com/data_access"' \
  --destination="bigquery.googleapis.com/projects/org-audit-central/datasets/centralized_audit_logs" \
  --include-children \
  --use-partitioned-tables

# Sink 3: All audit logs to Cloud Storage for archival
gcloud logging sinks create org-audit-to-gcs \
  --organization=ORG_ID \
  --log-filter='logName:"cloudaudit.googleapis.com"' \
  --destination="storage.googleapis.com/org-audit-archive-20260217" \
  --include-children

# Sink 4: High-severity events to Pub/Sub for real-time alerting
gcloud logging sinks create org-alerts-to-pubsub \
  --organization=ORG_ID \
  --log-filter='
    logName:"cloudaudit.googleapis.com/activity"
    AND (
      protoPayload.methodName:"SetIamPolicy" OR
      protoPayload.methodName:"delete" OR
      protoPayload.methodName:"Delete" OR
      protoPayload.methodName:"disable" OR
      protoPayload.methodName:"CreateServiceAccountKey"
    )
  ' \
  --destination="pubsub.googleapis.com/projects/org-audit-central/topics/audit-log-stream" \
  --include-children
```

## Step 5: Grant Sink Service Accounts Access

Each sink has a unique service account that needs write access to the destination.

```bash
# Get the service account for each sink and grant permissions
for SINK_NAME in org-admin-to-bigquery org-data-access-to-bigquery org-audit-to-gcs org-alerts-to-pubsub; do
  SINK_SA=$(gcloud logging sinks describe $SINK_NAME \
    --organization=ORG_ID \
    --format="value(writerIdentity)")

  echo "Granting access for $SINK_NAME ($SINK_SA)"

  # Grant BigQuery access for BQ sinks
  if [[ $SINK_NAME == *"bigquery"* ]]; then
    gcloud projects add-iam-policy-binding org-audit-central \
      --member="$SINK_SA" \
      --role="roles/bigquery.dataEditor"
  fi

  # Grant Storage access for GCS sink
  if [[ $SINK_NAME == *"gcs"* ]]; then
    gcloud storage buckets add-iam-policy-binding \
      gs://org-audit-archive-20260217 \
      --member="$SINK_SA" \
      --role="roles/storage.objectCreator"
  fi

  # Grant Pub/Sub access for Pub/Sub sink
  if [[ $SINK_NAME == *"pubsub"* ]]; then
    gcloud pubsub topics add-iam-policy-binding audit-log-stream \
      --project=org-audit-central \
      --member="$SINK_SA" \
      --role="roles/pubsub.publisher"
  fi
done
```

## Step 6: Verify Logs Are Flowing

After creating the sinks, verify that logs are actually arriving at the destinations.

```bash
# Check BigQuery for incoming logs (wait a few minutes after creating sinks)
bq query --use_legacy_sql=false '
SELECT
  COUNT(*) as log_count,
  MIN(timestamp) as earliest,
  MAX(timestamp) as latest
FROM `org-audit-central.centralized_audit_logs.cloudaudit_googleapis_com_activity_*`
WHERE _TABLE_SUFFIX >= FORMAT_DATE("%Y%m%d", CURRENT_DATE())
'

# Check the GCS bucket for log files
gcloud storage ls gs://org-audit-archive-20260217/ --recursive | head -20

# Check Pub/Sub for messages
gcloud pubsub subscriptions pull siem-subscription \
  --project=org-audit-central \
  --limit=5 \
  --auto-ack
```

## Step 7: Handle Data Access Log Volume

Data Access logs can be extremely high volume. Not every project needs them, and some services generate more than others. Use exclusion filters to manage volume.

```bash
# Create an exclusion filter to drop noisy Data Access logs
# For example, exclude routine BigQuery job read operations
gcloud logging sinks update org-data-access-to-bigquery \
  --organization=ORG_ID \
  --log-filter='
    logName:"cloudaudit.googleapis.com/data_access"
    AND NOT protoPayload.methodName="google.cloud.bigquery.v2.JobService.GetQueryResults"
    AND NOT protoPayload.methodName="google.cloud.bigquery.v2.TableService.GetTable"
  '
```

You can also control which projects generate Data Access logs using audit log configuration:

```bash
# Enable Data Access logs only for specific services in a project
gcloud projects get-iam-policy PROJECT_ID > /tmp/policy.yaml

# Edit the auditConfigs section to enable specific log types
# Then apply the updated policy
gcloud projects set-iam-policy PROJECT_ID /tmp/policy.yaml
```

## Step 8: Protect the Audit Infrastructure

The audit log infrastructure itself needs protection. If an attacker compromises an admin account, one of the first things they will try to do is delete or modify the log sinks.

```bash
# Create an alert for changes to organization log sinks
gcloud logging read '
  protoPayload.methodName=("google.logging.v2.ConfigServiceV2.UpdateSink" OR
                           "google.logging.v2.ConfigServiceV2.DeleteSink")
  AND resource.type="organization"
' --organization=ORG_ID --limit=10

# Set up a monitoring alert for sink modifications
gcloud alpha monitoring policies create \
  --display-name="Audit Sink Modified" \
  --condition-display-name="Organization log sink was modified or deleted" \
  --condition-filter='
    resource.type="audited_resource"
    AND protoPayload.methodName=("google.logging.v2.ConfigServiceV2.UpdateSink" OR "google.logging.v2.ConfigServiceV2.DeleteSink")
  ' \
  --notification-channels="projects/org-audit-central/notificationChannels/CHANNEL_ID"
```

## Querying Across the Organization

With all logs centralized, you can now run queries that span your entire organization.

```sql
-- Find all IAM changes across every project in the last 24 hours
SELECT
    timestamp,
    resource.labels.project_id AS project,
    protopayload_auditlog.authenticationInfo.principalEmail AS actor,
    protopayload_auditlog.methodName AS method,
    protopayload_auditlog.requestMetadata.callerIp AS source_ip
FROM `org-audit-central.centralized_audit_logs.cloudaudit_googleapis_com_activity_*`
WHERE protopayload_auditlog.methodName LIKE '%SetIamPolicy%'
AND _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY))
ORDER BY timestamp DESC;
```

Centralizing audit logs with organization-level sinks is one of the highest-value security investments you can make on GCP. It takes about an hour to set up, costs relatively little in ongoing storage, and gives your security team the ability to detect threats and investigate incidents across your entire cloud footprint from a single place.
