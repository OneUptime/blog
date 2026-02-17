# How to Audit IAM Policy Changes Using Cloud Audit Logs in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, IAM, Cloud Audit Logs, Security, Compliance, Logging

Description: Learn how to track and audit IAM policy changes in GCP using Cloud Audit Logs for security monitoring, compliance, and incident investigation.

---

Every change to an IAM policy in GCP is a security-relevant event. When someone grants a new role, removes a permission, or adds a member to a binding, you need to know about it. Was it authorized? Was it intentional? Did it follow your change management process?

Cloud Audit Logs in GCP capture all IAM policy changes automatically. In this post, I will show you how to find, query, and alert on these changes so that no IAM modification goes unnoticed.

## What Gets Logged

GCP records IAM policy changes in Admin Activity audit logs. These logs are always enabled and cannot be turned off. Every time someone calls `setIamPolicy` on any resource, an audit log entry is created.

The log entries include:

- **Who** made the change (the caller's identity)
- **When** the change was made (timestamp)
- **What** changed (the IAM method called)
- **Where** the change was applied (the resource)
- **How** the change was made (API call details, including the before and after policy)

## Viewing IAM Changes in Cloud Console

The quickest way to see recent IAM changes is through the Cloud Console:

1. Go to Logging > Logs Explorer
2. Use this filter:

```
protoPayload.methodName="SetIamPolicy"
```

This shows all IAM policy changes across the project.

## Querying IAM Changes with gcloud

For command-line access, use gcloud to query the logs:

```bash
# View all IAM policy changes in the last 24 hours
gcloud logging read 'protoPayload.methodName="SetIamPolicy"' \
    --project=my-project \
    --freshness=1d \
    --format="table(timestamp, protoPayload.authenticationInfo.principalEmail, protoPayload.resourceName, protoPayload.methodName)"
```

For more detail on each change:

```bash
# View detailed IAM changes including the policy diff
gcloud logging read 'protoPayload.methodName="SetIamPolicy"' \
    --project=my-project \
    --freshness=1d \
    --limit=10 \
    --format=json
```

## Filtering by Specific Resource Types

You can narrow down to IAM changes on specific resource types:

### Project-Level IAM Changes

```bash
# Only project-level IAM changes
gcloud logging read 'protoPayload.methodName="SetIamPolicy" AND protoPayload.resourceName:"projects/"' \
    --project=my-project \
    --freshness=7d \
    --format="table(timestamp, protoPayload.authenticationInfo.principalEmail, protoPayload.resourceName)"
```

### Cloud Storage Bucket IAM Changes

```bash
# IAM changes on Cloud Storage buckets
gcloud logging read 'protoPayload.methodName="storage.setIamPermissions" OR (protoPayload.methodName="SetIamPolicy" AND protoPayload.resourceName:"buckets/")' \
    --project=my-project \
    --freshness=7d \
    --format="table(timestamp, protoPayload.authenticationInfo.principalEmail, protoPayload.resourceName)"
```

### Service Account IAM Changes

```bash
# IAM changes on service accounts
gcloud logging read 'protoPayload.methodName="google.iam.admin.v1.SetIAMPolicy" AND protoPayload.resourceName:"serviceAccounts/"' \
    --project=my-project \
    --freshness=7d \
    --format="table(timestamp, protoPayload.authenticationInfo.principalEmail, protoPayload.resourceName)"
```

## Detecting Specific High-Risk Changes

Some IAM changes are more concerning than others. Here are queries for the most critical ones:

### Owner Role Granted

```bash
# Detect when someone is granted the Owner role
gcloud logging read 'protoPayload.methodName="SetIamPolicy" AND protoPayload.serviceData.policyDelta.bindingDeltas.role="roles/owner" AND protoPayload.serviceData.policyDelta.bindingDeltas.action="ADD"' \
    --project=my-project \
    --freshness=30d \
    --format="table(timestamp, protoPayload.authenticationInfo.principalEmail, protoPayload.serviceData.policyDelta.bindingDeltas.member)"
```

### External Users Added

```bash
# Detect when non-organization members are added to IAM
gcloud logging read 'protoPayload.methodName="SetIamPolicy" AND protoPayload.serviceData.policyDelta.bindingDeltas.action="ADD"' \
    --project=my-project \
    --freshness=7d \
    --format=json | python3 -c "
import json, sys
entries = json.loads(sys.stdin.read())
for entry in entries:
    deltas = entry.get('protoPayload', {}).get('serviceData', {}).get('policyDelta', {}).get('bindingDeltas', [])
    for delta in deltas:
        member = delta.get('member', '')
        if delta.get('action') == 'ADD' and '@example.com' not in member:
            print(f\"External member added: {member}\")
            print(f\"  Role: {delta.get('role')}\")
            print(f\"  By: {entry['protoPayload']['authenticationInfo']['principalEmail']}\")
            print(f\"  At: {entry['timestamp']}\")
            print()
"
```

### Service Account Key Created

Service account key creation is another critical event to track:

```bash
# Detect service account key creation
gcloud logging read 'protoPayload.methodName="google.iam.admin.v1.CreateServiceAccountKey"' \
    --project=my-project \
    --freshness=30d \
    --format="table(timestamp, protoPayload.authenticationInfo.principalEmail, protoPayload.resourceName)"
```

## Building a Comprehensive Audit Query

Here is a Python script that generates a comprehensive IAM change report:

```python
# iam_audit_report.py - Generate an IAM change audit report
from google.cloud import logging as cloud_logging
from datetime import datetime, timedelta
import json

def get_iam_changes(project_id, days=7):
    """Fetch all IAM policy changes from the last N days."""
    client = cloud_logging.Client(project=project_id)

    # Build the filter for IAM changes
    filter_str = (
        'protoPayload.methodName="SetIamPolicy" OR '
        'protoPayload.methodName="google.iam.admin.v1.SetIAMPolicy" OR '
        'protoPayload.methodName="google.iam.admin.v1.CreateServiceAccountKey" OR '
        'protoPayload.methodName="google.iam.admin.v1.DeleteServiceAccountKey"'
    )

    # Query the logs
    entries = client.list_entries(
        filter_=filter_str,
        order_by=cloud_logging.DESCENDING,
        page_size=1000
    )

    changes = []
    for entry in entries:
        payload = entry.payload
        change = {
            "timestamp": str(entry.timestamp),
            "caller": payload.get("authenticationInfo", {}).get("principalEmail", "unknown"),
            "method": payload.get("methodName", "unknown"),
            "resource": payload.get("resourceName", "unknown"),
            "caller_ip": payload.get("requestMetadata", {}).get("callerIp", "unknown")
        }

        # Extract policy delta if available
        service_data = payload.get("serviceData", {})
        if "policyDelta" in service_data:
            deltas = service_data["policyDelta"].get("bindingDeltas", [])
            change["deltas"] = [
                {
                    "action": d.get("action"),
                    "role": d.get("role"),
                    "member": d.get("member")
                }
                for d in deltas
            ]

        changes.append(change)

    return changes

def generate_report(changes):
    """Print a formatted audit report."""
    print("=" * 80)
    print("IAM POLICY CHANGE AUDIT REPORT")
    print(f"Generated: {datetime.now().isoformat()}")
    print(f"Total changes: {len(changes)}")
    print("=" * 80)

    for change in changes:
        print(f"\nTimestamp: {change['timestamp']}")
        print(f"Caller: {change['caller']}")
        print(f"Caller IP: {change['caller_ip']}")
        print(f"Method: {change['method']}")
        print(f"Resource: {change['resource']}")

        if "deltas" in change:
            for delta in change["deltas"]:
                action = delta.get("action", "UNKNOWN")
                symbol = "+" if action == "ADD" else "-"
                print(f"  {symbol} {delta.get('role')} -> {delta.get('member')}")

        print("-" * 40)

if __name__ == "__main__":
    project_id = "my-project"
    changes = get_iam_changes(project_id, days=7)
    generate_report(changes)
```

## Setting Up Alerts

Monitoring IAM changes reactively by reading logs is important, but real-time alerts are better for catching unauthorized changes quickly.

### Alert on Any IAM Policy Change

```bash
# Create a log-based metric for IAM changes
gcloud logging metrics create iam-policy-changes \
    --project=my-project \
    --description="Count of IAM policy changes" \
    --log-filter='protoPayload.methodName="SetIamPolicy"'

# Create an alerting policy based on the metric
gcloud alpha monitoring policies create \
    --display-name="IAM Policy Changed" \
    --condition-display-name="IAM policy change detected" \
    --condition-filter='metric.type="logging.googleapis.com/user/iam-policy-changes"' \
    --condition-comparison=COMPARISON_GT \
    --condition-threshold-value=0 \
    --condition-duration=0s \
    --notification-channels=projects/my-project/notificationChannels/12345
```

### Alert on High-Risk Changes

```bash
# Create a metric specifically for Owner role grants
gcloud logging metrics create owner-role-granted \
    --project=my-project \
    --description="Count of Owner role grants" \
    --log-filter='protoPayload.methodName="SetIamPolicy" AND protoPayload.serviceData.policyDelta.bindingDeltas.role="roles/owner" AND protoPayload.serviceData.policyDelta.bindingDeltas.action="ADD"'

# Alert immediately when Owner is granted
gcloud alpha monitoring policies create \
    --display-name="Owner Role Granted - CRITICAL" \
    --condition-display-name="Owner role was granted" \
    --condition-filter='metric.type="logging.googleapis.com/user/owner-role-granted"' \
    --condition-comparison=COMPARISON_GT \
    --condition-threshold-value=0 \
    --condition-duration=0s \
    --notification-channels=projects/my-project/notificationChannels/12345
```

### Alert on Service Account Key Creation

```bash
# Create a metric for service account key creation
gcloud logging metrics create sa-key-created \
    --project=my-project \
    --description="Service account key creation events" \
    --log-filter='protoPayload.methodName="google.iam.admin.v1.CreateServiceAccountKey"'
```

## Exporting Audit Logs for Long-Term Storage

By default, GCP retains Admin Activity logs for 400 days. For compliance requirements that need longer retention, export to Cloud Storage or BigQuery:

```bash
# Export IAM audit logs to a Cloud Storage bucket
gcloud logging sinks create iam-audit-archive \
    storage.googleapis.com/my-audit-bucket \
    --log-filter='protoPayload.methodName:"IamPolicy" OR protoPayload.methodName:"ServiceAccountKey"' \
    --description="Archive IAM-related audit logs"

# Export to BigQuery for analysis
gcloud logging sinks create iam-audit-bq \
    bigquery.googleapis.com/projects/my-project/datasets/iam_audit_logs \
    --log-filter='protoPayload.methodName:"IamPolicy" OR protoPayload.methodName:"ServiceAccountKey"' \
    --description="IAM audit logs for BigQuery analysis"
```

## Analyzing Trends in BigQuery

Once you have logs in BigQuery, you can run analytical queries:

```sql
-- Find the most active IAM policy changers in the last 30 days
SELECT
  protopayload_auditlog.authenticationInfo.principalEmail AS caller,
  COUNT(*) AS change_count,
  COUNTIF(JSON_EXTRACT_SCALAR(
    TO_JSON_STRING(protopayload_auditlog.serviceData),
    '$.policyDelta.bindingDeltas[0].action'
  ) = 'ADD') AS additions,
  COUNTIF(JSON_EXTRACT_SCALAR(
    TO_JSON_STRING(protopayload_auditlog.serviceData),
    '$.policyDelta.bindingDeltas[0].action'
  ) = 'REMOVE') AS removals
FROM `my-project.iam_audit_logs.cloudaudit_googleapis_com_activity_*`
WHERE
  protopayload_auditlog.methodName = 'SetIamPolicy'
  AND _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
GROUP BY caller
ORDER BY change_count DESC
LIMIT 20
```

```sql
-- Find IAM changes made outside business hours
SELECT
  timestamp,
  protopayload_auditlog.authenticationInfo.principalEmail AS caller,
  protopayload_auditlog.resourceName AS resource,
  EXTRACT(HOUR FROM timestamp AT TIME ZONE 'America/New_York') AS hour_et
FROM `my-project.iam_audit_logs.cloudaudit_googleapis_com_activity_*`
WHERE
  protopayload_auditlog.methodName = 'SetIamPolicy'
  AND (
    EXTRACT(HOUR FROM timestamp AT TIME ZONE 'America/New_York') < 9
    OR EXTRACT(HOUR FROM timestamp AT TIME ZONE 'America/New_York') >= 17
    OR EXTRACT(DAYOFWEEK FROM timestamp) IN (1, 7)
  )
ORDER BY timestamp DESC
```

## Security Information and Event Management (SIEM) Integration

For organizations using a SIEM, export audit logs through Pub/Sub:

```bash
# Create a Pub/Sub topic for audit logs
gcloud pubsub topics create iam-audit-stream

# Create a log sink to Pub/Sub
gcloud logging sinks create iam-audit-pubsub \
    pubsub.googleapis.com/projects/my-project/topics/iam-audit-stream \
    --log-filter='protoPayload.methodName:"IamPolicy"'

# Your SIEM can subscribe to this topic for real-time ingestion
```

## Wrapping Up

Auditing IAM policy changes is a fundamental security practice in GCP. Cloud Audit Logs capture every change automatically, and you have multiple ways to consume them: real-time queries with gcloud, alerts through Cloud Monitoring, long-term analysis in BigQuery, and SIEM integration through Pub/Sub. At minimum, set up alerts for high-risk changes like Owner role grants and service account key creation. For compliance, export logs to long-term storage and run regular reports. The logs are already there - you just need to make sure someone is watching them.
