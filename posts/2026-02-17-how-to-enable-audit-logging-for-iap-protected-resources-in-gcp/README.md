# How to Enable Audit Logging for IAP-Protected Resources in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, IAP, Audit Logging, Cloud Logging, Security, Compliance

Description: Learn how to enable and configure audit logging for Identity-Aware Proxy protected resources in GCP to track user access, authorization decisions, and security events.

---

When you put IAP in front of your applications, you want to know who accessed what and when. Audit logs answer those questions. They record access attempts and authorization decisions for non-public IAP-protected resources, along with configuration changes related to your IAP-protected resources.

For compliance teams, audit logs are not optional - they are a requirement. For security teams, they are essential for incident response. And for operations teams, they help debug access issues. Let me show you how to set up and use IAP audit logging effectively.

## What Gets Logged

IAP generates several types of audit log entries:

1. **Admin Activity logs**: Configuration changes to IAP (enabling/disabling, changing settings, modifying IAM policies). These are always enabled and cannot be turned off.

2. **Data Access logs**: User access attempts to non-public IAP-protected resources. These need to be explicitly enabled.

3. **Policy Denied logs**: Requests denied because of security policy violations. Always enabled.

The data access logs are the most valuable for tracking user activity, and they are the ones you need to enable manually.

## Step 1: Enable Data Access Audit Logs for IAP

By default, data access logs are disabled to reduce log volume and cost. Enable them for IAP.

```bash
# Get the current audit log configuration

gcloud projects get-iam-policy my-project-id \
    --format=json > /tmp/policy.json
```

Edit the policy file to add the IAP audit log configuration. Add this to the `auditConfigs` section:

```json
{
  "auditConfigs": [
    {
      "service": "iap.googleapis.com",
      "auditLogConfigs": [
        {
          "logType": "ADMIN_READ"
        },
        {
          "logType": "DATA_READ"
        },
        {
          "logType": "DATA_WRITE"
        }
      ]
    }
  ]
}
```

Apply the updated policy:

```bash
# Apply the audit log configuration
gcloud projects set-iam-policy my-project-id /tmp/policy.json
```

Make sure you preserve the existing `bindings` and `etag` fields in the policy file. Accidentally replacing the policy with only the `auditConfigs` section can remove existing IAM access.

The cleanest way is through the Cloud Console. Go to IAM & Admin, then Audit Logs, find "Identity-Aware Proxy" in the list, and check the Data Read, Data Write, and Admin Read log types.

## Step 2: Viewing IAP Audit Logs

Once enabled, you can query IAP audit logs using Cloud Logging.

### View All IAP Access Events

```bash
# View all IAP access authorization events
gcloud logging read \
    'logName:"cloudaudit.googleapis.com%2Fdata_access" AND protoPayload.serviceName="iap.googleapis.com" AND protoPayload.methodName="AuthorizeUser"' \
    --limit=20 \
    --project=my-project-id \
    --format="table(timestamp, protoPayload.authenticationInfo.principalEmail, protoPayload.status.code, protoPayload.resourceName)"
```

### View Only Denied Access Attempts

```bash
# View only denied access attempts
gcloud logging read \
    'logName:"cloudaudit.googleapis.com%2Fdata_access" AND protoPayload.serviceName="iap.googleapis.com" AND protoPayload.methodName="AuthorizeUser" AND protoPayload.status.code!=0' \
    --limit=20 \
    --project=my-project-id \
    --format="table(timestamp, protoPayload.authenticationInfo.principalEmail, protoPayload.status.message)"
```

### View IAP Configuration Changes

```bash
# View changes to IAP settings and IAM policies
gcloud logging read \
    'protoPayload.serviceName="iap.googleapis.com" AND protoPayload.methodName="google.cloud.iap.v1.IdentityAwareProxyAdminService.SetIamPolicy"' \
    --limit=10 \
    --project=my-project-id \
    --format="table(timestamp, protoPayload.authenticationInfo.principalEmail, protoPayload.methodName)"
```

### View Tunnel Access Events

