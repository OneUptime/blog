# How to Create Log-Based Alerts in Cloud Logging for Error Detection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Logging, Log-Based Alerts, Error Detection, Alerting

Description: Learn how to create log-based alerts in Cloud Logging that notify you when specific error patterns appear in your application or infrastructure logs.

---

Not every problem shows up as a metric. Sometimes the first sign of trouble is an error message in your logs - a stack trace, a connection timeout message, or a critical security warning. Log-based alerts let you trigger notifications directly from log entries, without needing to create a metric first. When a log entry matches your filter, the alert fires.

In this post, I will show you how to create log-based alerts for common error detection scenarios and share some patterns that have saved me from many late-night surprises.

## Log-Based Alerts vs Metric-Based Alerts

Before diving in, it is worth understanding the difference:

**Metric-based alerts** fire when a numeric metric crosses a threshold over a time window. They are good for "too much" or "too little" scenarios - CPU too high, request count too low.

**Log-based alerts** fire when one or more log entries match a filter within a time window. They are good for "this specific thing happened" scenarios - a particular error message appeared, a security event occurred, a critical process crashed.

The two approaches complement each other. Use metrics for quantitative monitoring and logs for qualitative detection.

## Creating a Basic Log-Based Alert

### Using the Cloud Console

1. Go to **Logging** > **Logs Explorer**
2. Write the filter for the log entries you want to alert on
3. Click **Create Alert** in the toolbar (or go to **Monitoring** > **Alerting** > **Create Policy**)
4. Configure the notification settings

### Using gcloud CLI

The gcloud approach uses the `logging` command for log-based alerts (called "log alerts" or "logs-based alerting policies"):

```bash
# Create a log-based alert for critical application errors
gcloud alpha monitoring policies create \
  --policy-from-file=log-alert-policy.json \
  --project=my-project
```

Here is the JSON policy file for a log-based alert:

```json
{
  "displayName": "Critical Application Error Detected",
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "Error log entry found",
      "conditionMatchedLog": {
        "filter": "resource.type=\"cloud_run_revision\" AND severity=CRITICAL",
        "labelExtractors": {
          "service_name": "EXTRACT(resource.labels.service_name)"
        }
      }
    }
  ],
  "alertStrategy": {
    "notificationRateLimit": {
      "period": "300s"
    },
    "autoClose": "604800s"
  },
  "notificationChannels": []
}
```

The `conditionMatchedLog` is what makes this a log-based alert rather than a metric-based one. The `notificationRateLimit` prevents alert storms - it limits notifications to at most one every 5 minutes.

## Practical Alert Patterns

### Alert on Application Crashes

Detect when your application crashes or encounters unhandled exceptions:

```json
{
  "displayName": "Application Crash Detected",
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "Crash or unhandled exception in logs",
      "conditionMatchedLog": {
        "filter": "severity>=ERROR AND (textPayload=~\"unhandled exception\" OR textPayload=~\"panic:\" OR textPayload=~\"FATAL\" OR jsonPayload.message=~\"unhandled exception\")"
      }
    }
  ],
  "alertStrategy": {
    "notificationRateLimit": {
      "period": "60s"
    }
  }
}
```

### Alert on Database Connection Failures

Database connectivity issues often appear in logs before they affect metrics:

```json
{
  "displayName": "Database Connection Failure",
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "Database connection error in logs",
      "conditionMatchedLog": {
        "filter": "severity>=ERROR AND (textPayload=~\"connection refused\" OR textPayload=~\"connection timed out\" OR textPayload=~\"too many connections\" OR jsonPayload.message=~\"database.*connection.*failed\")"
      }
    }
  ],
  "alertStrategy": {
    "notificationRateLimit": {
      "period": "300s"
    }
  }
}
```

### Alert on Security Events

Detect suspicious activities like failed authentication attempts or privilege escalation:

```json
{
  "displayName": "Security Event - Failed Authentication",
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "Failed authentication attempt",
      "conditionMatchedLog": {
        "filter": "logName:\"cloudaudit.googleapis.com%2Factivity\" AND protoPayload.status.code!=0 AND protoPayload.authenticationInfo.principalEmail!=\"\""
      }
    }
  ],
  "alertStrategy": {
    "notificationRateLimit": {
      "period": "600s"
    }
  }
}
```

### Alert on IAM Policy Changes

Get notified whenever someone modifies IAM permissions:

```json
{
  "displayName": "IAM Policy Changed",
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "IAM SetIamPolicy called",
      "conditionMatchedLog": {
        "filter": "logName:\"cloudaudit.googleapis.com%2Factivity\" AND protoPayload.methodName=\"SetIamPolicy\"",
        "labelExtractors": {
          "actor": "EXTRACT(protoPayload.authenticationInfo.principalEmail)",
          "resource": "EXTRACT(protoPayload.resourceName)"
        }
      }
    }
  ],
  "alertStrategy": {
    "notificationRateLimit": {
      "period": "0s"
    }
  }
}
```

