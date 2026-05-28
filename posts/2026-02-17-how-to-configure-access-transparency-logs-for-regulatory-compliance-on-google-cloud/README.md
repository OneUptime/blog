# How to Configure Access Transparency Logs for Regulatory Compliance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Access Transparency, Compliance, Audit Logging, Security

Description: Learn how to configure and use Google Cloud Access Transparency logs to track when Google personnel access your data, meeting regulatory audit requirements.

---

When regulators ask "who has accessed your data?", they do not just mean your own employees. They mean everyone - including your cloud provider's personnel. Access Transparency is Google Cloud's answer to this question. It provides logs every time a Google employee accesses your content, along with the reason for that access.

This matters for financial services companies under SOX or Basel III, healthcare organizations under HIPAA, government agencies, and any organization in the EU subject to GDPR. If you need to demonstrate to auditors that you know who touched your data and why, Access Transparency is the tool.

## What Access Transparency Logs Capture

Access Transparency logs are different from Cloud Audit Logs. Audit Logs capture actions taken by your users and service accounts. Access Transparency logs capture actions taken by Google personnel - support engineers, site reliability engineers, and automated systems.

Each log entry includes the justification for the access (such as a support ticket number), the resource and action, the time of the action, and accessor information such as the Google employee's office country, physical location country, employing entity, and job category.

## Prerequisites

Access Transparency is included for all Google Cloud organizations at no extra charge. It requires an organization resource - you cannot use it with standalone projects. You also need the Access Transparency Admin role at the organization level to verify or change the setting.

```bash
# Verify your organization setup

gcloud organizations list

# Verify that you have roles/axt.admin at the organization level
# Navigate to: console.cloud.google.com/iam-admin/iam
```

## Step 1: Enable Access Transparency

Access Transparency is an organization-level control. In the Google Cloud console, verify it from IAM > Settings. If it is not enabled in your environment, use the console workflow with the Access Transparency Admin role.

```bash
# There is no gcloud access-transparency enable command.
# Verify from the console instead:
# IAM > Settings > Access Transparency
```

Access Transparency is separate from Access Approval, but they complement each other well. Use the Access Approval API only for Access Approval settings, not for enabling Access Transparency.

## Step 2: Configure Log Routing

By default, Access Transparency logs appear in Cloud Logging. Route them to long-term storage for compliance purposes.

```bash
# Create a BigQuery dataset for Access Transparency log analysis
bq mk --dataset \
  --location=US \
  --description="Access Transparency logs for compliance" \
  audit-project:access_transparency_logs

# Create an organization-level log sink for Access Transparency logs
gcloud logging sinks create access-transparency-sink \
  --organization=ORG_ID \
  --log-filter='log_id("cloudaudit.googleapis.com/access_transparency")' \
  --destination="bigquery.googleapis.com/projects/audit-project/datasets/access_transparency_logs" \
  --include-children

# Get the sink's service account and grant it BigQuery access
SINK_SA=$(gcloud logging sinks describe access-transparency-sink \
  --organization=ORG_ID --format="value(writerIdentity)")

bq add-iam-policy-binding \
  --member="$SINK_SA" \
  --role="roles/bigquery.dataEditor" \
  audit-project:access_transparency_logs
```

Also export to Cloud Storage for long-term archival:

```bash
# Create a GCS bucket for long-term log archival
gcloud storage buckets create gs://access-transparency-archive \
  --location=us-central1 \
  --uniform-bucket-level-access \
  --retention-period=31536000  # 1 year retention

# Create a second sink for archival
gcloud logging sinks create access-transparency-archive \
  --organization=ORG_ID \
  --log-filter='log_id("cloudaudit.googleapis.com/access_transparency")' \
  --destination="storage.googleapis.com/access-transparency-archive" \
  --include-children

# Grant the archive sink permission to write to the bucket
ARCHIVE_SINK_SA=$(gcloud logging sinks describe access-transparency-archive \
  --organization=ORG_ID --format="value(writerIdentity)")

gcloud storage buckets add-iam-policy-binding gs://access-transparency-archive \
  --member="$ARCHIVE_SINK_SA" \
  --role="roles/storage.objectCreator"
```

