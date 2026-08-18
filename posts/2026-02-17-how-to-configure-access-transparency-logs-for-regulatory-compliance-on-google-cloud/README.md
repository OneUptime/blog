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

Access Transparency is a default security control for every Google Cloud organization. It is included at no extra charge and is already on - there is no activation step to work through. It does require an organization resource, so it does not apply to standalone projects.

Reading the setting needs the Access Approval Viewer role (`roles/accessapproval.viewer`). Administering it needs the Access Transparency Admin role (`roles/axt.admin`). Grant either at the organization level.

```bash
# Verify your organization setup

gcloud organizations list

# Verify that you have roles/accessapproval.viewer (to read the setting)
# or roles/axt.admin (to administer it) at the organization level
# Navigate to: console.cloud.google.com/iam-admin/iam
```

## Step 1: Confirm Access Transparency Is Active

Access Transparency is an organization-level control that Google enables by default, so for most organizations this is a confirmation step rather than an enablement step. There is no gcloud command or API call that turns it on - confirm it from the console using either of two paths.

```bash
# There is no gcloud access-transparency enable command.
# Confirm from the console instead, using either path:
#
#   Security > Access Approval  -> check the Home tab
#   IAM > Settings              -> check Access Transparency
```

If your organization predates the default rollout and the setting still reads as disabled, IAM > Settings is where you turn it on, using the Access Transparency Admin role.

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

Access Transparency tells you after the fact that Google personnel touched your data. Access Approval goes further and puts a gate in front of that access. Today you enroll in it explicitly, but Google is migrating Access Approval onto the same platform as Access Transparency with customers enrolled by default, so the decision that actually matters is not whether to turn it on - it is which operating mode to run.

### Pick an operating mode first

Access Approval has three operating modes, selected through the approval policy on your settings. You can change the mode at any time.

| Mode | `gcloud --approval_policy` | API `justificationBasedApprovalPolicy` | Behavior |
| --- | --- | --- | --- |
| Transparency | `transparency` | `JUSTIFICATION_BASED_APPROVAL_ENABLED_ALL` | Audit-only. Every access is pre-approved instantly and recorded. Nothing blocks. |
| Streamlined Support | `streamlined-support` | `JUSTIFICATION_BASED_APPROVAL_ENABLED_EXTERNAL_JUSTIFICATIONS` | Access tied to your own support cases is pre-approved. Everything else waits for you. |
| Access Approval | `access-approval` | `JUSTIFICATION_BASED_APPROVAL_NOT_ENABLED` | Every request waits for an explicit approval from your team. |

Start in Transparency mode. You get the full record of who requested access and why, without an unanswered approval request stalling a live support case - which is the usual way these rollouts go wrong. Be clear-eyed about the tradeoff: Transparency mode is audit-only, so it is a recording, not a control. It satisfies "we know who touched our data"; it does not satisfy "nobody touches our data without our say-so."

Run it long enough to learn your real access volume and to confirm someone actually answers the notifications. Then tighten to Streamlined Support, and to full Access Approval once you are confident an approver is always reachable.

```bash
# Start in Transparency mode: audit-only, every access pre-approved and recorded
gcloud access-approval settings update \
  --organization=ORG_ID \
  --approval_policy=transparency \
  --enrolled_services=all \
  --notification_emails="security-team@company.com,compliance@company.com"
```

```bash
# Later, once approvers are reliably responding, tighten the mode
gcloud access-approval settings update \
  --organization=ORG_ID \
  --approval_policy=streamlined-support

# And finally require approval for every access
gcloud access-approval settings update \
  --organization=ORG_ID \
  --approval_policy=access-approval
```

The same change through the REST API. Send `updateMask` explicitly - if you leave it unset, only `notificationEmails` is updated and your policy change is silently dropped.

```bash
curl -X PATCH \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  -d '{
        "approvalPolicy": {
          "justificationBasedApprovalPolicy": "JUSTIFICATION_BASED_APPROVAL_ENABLED_ALL"
        }
      }' \
  "https://accessapproval.googleapis.com/v1/organizations/ORG_ID/accessApprovalSettings?updateMask=approvalPolicy"
```

### Enrollment and notifications

Enrolled services and notification emails are set separately from the mode. Get the notification list right before you leave Transparency mode - in the stricter modes an unread inbox turns into a blocked support case.

```python
from google.cloud import accessapproval_v1

def configure_access_approval(org_id):
    """Configure Access Approval enrollment and notification settings.

    Set the operating mode separately, with
    `gcloud access-approval settings update --approval_policy=...` or the
    REST API - the Python client does not expose approvalPolicy yet.
    """
    client = accessapproval_v1.AccessApprovalClient()

    settings = accessapproval_v1.AccessApprovalSettings()
    settings.name = f"organizations/{org_id}/accessApprovalSettings"

    # Enroll every Google Cloud service
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

Access Transparency logs close the visibility gap between what your users do and what your cloud provider does. For regulatory compliance, this is essential. Auditors want evidence that you track all access to sensitive data, and Access Transparency provides that evidence in a structured, queryable format. Because it is now on by default, the work is not enabling it - it is routing the logs somewhere durable and querying them.

Access Approval is the other half. Start it in Transparency mode to learn your access patterns without risking a stalled support case, then move up to Streamlined Support and full Access Approval as your approval process proves itself. At that point you are not just recording who accesses your cloud resources and why - you are deciding.
