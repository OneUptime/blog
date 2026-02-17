# How to Detect Insider Threat Patterns Using Google Cloud Audit Logs and Chronicle SIEM

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Chronicle SIEM, Audit Logs, Security, Insider Threats

Description: Use Google Cloud Audit Logs with Chronicle SIEM to detect insider threat patterns including data exfiltration, privilege abuse, and unauthorized access.

---

Insider threats are the hardest security problems to solve. Unlike external attackers who trip network-level detections, insiders already have legitimate access. The signs are subtle - a developer downloading an unusual amount of data, an admin granting themselves permissions they do not normally use, or someone accessing resources outside their normal work hours.

Google Cloud's audit logs capture the raw data you need, and Chronicle SIEM gives you the detection and analytics layer to find these patterns. In this post, I will walk through building insider threat detection rules that go beyond simple threshold alerts.

## Ingesting Audit Logs into Chronicle

First, get your GCP audit logs flowing into Chronicle. The simplest method is through the Google Cloud integration:

```hcl
# chronicle-ingestion.tf
# Set up audit log export to Chronicle SIEM

# Create a dedicated log sink for Chronicle
resource "google_logging_organization_sink" "chronicle" {
  name             = "audit-logs-to-chronicle"
  org_id           = var.org_id
  destination      = "pubsub.googleapis.com/projects/${var.security_project}/topics/${google_pubsub_topic.chronicle_ingest.name}"
  include_children = true

  filter = <<-EOT
    logName:"logs/cloudaudit.googleapis.com"
    OR logName:"logs/cloudaudit.googleapis.com%2Fdata_access"
    OR logName:"logs/cloudaudit.googleapis.com%2Factivity"
    OR logName:"logs/cloudaudit.googleapis.com%2Fsystem_event"
    OR logName:"logs/cloudaudit.googleapis.com%2Fpolicy"
  EOT
}

resource "google_pubsub_topic" "chronicle_ingest" {
  name    = "chronicle-audit-log-ingest"
  project = var.security_project
}

# Chronicle pulls from this subscription
resource "google_pubsub_subscription" "chronicle_sub" {
  name    = "chronicle-ingest-sub"
  topic   = google_pubsub_topic.chronicle_ingest.name
  project = var.security_project

  ack_deadline_seconds = 600

  # Retain unacknowledged messages for 7 days
  message_retention_duration = "604800s"

  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }
}
```

## Understanding Insider Threat Indicators

Before writing detection rules, it helps to categorize what you are looking for:

**Data Exfiltration Indicators:**
- Downloading large volumes from Cloud Storage
- Copying data to personal or external projects
- Creating public buckets or sharing resources externally
- Exporting BigQuery results to unusual destinations

**Privilege Abuse Indicators:**
- Self-granting elevated roles
- Accessing resources outside normal scope
- Creating service account keys for unauthorized use
- Modifying audit log configurations

**Pre-Departure Indicators:**
- Sudden increase in data access volume
- Accessing repositories or resources not accessed before
- Downloading or cloning source code repositories
- Activity outside normal working hours

## Writing Chronicle Detection Rules

Chronicle uses YARA-L 2.0 for detection rules. Here are several rules targeting insider threat patterns.

This rule detects when someone grants themselves a privileged role:

```
// Rule: Self-Privilege Escalation
// Detects when a user grants themselves an elevated IAM role
rule insider_self_privilege_escalation {
  meta:
    author = "Security Team"
    description = "Detects self-granted IAM role assignments"
    severity = "HIGH"
    category = "Insider Threat"

  events:
    // Match IAM policy change events
    $event.metadata.event_type = "USER_RESOURCE_UPDATE_CONTENT"
    $event.metadata.product_name = "Google Cloud Audit Logs"
    $event.target.application = "cloudresourcemanager.googleapis.com"

    // The actor and the granted principal are the same person
    $event.principal.user.email_addresses = $actor
    $event.target.user.email_addresses = $actor

    // The granted role is privileged
    (
      $event.security_result.description = /roles\/owner/ or
      $event.security_result.description = /roles\/editor/ or
      $event.security_result.description = /roles\/iam.securityAdmin/ or
      $event.security_result.description = /roles\/iam.serviceAccountAdmin/
    )

  match:
    $actor over 1h

  outcome:
    $risk_score = 90

  condition:
    $event
}
```

This rule detects unusual data download volumes from Cloud Storage:

```
// Rule: Abnormal Data Download Volume
// Triggers when a user downloads significantly more data than usual
rule insider_abnormal_download_volume {
  meta:
    author = "Security Team"
    description = "Detects unusually high Cloud Storage download volume"
    severity = "MEDIUM"
    category = "Insider Threat - Data Exfiltration"

  events:
    // Match storage object read events
    $event.metadata.event_type = "USER_RESOURCE_ACCESS"
    $event.target.application = "storage.googleapis.com"
    $event.metadata.product_event_type = "storage.objects.get"

    $event.principal.user.email_addresses = $user

  match:
    $user over 1h

  outcome:
    $download_count = count($event)
    $risk_score = if($download_count > 1000, 85,
                  if($download_count > 500, 70,
                  if($download_count > 100, 50, 30)))

  condition:
    // More than 100 object downloads in an hour is unusual for most users
    #event > 100
}
```

This rule detects service account key creation outside of CI/CD:

