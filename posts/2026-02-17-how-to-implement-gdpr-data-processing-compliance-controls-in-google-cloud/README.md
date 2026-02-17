# How to Implement GDPR Data Processing Compliance Controls in Google Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, GDPR, Data Privacy, Compliance, Data Protection, Cloud Security

Description: A practical guide to implementing GDPR data processing compliance controls on Google Cloud, covering data residency, consent management, data subject rights, and DPIAs.

---

The General Data Protection Regulation (GDPR) affects any organization that processes personal data of EU residents, regardless of where the organization is based. Running workloads on Google Cloud gives you the infrastructure to comply, but compliance requires deliberate configuration choices around where data lives, who can access it, how long it is retained, and how you respond to data subject requests.

This guide covers the technical controls you need to implement on Google Cloud to meet GDPR requirements, from data residency and encryption to data subject rights and breach detection.

## Google's Data Processing Agreement

Google provides a Data Processing Agreement (DPA) that covers GDPR requirements for Google Cloud services. This is a prerequisite - you need to accept the DPA before processing EU personal data on Google Cloud.

The DPA covers:
- Google acting as a data processor on your behalf
- Sub-processor transparency and notification
- Data deletion upon contract termination
- Assistance with data subject requests
- Security measures Google implements

Accept the DPA through the Google Cloud Console under Organization Settings.

## Data Residency and Location Controls

GDPR does not strictly require data to stay in the EU, but many organizations choose EU-only data residency as a compliance simplification. Google Cloud provides region-specific resource creation.

```bash
# Create resources in EU regions only
# Cloud Storage bucket in EU
gcloud storage buckets create gs://eu-personal-data \
  --location=EU \
  --uniform-bucket-level-access \
  --default-encryption-key=projects/my-kms-project/locations/europe-west1/keyRings/eu-keyring/cryptoKeys/data-key \
  --project=gdpr-data-project

# BigQuery dataset in EU
bq mk --dataset \
  --location=EU \
  --description="Personal data - EU only" \
  --default_kms_key=projects/my-kms-project/locations/europe-west1/keyRings/eu-keyring/cryptoKeys/bq-key \
  gdpr-data-project:personal_data

# Cloud SQL in EU region
gcloud sql instances create eu-database \
  --database-version=POSTGRES_15 \
  --tier=db-custom-4-16384 \
  --region=europe-west1 \
  --no-assign-ip \
  --network=projects/gdpr-data-project/global/networks/eu-vpc \
  --require-ssl \
  --project=gdpr-data-project
```

### Enforce Data Residency with Organization Policies

Prevent accidental creation of resources outside approved regions.

```bash
# Restrict resource locations to EU regions
gcloud resource-manager org-policies set-policy \
  --project=gdpr-data-project \
  location-policy.yaml
```

```yaml
# location-policy.yaml
# Restrict all resources to EU locations
constraint: constraints/gcp.resourceLocations
listPolicy:
  allowedValues:
    - in:eu-locations
```

## Personal Data Classification with Cloud DLP

Before you can protect personal data, you need to know where it is. Cloud DLP scans your data stores and identifies personal data.

```bash
# Create a DLP inspection job to find personal data in Cloud Storage
gcloud dlp jobs create \
  --project=gdpr-data-project \
  --display-name="GDPR Personal Data Scan" \
  --inspect-config='{"infoTypes":[{"name":"PERSON_NAME"},{"name":"EMAIL_ADDRESS"},{"name":"PHONE_NUMBER"},{"name":"DATE_OF_BIRTH"},{"name":"STREET_ADDRESS"},{"name":"IP_ADDRESS"},{"name":"CREDIT_CARD_NUMBER"}],"minLikelihood":"LIKELY","includeQuote":false}' \
  --storage-config='{"cloudStorageOptions":{"fileSet":{"url":"gs://eu-personal-data/*"}}}'

# Create a DLP inspection template for reusable scanning
gcloud dlp inspect-templates create \
  --project=gdpr-data-project \
  --display-name="GDPR PII Scanner" \
  --description="Detects personal data types relevant to GDPR" \
  --inspect-config='{"infoTypes":[{"name":"PERSON_NAME"},{"name":"EMAIL_ADDRESS"},{"name":"PHONE_NUMBER"},{"name":"DATE_OF_BIRTH"},{"name":"STREET_ADDRESS"},{"name":"IP_ADDRESS"},{"name":"IBAN_CODE"},{"name":"VAT_NUMBER"}],"minLikelihood":"LIKELY"}'
```