## Step 3: Set Up Access Approval

Access Approval goes one step further than Access Transparency by requiring your explicit approval before Google personnel can access your data. This is optional but valuable for highly regulated environments.

```bash
# Enable Access Approval at the organization level
gcloud access-approval settings update \
  --organization=ORG_ID \
  --enrolled_services=all \
  --notification_emails="security-team@company.com,compliance@company.com"
```

```python
from google.cloud import accessapproval_v1

def configure_access_approval(org_id):
    """Configure Access Approval with notification settings."""
    client = accessapproval_v1.AccessApprovalClient()

    settings = accessapproval_v1.AccessApprovalSettings()
    settings.name = f"organizations/{org_id}/accessApprovalSettings"

    # Require approval for all Google Cloud services
    settings.enrolled_services = [
        accessapproval_v1.EnrolledService(
            cloud_product="all",
            enrollment_level=accessapproval_v1.EnrollmentLevel.BLOCK_ALL,
        )
    ]

    # Email notifications for approval requests
    settings.notification_emails = [
        "security-team@company.com",
        "on-call-approver@company.com",
    ]

    response = client.update_access_approval_settings(settings=settings)
    print(f"Access Approval configured: {response.name}")
    return response
```

## Step 4: Build a Compliance Dashboard

Create a BigQuery-based dashboard that gives your compliance team visibility into all Google personnel access events.

```sql
-- Query to summarize Access Transparency events by justification type
SELECT
  reason.type AS reason_type,
  reason.detail AS reason_detail,
  access.methodname AS access_method,
  COUNT(*) AS access_count,
  MIN(timestamp) AS first_access,
  MAX(timestamp) AS last_access
FROM `audit-project.access_transparency_logs.cloudaudit_googleapis_com_access_transparency_*`,
UNNEST(jsonpayload_audit_transparencylog.reason) AS reason,
UNNEST(jsonpayload_audit_transparencylog.accesses) AS access
WHERE _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
GROUP BY reason_type, reason_detail, access_method
ORDER BY access_count DESC;
```

```sql
-- Query to identify access events by Google personnel location
SELECT
  jsonpayload_audit_transparencylog.location.principalphysicallocationcountry AS accessor_country,
  resource.type AS resource_type,
  COUNT(*) AS access_count
FROM `audit-project.access_transparency_logs.cloudaudit_googleapis_com_access_transparency_*`
WHERE _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY))
GROUP BY accessor_country, resource_type
ORDER BY access_count DESC;
```

## Step 5: Set Up Alerts for Anomalous Access

Configure alerts for access patterns that might indicate a problem or that your compliance team should investigate.

