# How to Monitor and Audit BeyondCorp Enterprise Access Events in Cloud Logging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BeyondCorp, Cloud Logging, Audit, Security Monitoring

Description: Learn how to monitor and audit BeyondCorp Enterprise access events using Cloud Logging, including setting up log queries, alerts, and dashboards for security visibility.

---

BeyondCorp Enterprise generates a wealth of access event data every time a user attempts to reach a protected resource. IAP authorization decisions, access-level details recorded in the audit entry, and policy changes can be logged. But having the data is only useful if you know how to find it, analyze it, and act on it.

This guide covers querying BeyondCorp access events in Cloud Logging, building dashboards for visibility, setting up alerts for suspicious activity, and exporting logs for long-term retention.

## What Gets Logged

BeyondCorp Enterprise logs several types of events:

- **Authorization decisions**: Whether access was granted or denied, and why
- **Access level information**: Access levels recorded in the IAP audit entry
- **Device posture signals**: Device details used by context-aware access, when available
- **Policy changes**: Modifications to access levels and IAP settings

IAP access and policy logs appear in Cloud Audit Logs under the IAP service. Related device events can come from Endpoint Verification or Cloud Identity logs, depending on how your organization collects device data.

## Prerequisites

- BeyondCorp Enterprise configured with IAP-protected resources
- Cloud Logging enabled (it is on by default)
- Data Access audit logs enabled for the Cloud Identity-Aware Proxy API
- Appropriate IAM roles for log access (`roles/logging.privateLogViewer` for Data Access audit logs, or `roles/logging.admin`)

```bash
# Verify logging is working by checking recent IAP logs

gcloud logging read \
  'protoPayload.serviceName="iap.googleapis.com"' \
  --project=my-project-id \
  --limit=5
```

## Querying Access Granted Events

Find all successful access events for a specific application.

```bash
# View successful access events for a specific backend service
gcloud logging read '
  protoPayload.serviceName="iap.googleapis.com" AND
  protoPayload.methodName="AuthorizeUser" AND
  protoPayload.authorizationInfo.granted=true
' --project=my-project-id \
  --limit=20 \
  --format="table(timestamp,protoPayload.authenticationInfo.principalEmail,protoPayload.resourceName)"
```

## Querying Access Denied Events

Access denied events are the most important for security monitoring. They can indicate unauthorized access attempts, compliance failures, or misconfiguration.

```bash
# View all access denied events
gcloud logging read '
  protoPayload.serviceName="iap.googleapis.com" AND
  protoPayload.methodName="AuthorizeUser" AND
  protoPayload.authorizationInfo.granted=false
' --project=my-project-id \
  --limit=20 \
  --format="table(timestamp,protoPayload.authenticationInfo.principalEmail,protoPayload.resourceName,protoPayload.status.message)"
```

The `status.message` field tells you why access was denied - whether it was an identity issue, a failed access level evaluation, or a missing IAM binding.

## Querying by User

Track a specific user's access history.

```bash
# View all access events for a specific user
gcloud logging read '
  protoPayload.serviceName="iap.googleapis.com" AND
  protoPayload.authenticationInfo.principalEmail="alice@example.com"
' --project=my-project-id \
  --limit=50 \
  --format="table(timestamp,protoPayload.methodName,protoPayload.resourceName,protoPayload.authorizationInfo[0].granted)"
```

## Querying Device State Events

Monitor device compliance changes from Endpoint Verification if your organization routes those events into Cloud Logging.

```bash
# View device state changes
gcloud logging read '
  protoPayload.serviceName="endpointverification.googleapis.com"
' --project=my-project-id \
  --limit=20 \
  --format="table(timestamp,protoPayload.authenticationInfo.principalEmail,protoPayload.request.deviceState)"
```

## Building Log-Based Metrics

Create metrics from log entries for dashboarding and alerting.

```bash
# Create a metric for access denied events
gcloud logging metrics create beyondcorp-access-denied \
  --description="Count of BeyondCorp access denied events" \
  --log-filter='
    protoPayload.serviceName="iap.googleapis.com" AND
    protoPayload.methodName="AuthorizeUser" AND
    protoPayload.authorizationInfo.granted=false
  ' \
  --project=my-project-id

# Create a metric for access granted events
gcloud logging metrics create beyondcorp-access-granted \
  --description="Count of BeyondCorp access granted events" \
  --log-filter='
    protoPayload.serviceName="iap.googleapis.com" AND
    protoPayload.methodName="AuthorizeUser" AND
    protoPayload.authorizationInfo.granted=true
  ' \
  --project=my-project-id

# Create a metric for access denied by user (for detecting brute force)
cat > beyondcorp-denied-by-user.json <<'EOF'
{
  "name": "beyondcorp-denied-by-user",
  "description": "Access denied events grouped by user",
  "filter": "protoPayload.serviceName=\"iap.googleapis.com\" AND protoPayload.methodName=\"AuthorizeUser\" AND protoPayload.authorizationInfo.granted=false",
  "metricDescriptor": {
    "metricKind": "DELTA",
    "valueType": "INT64",
    "labels": [
      {
        "key": "user",
        "valueType": "STRING",
        "description": "Authenticated principal email"
      }
    ]
  },
  "labelExtractors": {
    "user": "EXTRACT(protoPayload.authenticationInfo.principalEmail)"
  }
}
EOF

gcloud logging metrics create beyondcorp-denied-by-user \
  --config-from-file=beyondcorp-denied-by-user.json \
  --project=my-project-id
```

## Creating Monitoring Dashboards

Build a dashboard that shows your BeyondCorp access patterns at a glance.