## Implementing Data Subject Rights

GDPR grants data subjects several rights. Here is how to implement each one technically.

### Right of Access (Article 15)

Data subjects can request a copy of their personal data.

```python
# Export all personal data for a specific user
from google.cloud import bigquery
from google.cloud import storage
import json

def export_user_data(user_id, export_bucket):
    """Export all personal data for a user (GDPR Article 15)."""
    bq_client = bigquery.Client(project='gdpr-data-project')
    storage_client = storage.Client(project='gdpr-data-project')

    # Query all tables that contain user data
    tables_with_user_data = [
        ("personal_data", "user_profiles", "user_id"),
        ("personal_data", "user_activity", "user_id"),
        ("personal_data", "user_preferences", "user_id"),
        ("personal_data", "consent_records", "user_id"),
    ]

    export_data = {}

    for dataset, table, id_column in tables_with_user_data:
        query = f"""
            SELECT *
            FROM `gdpr-data-project.{dataset}.{table}`
            WHERE {id_column} = @user_id
        """
        job_config = bigquery.QueryJobConfig(
            query_parameters=[
                bigquery.ScalarQueryParameter("user_id", "STRING", user_id)
            ]
        )

        results = bq_client.query(query, job_config=job_config)
        rows = [dict(row) for row in results]
        export_data[f"{dataset}.{table}"] = rows

    # Save to GCS as a portable format
    bucket = storage_client.bucket(export_bucket)
    blob = bucket.blob(f"data-exports/{user_id}/personal-data.json")
    blob.upload_from_string(
        json.dumps(export_data, indent=2, default=str),
        content_type='application/json'
    )

    return f"gs://{export_bucket}/data-exports/{user_id}/personal-data.json"
```

### Right to Erasure (Article 17)

Delete personal data when requested. For large-scale data, consider crypto-shredding.

```python
# Delete personal data for a specific user
def delete_user_data(user_id):
    """Delete all personal data for a user (GDPR Article 17)."""
    bq_client = bigquery.Client(project='gdpr-data-project')

    # Delete from all tables containing user data
    deletion_queries = [
        "DELETE FROM `gdpr-data-project.personal_data.user_profiles` WHERE user_id = @user_id",
        "DELETE FROM `gdpr-data-project.personal_data.user_activity` WHERE user_id = @user_id",
        "DELETE FROM `gdpr-data-project.personal_data.user_preferences` WHERE user_id = @user_id",
        # Keep consent records for compliance evidence
        # "DELETE FROM `gdpr-data-project.personal_data.consent_records` WHERE user_id = @user_id",
    ]

    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("user_id", "STRING", user_id)
        ]
    )

    for query in deletion_queries:
        job = bq_client.query(query, job_config=job_config)
        job.result()  # Wait for completion

    # Log the erasure for compliance records
    audit_entry = {
        "user_id": user_id,
        "action": "DATA_ERASURE",
        "timestamp": datetime.utcnow().isoformat(),
        "tables_affected": len(deletion_queries),
    }

    audit_table = bq_client.dataset("compliance").table("erasure_log")
    bq_client.insert_rows_json(audit_table, [audit_entry])

    return audit_entry
```

### Right to Data Portability (Article 20)

Export data in a commonly used, machine-readable format.

```bash
# Export user data in a standard format (CSV/JSON)
bq extract --destination_format=CSV \
  'gdpr-data-project:personal_data.user_profiles' \
  gs://eu-personal-data/exports/user-profiles-*.csv

# For specific user export, use a query-based export
bq query --use_legacy_sql=false --format=json \
  "SELECT * FROM \`gdpr-data-project.personal_data.user_profiles\` WHERE user_id = 'USER_ID'" \
  > user-export.json
```

## Consent Management

Track and honor consent preferences for data processing.

```sql
-- Consent records table for tracking user consent
CREATE TABLE `gdpr-data-project.personal_data.consent_records` (
  user_id STRING NOT NULL,
  consent_type STRING NOT NULL,       -- e.g., 'marketing', 'analytics', 'personalization'
  consent_given BOOL NOT NULL,
  consent_timestamp TIMESTAMP NOT NULL,
  consent_source STRING,               -- 'web_form', 'api', 'email'
  consent_version STRING,              -- version of privacy policy
  ip_address STRING,                   -- for proof of consent
  withdrawal_timestamp TIMESTAMP,
  withdrawal_source STRING
)
PARTITION BY DATE(consent_timestamp);

-- Query to check if a user has active consent for a purpose
-- Use this before processing personal data
SELECT
  user_id,
  consent_type,
  consent_given,
  consent_timestamp,
  withdrawal_timestamp
FROM `gdpr-data-project.personal_data.consent_records`
WHERE user_id = 'USER_ID'
  AND consent_type = 'marketing'
  AND consent_given = TRUE
  AND withdrawal_timestamp IS NULL
ORDER BY consent_timestamp DESC
LIMIT 1;
```

