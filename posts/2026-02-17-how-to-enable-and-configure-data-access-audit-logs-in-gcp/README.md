# How to Enable and Configure Data Access Audit Logs in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Audit Logs, Cloud Logging, Security, Compliance

Description: A complete guide to enabling and configuring Data Access audit logs in GCP for security monitoring, compliance, and tracking who accessed what data.

---

GCP automatically logs administrative actions - creating VMs, changing IAM policies, modifying firewall rules. These Admin Activity audit logs are always on and free. But what about data access - who read a BigQuery table, who listed objects in a Cloud Storage bucket, who queried a Cloud SQL database? That is where Data Access audit logs come in, and they are not enabled by default.

In this post, I will explain why Data Access audit logs matter, how to enable them, and how to configure them without drowning in log volume and costs.

## Types of Audit Logs in GCP

GCP produces four types of audit logs:

| Type | Always On? | Free? | What It Captures |
|------|-----------|-------|------------------|
| Admin Activity | Yes | Yes | Resource create/update/delete operations |
| Data Access | No (mostly) | No | Data read, data write, and metadata operations |
| System Event | Yes | Yes | Google-initiated system operations |
| Policy Denied | Yes | Yes | Denied access attempts from VPC Service Controls |

Data Access audit logs are special because they need to be explicitly enabled for most services, and they are billed at standard Cloud Logging ingestion rates. This is why GCP does not turn them on by default - for busy services, they can generate enormous log volumes.

## Why Enable Data Access Audit Logs?

Several reasons to turn them on:

- **Security monitoring**: Track who accessed sensitive data and when
- **Compliance requirements**: Regulations like HIPAA, PCI-DSS, SOC 2, and GDPR may require data access logging
- **Forensic investigation**: After a security incident, you need to know what data was accessed
- **Access pattern analysis**: Understand how your data is being used

## Enabling Data Access Audit Logs

### Using the Cloud Console

1. Go to **IAM & Admin** > **Audit Logs**
2. You will see a list of all GCP services
3. Click on the service you want to enable data access logging for (e.g., BigQuery, Cloud Storage)
4. Check the log types you want to enable:
   - **Admin Read**: Metadata operations (listing resources)
   - **Data Read**: Reading user-provided data
   - **Data Write**: Writing user-provided data
5. Click **Save**

### Using gcloud CLI

The audit log configuration is part of the project's IAM policy. Here is how to update it:

First, get the current policy:

```bash
# Get the current IAM policy including audit config
gcloud projects get-iam-policy my-project --format=json > policy.json
```