```bash
# View IAP TCP tunnel events (SSH tunneling)
gcloud logging read \
    'resource.type="gce_instance" AND protoPayload.serviceName="iap.googleapis.com" AND protoPayload.authorizationInfo.permission="iap.tunnelInstances.accessViaIAP"' \
    --limit=20 \
    --project=my-project-id \
    --format="table(timestamp, protoPayload.authenticationInfo.principalEmail, protoPayload.resourceName)"
```

## Step 3: Understanding Log Entry Structure

Here is what an IAP access audit log entry looks like:

```json
{
  "protoPayload": {
    "methodName": "AuthorizeUser",
    "authenticationInfo": {
      "principalEmail": "user@company.com"
    },
    "requestMetadata": {
      "callerIp": "203.0.113.45",
      "callerSuppliedUserAgent": "Mozilla/5.0..."
    },
    "resourceName": "projects/123456/iap_web/compute/services/my-backend-service",
    "status": {
      "code": 0,
      "message": ""
    },
    "authorizationInfo": [
      {
        "resource": "projects/123456/iap_web/compute/services/my-backend-service",
        "permission": "iap.webServiceVersions.accessViaIAP",
        "granted": true
      }
    ]
  },
  "resource": {
    "type": "gce_backend_service",
    "labels": {
      "project_id": "my-project-id",
      "backend_service_id": "1234567890",
      "location": "global"
    }
  },
  "timestamp": "2026-02-17T10:30:00.000Z"
}
```

Key fields to pay attention to:
- `principalEmail`: Who made the request
- `callerIp`: Where the request came from
- `status.code`: 0 means success, non-zero means denied
- `granted`: Whether the specific permission was granted

## Step 4: Set Up Log-Based Alerts

Create alerts for security-relevant events.

### Alert on Repeated Access Denials

```bash
# Create a log-based metric for IAP access denials
gcloud logging metrics create iap-access-denied \
    --description="Count of IAP access denied events" \
    --log-filter='logName:"cloudaudit.googleapis.com%2Fdata_access" AND protoPayload.serviceName="iap.googleapis.com" AND protoPayload.methodName="AuthorizeUser" AND protoPayload.status.code!=0' \
    --project=my-project-id
```

Then create an alerting policy in Cloud Monitoring that triggers when this metric exceeds a threshold.

### Alert on IAP Configuration Changes

```bash
# Create a log-based metric for IAP configuration changes
gcloud logging metrics create iap-config-changes \
    --description="Count of IAP configuration changes" \
    --log-filter='protoPayload.serviceName="iap.googleapis.com" AND (protoPayload.methodName="google.cloud.iap.v1.IdentityAwareProxyAdminService.SetIamPolicy" OR protoPayload.methodName="google.cloud.iap.v1.IdentityAwareProxyAdminService.UpdateIapSettings")' \
    --project=my-project-id
```

## Step 5: Export Logs for Long-Term Retention

Cloud Logging retains logs for a limited time (30 days for data access logs by default). For compliance, you probably need longer retention.

### Export to Cloud Storage

```bash
# Create a log sink to export IAP logs to Cloud Storage
gcloud logging sinks create iap-audit-archive \
    'storage.googleapis.com/my-audit-log-bucket' \
    --log-filter='protoPayload.serviceName="iap.googleapis.com"' \
    --project=my-project-id
```

Grant the sink's service account write access to the bucket.

```bash
# Get the sink writer identity
WRITER=$(gcloud logging sinks describe iap-audit-archive \
    --format="value(writerIdentity)" \
    --project=my-project-id)

# Grant write access to Cloud Storage
gcloud storage buckets add-iam-policy-binding gs://my-audit-log-bucket \
    --member="$WRITER" \
    --role="roles/storage.objectCreator"
```

### Export to BigQuery

For analysis, export to BigQuery.

```bash
# Create a log sink to export IAP logs to BigQuery
gcloud logging sinks create iap-audit-bigquery \
    'bigquery.googleapis.com/projects/my-project-id/datasets/audit_logs' \
    --log-filter='protoPayload.serviceName="iap.googleapis.com"' \
    --project=my-project-id
```

After creating the sink, grant the sink's service account write access to the destination.

