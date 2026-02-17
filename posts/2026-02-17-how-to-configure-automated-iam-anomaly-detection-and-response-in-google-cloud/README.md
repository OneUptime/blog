# How to Configure Automated IAM Anomaly Detection and Response in Google Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, IAM, Security, Anomaly Detection, Cloud Logging

Description: Set up automated IAM anomaly detection in Google Cloud to identify suspicious access patterns and respond to potential identity-based threats quickly.

---

IAM is the front door to every resource in your Google Cloud organization. If someone gets hold of a service account key or compromises a user identity, they can do a lot of damage before anyone notices. The challenge is that IAM activity generates a massive volume of logs, and manually reviewing them is not practical.

In this post, I will walk through building an automated system that detects anomalous IAM behavior - things like unusual login locations, privilege escalation attempts, and service account key abuse - and takes action automatically.

## What IAM Anomalies Look Like

Before diving into the implementation, let us define what we are looking for:

- A user granting themselves elevated permissions
- Service account keys being used from unexpected IP addresses
- Bulk role assignments or permission changes
- Access from geographic locations that do not match your team
- API calls at unusual hours for a given identity
- Failed authentication attempts followed by successful ones

## Setting Up Audit Log Collection

Everything starts with audit logs. Make sure you have Data Access logs enabled for IAM services:

```hcl
# audit-config.tf
# Enable comprehensive IAM audit logging

resource "google_project_iam_audit_config" "iam_audit" {
  project = var.project_id
  service = "iam.googleapis.com"

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

resource "google_project_iam_audit_config" "crm_audit" {
  project = var.project_id
  service = "cloudresourcemanager.googleapis.com"

  audit_log_config {
    log_type = "ADMIN_READ"
  }

  audit_log_config {
    log_type = "DATA_WRITE"
  }
}

# Export logs to BigQuery for analysis
resource "google_logging_project_sink" "iam_logs_to_bq" {
  name        = "iam-audit-logs-to-bigquery"
  project     = var.project_id
  destination = "bigquery.googleapis.com/projects/${var.project_id}/datasets/${google_bigquery_dataset.iam_audit.dataset_id}"

  filter = <<-EOT
    logName:"cloudaudit.googleapis.com"
    AND (
      protoPayload.serviceName="iam.googleapis.com"
      OR protoPayload.serviceName="cloudresourcemanager.googleapis.com"
      OR protoPayload.serviceName="sts.googleapis.com"
    )
  EOT

  unique_writer_identity = true
}

resource "google_bigquery_dataset" "iam_audit" {
  dataset_id = "iam_audit_logs"
  project    = var.project_id
  location   = var.region

  # Keep logs for 1 year
  default_table_expiration_ms = 31536000000
}
```

## Building Anomaly Detection Queries

With logs flowing into BigQuery, you can run detection queries. Here are several that catch real-world attack patterns.

This query detects self-privilege escalation, which is when a user grants themselves a higher role:

```sql
-- Detect users granting themselves elevated permissions
-- This is a strong indicator of privilege escalation attempts
SELECT
  protopayload_auditlog.authenticationInfo.principalEmail AS actor,
  protopayload_auditlog.methodName AS method,
  JSON_EXTRACT_SCALAR(
    protopayload_auditlog.requestJson, '$.policy.bindings[0].role'
  ) AS granted_role,
  JSON_EXTRACT_SCALAR(
    protopayload_auditlog.requestJson, '$.policy.bindings[0].members[0]'
  ) AS granted_to,
  timestamp,
  resource.labels.project_id
FROM `project.iam_audit_logs.cloudaudit_googleapis_com_activity_*`
WHERE
  protopayload_auditlog.methodName LIKE '%SetIamPolicy%'
  AND protopayload_auditlog.authenticationInfo.principalEmail =
    REGEXP_EXTRACT(
      JSON_EXTRACT_SCALAR(
        protopayload_auditlog.requestJson,
        '$.policy.bindings[0].members[0]'
      ),
      r'(?:user:|serviceAccount:)(.*)'
    )
  AND _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY))
ORDER BY timestamp DESC;
```

