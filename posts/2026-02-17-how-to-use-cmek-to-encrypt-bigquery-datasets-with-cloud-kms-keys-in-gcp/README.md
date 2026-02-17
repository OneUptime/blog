# How to Use CMEK to Encrypt BigQuery Datasets with Cloud KMS Keys in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud KMS, BigQuery, CMEK, Encryption, Data Security

Description: A practical guide to encrypting BigQuery datasets with Customer-Managed Encryption Keys using Cloud KMS in Google Cloud for enhanced data governance and compliance.

---

BigQuery encrypts all data at rest by default using Google-managed keys. For most teams, that is sufficient. But when regulations like HIPAA, PCI DSS, or internal security policies require you to own and control the encryption keys, you need CMEK - Customer-Managed Encryption Keys.

With CMEK, you create encryption keys in Cloud KMS and configure BigQuery to use them. You get to decide the rotation schedule, who has access to the keys, and you can even disable a key to render all data encrypted with it completely inaccessible. That level of control is what compliance teams are usually looking for.

Let me walk through the complete setup.

## Prerequisites

You will need:

- A GCP project with BigQuery and Cloud KMS APIs enabled
- Sufficient IAM permissions (BigQuery Admin and Cloud KMS Admin)
- The `gcloud` CLI and `bq` command-line tool installed

## Step 1: Enable the Required APIs

Make sure both the Cloud KMS and BigQuery APIs are enabled in your project.

```bash
# Enable Cloud KMS and BigQuery APIs
gcloud services enable cloudkms.googleapis.com bigquery.googleapis.com \
    --project=my-project-id
```

## Step 2: Create a Key Ring and Key

Create a key ring and a symmetric encryption key. The key ring location must match the BigQuery dataset location. If your dataset is in `US`, use the `us` multi-region for your key ring. If your dataset is in `us-central1`, use `us-central1`.

```bash
# Create a key ring in the US multi-region to match BigQuery dataset location
gcloud kms keyrings create bigquery-keyring \
    --location=us \
    --project=my-project-id

# Create a symmetric encryption key with 90-day rotation
gcloud kms keys create bigquery-encryption-key \
    --location=us \
    --keyring=bigquery-keyring \
    --purpose=encryption \
    --rotation-period=90d \
    --project=my-project-id
```

## Step 3: Grant BigQuery Access to the KMS Key

BigQuery uses an internal service account to perform encryption and decryption. You need to find this service account and grant it access to your key.

```bash
# Get the BigQuery service account for your project
# Replace PROJECT_NUMBER with your actual project number
bq show --encryption_service_account --project_id=my-project-id
```

This returns an email like `bq-PROJECT_NUMBER@bigquery-encryption.iam.gserviceaccount.com`. Grant it the encrypter/decrypter role on your key.

```bash
# Grant BigQuery's encryption service account permission to use the KMS key
gcloud kms keys add-iam-policy-binding bigquery-encryption-key \
    --location=us \
    --keyring=bigquery-keyring \
    --member="serviceAccount:bq-123456789@bigquery-encryption.iam.gserviceaccount.com" \
    --role="roles/cloudkms.cryptoKeyEncrypterDecrypter" \
    --project=my-project-id
```

This binding is critical. Without it, BigQuery cannot use your key and any attempt to create a CMEK-encrypted dataset or table will fail with a permission error.

## Step 4: Create a BigQuery Dataset with CMEK

Now create a dataset that uses your Cloud KMS key as the default encryption key.

```bash
# Create a BigQuery dataset with CMEK default encryption
bq mk --dataset \
    --default_kms_key="projects/my-project-id/locations/us/keyRings/bigquery-keyring/cryptoKeys/bigquery-encryption-key" \
    --location=US \
    --description="CMEK-encrypted dataset" \
    my-project-id:cmek_dataset
```

Every table created in this dataset will automatically be encrypted with your KMS key.

## Step 5: Create a Table with CMEK (Per-Table Encryption)

You can also set encryption at the individual table level. This is useful when you want different tables encrypted with different keys.

```bash
# Create a table with a specific CMEK key
bq mk --table \
    --schema="name:STRING,email:STRING,created_at:TIMESTAMP" \
    --destination_kms_key="projects/my-project-id/locations/us/keyRings/bigquery-keyring/cryptoKeys/bigquery-encryption-key" \
    my-project-id:cmek_dataset.users
```

## Step 6: Verify the Encryption

Check that your dataset and table are using the right key.