```python
from google.cloud import monitoring_v3
from google.protobuf import duration_pb2

def create_access_alerts(project_id):
    """Create monitoring alerts for unusual Access Transparency events."""
    client = monitoring_v3.AlertPolicyServiceClient()

    # Alert for access from unexpected countries
    unexpected_location_alert = monitoring_v3.AlertPolicy()
    unexpected_location_alert.display_name = "AT - Access from Unexpected Location"
    unexpected_location_alert.conditions = [
        monitoring_v3.AlertPolicy.Condition(
            display_name="Access from non-standard location",
            condition_matched_log=monitoring_v3.AlertPolicy.Condition.LogMatch(
                filter=(
                    'log_id("cloudaudit.googleapis.com/access_transparency") AND '
                    'jsonPayload.location.principalPhysicalLocationCountry!="US" AND '
                    'jsonPayload.location.principalPhysicalLocationCountry!="IE" AND '
                    'jsonPayload.location.principalPhysicalLocationCountry!="GB" AND '
                    'jsonPayload.location.principalPhysicalLocationCountry!="DE"'
                ),
            ),
        )
    ]
    unexpected_location_alert.combiner = (
        monitoring_v3.AlertPolicy.ConditionCombinerType.OR
    )
    unexpected_location_alert.notification_channels = [
        f"projects/{project_id}/notificationChannels/CHANNEL_ID"
    ]
    unexpected_location_alert.alert_strategy = monitoring_v3.AlertPolicy.AlertStrategy(
        notification_rate_limit=monitoring_v3.AlertPolicy.AlertStrategy.NotificationRateLimit(
            period=duration_pb2.Duration(seconds=300),
        ),
        auto_close=duration_pb2.Duration(seconds=604800),
    )

    client.create_alert_policy(
        name=f"projects/{project_id}",
        alert_policy=unexpected_location_alert,
    )

    # Alert for any Access Transparency event that should be reviewed
    access_event_alert = monitoring_v3.AlertPolicy()
    access_event_alert.display_name = "AT - Access Transparency Event"
    access_event_alert.conditions = [
        monitoring_v3.AlertPolicy.Condition(
            display_name="Access Transparency event observed",
            condition_matched_log=monitoring_v3.AlertPolicy.Condition.LogMatch(
                filter='log_id("cloudaudit.googleapis.com/access_transparency")',
            ),
        )
    ]
    access_event_alert.combiner = (
        monitoring_v3.AlertPolicy.ConditionCombinerType.OR
    )
    access_event_alert.notification_channels = [
        f"projects/{project_id}/notificationChannels/CHANNEL_ID"
    ]
    access_event_alert.alert_strategy = monitoring_v3.AlertPolicy.AlertStrategy(
        notification_rate_limit=monitoring_v3.AlertPolicy.AlertStrategy.NotificationRateLimit(
            period=duration_pb2.Duration(seconds=300),
        ),
        auto_close=duration_pb2.Duration(seconds=604800),
    )

    client.create_alert_policy(
        name=f"projects/{project_id}",
        alert_policy=access_event_alert,
    )
    print("Access Transparency alerts created")
```

## Step 6: Generate Compliance Reports

Automate the generation of compliance reports that auditors can review.

```python
from google.cloud import bigquery
from datetime import datetime, timezone

def generate_compliance_report(project_id, dataset_id, start_date, end_date):
    """Generate a compliance report of all Access Transparency events."""
    client = bigquery.Client(project=project_id)

    query = f"""
    SELECT
        timestamp,
        resource.type AS resource_type,
        resource.labels.project_id AS project_id,
        reason.type AS access_reason,
        reason.detail AS access_detail,
        jsonpayload_audit_transparencylog.location.principalphysicallocationcountry AS accessor_country,
        access.methodname AS method,
        access.resourcename AS accessed_resource
    FROM `{project_id}.{dataset_id}.cloudaudit_googleapis_com_access_transparency_*`,
    UNNEST(jsonpayload_audit_transparencylog.reason) AS reason,
    UNNEST(jsonpayload_audit_transparencylog.accesses) AS access
    WHERE timestamp BETWEEN '{start_date}' AND '{end_date}'
    ORDER BY timestamp
    """

    results = client.query(query)

    report = {
        "report_type": "Access Transparency Compliance Report",
        "period": {"start": start_date, "end": end_date},
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_events": 0,
        "events": [],
    }

    for row in results:
        report["total_events"] += 1
        report["events"].append({
            "timestamp": row.timestamp.isoformat(),
            "resource_type": row.resource_type,
            "project": row.project_id,
            "reason": row.access_reason,
            "detail": row.access_detail,
            "country": row.accessor_country,
            "method": row.method,
            "accessed_resource": row.accessed_resource,
        })

    return report
```

Access Transparency logs close the visibility gap between what your users do and what your cloud provider does. For regulatory compliance, this is essential. Auditors want evidence that you track all access to sensitive data, and Access Transparency provides that evidence in a structured, queryable format. Combined with Access Approval for pre-authorization controls, you have a complete picture of who accesses your cloud resources and why.