This query identifies service account keys being used from new IP addresses:

```sql
-- Detect service account usage from previously unseen IP addresses
-- Compares recent activity against a 30-day baseline
WITH baseline AS (
  SELECT
    protopayload_auditlog.authenticationInfo.principalEmail AS identity,
    protopayload_auditlog.requestMetadata.callerIp AS ip_address,
    COUNT(*) AS historical_count
  FROM `project.iam_audit_logs.cloudaudit_googleapis_com_activity_*`
  WHERE
    _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
    AND _TABLE_SUFFIX < FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY))
    AND protopayload_auditlog.authenticationInfo.principalEmail LIKE '%gserviceaccount.com'
  GROUP BY identity, ip_address
),
recent AS (
  SELECT
    protopayload_auditlog.authenticationInfo.principalEmail AS identity,
    protopayload_auditlog.requestMetadata.callerIp AS ip_address,
    MIN(timestamp) AS first_seen,
    COUNT(*) AS request_count
  FROM `project.iam_audit_logs.cloudaudit_googleapis_com_activity_*`
  WHERE
    _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY))
    AND protopayload_auditlog.authenticationInfo.principalEmail LIKE '%gserviceaccount.com'
  GROUP BY identity, ip_address
)
SELECT
  r.identity,
  r.ip_address,
  r.first_seen,
  r.request_count
FROM recent r
LEFT JOIN baseline b
  ON r.identity = b.identity AND r.ip_address = b.ip_address
WHERE b.identity IS NULL  -- IP not seen in baseline period
ORDER BY r.request_count DESC;
```

This query catches bulk permission changes that might indicate an attacker preparing for lateral movement:

```sql
-- Detect bulk IAM changes within a short time window
-- More than 5 IAM changes in 10 minutes is suspicious
SELECT
  protopayload_auditlog.authenticationInfo.principalEmail AS actor,
  COUNT(*) AS change_count,
  MIN(timestamp) AS first_change,
  MAX(timestamp) AS last_change,
  ARRAY_AGG(DISTINCT resource.labels.project_id) AS affected_projects,
  ARRAY_AGG(DISTINCT protopayload_auditlog.methodName) AS methods_used
FROM `project.iam_audit_logs.cloudaudit_googleapis_com_activity_*`
WHERE
  protopayload_auditlog.methodName LIKE '%SetIamPolicy%'
  AND _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY))
GROUP BY
  actor,
  TIMESTAMP_TRUNC(timestamp, INTERVAL 10 MINUTE)
HAVING change_count > 5
ORDER BY change_count DESC;
```

## Automating Detection with Scheduled Queries

Run these detection queries on a schedule using BigQuery scheduled queries and Cloud Functions:

