# How to Audit and Monitor Access Level Evaluations in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Access Context Manager, Audit Logging, Cloud Monitoring, Security

Description: Learn how to set up auditing and monitoring for Access Context Manager access level evaluations to track policy enforcement and troubleshoot access issues in GCP.

---

You have set up access levels in Access Context Manager and configured VPC Service Controls or Identity-Aware Proxy to enforce them. Great. But now someone on your team reports they cannot access a resource and you have no idea why. Or worse, your security team asks for a report on how many access attempts were blocked last month and you have nothing to show them.

Monitoring access level evaluations is not optional - it is a critical part of running context-aware access controls in production. In this post, I will show you how to set up proper auditing and monitoring for access levels in GCP.

## Where Access Level Evaluations Show Up

Access level evaluations generate log entries in different places depending on what is enforcing them:

- **VPC Service Controls**: Violations appear in audit logs as `PERMISSION_DENIED` errors with a `violationInfo` field
- **Identity-Aware Proxy**: Denied access shows up in IAP request logs
- **IAM Conditions**: Access level condition failures appear in policy troubleshooter output

Each of these has slightly different log formats, so you need to know where to look depending on your setup.

## Step 1: Enable Data Access Audit Logs

By default, GCP logs admin activity (creating/modifying resources) but not data access. For access level monitoring, you need data access logs enabled.

Enable audit logging for the relevant services through the IAM audit config:

```bash
# Get the current IAM policy
gcloud projects get-iam-policy PROJECT_ID --format=json > policy.json
```

Edit `policy.json` to add audit log configuration:

```json
{
  "auditConfigs": [
    {
      "service": "accesscontextmanager.googleapis.com",
      "auditLogConfigs": [
        { "logType": "ADMIN_READ" },
        { "logType": "DATA_READ" },
        { "logType": "DATA_WRITE" }
      ]
    },
    {
      "service": "iap.googleapis.com",
      "auditLogConfigs": [
        { "logType": "ADMIN_READ" },
        { "logType": "DATA_READ" }
      ]
    }
  ]
}
```

```bash
# Apply the updated policy with audit logging enabled
gcloud projects set-iam-policy PROJECT_ID policy.json
```

## Step 2: Monitor VPC Service Controls Violations

VPC Service Controls violations are one of the most common things you will need to track. When a request does not satisfy an access level required by a service perimeter, it gets logged.

Query for VPC SC violations using Cloud Logging:

```bash
# Find VPC Service Controls violations in the last 24 hours
gcloud logging read '
  resource.type="audited_resource" AND
  protoPayload.metadata.@type="type.googleapis.com/google.cloud.audit.VpcServiceControlAuditMetadata" AND
  protoPayload.metadata.violationReason!=""
' --project=PROJECT_ID \
  --freshness=1d \
  --limit=100
```

The log entries contain useful fields:

- `violationReason`: Why the request was denied (e.g., `NO_MATCHING_ACCESS_LEVEL`)
- `resourceNames`: Which resource was being accessed
- `callerIp`: The IP address of the requester
- `principalEmail`: Who made the request
- `accessLevels`: Which access levels were evaluated

## Step 3: Create a Log-Based Metric for Access Denials

To track access level denials over time, create a log-based metric:

```bash
# Create a metric that counts VPC SC violations
gcloud logging metrics create vpc-sc-violations \
  --project=PROJECT_ID \
  --description="Count of VPC Service Controls access violations" \
  --log-filter='
    resource.type="audited_resource" AND
    protoPayload.metadata.@type="type.googleapis.com/google.cloud.audit.VpcServiceControlAuditMetadata" AND
    protoPayload.metadata.violationReason!=""
  '
```

You can also create more specific metrics that break down by violation reason:

```bash
# Create a metric with labels for detailed breakdown
gcloud logging metrics create vpc-sc-violations-detailed \
  --project=PROJECT_ID \
  --description="VPC SC violations with reason and principal labels" \
  --log-filter='
    resource.type="audited_resource" AND
    protoPayload.metadata.violationReason!=""
  ' \
  --label-extractors='
    violation_reason=EXTRACT(protoPayload.metadata.violationReason),
    principal=EXTRACT(protoPayload.authenticationInfo.principalEmail)
  '
```

## Step 4: Set Up Alerting

Once you have metrics, set up alerts so your team knows about unusual patterns. Here is how to create an alert policy that fires when access denials spike:

```bash
# Create an alert for spike in access level violations
gcloud alpha monitoring policies create \
  --display-name="VPC SC Violation Spike" \
  --condition-display-name="High violation rate" \
  --condition-filter='metric.type="logging.googleapis.com/user/vpc-sc-violations" AND resource.type="audited_resource"' \
  --condition-threshold-value=50 \
  --condition-threshold-duration=300s \
  --condition-threshold-comparison=COMPARISON_GT \
  --notification-channels=CHANNEL_ID \
  --combiner=OR
```

You should alert on:

- Sudden spikes in access denials (could indicate a misconfiguration or an attack)
- Denials from specific service accounts (could indicate a broken automation)
- Denials from geographic regions you do not expect

## Step 5: Build a Monitoring Dashboard

Create a Cloud Monitoring dashboard that gives you visibility into access level evaluations.

Here is a Terraform definition for a dashboard:

```hcl
# Dashboard for monitoring access level evaluations
resource "google_monitoring_dashboard" "access_monitoring" {
  dashboard_json = jsonencode({
    displayName = "Access Level Monitoring"
    gridLayout = {
      widgets = [
        {
          title = "VPC SC Violations Over Time"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"logging.googleapis.com/user/vpc-sc-violations\""
                }
              }
            }]
          }
        },
        {
          title = "Violations by Principal"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"logging.googleapis.com/user/vpc-sc-violations-detailed\""
                  aggregation = {
                    groupByFields = ["metric.label.principal"]
                  }
                }
              }
            }]
          }
        },
        {
          title = "IAP Access Denials"
          xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"logging.googleapis.com/user/iap-denials\""
                }
              }
            }]
          }
        }
      ]
    }
  })
}
```

## Step 6: Export Logs for Long-Term Analysis

Cloud Logging retains logs for a limited time (30 days by default for most log types). For compliance and long-term analysis, export your access logs to BigQuery:

```bash
# Create a log sink that exports access level evaluation logs to BigQuery
gcloud logging sinks create access-level-audit-sink \
  bigquery.googleapis.com/projects/PROJECT_ID/datasets/access_audit_logs \
  --log-filter='
    protoPayload.metadata.@type="type.googleapis.com/google.cloud.audit.VpcServiceControlAuditMetadata" OR
    resource.type="gce_backend_service" AND protoPayload.serviceName="iap.googleapis.com"
  '
```

Once the logs are in BigQuery, you can run detailed queries:

```sql
-- Find the top 10 principals with the most access denials this month
SELECT
  protopayload_auditlog.authenticationInfo.principalEmail AS principal,
  COUNT(*) AS denial_count
FROM
  `project_id.access_audit_logs.cloudaudit_googleapis_com_policy_*`
WHERE
  _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
  AND protopayload_auditlog.metadata.violationReason IS NOT NULL
GROUP BY principal
ORDER BY denial_count DESC
LIMIT 10;
```

```sql
-- Analyze access denials by hour to find patterns
SELECT
  EXTRACT(HOUR FROM timestamp) AS hour_of_day,
  COUNT(*) AS denial_count
FROM
  `project_id.access_audit_logs.cloudaudit_googleapis_com_policy_*`
WHERE
  _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY))
  AND protopayload_auditlog.metadata.violationReason IS NOT NULL
GROUP BY hour_of_day
ORDER BY hour_of_day;
```

## Step 7: Use Policy Troubleshooter for Individual Issues

When a specific user reports access problems, use the IAM Policy Troubleshooter to diagnose the issue:

```bash
# Troubleshoot why a user cannot access a resource
gcloud policy-troubleshoot iam \
  //cloudresourcemanager.googleapis.com/projects/PROJECT_ID \
  --principal-email="user@example.com" \
  --permission="bigquery.tables.getData"
```

This shows you exactly which policies apply, which conditions were evaluated, and where the denial happened.

## Practical Tips

From running this in production, here are some things I have learned:

**Set up a dry-run perimeter alongside your enforced one.** The dry-run perimeter logs what would be blocked without actually blocking it. Compare the two to catch potential issues before they become outages.

**Correlate access denials with deployment events.** Many spikes in access denials happen right after infrastructure changes. If you push a new service perimeter config and suddenly see a flood of denials, you know where to look.

**Create a runbook for common denial patterns.** Document the most frequent access denial scenarios and their resolutions. This saves time when on-call engineers need to respond to alerts.

**Review access level configurations regularly.** IP ranges change, offices move, VPN endpoints get updated. Schedule quarterly reviews of your access levels to make sure they still match reality.

## Summary

Monitoring access level evaluations is essential for operating context-aware security controls in GCP. Use Cloud Logging to capture violations, create log-based metrics for trending, set up alerts for anomalies, and export to BigQuery for long-term analysis. Good visibility into access level evaluations helps you catch misconfigurations early, respond to security incidents faster, and satisfy compliance auditors.
