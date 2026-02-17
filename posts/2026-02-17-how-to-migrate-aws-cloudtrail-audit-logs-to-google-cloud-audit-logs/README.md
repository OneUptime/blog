# How to Migrate AWS CloudTrail Audit Logs to Google Cloud Audit Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud Audit Logs, AWS CloudTrail, Security, Compliance, Cloud Migration

Description: Learn how to migrate your audit logging strategy from AWS CloudTrail to Google Cloud Audit Logs, including log export, compliance mapping, and monitoring configuration.

---

Audit logging is critical for security, compliance, and troubleshooting. When migrating from AWS to GCP, you need to understand how Google Cloud Audit Logs work compared to CloudTrail, migrate your existing log analysis and alerting workflows, and potentially keep historical CloudTrail logs accessible.

The good news is that Google Cloud Audit Logs are enabled by default for most services - there is less setup involved compared to CloudTrail.

## How the Concepts Map

| AWS CloudTrail | Google Cloud Audit Logs |
|---------------|------------------------|
| Management Events | Admin Activity logs |
| Data Events | Data Access logs |
| Insights Events | No direct equivalent (use Cloud Monitoring) |
| Trail | Log sink (Cloud Logging) |
| S3 bucket for log storage | Cloud Storage bucket / BigQuery dataset |
| CloudWatch Logs integration | Cloud Logging (built-in) |
| Event History (90 days) | Cloud Logging retention (default 400 days for Admin Activity) |
| Organization Trail | Organization-level log sink |

Key differences worth noting:

- Admin Activity audit logs are always enabled and cannot be disabled. CloudTrail management events can be turned off.
- Data Access audit logs need to be explicitly enabled for most services. This is similar to CloudTrail data events.
- Cloud Audit Logs are automatically part of Cloud Logging. There is no separate service to configure for basic access.

## Step 1: Understand What is Already Logged

Before configuring anything, check what Google Cloud already logs automatically.

```bash
# View recent Admin Activity audit logs
gcloud logging read \
  'logName:"cloudaudit.googleapis.com/activity"' \
  --limit=10 \
  --format='table(timestamp, protoPayload.methodName, protoPayload.authenticationInfo.principalEmail, resource.type)'

# View recent Data Access audit logs (if enabled)
gcloud logging read \
  'logName:"cloudaudit.googleapis.com/data_access"' \
  --limit=10 \
  --format='table(timestamp, protoPayload.methodName, protoPayload.authenticationInfo.principalEmail)'
```

Admin Activity logs include operations like creating or deleting resources, changing IAM policies, and modifying configurations. These are the equivalent of CloudTrail management events and they are free and always on.

## Step 2: Enable Data Access Audit Logs

Data Access logs (equivalent to CloudTrail data events) need to be explicitly enabled.

```bash
# Get current IAM audit config
gcloud projects get-iam-policy my-project \
  --format=json > iam-policy.json
```

Edit the IAM policy to include audit log configuration:

```json
{
  "auditConfigs": [
    {
      "service": "allServices",
      "auditLogConfigs": [
        { "logType": "ADMIN_READ" },
        { "logType": "DATA_READ" },
        { "logType": "DATA_WRITE" }
      ]
    },
    {
      "service": "storage.googleapis.com",
      "auditLogConfigs": [
        { "logType": "DATA_READ" },
        { "logType": "DATA_WRITE" }
      ]
    }
  ]
}
```

Apply the updated policy:

```bash
# Apply the audit log configuration
gcloud projects set-iam-policy my-project iam-policy.json
```

Be selective about which services you enable Data Access logs for. Enabling them for all services on a high-traffic project can generate massive log volumes and costs.

## Step 3: Export Historical CloudTrail Logs

If you need to retain your CloudTrail history for compliance, export the logs to GCP.

```bash
# Download CloudTrail logs from S3
aws s3 sync s3://my-cloudtrail-bucket/AWSLogs/ ./cloudtrail-logs/

# Upload to a GCS bucket for retention
gsutil -m cp -r ./cloudtrail-logs/ gs://my-gcp-audit-archive/cloudtrail/
```

For long-term analysis, load the CloudTrail logs into BigQuery:

```bash
# Create a BigQuery dataset for historical audit logs
bq mk --dataset audit_logs

# Load CloudTrail JSON files into BigQuery
bq load \
  --source_format=NEWLINE_DELIMITED_JSON \
  --autodetect \
  audit_logs.cloudtrail_history \
  gs://my-gcp-audit-archive/cloudtrail/**/*.json
```

## Step 4: Set Up Log Sinks

CloudTrail trails store logs in S3. In GCP, set up log sinks to export audit logs to Cloud Storage, BigQuery, or Pub/Sub.

```bash
# Export all audit logs to BigQuery for analysis
gcloud logging sinks create audit-to-bigquery \
  bigquery.googleapis.com/projects/my-project/datasets/audit_logs \
  --log-filter='logName:"cloudaudit.googleapis.com"'

# Export to Cloud Storage for long-term archival
gcloud logging sinks create audit-to-gcs \
  storage.googleapis.com/my-audit-log-bucket \
  --log-filter='logName:"cloudaudit.googleapis.com"'

# Export to Pub/Sub for real-time processing
gcloud logging sinks create audit-to-pubsub \
  pubsub.googleapis.com/projects/my-project/topics/audit-log-events \
  --log-filter='logName:"cloudaudit.googleapis.com/activity"'
```