```bash
# Verify dataset-level encryption
bq show --format=prettyjson my-project-id:cmek_dataset | grep -A 2 "defaultEncryptionConfiguration"

# Verify table-level encryption
bq show --format=prettyjson my-project-id:cmek_dataset.users | grep -A 2 "encryptionConfiguration"
```

Both should display the full resource name of your Cloud KMS key.

## Setting Up with Terraform

For teams managing infrastructure as code, here is the Terraform configuration.

```hcl
# Create the KMS key ring
resource "google_kms_key_ring" "bq_keyring" {
  name     = "bigquery-keyring"
  location = "us"
}

# Create the encryption key
resource "google_kms_crypto_key" "bq_key" {
  name            = "bigquery-encryption-key"
  key_ring        = google_kms_key_ring.bq_keyring.id
  rotation_period = "7776000s" # 90 days
}

# Look up the BigQuery encryption service account
data "google_bigquery_default_service_account" "bq_sa" {}

# Grant the BigQuery service account access to the key
resource "google_kms_crypto_key_iam_member" "bq_cmek" {
  crypto_key_id = google_kms_crypto_key.bq_key.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:${data.google_bigquery_default_service_account.bq_sa.email}"
}

# Create the BigQuery dataset with CMEK
resource "google_bigquery_dataset" "cmek_dataset" {
  dataset_id = "cmek_dataset"
  location   = "US"

  default_encryption_configuration {
    kms_key_name = google_kms_crypto_key.bq_key.id
  }

  depends_on = [google_kms_crypto_key_iam_member.bq_cmek]
}
```

## Updating Encryption on an Existing Dataset

If you have an existing dataset and want to add CMEK, you can update it.

```bash
# Update an existing dataset to use CMEK
bq update --default_kms_key="projects/my-project-id/locations/us/keyRings/bigquery-keyring/cryptoKeys/bigquery-encryption-key" \
    my-project-id:existing_dataset
```

This sets the default key for new tables, but existing tables in the dataset keep their current encryption. To change encryption on an existing table, you need to copy it.

```bash
# Copy a table to re-encrypt it with CMEK
bq cp --destination_kms_key="projects/my-project-id/locations/us/keyRings/bigquery-keyring/cryptoKeys/bigquery-encryption-key" \
    my-project-id:existing_dataset.my_table \
    my-project-id:existing_dataset.my_table
```

Yes, you can copy a table to itself. BigQuery will re-encrypt the data with the new key.

## Understanding Key Rotation

When Cloud KMS rotates your key, it creates a new key version. BigQuery continues to use the old version for existing data and uses the new version for new data. This is transparent - queries work the same regardless of which key version was used to encrypt the data.

If you want to re-encrypt all data with the latest key version, you need to copy each table to itself as shown above.

## Revoking Access by Disabling a Key

One of the primary reasons teams adopt CMEK is the ability to revoke access. If you disable a Cloud KMS key, all BigQuery data encrypted with that key becomes immediately inaccessible.

```bash
# Disable a key version to make all data encrypted with it inaccessible
gcloud kms keys versions disable 1 \
    --key=bigquery-encryption-key \
    --keyring=bigquery-keyring \
    --location=us \
    --project=my-project-id
```

Queries against affected tables will fail. This is useful for responding to security incidents or for decommissioning datasets.

## Common Issues and Fixes

**Location mismatch error**: Your key ring must be in the same location as your BigQuery dataset. A key in `us-central1` will not work with a dataset in `US` (the multi-region).

**Permission denied on key**: Verify the BigQuery encryption service account has the `cloudkms.cryptoKeyEncrypterDecrypter` role on the specific key. This is a frequent source of confusion because BigQuery uses a different service account than other GCP services.

**Key not found**: Double-check the full resource path. A common mistake is confusing the key ring name with the key name, or getting the location wrong.

**Scheduled queries failing**: If a scheduled query writes to a CMEK-encrypted table and the key becomes unavailable, the scheduled query will fail. Set up monitoring alerts for key availability.

## Monitoring and Audit

Track CMEK usage through Cloud Audit Logs to maintain compliance records.

```bash
# View encrypt/decrypt operations against your key
gcloud logging read \
    'resource.type="cloudkms_cryptokey" AND resource.labels.key_ring_id="bigquery-keyring"' \
    --limit=20 \
    --project=my-project-id
```

You can also set up alerts in Cloud Monitoring for key disable/destroy events to catch accidental changes early.

## Summary

Setting up CMEK for BigQuery datasets is about creating a Cloud KMS key, granting BigQuery access to it, and then configuring your datasets or tables to use it. The location alignment between key ring and dataset is the most important detail to get right. Once configured, encryption is transparent to users running queries, and you gain the ability to control key rotation and revoke access when needed.
