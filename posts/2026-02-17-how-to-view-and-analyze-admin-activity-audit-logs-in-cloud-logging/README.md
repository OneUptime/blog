# How to View and Analyze Admin Activity Audit Logs in Cloud Logging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Audit Logs, Cloud Logging, Security, Admin Activity

Description: Learn how to view, filter, and analyze Admin Activity audit logs in Cloud Logging to track infrastructure changes and investigate security events.

---

Every time someone creates a VM, changes a firewall rule, modifies an IAM policy, or performs any other administrative action in your GCP project, an Admin Activity audit log entry is created. These logs are always enabled, always free, and retained for 400 days. They form the core of your GCP security audit trail and are essential for tracking who changed what and when.

In this post, I will show you how to find, filter, and analyze Admin Activity audit logs for common operational and security scenarios.

## What Admin Activity Audit Logs Capture

Admin Activity audit logs record API calls that modify the configuration or metadata of GCP resources. This includes:

- Creating, updating, or deleting resources (VMs, disks, networks, buckets, etc.)
- Changing IAM policies
- Modifying organization policies
- Setting up billing accounts
- Configuring VPC networks and firewall rules
- Deploying Cloud Functions or Cloud Run services

Essentially, if someone made a change to your infrastructure, there is an audit log for it.

What they do NOT capture:
- Reading data (that is Data Access audit logs)
- Normal application operations
- Console page views or navigation

## Finding Admin Activity Audit Logs

### In the Cloud Console

1. Go to **Logging** > **Logs Explorer**
2. In the query editor, enter:

```
logName="projects/my-project/logs/cloudaudit.googleapis.com%2Factivity"
```

3. Click **Run Query**

You will see a chronological list of all administrative actions in your project.

### Using the gcloud CLI

```bash
# List recent admin activity audit logs
gcloud logging read 'logName="projects/my-project/logs/cloudaudit.googleapis.com%2Factivity"' \
  --project=my-project \
  --limit=50 \
  --format=json
```

### Using the Activity Page

For a simplified view, go to **Home** > **Activity** in the Cloud Console. This page shows recent administrative actions in a user-friendly format, though it does not support advanced filtering.

## Filtering Admin Activity Logs

The real power comes from filtering. Here are the most useful filter patterns.

### Filter by User or Service Account

Find out what a specific person did:

```
logName="projects/my-project/logs/cloudaudit.googleapis.com%2Factivity"
protoPayload.authenticationInfo.principalEmail="user@company.com"
```

Track service account activity:

```
logName="projects/my-project/logs/cloudaudit.googleapis.com%2Factivity"
protoPayload.authenticationInfo.principalEmail="terraform@my-project.iam.gserviceaccount.com"
```

### Filter by Service

See all changes to a specific GCP service:

```
# All Compute Engine administrative changes
logName="projects/my-project/logs/cloudaudit.googleapis.com%2Factivity"
protoPayload.serviceName="compute.googleapis.com"
```

```
# All IAM changes
logName="projects/my-project/logs/cloudaudit.googleapis.com%2Factivity"
protoPayload.serviceName="iam.googleapis.com"
```

### Filter by Method

Look for specific types of operations:

```
# All resource deletions across any service
logName="projects/my-project/logs/cloudaudit.googleapis.com%2Factivity"
protoPayload.methodName=~"delete"
```

```
# IAM policy changes specifically
logName="projects/my-project/logs/cloudaudit.googleapis.com%2Factivity"
protoPayload.methodName="SetIamPolicy"
```

### Filter by Resource

Track changes to a specific resource:

```
# Changes to a specific VM instance
logName="projects/my-project/logs/cloudaudit.googleapis.com%2Factivity"
protoPayload.resourceName=~"instances/my-production-vm"
```

### Filter by Time Range

Combine with timestamp for incident investigation:

```
# Changes during a specific incident window
logName="projects/my-project/logs/cloudaudit.googleapis.com%2Factivity"
timestamp>="2026-02-17T10:00:00Z"
timestamp<="2026-02-17T12:00:00Z"
```

## Common Investigation Scenarios

### Who Changed the Firewall Rules?

During a security incident, one of the first things to check is whether firewall rules were modified:

```
logName="projects/my-project/logs/cloudaudit.googleapis.com%2Factivity"
protoPayload.serviceName="compute.googleapis.com"
protoPayload.methodName=~"firewalls"
```

This shows all firewall create, update, and delete operations.

### Who Modified IAM Permissions?

Track permission changes - critical for access reviews and incident response:

```
logName="projects/my-project/logs/cloudaudit.googleapis.com%2Factivity"
protoPayload.methodName="SetIamPolicy"
```