For organization-level sinks (equivalent to an organization trail):

```bash
# Create an organization-level log sink
gcloud logging sinks create org-audit-sink \
  bigquery.googleapis.com/projects/audit-project/datasets/org_audit \
  --organization=123456789 \
  --include-children \
  --log-filter='logName:"cloudaudit.googleapis.com"'
```

## Step 5: Migrate Alert Rules

Convert your CloudTrail-based CloudWatch alarms to Cloud Monitoring alerts.

Common CloudTrail alerts and their GCP equivalents:

```bash
# Alert on IAM policy changes (equivalent to CloudTrail "IAM policy changed" alarm)
gcloud logging metrics create iam-policy-changes \
  --description="IAM policy changes detected" \
  --log-filter='protoPayload.methodName="SetIamPolicy" AND logName:"cloudaudit.googleapis.com/activity"'

# Alert on console sign-ins without MFA
gcloud logging metrics create console-login-no-mfa \
  --description="Console login without MFA" \
  --log-filter='protoPayload.methodName="google.login.LoginService.loginSuccess" AND NOT protoPayload.metadata.is_second_factor'

# Alert on root/super admin usage
gcloud logging metrics create super-admin-activity \
  --description="Super admin account activity" \
  --log-filter='protoPayload.authenticationInfo.principalEmail="admin@example.com" AND logName:"cloudaudit.googleapis.com/activity"'

# Create an alerting policy based on the log metric
gcloud monitoring policies create \
  --display-name="IAM Policy Change Alert" \
  --condition-display-name="IAM policy was modified" \
  --condition-filter='resource.type="global" AND metric.type="logging.googleapis.com/user/iam-policy-changes"' \
  --condition-threshold-value=0 \
  --condition-threshold-comparison=COMPARISON_GT \
  --notification-channels=projects/my-project/notificationChannels/12345
```

## Step 6: Set Up Log-Based Queries

Replace your CloudTrail Insights and Athena queries with BigQuery queries on the audit log data.

```sql
-- Find all resource deletions in the last 24 hours
-- Equivalent to CloudTrail query for Delete* API calls
SELECT
  timestamp,
  protopayload_auditlog.methodName AS method,
  protopayload_auditlog.authenticationInfo.principalEmail AS user,
  resource.type AS resource_type,
  protopayload_auditlog.resourceName AS resource_name
FROM `my-project.audit_logs.cloudaudit_googleapis_com_activity_*`
WHERE
  _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY))
  AND protopayload_auditlog.methodName LIKE '%delete%'
ORDER BY timestamp DESC
LIMIT 100;

-- Find all actions by a specific user
SELECT
  timestamp,
  protopayload_auditlog.methodName,
  resource.type,
  protopayload_auditlog.status.code AS status_code
FROM `my-project.audit_logs.cloudaudit_googleapis_com_activity_*`
WHERE
  protopayload_auditlog.authenticationInfo.principalEmail = 'user@example.com'
  AND _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY))
ORDER BY timestamp DESC;

-- Detect unusual API activity patterns
SELECT
  protopayload_auditlog.authenticationInfo.principalEmail AS user,
  protopayload_auditlog.methodName AS method,
  COUNT(*) AS call_count
FROM `my-project.audit_logs.cloudaudit_googleapis_com_activity_*`
WHERE
  _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY))
GROUP BY user, method
HAVING call_count > 100
ORDER BY call_count DESC;
```

## Step 7: Configure Log Retention

Set retention policies to match your compliance requirements.

```bash
# Set custom retention for a log bucket
gcloud logging buckets update _Default \
  --location=global \
  --retention-days=365

# Create a custom log bucket with specific retention
gcloud logging buckets create compliance-logs \
  --location=us-central1 \
  --retention-days=2555 \
  --description="7-year retention for compliance"

# Route audit logs to the compliance bucket
gcloud logging sinks create compliance-sink \
  logging.googleapis.com/projects/my-project/locations/us-central1/buckets/compliance-logs \
  --log-filter='logName:"cloudaudit.googleapis.com"'
```

## Step 8: Validate Your Audit Coverage

Make sure you have equivalent coverage to what CloudTrail provided.

```bash
# Verify that audit logs are being generated
gcloud logging read \
  'logName:"cloudaudit.googleapis.com"' \
  --limit=5 \
  --format=json

# Check that log sinks are working
gcloud logging sinks list \
  --format='table(name, destination, filter)'

# Verify BigQuery tables are receiving data
bq query --use_legacy_sql=false \
  'SELECT COUNT(*) as log_count,
   DATE(timestamp) as log_date
   FROM `my-project.audit_logs.cloudaudit_googleapis_com_activity_*`
   GROUP BY log_date
   ORDER BY log_date DESC
   LIMIT 7'
```

## Summary

Migrating from CloudTrail to Cloud Audit Logs is less about data migration and more about understanding the new logging framework and recreating your alerting and analysis workflows. The built-in nature of Cloud Audit Logs (Admin Activity logs are always on) actually makes the baseline setup simpler than CloudTrail. The main effort goes into enabling Data Access logs selectively, setting up log sinks for archival and analysis, and converting your CloudWatch alarms and Athena queries to Cloud Monitoring alerts and BigQuery queries. Keep your historical CloudTrail logs accessible in GCS or BigQuery for the retention period required by your compliance framework.