Then add or modify the `auditConfigs` section in the JSON file. Here is what enabling data access logs for BigQuery and Cloud Storage looks like:

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
    },
    {
      "service": "storage.googleapis.com",
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

Apply the updated policy:

```bash
# Apply the updated IAM policy with audit configuration
gcloud projects set-iam-policy my-project policy.json
```

### Enabling for All Services at Once

If compliance requires data access logging for every service, you can use the special `allServices` identifier:

```json
{
  "auditConfigs": [
    {
      "service": "allServices",
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

Be warned that this generates a lot of logs and can significantly increase your Cloud Logging costs.

## Exempting Specific Users

Sometimes you want data access logging enabled but need to exempt certain service accounts or users from generating logs. This is common for monitoring systems or service accounts that make frequent read operations:

```json
{
  "auditConfigs": [
    {
      "service": "bigquery.googleapis.com",
      "auditLogConfigs": [
        {
          "logType": "DATA_READ",
          "exemptedMembers": [
            "serviceAccount:monitoring-sa@my-project.iam.gserviceaccount.com",
            "serviceAccount:dataflow-worker@my-project.iam.gserviceaccount.com"
          ]
        },
        {
          "logType": "DATA_WRITE"
        }
      ]
    }
  ]
}
```

The monitoring and dataflow service accounts will not generate DATA_READ audit logs for BigQuery, reducing noise.

## Enabling at the Organization Level

For organizations that need consistent audit logging across all projects, configure it at the organization level:

```bash
# Get the organization IAM policy
gcloud organizations get-iam-policy ORGANIZATION_ID --format=json > org-policy.json

# After editing the auditConfigs section, apply it
gcloud organizations set-iam-policy ORGANIZATION_ID org-policy.json
```

Organization-level audit configurations are inherited by all projects. Project-level configurations can add additional logging but cannot reduce what the organization requires.

## Viewing Data Access Audit Logs

Once enabled, data access logs appear in Cloud Logging. You can query them like this:

```
# View all data access audit logs
logName="projects/my-project/logs/cloudaudit.googleapis.com%2Fdata_access"
```

Filter for a specific service:

```
# BigQuery data access logs only
logName="projects/my-project/logs/cloudaudit.googleapis.com%2Fdata_access"
protoPayload.serviceName="bigquery.googleapis.com"
```

Filter for a specific user:

```
# Data access by a specific user
logName="projects/my-project/logs/cloudaudit.googleapis.com%2Fdata_access"
protoPayload.authenticationInfo.principalEmail="user@company.com"
```

## Practical Queries for Security Teams

### Who Accessed a Specific BigQuery Table

```
# Find all access to a specific BigQuery table
logName="projects/my-project/logs/cloudaudit.googleapis.com%2Fdata_access"
protoPayload.serviceName="bigquery.googleapis.com"
protoPayload.resourceName=~"datasets/sensitive_data/tables/customer_records"
```

### Track Cloud Storage Object Access

```
# Who downloaded objects from a specific bucket
logName="projects/my-project/logs/cloudaudit.googleapis.com%2Fdata_access"
protoPayload.serviceName="storage.googleapis.com"
protoPayload.resourceName=~"buckets/sensitive-data-bucket"
protoPayload.methodName="storage.objects.get"
```

### Monitor Service Account Data Access

```
# All data access by service accounts
logName="projects/my-project/logs/cloudaudit.googleapis.com%2Fdata_access"
protoPayload.authenticationInfo.principalEmail=~"gserviceaccount.com"
```

## Using Log Analytics for Audit Analysis

If you have Log Analytics enabled, you can run SQL queries on audit logs:

```sql
-- Top data accessors in the last 30 days
SELECT
  proto_payload.audit_log.authentication_info.principal_email AS accessor,
  proto_payload.audit_log.service_name AS service,
  COUNT(*) AS access_count
FROM
  `my-project.global._Default._AllLogs`
WHERE
  log_id = 'cloudaudit.googleapis.com/data_access'
  AND timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
GROUP BY
  accessor, service
ORDER BY
  access_count DESC
LIMIT 50
```

## Terraform Configuration

```hcl
# Enable data access audit logs for specific services
resource "google_project_iam_audit_config" "bigquery" {
  project = var.project_id
  service = "bigquery.googleapis.com"

  audit_log_config {
    log_type = "ADMIN_READ"
  }

  audit_log_config {
    log_type = "DATA_READ"
    exempted_members = [
      "serviceAccount:${var.monitoring_sa_email}",
    ]
  }

  audit_log_config {
    log_type = "DATA_WRITE"
  }
}

resource "google_project_iam_audit_config" "storage" {
  project = var.project_id
  service = "storage.googleapis.com"

  audit_log_config {
    log_type = "DATA_READ"
  }

  audit_log_config {
    log_type = "DATA_WRITE"
  }
}

# Organization-level audit config for all services
resource "google_organization_iam_audit_config" "all_services" {
  org_id  = var.organization_id
  service = "allServices"

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
```

## Cost Management

Data Access audit logs can be expensive. Here are ways to manage costs:

1. **Enable selectively**: Only enable for services that handle sensitive data. You probably do not need data access logs for Cloud Monitoring or Deployment Manager.

2. **Use exemptions**: Exempt high-volume service accounts that perform routine read operations.

3. **Route to Cloud Storage**: If you need to retain data access logs for compliance but do not need to search them frequently, route them to Cloud Storage and exclude them from the `_Default` bucket.

4. **Monitor ingestion volume**: Set up an alert on `logging.googleapis.com/billing/bytes_ingested` to catch unexpected spikes.

## Wrapping Up

Data Access audit logs are a critical security and compliance feature in GCP. They tell you who accessed what data and when, which is information you cannot get from Admin Activity logs alone. The key is being strategic about which services you enable them for and using exemptions to control volume. Enable them for your data stores (BigQuery, Cloud Storage, Cloud SQL, Spanner), exempt your automated systems where appropriate, and set up a cost-effective retention strategy using custom buckets or Cloud Storage export.