The log entry includes both the old and new policy, so you can see exactly what changed.

### Who Deleted Resources?

Find out who deleted a resource that should not have been deleted:

```
logName="projects/my-project/logs/cloudaudit.googleapis.com%2Factivity"
protoPayload.methodName=~"\.delete$"
severity="NOTICE"
```

### Track Deployments

See all deployments to Cloud Run or App Engine:

```
# Cloud Run deployments
logName="projects/my-project/logs/cloudaudit.googleapis.com%2Factivity"
protoPayload.serviceName="run.googleapis.com"
protoPayload.methodName=~"ReplaceService"
```

## Analyzing Audit Logs with SQL

If you have Log Analytics enabled, SQL gives you much more powerful analysis capabilities:

```sql
-- Most active administrators in the last 7 days
SELECT
  proto_payload.audit_log.authentication_info.principal_email AS actor,
  COUNT(*) AS action_count,
  COUNT(DISTINCT proto_payload.audit_log.method_name) AS unique_actions
FROM
  `my-project.global._Required._AllLogs`
WHERE
  log_id = 'cloudaudit.googleapis.com/activity'
  AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY
  actor
ORDER BY
  action_count DESC
```

```sql
-- All resource deletions in the last 24 hours
SELECT
  timestamp,
  proto_payload.audit_log.authentication_info.principal_email AS actor,
  proto_payload.audit_log.service_name AS service,
  proto_payload.audit_log.method_name AS method,
  proto_payload.audit_log.resource_name AS resource
FROM
  `my-project.global._Required._AllLogs`
WHERE
  log_id = 'cloudaudit.googleapis.com/activity'
  AND proto_payload.audit_log.method_name LIKE '%delete%'
  AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 DAY)
ORDER BY
  timestamp DESC
```

```sql
-- IAM policy changes with details
SELECT
  timestamp,
  proto_payload.audit_log.authentication_info.principal_email AS actor,
  proto_payload.audit_log.resource_name AS resource,
  proto_payload.audit_log.service_data AS details
FROM
  `my-project.global._Required._AllLogs`
WHERE
  log_id = 'cloudaudit.googleapis.com/activity'
  AND proto_payload.audit_log.method_name = 'SetIamPolicy'
  AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
ORDER BY
  timestamp DESC
```

## Setting Up Alerts on Admin Activity

Create alerts for sensitive administrative actions:

### Alert on IAM Policy Changes

```bash
# Create a log-based alert for IAM changes
gcloud logging metrics create iam-policy-changes \
  --description="Count of IAM policy changes" \
  --log-filter='logName="projects/my-project/logs/cloudaudit.googleapis.com%2Factivity" AND protoPayload.methodName="SetIamPolicy"' \
  --project=my-project
```

Then create an alerting policy on that metric.

### Alert on Resource Deletions

```bash
# Create a log-based alert for resource deletions
gcloud logging metrics create resource-deletions \
  --description="Count of resource deletion operations" \
  --log-filter='logName="projects/my-project/logs/cloudaudit.googleapis.com%2Factivity" AND protoPayload.methodName=~"\.delete$"' \
  --project=my-project
```

## Exporting Audit Logs

For long-term retention beyond 400 days or for analysis in external tools:

```bash
# Export admin activity logs to BigQuery
gcloud logging sinks create audit-to-bigquery \
  bigquery.googleapis.com/projects/my-project/datasets/audit_logs \
  --log-filter='logName="projects/my-project/logs/cloudaudit.googleapis.com%2Factivity"' \
  --project=my-project
```

```bash
# Export to Cloud Storage for archival
gcloud logging sinks create audit-to-storage \
  storage.googleapis.com/my-project-audit-archive \
  --log-filter='logName="projects/my-project/logs/cloudaudit.googleapis.com%2Factivity"' \
  --project=my-project
```

## Understanding Audit Log Structure

Each Admin Activity audit log entry contains:

- **`protoPayload.authenticationInfo.principalEmail`**: Who performed the action
- **`protoPayload.serviceName`**: Which GCP service was involved
- **`protoPayload.methodName`**: The specific API method called
- **`protoPayload.resourceName`**: The resource that was affected
- **`protoPayload.request`**: The request parameters
- **`protoPayload.response`**: The response data
- **`protoPayload.authorizationInfo`**: Which permissions were used

Understanding this structure is key to writing effective filters and queries.

## Wrapping Up

Admin Activity audit logs are one of the most valuable security and operational tools in GCP. They are always on, always free, and retained for over a year. The challenge is not generating them - it is knowing how to find what you need. Master the filtering syntax, set up alerts for sensitive operations like IAM changes and resource deletions, and build regular review processes. When an incident happens, these logs will be the first place you turn.
