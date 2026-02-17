# How to Configure BigQuery Audit Logs for Compliance and Usage Tracking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Audit Logs, Compliance, Security, Usage Tracking

Description: Learn how to configure and analyze BigQuery audit logs for regulatory compliance, security monitoring, and understanding data access patterns.

---

If you handle any kind of regulated data in BigQuery - and these days, who does not - you need audit logging. Audit logs tell you who accessed what data, when they accessed it, and what queries they ran. This information is essential for compliance with regulations like GDPR, HIPAA, SOC 2, and PCI DSS. Beyond compliance, audit logs are also valuable for understanding how your data assets are being used, identifying unused tables, and detecting suspicious access patterns.

In this post, I will walk through configuring BigQuery audit logs, querying them for common compliance and usage scenarios, and setting up automated monitoring.

## Understanding BigQuery Audit Log Types

Google Cloud generates three types of audit logs for BigQuery.

Admin Activity logs capture operations that modify BigQuery resources, like creating or deleting tables, datasets, or reservations. These are always on and cannot be disabled. They are free and retained for 400 days.

Data Access logs capture operations that read data or metadata. This includes queries, table listing, and schema reads. These are the most important logs for compliance because they show who read what data. Data Access logs are not enabled by default for BigQuery and need to be turned on explicitly.

System Event logs capture automated system actions. These are always on and mostly relevant for internal GCP operations.

## Enabling Data Access Audit Logs

To get meaningful audit trails, you need to enable Data Access logs for BigQuery.

```bash
# Get the current IAM audit config
gcloud projects get-iam-policy my-project --format=json > /tmp/policy.json
```

Edit the policy to add BigQuery data access logging. Add the following to the auditConfigs section.

```json
{
  "auditConfigs": [
    {
      "service": "bigquery.googleapis.com",
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

Apply the updated policy.

```bash
# Apply the updated audit config
gcloud projects set-iam-policy my-project /tmp/policy.json
```

You can also enable this through the Cloud Console under IAM and Admin, then Audit Logs. Find BigQuery and check all three log types.

## Routing Audit Logs to BigQuery

While audit logs are available in Cloud Logging, querying them there is expensive and slow for large volumes. Route them to BigQuery for efficient analysis.

```bash
# Create a log sink that exports BigQuery audit logs to a BigQuery dataset
gcloud logging sinks create bigquery-audit-sink \
  bigquery.googleapis.com/projects/my-project/datasets/audit_logs \
  --log-filter='resource.type="bigquery_resource" OR resource.type="bigquery_project" OR resource.type="bigquery_dataset"' \
  --use-partitioned-tables \
  --project=my-project
```

The log sink creates tables in the audit_logs dataset that receive all BigQuery-related audit log entries. Using partitioned tables is important for cost-efficient querying of historical logs.

After creating the sink, grant the sink's service account write access to the BigQuery dataset.

```bash
# Get the sink's service account
gcloud logging sinks describe bigquery-audit-sink --project=my-project --format='value(writerIdentity)'

# Grant BigQuery data editor role to the sink service account
bq add-iam-policy-binding \
  --member="serviceAccount:SINK_SERVICE_ACCOUNT" \
  --role="roles/bigquery.dataEditor" \
  my-project:audit_logs
```

## Querying Audit Logs for Data Access

Once logs are flowing to BigQuery, you can run analytical queries on them. Here are common compliance-related queries.

This query shows who queried which tables in the last 30 days.

```sql
-- Who accessed which tables in the last 30 days
SELECT
  protopayload_auditlog.authenticationInfo.principalEmail AS user_email,
  protopayload_auditlog.resourceName AS resource,
  TIMESTAMP_TRUNC(timestamp, DAY) AS access_date,
  COUNT(*) AS access_count
FROM
  `my_project.audit_logs.cloudaudit_googleapis_com_data_access`
WHERE
  timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
  AND protopayload_auditlog.methodName = 'jobservice.jobcompleted'
GROUP BY
  user_email, resource, access_date
ORDER BY
  access_count DESC;
```

## Tracking Queries on Sensitive Tables

For compliance, you often need to track all access to specific tables that contain sensitive data.

```sql
-- All queries that accessed the customers table (contains PII)
SELECT
  timestamp,
  protopayload_auditlog.authenticationInfo.principalEmail AS user_email,
  protopayload_auditlog.servicedata_v1_bigquery.jobCompletedEvent.job.jobConfiguration.query.query AS query_text,
  protopayload_auditlog.servicedata_v1_bigquery.jobCompletedEvent.job.jobStatistics.totalBilledBytes AS bytes_billed
FROM
  `my_project.audit_logs.cloudaudit_googleapis_com_data_access`
WHERE
  timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
  AND protopayload_auditlog.methodName = 'jobservice.jobcompleted'
  -- Filter for queries that referenced the sensitive table
  AND EXISTS (
    SELECT 1
    FROM UNNEST(
      protopayload_auditlog.servicedata_v1_bigquery.jobCompletedEvent.job.jobStatistics.referencedTables
    ) AS ref_table
    WHERE ref_table.tableId = 'customers'
      AND ref_table.datasetId = 'analytics'
  )
ORDER BY
  timestamp DESC;
