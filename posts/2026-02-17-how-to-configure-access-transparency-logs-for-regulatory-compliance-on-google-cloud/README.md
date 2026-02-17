# How to Configure Access Transparency Logs for Regulatory Compliance on Google Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Access Transparency, Compliance, Audit Logging, Security

Description: Learn how to configure and use Google Cloud Access Transparency logs to track when Google personnel access your data, meeting regulatory audit requirements.

---

When regulators ask "who has accessed your data?", they do not just mean your own employees. They mean everyone - including your cloud provider's personnel. Access Transparency is Google Cloud's answer to this question. It provides logs every time a Google employee accesses your content, along with the reason for that access.

This matters for financial services companies under SOX or Basel III, healthcare organizations under HIPAA, government agencies, and any organization in the EU subject to GDPR. If you need to demonstrate to auditors that you know who touched your data and why, Access Transparency is the tool.

## What Access Transparency Logs Capture

Access Transparency logs are different from Cloud Audit Logs. Audit Logs capture actions taken by your users and service accounts. Access Transparency logs capture actions taken by Google personnel - support engineers, site reliability engineers, and automated systems.

Each log entry includes the justification for the access (such as a support ticket number), the resource that was accessed, the Google employee's office location (by country), and the time and duration of access.

## Prerequisites

Access Transparency requires one of the following support levels: Premium Support, Enhanced Support, or a support package that includes Access Transparency. It also requires an organization resource - you cannot use it with standalone projects.

```bash
# Verify your organization setup
gcloud organizations list

# Check your support level (this needs to be done in the console)
# Navigate to: console.cloud.google.com/support
```

## Step 1: Enable Access Transparency

Access Transparency is enabled at the organization level. Once enabled, it applies to all projects in the organization.

```bash
# Enable Access Transparency for your organization
gcloud access-transparency enable \
  --organization=ORG_ID

# Verify it is enabled
gcloud access-transparency get \
  --organization=ORG_ID
```

You can also enable it using the API:

```python
from google.cloud import accessapproval_v1

def enable_access_transparency(org_id):
    """Enable Access Transparency at the organization level."""
    # Note: Access Transparency is separate from Access Approval
    # but they complement each other well
    client = accessapproval_v1.AccessApprovalClient()

    settings = accessapproval_v1.AccessApprovalSettings()
    settings.name = f"organizations/{org_id}/accessApprovalSettings"

    # Enable notifications for all services
    settings.enrolled_services = [
        accessapproval_v1.EnrolledService(
            cloud_product="all",
            enrollment_level=accessapproval_v1.EnrollmentLevel.BLOCK_ALL,
        )
    ]

    response = client.update_access_approval_settings(settings=settings)
    print(f"Access Transparency configured: {response.name}")
```

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
  --log-filter='logName:"accessTransparency"' \
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
  --log-filter='logName:"accessTransparency"' \
  --destination="storage.googleapis.com/access-transparency-archive" \
  --include-children
```

## Step 3: Set Up Access Approval

Access Approval goes one step further than Access Transparency by requiring your explicit approval before Google personnel can access your data. This is optional but valuable for highly regulated environments.

```bash
# Enable Access Approval at the organization level
gcloud access-approval settings update \
  --organization=ORG_ID \
  --enrolled-services=all \
  --notification-emails="security-team@company.com,compliance@company.com"
```

```python
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
  JSON_EXTRACT_SCALAR(protopayload_auditlog.requestMetadata, '$.callerSuppliedUserAgent') AS access_tool,
  JSON_EXTRACT_SCALAR(protopayload_auditlog.servicedata, '$.accessReason.type') AS reason_type,
  JSON_EXTRACT_SCALAR(protopayload_auditlog.servicedata, '$.accessReason.detail') AS reason_detail,
  COUNT(*) AS access_count,
  MIN(timestamp) AS first_access,
  MAX(timestamp) AS last_access
FROM `audit-project.access_transparency_logs.cloudaudit_googleapis_com_access_transparency_*`
WHERE _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
GROUP BY access_tool, reason_type, reason_detail
ORDER BY access_count DESC;
```

```sql
-- Query to identify access events by Google personnel location
SELECT
  JSON_EXTRACT_SCALAR(protopayload_auditlog.servicedata, '$.accessorLocation.countryCode') AS accessor_country,
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
                    'logName:"accessTransparency" AND '
                    'NOT protoPayload.servicedata.accessorLocation.countryCode=("US" OR "IE" OR "GB" OR "DE")'
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

    client.create_alert_policy(
        name=f"projects/{project_id}",
        alert_policy=unexpected_location_alert,
    )

    # Alert for high volume of access events
    high_volume_alert = monitoring_v3.AlertPolicy()
    high_volume_alert.display_name = "AT - High Volume Access"
    high_volume_alert.conditions = [
        monitoring_v3.AlertPolicy.Condition(
            display_name="More than 10 access events in an hour",
            condition_matched_log=monitoring_v3.AlertPolicy.Condition.LogMatch(
                filter='logName:"accessTransparency"',
            ),
        )
    ]
    high_volume_alert.combiner = (
        monitoring_v3.AlertPolicy.ConditionCombinerType.OR
    )

    client.create_alert_policy(
        name=f"projects/{project_id}",
        alert_policy=high_volume_alert,
    )
    print("Access Transparency alerts created")
```

## Step 6: Generate Compliance Reports

Automate the generation of compliance reports that auditors can review.

```python
from google.cloud import bigquery
import json
from datetime import datetime

def generate_compliance_report(project_id, dataset_id, start_date, end_date):
    """Generate a compliance report of all Access Transparency events."""
    client = bigquery.Client(project=project_id)

    query = f"""
    SELECT
        timestamp,
        resource.type AS resource_type,
        resource.labels.project_id AS project_id,
        JSON_EXTRACT_SCALAR(protopayload_auditlog.servicedata,
            '$.accessReason.type') AS access_reason,
        JSON_EXTRACT_SCALAR(protopayload_auditlog.servicedata,
            '$.accessReason.detail') AS access_detail,
        JSON_EXTRACT_SCALAR(protopayload_auditlog.servicedata,
            '$.accessorLocation.countryCode') AS accessor_country,
        protopayload_auditlog.methodName AS method
    FROM `{project_id}.{dataset_id}.cloudaudit_googleapis_com_access_transparency_*`
    WHERE timestamp BETWEEN '{start_date}' AND '{end_date}'
    ORDER BY timestamp
    """

    results = client.query(query)

    report = {
        "report_type": "Access Transparency Compliance Report",
        "period": {"start": start_date, "end": end_date},
        "generated_at": datetime.utcnow().isoformat(),
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
        })

    return report
```

Access Transparency logs close the visibility gap between what your users do and what your cloud provider does. For regulatory compliance, this is essential. Auditors want evidence that you track all access to sensitive data, and Access Transparency provides that evidence in a structured, queryable format. Combined with Access Approval for pre-authorization controls, you have a complete picture of who accesses your cloud resources and why.
