# How to Use CMEK to Encrypt Cloud Storage Buckets with Cloud KMS Keys in GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud KMS, Cloud Storage, CMEK, Encryption, Security

Description: Learn how to encrypt Cloud Storage buckets using Customer-Managed Encryption Keys (CMEK) with Cloud KMS in Google Cloud Platform for complete control over your data encryption.

---

When you store data in Google Cloud Storage, it is encrypted at rest by default using Google-managed keys. That works fine for many use cases, but some organizations need more control. Maybe your compliance team requires that encryption keys live in a specific region, or you need the ability to rotate and revoke keys on your own schedule. That is where Customer-Managed Encryption Keys (CMEK) come in.

With CMEK, you create and manage your own encryption keys in Cloud KMS, and then tell Cloud Storage to use those keys instead of the default Google-managed ones. You still get the convenience of server-side encryption, but you hold the keys.

In this post, I will walk through setting up CMEK for Cloud Storage buckets from scratch.

## Prerequisites

Before you start, make sure you have:

- A GCP project with billing enabled
- The `gcloud` CLI installed and configured
- Appropriate IAM permissions (Cloud KMS Admin and Storage Admin roles)

## Step 1: Create a Cloud KMS Key Ring

Key rings are containers for your encryption keys. They live in a specific location, and once created, they cannot be deleted or moved. Choose your location carefully - it should match where your Cloud Storage bucket will be.

```bash
# Create a key ring in the us-central1 region
gcloud kms keyrings create my-storage-keyring \
    --location=us-central1 \
    --project=my-project-id
```

The location matters. If your bucket is regional in `us-central1`, your key ring should be in `us-central1` as well. For multi-regional buckets, use a matching multi-region like `us`.

## Step 2: Create an Encryption Key

Now create a symmetric encryption key inside that key ring. This key will be used to encrypt objects in your Cloud Storage bucket.

```bash
# Create a symmetric encryption key for encrypting storage objects
gcloud kms keys create my-storage-key \
    --location=us-central1 \
    --keyring=my-storage-keyring \
    --purpose=encryption \
    --rotation-period=90d \
    --next-rotation-time=$(date -u +"%Y-%m-%dT%H:%M:%SZ" -d "+90 days") \
    --project=my-project-id
```

The `--rotation-period` flag sets automatic key rotation every 90 days. Google will create new key versions automatically, and old versions remain available to decrypt data that was encrypted with them.

## Step 3: Grant Cloud Storage Permission to Use the Key

Cloud Storage uses a service account to read and write objects. That service account needs permission to use your KMS key. First, find the service account email.

```bash
# Get the Cloud Storage service account for your project
gcloud storage service-agent --project=my-project-id
```

This returns something like `service-123456789@gs-project-accounts.iam.gserviceaccount.com`. Now grant it the `cloudkms.cryptoKeyEncrypterDecrypter` role on your key.

```bash
# Grant the Cloud Storage service agent permission to encrypt/decrypt with the key
gcloud kms keys add-iam-policy-binding my-storage-key \
    --location=us-central1 \
    --keyring=my-storage-keyring \
    --member="serviceAccount:service-123456789@gs-project-accounts.iam.gserviceaccount.com" \
    --role="roles/cloudkms.cryptoKeyEncrypterDecrypter" \
    --project=my-project-id
```

This is the step people most commonly forget. Without this binding, Cloud Storage cannot access your key and all write operations to the bucket will fail.

## Step 4: Create a Bucket with CMEK

Now create your bucket and set the default encryption key.

```bash
# Create a bucket with a default CMEK encryption key
gcloud storage buckets create gs://my-cmek-bucket \
    --location=us-central1 \
    --default-encryption-key=projects/my-project-id/locations/us-central1/keyRings/my-storage-keyring/cryptoKeys/my-storage-key \
    --project=my-project-id
```

Every object written to this bucket will now be encrypted with your Cloud KMS key by default.

## Step 5: Verify the Configuration

Upload a test file and confirm it is encrypted with your CMEK key.

```bash
# Upload a test file
echo "test content" > /tmp/test-file.txt
gcloud storage cp /tmp/test-file.txt gs://my-cmek-bucket/

# Check the encryption metadata on the uploaded object
gcloud storage objects describe gs://my-cmek-bucket/test-file.txt \
    --format="value(kms_key)"
```