```
// Rule: Manual Service Account Key Creation
// Service account keys should only be created by Terraform/CI
rule insider_manual_sa_key_creation {
  meta:
    author = "Security Team"
    description = "Detects service account key creation by human users"
    severity = "HIGH"
    category = "Insider Threat - Privilege Abuse"

  events:
    $event.metadata.event_type = "USER_RESOURCE_CREATION"
    $event.target.application = "iam.googleapis.com"
    $event.metadata.product_event_type = "google.iam.admin.v1.CreateServiceAccountKey"

    // The actor is a human user, not a service account
    $event.principal.user.email_addresses = $actor
    not $event.principal.user.email_addresses = /.*gserviceaccount\.com$/

  match:
    $actor over 24h

  outcome:
    $risk_score = 75

  condition:
    $event
}
```

This rule detects after-hours access patterns:

```
// Rule: Unusual After-Hours Activity
// Detects significant cloud activity outside normal business hours
rule insider_after_hours_activity {
  meta:
    author = "Security Team"
    description = "Detects unusual volume of activity outside business hours"
    severity = "LOW"
    category = "Insider Threat - Behavioral"

  events:
    $event.metadata.event_type = "USER_RESOURCE_ACCESS" or
    $event.metadata.event_type = "USER_RESOURCE_UPDATE_CONTENT"

    $event.principal.user.email_addresses = $user

    // Outside business hours (adjust timezone as needed)
    // 0-7 and 20-23 in UTC (adjust for your timezone)
    (
      $event.metadata.event_timestamp.hours < 7 or
      $event.metadata.event_timestamp.hours > 20
    )

  match:
    $user over 4h

  outcome:
    $activity_count = count($event)
    $risk_score = if($activity_count > 50, 70,
                  if($activity_count > 20, 50, 30))

  condition:
    #event > 20
}
```

## Correlating Multiple Indicators

The real power comes from combining multiple weak signals into a strong detection. This rule triggers when multiple insider threat indicators fire for the same user:

```
// Rule: Multiple Insider Threat Indicators
// Correlates multiple low-severity signals into a high-severity alert
rule insider_threat_correlation {
  meta:
    author = "Security Team"
    description = "Multiple insider threat indicators for the same user"
    severity = "CRITICAL"
    category = "Insider Threat - Correlated"

  events:
    // Look for any detection matches from our other rules
    $detection.metadata.event_type = "DETECTION"

    (
      $detection.security_result.rule_name = "insider_self_privilege_escalation" or
      $detection.security_result.rule_name = "insider_abnormal_download_volume" or
      $detection.security_result.rule_name = "insider_manual_sa_key_creation" or
      $detection.security_result.rule_name = "insider_after_hours_activity"
    )

    $detection.principal.user.email_addresses = $user

  match:
    $user over 24h

  outcome:
    $indicator_count = count_distinct($detection.security_result.rule_name)
    $risk_score = 95

  condition:
    // At least 3 different indicator types for the same user
    $indicator_count >= 3
}
```

## Building a User Risk Score Dashboard

Use BigQuery to maintain a rolling risk score for each user:

```sql
-- Calculate a rolling 30-day risk score for each user
-- Combines multiple signal types with different weights
WITH risk_signals AS (
  SELECT
    principal_email AS user_email,
    CASE
      WHEN rule_name = 'insider_self_privilege_escalation' THEN 30
      WHEN rule_name = 'insider_abnormal_download_volume' THEN 20
      WHEN rule_name = 'insider_manual_sa_key_creation' THEN 25
      WHEN rule_name = 'insider_after_hours_activity' THEN 10
      ELSE 5
    END AS signal_weight,
    detection_timestamp
  FROM `security_project.chronicle_detections.insider_threats`
  WHERE detection_timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
)
SELECT
  user_email,
  SUM(signal_weight) AS total_risk_score,
  COUNT(*) AS total_signals,
  COUNT(DISTINCT DATE(detection_timestamp)) AS active_days,
  MAX(detection_timestamp) AS latest_signal
FROM risk_signals
GROUP BY user_email
HAVING total_risk_score > 30
ORDER BY total_risk_score DESC;
```

## Response Playbook

When an insider threat alert fires, you need a structured response:

```python
# insider_response.py
# Automated first-response actions for insider threat detections
from google.cloud import iam_admin_v1
from google.cloud import compute_v1
import json

def handle_insider_alert(alert_data):
    """Execute first-response actions based on risk score."""
    user = alert_data['user_email']
    risk_score = alert_data['risk_score']
    indicators = alert_data['indicators']

    if risk_score >= 90:
        # Critical - immediate containment
        suspend_user_sessions(user)
        restrict_network_access(user)
        preserve_evidence(user)
        notify_security_team(user, "CRITICAL", indicators)

    elif risk_score >= 70:
        # High - enhanced monitoring
        enable_detailed_logging(user)
        notify_security_team(user, "HIGH", indicators)

    else:
        # Medium - create investigation ticket
        create_investigation_ticket(user, indicators)


def suspend_user_sessions(user_email):
    """Revoke all active sessions for a user."""
    # Use Admin SDK to sign out the user
    # and revoke OAuth tokens
    print(f"Suspending sessions for {user_email}")


def preserve_evidence(user_email):
    """Create a snapshot of all user activity for forensics."""
    # Export all logs related to this user
    # Store in a locked forensics bucket
    print(f"Preserving evidence for {user_email}")
```

## Wrapping Up

Insider threat detection is never a single rule or a single tool. It is about building layers of behavioral signals, correlating them over time, and having a clear response process. Chronicle SIEM gives you the detection engine, GCP audit logs provide the raw data, and BigQuery lets you build the analytics layer on top. Start with the highest-confidence detections like self-privilege escalation and manual key creation, tune the thresholds to your environment, and gradually add more behavioral rules as you reduce false positives.