```bash
# Get the sink writer identity
WRITER=$(gcloud logging sinks describe iap-audit-bigquery \
    --format="value(writerIdentity)" \
    --project=my-project-id)

# Grant write access to BigQuery at the project level
gcloud projects add-iam-policy-binding my-project-id \
    --member="$WRITER" \
    --role="roles/bigquery.dataEditor"
```

## Step 6: Query Logs in BigQuery

Once logs are flowing to BigQuery, you can run analytical queries.

```sql
-- Find the top users accessing IAP-protected resources today
SELECT
    protopayload_auditlog.authenticationInfo.principalEmail AS user_email,
    COUNT(*) AS access_count
FROM
    `my-project-id.audit_logs.cloudaudit_googleapis_com_data_access_*`
WHERE
    protopayload_auditlog.serviceName = 'iap.googleapis.com'
    AND protopayload_auditlog.methodName = 'AuthorizeUser'
    AND _TABLE_SUFFIX = FORMAT_DATE('%Y%m%d', CURRENT_DATE())
GROUP BY user_email
ORDER BY access_count DESC
LIMIT 20
```

```sql
-- Find all denied access attempts in the last 7 days
SELECT
    timestamp,
    protopayload_auditlog.authenticationInfo.principalEmail AS user_email,
    protopayload_auditlog.requestMetadata.callerIp AS source_ip,
    protopayload_auditlog.status.message AS denial_reason
FROM
    `my-project-id.audit_logs.cloudaudit_googleapis_com_data_access_*`
WHERE
    protopayload_auditlog.serviceName = 'iap.googleapis.com'
    AND protopayload_auditlog.methodName = 'AuthorizeUser'
    AND protopayload_auditlog.status.code != 0
    AND _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY))
ORDER BY timestamp DESC
```

## Terraform Configuration for Audit Logging

```hcl
# Enable audit logging for IAP
resource "google_project_iam_audit_config" "iap_audit" {
  project = var.project_id
  service = "iap.googleapis.com"

  audit_log_config {
    log_type = "ADMIN_READ"
  }

  audit_log_config {
    log_type = "DATA_READ"
  }

  audit_log_config {
    log_type = "DATA_WRITE"
  }
}

# Export logs to BigQuery for analysis
resource "google_logging_project_sink" "iap_bigquery" {
  name        = "iap-audit-bigquery"
  destination = "bigquery.googleapis.com/projects/${var.project_id}/datasets/${google_bigquery_dataset.audit_logs.dataset_id}"
  filter      = "protoPayload.serviceName=\"iap.googleapis.com\""

  unique_writer_identity = true
}

# Grant the log sink write access to BigQuery
resource "google_bigquery_dataset_iam_member" "log_writer" {
  dataset_id = google_bigquery_dataset.audit_logs.dataset_id
  role       = "roles/bigquery.dataEditor"
  member     = google_logging_project_sink.iap_bigquery.writer_identity
}

# BigQuery dataset for audit logs
resource "google_bigquery_dataset" "audit_logs" {
  dataset_id = "iap_audit_logs"
  location   = "US"

  default_table_expiration_ms = 31536000000 # 1 year
}
```

## Cost Considerations

Data access logs can generate significant volume, especially for high-traffic applications. Each IAP authorization check generates a log entry. Consider:

- **Exclusion filters**: If you do not need logs for specific backend services, exclude them.
- **Log retention**: Reduce the default retention period if you are exporting to cheaper storage.
- **Sampling exclusions**: For very high-traffic applications, consider whether a sampled exclusion filter is appropriate for non-critical logs.

```bash
# Create an exclusion filter for non-critical backend services
gcloud logging exclusions create iap-exclude-staging \
    --description="Exclude IAP logs for staging backend" \
    --log-filter='protoPayload.serviceName="iap.googleapis.com" AND protoPayload.resourceName:"/services/staging-backend"' \
    --project=my-project-id
```

## Summary

IAP audit logging gives you visibility into who accesses non-public IAP-protected applications and when. Enable data access logs for IAP, set up log-based alerts for security events, and export logs to BigQuery or Cloud Storage for long-term retention and analysis. The admin activity logs (configuration changes) are always on, but data access logs need to be explicitly enabled. For compliance, make sure you export logs before they age out of Cloud Logging's default retention period.