## Data Retention and Automated Deletion

GDPR requires that personal data is not kept longer than necessary. Implement automated retention policies.

```bash
# Set partition expiration on tables with personal data
bq update --time_partitioning_expiration=63072000 \
  gdpr-data-project:personal_data.user_activity

# Create a scheduled query for data cleanup
bq query --use_legacy_sql=false \
  --schedule="every day 03:00" \
  --display_name="GDPR retention cleanup" \
  'DELETE FROM `gdpr-data-project.personal_data.user_activity`
   WHERE event_date < DATE_SUB(CURRENT_DATE(), INTERVAL 730 DAY)'
```

## Breach Detection and Notification

GDPR requires breach notification within 72 hours. Use SCC and Cloud Monitoring for detection.

```bash
# Enable Event Threat Detection for breach indicators
gcloud scc settings services enable \
  --project=gdpr-data-project \
  --service=EVENT_THREAT_DETECTION

# Create high-priority alert for data access anomalies
gcloud monitoring policies create \
  --display-name="GDPR Breach Alert - Unusual Data Access" \
  --condition-display-name="Abnormal data access volume" \
  --condition-filter='resource.type="bigquery_dataset" AND metric.type="bigquery.googleapis.com/query/scanned_bytes"' \
  --condition-threshold-value=10737418240 \
  --condition-threshold-duration=3600s \
  --notification-channels=projects/gdpr-data-project/notificationChannels/SECURITY_CHANNEL

# Create notification for SCC findings indicating potential breach
gcloud scc notifications create gdpr-breach-alerts \
  --organization=123456789 \
  --pubsub-topic=projects/gdpr-data-project/topics/security-alerts \
  --filter='(category="DATA_EXFILTRATION" OR category="ANOMALOUS_ACCESS") AND severity="HIGH"'
```

## Data Protection Impact Assessment Support

For high-risk processing activities, GDPR requires a Data Protection Impact Assessment (DPIA). Use Cloud Asset Inventory to document your data processing architecture.

```bash
# Export resource inventory for DPIA documentation
gcloud asset search-all-resources \
  --scope=projects/gdpr-data-project \
  --format=json > dpia-resource-inventory.json

# Export IAM configuration for access analysis
gcloud projects get-iam-policy gdpr-data-project \
  --format=json > dpia-access-controls.json

# Export data flow information
gcloud logging read 'resource.type="bigquery_dataset" AND protoPayload.methodName="jobservice.insert"' \
  --project=gdpr-data-project \
  --freshness=30d \
  --format=json > dpia-data-flows.json
```

## Terraform for GDPR Infrastructure

```hcl
# GDPR-compliant infrastructure configuration
resource "google_project" "gdpr_data" {
  name       = "GDPR Data Processing"
  project_id = "gdpr-data-project"
  org_id     = var.org_id
}

# Enforce EU-only resource locations
resource "google_org_policy_policy" "eu_location" {
  name   = "projects/${google_project.gdpr_data.project_id}/policies/gcp.resourceLocations"
  parent = "projects/${google_project.gdpr_data.project_id}"

  spec {
    rules {
      values {
        allowed_values = ["in:eu-locations"]
      }
    }
  }
}

# BigQuery dataset for personal data with EU location
resource "google_bigquery_dataset" "personal_data" {
  dataset_id = "personal_data"
  project    = google_project.gdpr_data.project_id
  location   = "EU"

  default_encryption_configuration {
    kms_key_name = google_kms_crypto_key.eu_data_key.id
  }

  default_partition_expiration_ms = 63072000000 # 2 years

  access {
    role          = "OWNER"
    group_by_email = "gdpr-data-admins@company.com"
  }
}
```

GDPR compliance on Google Cloud requires a combination of technical controls and organizational processes. The technical side - encryption, access controls, data residency, and logging - is well-supported by Google Cloud services. The organizational side - consent management, data subject request handling, and DPIA processes - requires building workflows on top of those services. Start with data classification to understand what personal data you have and where it lives, then layer on the controls from there.