```bash
# Create a Cloud Monitoring dashboard for BeyondCorp
gcloud monitoring dashboards create --config='
{
  "displayName": "BeyondCorp Enterprise Access Dashboard",
  "mosaicLayout": {
    "tiles": [
      {
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Access Granted vs Denied",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "metric.type=\"logging.googleapis.com/user/beyondcorp-access-granted\"",
                    "aggregation": {
                      "alignmentPeriod": "300s",
                      "perSeriesAligner": "ALIGN_RATE"
                    }
                  }
                },
                "plotType": "LINE",
                "legendTemplate": "Access Granted"
              },
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "metric.type=\"logging.googleapis.com/user/beyondcorp-access-denied\"",
                    "aggregation": {
                      "alignmentPeriod": "300s",
                      "perSeriesAligner": "ALIGN_RATE"
                    }
                  }
                },
                "plotType": "LINE",
                "legendTemplate": "Access Denied"
              }
            ]
          }
        }
      }
    ]
  }
}' --project=my-project-id
```

## Setting Up Alerts

Create alerts for security-relevant events.

### Alert: Unusual Access Denied Spike

```bash
# Alert when access denied count exceeds normal levels
gcloud monitoring policies create \
  --display-name="BeyondCorp Access Denied Spike" \
  --condition-display-name="Access denied count above threshold" \
  --condition-filter='metric.type="logging.googleapis.com/user/beyondcorp-access-denied"' \
  --aggregation='{"alignmentPeriod":"300s","perSeriesAligner":"ALIGN_DELTA"}' \
  --duration=300s \
  --if="> 20" \
  --notification-channels=CHANNEL_ID \
  --project=my-project-id
```

### Alert: Access from Unusual Location

```bash
# Route candidate events to Pub/Sub for alert processing
gcloud logging sinks create beyondcorp-geo-alert \
  --log-filter='
    protoPayload.serviceName="iap.googleapis.com" AND
    protoPayload.requestMetadata.callerIp!="" AND
    NOT protoPayload.requestMetadata.callerIp:("203.0.113." OR "198.51.100.")
  ' \
  --destination="pubsub.googleapis.com/projects/my-project-id/topics/security-alerts" \
  --project=my-project-id
```

### Alert: After-Hours Access

```bash
# Create a metric for granted access. Use Cloud Monitoring notification routing,
# incident handling, or BigQuery analysis to apply recurring business-hour logic.
gcloud logging metrics create after-hours-access \
  --description="Granted IAP access events for after-hours analysis" \
  --log-filter='
    protoPayload.serviceName="iap.googleapis.com" AND
    protoPayload.methodName="AuthorizeUser" AND
    protoPayload.authorizationInfo.granted=true
  ' \
  --project=my-project-id
```

## Exporting Logs for Long-Term Retention

Cloud Logging retains logs for 30 days by default. For compliance, export to long-term storage.

```bash
# Export BeyondCorp logs to Cloud Storage for long-term retention
gcloud logging sinks create beyondcorp-archive \
  --log-filter='
    protoPayload.serviceName="iap.googleapis.com"
  ' \
  --destination="storage.googleapis.com/my-security-logs-bucket" \
  --project=my-project-id

# Export to BigQuery for analytical queries
gcloud logging sinks create beyondcorp-analytics \
  --log-filter='
    protoPayload.serviceName="iap.googleapis.com"
  ' \
  --destination="bigquery.googleapis.com/projects/my-project-id/datasets/security_logs" \
  --project=my-project-id
```

## Analyzing Logs in BigQuery

Once logs are in BigQuery, run analytical queries.

```sql
-- Find the top 10 users with the most denied access attempts
SELECT
  protopayload_auditlog.authenticationInfo.principalEmail AS user_email,
  COUNT(*) AS denied_count,
  MIN(timestamp) AS first_denied,
  MAX(timestamp) AS last_denied
FROM `my-project-id.security_logs.cloudaudit_googleapis_com_data_access`
WHERE
  protopayload_auditlog.serviceName = "iap.googleapis.com" AND
  protopayload_auditlog.authorizationInfo[SAFE_OFFSET(0)].granted = false AND
  timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
GROUP BY user_email
ORDER BY denied_count DESC
LIMIT 10;
```

```sql
-- Identify access patterns by hour of day
SELECT
  EXTRACT(HOUR FROM timestamp) AS hour_of_day,
  COUNTIF(protopayload_auditlog.authorizationInfo[SAFE_OFFSET(0)].granted = true) AS granted,
  COUNTIF(protopayload_auditlog.authorizationInfo[SAFE_OFFSET(0)].granted = false) AS denied
FROM `my-project-id.security_logs.cloudaudit_googleapis_com_data_access`
WHERE
  protopayload_auditlog.serviceName = "iap.googleapis.com" AND
  timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY hour_of_day
ORDER BY hour_of_day;
```

## Compliance Reporting

Generate compliance reports from the logged data.

```bash
# Generate a report of all unique users who accessed a specific application
gcloud logging read '
  protoPayload.serviceName="iap.googleapis.com" AND
  protoPayload.methodName="AuthorizeUser" AND
  protoPayload.authorizationInfo.granted=true AND
  protoPayload.resourceName:"my-sensitive-app" AND
  timestamp>="2026-01-01T00:00:00Z"
' --project=my-project-id \
  --format="value(protoPayload.authenticationInfo.principalEmail)" | sort -u
```

## Summary

Monitoring BeyondCorp Enterprise access events gives you visibility into who is accessing your applications, from where, and whether their access is being granted or denied. Build log-based metrics for dashboarding, set up alerts for anomalous patterns, export to BigQuery for deep analysis, and maintain long-term archives for compliance. The combination of Cloud Logging, Cloud Monitoring, and BigQuery gives you a complete security monitoring stack for your zero trust deployment.