The output should show your Cloud KMS key resource name, confirming the object was encrypted with CMEK.

## Setting CMEK on an Existing Bucket

If you already have a bucket and want to add CMEK encryption, you can update it.

```bash
# Update an existing bucket to use CMEK as the default encryption
gcloud storage buckets update gs://my-existing-bucket \
    --default-encryption-key=projects/my-project-id/locations/us-central1/keyRings/my-storage-keyring/cryptoKeys/my-storage-key
```

Keep in mind that this only applies to new objects. Existing objects remain encrypted with whatever key they were originally encrypted with. If you need to re-encrypt existing objects, you have to rewrite them.

```bash
# Rewrite existing objects to encrypt them with the new CMEK key
gcloud storage objects update gs://my-existing-bucket/my-object \
    --encryption-key=projects/my-project-id/locations/us-central1/keyRings/my-storage-keyring/cryptoKeys/my-storage-key
```

## Using Terraform

If you manage your infrastructure with Terraform, here is how to set this up.

```hcl
# Define the KMS key ring
resource "google_kms_key_ring" "storage_keyring" {
  name     = "storage-keyring"
  location = "us-central1"
}

# Define the encryption key inside the key ring
resource "google_kms_crypto_key" "storage_key" {
  name            = "storage-encryption-key"
  key_ring        = google_kms_key_ring.storage_keyring.id
  rotation_period = "7776000s" # 90 days in seconds
}

# Look up the Cloud Storage service account
data "google_storage_project_service_account" "gcs_sa" {}

# Grant the service account access to use the KMS key
resource "google_kms_crypto_key_iam_member" "gcs_cmek" {
  crypto_key_id = google_kms_crypto_key.storage_key.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:${data.google_storage_project_service_account.gcs_sa.email_address}"
}

# Create the bucket with CMEK as default encryption
resource "google_storage_bucket" "cmek_bucket" {
  name     = "my-cmek-bucket"
  location = "us-central1"

  encryption {
    default_kms_key_name = google_kms_crypto_key.storage_key.id
  }

  depends_on = [google_kms_crypto_key_iam_member.gcs_cmek]
}
```

The `depends_on` block is important. Without it, Terraform might try to create the bucket before the IAM binding is in place, which will fail.

## Key Rotation and Its Impact

When Cloud KMS rotates your key, it creates a new key version. New objects get encrypted with the latest version, but old objects stay encrypted with the version that was current when they were written. Both versions remain active, so reads continue working.

If you want all objects encrypted with the latest key version, you need to rewrite them. For large buckets, consider using a Cloud Storage transfer job or a script that iterates over objects.

## What Happens When You Disable or Destroy a Key

This is the nuclear option. If you disable a key version, any object encrypted with that version becomes unreadable. If you destroy it, the data is permanently inaccessible after the scheduled destruction period (24 hours by default).

Before disabling or destroying keys, make sure no critical data depends on them. Cloud KMS has a scheduled destruction delay specifically to prevent accidental data loss.

## Common Pitfalls

- **Location mismatch**: Your key ring location must be compatible with your bucket location. A key in `us-central1` cannot encrypt a bucket in `europe-west1`.
- **Missing IAM binding**: The Cloud Storage service account must have `cryptoKeyEncrypterDecrypter` on the key. Without it, writes fail immediately.
- **Org policy conflicts**: Some organizations set constraints like `constraints/gcp.restrictNonCmekServices` which require CMEK on all storage buckets. Make sure your setup aligns with your org policies.
- **Key ring permanence**: Key rings cannot be deleted. Plan your naming convention before creating them.

## Monitoring CMEK Usage

You can monitor key usage through Cloud Audit Logs. Every time Cloud Storage uses your key to encrypt or decrypt an object, it generates a log entry.

```bash
# View recent Cloud KMS data access logs for your key
gcloud logging read 'resource.type="cloudkms_cryptokey" AND protoPayload.methodName="Encrypt"' \
    --limit=10 \
    --project=my-project-id
```

This helps you track which services are using your keys and how often.

## Wrapping Up

CMEK with Cloud KMS gives you full control over the encryption keys protecting your Cloud Storage data. The setup involves creating a key ring and key, granting the right permissions, and then pointing your bucket at the key. The process is straightforward, but pay close attention to locations and IAM bindings - those are where most issues come from. Once everything is in place, encryption happens transparently with no changes needed in your application code.