Setting `notificationRateLimit.period` to `0s` means you get notified for every occurrence. This is appropriate for high-priority security events.

### Alert on Out of Memory Events

GKE containers getting OOM-killed is a common issue:

```json
{
  "displayName": "Container OOM Killed",
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "OOMKilled event in logs",
      "conditionMatchedLog": {
        "filter": "resource.type=\"k8s_container\" AND (textPayload=~\"OOMKilled\" OR jsonPayload.message=~\"OOMKilled\" OR textPayload=~\"out of memory\")"
      }
    }
  ],
  "alertStrategy": {
    "notificationRateLimit": {
      "period": "300s"
    }
  }
}
```

### Alert on Disk Space Warnings

Applications often log disk space warnings before metrics catch up:

```json
{
  "displayName": "Disk Space Warning in Logs",
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "Disk space warning detected",
      "conditionMatchedLog": {
        "filter": "severity>=WARNING AND (textPayload=~\"disk space\" OR textPayload=~\"No space left on device\" OR textPayload=~\"filesystem.*full\")"
      }
    }
  ],
  "alertStrategy": {
    "notificationRateLimit": {
      "period": "600s"
    }
  }
}
```

## Adding Documentation to Alerts

Good alert documentation helps on-call engineers respond faster. Include runbook links and context in your alert policy:

```json
{
  "displayName": "Database Connection Failure",
  "documentation": {
    "content": "## Database Connection Failure\n\nA database connection failure has been detected in the application logs.\n\n### Immediate Actions\n1. Check Cloud SQL instance status in the Console\n2. Verify network connectivity from the application to the database\n3. Check connection pool settings\n\n### Runbook\n[Link to runbook](https://wiki.internal/runbooks/database-connection-failure)\n\n### Escalation\nIf not resolved within 15 minutes, escalate to the database team.",
    "mimeType": "text/markdown"
  },
  "combiner": "OR",
  "conditions": [
    {
      "displayName": "Database connection error",
      "conditionMatchedLog": {
        "filter": "severity>=ERROR AND textPayload=~\"connection refused\""
      }
    }
  ]
}
```

## Terraform Configuration

```hcl
# Log-based alert for critical errors
resource "google_monitoring_alert_policy" "critical_errors" {
  display_name = "Critical Application Error Detected"
  combiner     = "OR"

  conditions {
    display_name = "Critical error in logs"

    condition_matched_log {
      filter = "resource.type=\"cloud_run_revision\" AND severity=CRITICAL"

      label_extractors = {
        "service_name" = "EXTRACT(resource.labels.service_name)"
      }
    }
  }

  alert_strategy {
    notification_rate_limit {
      period = "300s"
    }
    auto_close = "604800s"
  }

  notification_channels = var.notification_channels

  documentation {
    content   = "A critical error was detected in application logs. Check the service immediately."
    mime_type = "text/markdown"
  }
}

# Log-based alert for IAM changes
resource "google_monitoring_alert_policy" "iam_changes" {
  display_name = "IAM Policy Changed"
  combiner     = "OR"

  conditions {
    display_name = "IAM SetIamPolicy detected"

    condition_matched_log {
      filter = "logName:\"cloudaudit.googleapis.com%2Factivity\" AND protoPayload.methodName=\"SetIamPolicy\""

      label_extractors = {
        "actor"    = "EXTRACT(protoPayload.authenticationInfo.principalEmail)"
        "resource" = "EXTRACT(protoPayload.resourceName)"
      }
    }
  }

  alert_strategy {
    notification_rate_limit {
      period = "0s"
    }
  }

  notification_channels = var.security_notification_channels
}
```

## Notification Rate Limiting

Notification rate limiting is an important configuration for log-based alerts. Without it, a burst of matching log entries can generate hundreds of notifications in minutes.

Recommended rate limits by alert type:

| Alert Type | Rate Limit | Reasoning |
|-----------|-----------|-----------|
| Security events (IAM changes) | 0s | Every occurrence matters |
| Application crashes | 60s | Know quickly, but batch nearby events |
| Connection errors | 300s | Often bursty, one notification per 5 min is enough |
| Disk warnings | 600s | Slow-developing, 10 min batching is fine |

## Testing Log-Based Alerts

To test that your alert works, generate a matching log entry:

```bash
# Write a test log entry that matches your alert filter
gcloud logging write test-log '{"message": "Test critical error for alert validation"}' \
  --severity=CRITICAL \
  --project=my-project
```

Check that the alert fires and the notification reaches your channel. Then clean up by acknowledging or closing the incident.

## Wrapping Up

Log-based alerts fill the gap that metric-based alerts cannot cover. They detect specific events - errors, security changes, crashes - that are best identified by their content rather than their count. The key is writing precise filters that match the events you care about and setting appropriate rate limits to avoid alert fatigue. Start with a few high-priority alerts (application crashes, security events, database errors) and expand as you learn what patterns appear in your logs before incidents.