```

## Detecting Unusual Access Patterns

Security monitoring means looking for anomalies. Here are queries to detect potentially suspicious activity.

```sql
-- Users who accessed BigQuery at unusual hours (outside business hours)
SELECT
  protopayload_auditlog.authenticationInfo.principalEmail AS user_email,
  EXTRACT(HOUR FROM timestamp) AS access_hour,
  COUNT(*) AS query_count
FROM
  `my_project.audit_logs.cloudaudit_googleapis_com_data_access`
WHERE
  timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
  AND protopayload_auditlog.methodName = 'jobservice.jobcompleted'
  -- Outside business hours (before 7 AM or after 9 PM)
  AND (EXTRACT(HOUR FROM timestamp) < 7 OR EXTRACT(HOUR FROM timestamp) > 21)
GROUP BY
  user_email, access_hour
ORDER BY
  query_count DESC;
```

```sql
-- Users who queried unusually large amounts of data
SELECT
  protopayload_auditlog.authenticationInfo.principalEmail AS user_email,
  COUNT(*) AS query_count,
  SUM(
    CAST(protopayload_auditlog.servicedata_v1_bigquery.jobCompletedEvent.job.jobStatistics.totalBilledBytes AS INT64)
  ) / POW(1024, 4) AS total_tb_billed,
  -- Compare to their typical usage
  AVG(
    CAST(protopayload_auditlog.servicedata_v1_bigquery.jobCompletedEvent.job.jobStatistics.totalBilledBytes AS INT64)
  ) / POW(1024, 3) AS avg_gb_per_query
FROM
  `my_project.audit_logs.cloudaudit_googleapis_com_data_access`
WHERE
  timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
  AND protopayload_auditlog.methodName = 'jobservice.jobcompleted'
GROUP BY
  user_email
HAVING
  total_tb_billed > 1  -- More than 1 TB in a week
ORDER BY
  total_tb_billed DESC;
```

## Tracking Schema Changes

For compliance, you also need to know when table structures change.

```sql
-- Track all schema modifications (table create, alter, delete)
SELECT
  timestamp,
  protopayload_auditlog.authenticationInfo.principalEmail AS user_email,
  protopayload_auditlog.methodName AS operation,
  protopayload_auditlog.resourceName AS resource
FROM
  `my_project.audit_logs.cloudaudit_googleapis_com_activity`
WHERE
  timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
  AND protopayload_auditlog.methodName IN (
    'google.cloud.bigquery.v2.TableService.InsertTable',
    'google.cloud.bigquery.v2.TableService.UpdateTable',
    'google.cloud.bigquery.v2.TableService.DeleteTable',
    'google.cloud.bigquery.v2.DatasetService.InsertDataset',
    'google.cloud.bigquery.v2.DatasetService.DeleteDataset'
  )
ORDER BY
  timestamp DESC;
```

## Setting Up Automated Alerts

Create scheduled queries that check for policy violations and send alerts.

```sql
-- Scheduled query: Check for access to sensitive tables by unauthorized users
-- Write results to an alerts table that triggers notifications
INSERT INTO `my_project.audit_logs.security_alerts`
  (alert_time, alert_type, user_email, details)
SELECT
  CURRENT_TIMESTAMP() AS alert_time,
  'UNAUTHORIZED_SENSITIVE_ACCESS' AS alert_type,
  protopayload_auditlog.authenticationInfo.principalEmail AS user_email,
  CONCAT(
    'User accessed sensitive table: ',
    protopayload_auditlog.resourceName,
    ' Query: ',
    LEFT(protopayload_auditlog.servicedata_v1_bigquery.jobCompletedEvent.job.jobConfiguration.query.query, 500)
  ) AS details
FROM
  `my_project.audit_logs.cloudaudit_googleapis_com_data_access`
WHERE
  timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
  AND protopayload_auditlog.methodName = 'jobservice.jobcompleted'
  -- Check for access to sensitive tables
  AND EXISTS (
    SELECT 1
    FROM UNNEST(
      protopayload_auditlog.servicedata_v1_bigquery.jobCompletedEvent.job.jobStatistics.referencedTables
    ) AS ref_table
    WHERE ref_table.tableId IN ('customers', 'payment_methods', 'medical_records')
  )
  -- Exclude authorized users
  AND protopayload_auditlog.authenticationInfo.principalEmail NOT IN (
    SELECT email FROM `my_project.security.authorized_pii_users`
  );
```

## Retention and Compliance

Different regulations have different log retention requirements. HIPAA requires 6 years, SOC 2 typically requires 1 year, GDPR does not specify but expects reasonable retention. Configure your audit log dataset retention accordingly.

```bash
# Set a 7-year retention period on the audit logs dataset
bq update --default_table_expiration=220752000 my_project:audit_logs
```

For long-term retention at lower cost, consider exporting older audit logs to Cloud Storage.

```bash
# Export old audit logs to Cloud Storage for archival
bq extract --destination_format=AVRO \
  'my_project:audit_logs.cloudaudit_googleapis_com_data_access$20250101' \
  gs://my-project-audit-archive/2025/01/01/*.avro
```

## Wrapping Up

BigQuery audit logs are the foundation of data governance and compliance. Enabling Data Access logs, routing them to BigQuery for analysis, and setting up automated monitoring gives you a comprehensive audit trail that satisfies most regulatory requirements. The key is to set this up before you need it - retroactive audit logging is not possible. Start with enabling all three log types, route to BigQuery, and build the queries you need for your specific compliance requirements. The ongoing cost of storing and querying audit logs is modest compared to the cost of a compliance failure.