```python
# anomaly_detector.py
# Runs IAM anomaly detection queries and triggers alerts
from google.cloud import bigquery
from google.cloud import pubsub_v1
import json
import os

# Initialize clients
bq_client = bigquery.Client()
publisher = pubsub_v1.PublisherClient()

# Alert topic for detected anomalies
ALERT_TOPIC = publisher.topic_path(
    os.environ['PROJECT_ID'],
    'iam-anomaly-alerts'
)

# Detection queries mapped to severity levels
DETECTION_QUERIES = {
    "self_privilege_escalation": {
        "severity": "CRITICAL",
        "query": """
            SELECT
              protopayload_auditlog.authenticationInfo.principalEmail AS actor,
              JSON_EXTRACT_SCALAR(
                protopayload_auditlog.requestJson,
                '$.policy.bindings[0].role'
              ) AS granted_role,
              timestamp
            FROM `{project}.iam_audit_logs.cloudaudit_googleapis_com_activity_*`
            WHERE
              protopayload_auditlog.methodName LIKE '%SetIamPolicy%'
              AND _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d',
                DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY))
              AND protopayload_auditlog.authenticationInfo.principalEmail =
                REGEXP_EXTRACT(
                  JSON_EXTRACT_SCALAR(
                    protopayload_auditlog.requestJson,
                    '$.policy.bindings[0].members[0]'
                  ), r'(?:user:|serviceAccount:)(.*)'
                )
        """
    },
    "bulk_iam_changes": {
        "severity": "HIGH",
        "query": """
            SELECT
              protopayload_auditlog.authenticationInfo.principalEmail AS actor,
              COUNT(*) AS change_count
            FROM `{project}.iam_audit_logs.cloudaudit_googleapis_com_activity_*`
            WHERE
              protopayload_auditlog.methodName LIKE '%SetIamPolicy%'
              AND _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d',
                DATE_SUB(CURRENT_DATE(), INTERVAL 1 DAY))
            GROUP BY actor, TIMESTAMP_TRUNC(timestamp, INTERVAL 10 MINUTE)
            HAVING change_count > 5
        """
    }
}


def run_detections(request):
    """Run all detection queries and publish alerts for findings."""
    project_id = os.environ['PROJECT_ID']
    total_findings = 0

    for detection_name, config in DETECTION_QUERIES.items():
        query = config['query'].format(project=project_id)
        results = bq_client.query(query).result()

        for row in results:
            total_findings += 1
            alert = {
                "detection": detection_name,
                "severity": config['severity'],
                "details": dict(row),
            }

            # Publish alert to Pub/Sub for response workflow
            publisher.publish(
                ALERT_TOPIC,
                data=json.dumps(alert, default=str).encode('utf-8'),
                severity=config['severity']
            )

    return json.dumps({
        "status": "complete",
        "findings": total_findings
    })
```

## Automated Response Actions

When an anomaly is detected, take automated response actions proportional to the severity:

```python
# iam_response.py
# Automated response actions for IAM anomalies
from google.cloud import iam_admin_v1
from google.cloud import resourcemanager_v3

def handle_iam_anomaly(event, context):
    """Respond to detected IAM anomalies."""
    import base64
    import json

    data = json.loads(base64.b64decode(event['data']).decode('utf-8'))
    detection = data['detection']
    severity = data['severity']
    details = data['details']

    if detection == "self_privilege_escalation":
        # Revert the IAM change and disable the account
        actor = details['actor']
        revert_iam_change(actor, details)
        if actor.endswith('gserviceaccount.com'):
            disable_service_account(actor)

    elif detection == "bulk_iam_changes":
        # Temporarily restrict the actor's permissions
        actor = details['actor']
        apply_temporary_restriction(actor)


def disable_service_account(email):
    """Disable a compromised service account."""
    client = iam_admin_v1.IAMClient()
    request = iam_admin_v1.DisableServiceAccountRequest(
        name=f"projects/-/serviceAccounts/{email}"
    )
    client.disable_service_account(request=request)


def apply_temporary_restriction(actor):
    """Add a deny policy to temporarily restrict an actor."""
    client = resourcemanager_v3.ProjectsClient()
    # In practice, you would apply an IAM deny policy
    # or move the actor to a restricted group
    pass
```

## Setting Up the Schedule

Use Cloud Scheduler to run detections every 15 minutes:

```hcl
# scheduler.tf
# Runs IAM anomaly detection on a regular schedule

resource "google_cloud_scheduler_job" "iam_anomaly_detection" {
  name        = "iam-anomaly-detection"
  description = "Run IAM anomaly detection queries"
  schedule    = "*/15 * * * *"
  project     = var.project_id
  region      = var.region

  http_target {
    http_method = "POST"
    uri         = google_cloudfunctions2_function.anomaly_detector.url

    oidc_token {
      service_account_email = google_service_account.anomaly_detector.email
    }
  }
}
```

## Wrapping Up

IAM anomaly detection is not optional if you are running production workloads on GCP. The combination of BigQuery for log analysis, Cloud Functions for detection logic, and Pub/Sub for alerting gives you a system that catches identity-based threats early. Start with the detection queries, tune them against your normal activity patterns to reduce false positives, and then layer on automated response actions gradually. The goal is to catch compromised identities within minutes, not days.
