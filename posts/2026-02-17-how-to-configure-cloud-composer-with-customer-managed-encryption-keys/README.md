# How to Configure Cloud Composer with Customer-Managed Encryption Keys

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Composer, CMEK, Encryption, Security

Description: Set up Cloud Composer environments with Customer-Managed Encryption Keys (CMEK) using Cloud KMS for complete control over data encryption.

---

By default, Google Cloud encrypts all data at rest using Google-managed keys. For most workloads, that is sufficient. But some organizations need tighter control over their encryption keys - for compliance reasons, for the ability to revoke access by disabling a key, or simply for defense-in-depth. Customer-Managed Encryption Keys (CMEK) give you that control.

When you configure Cloud Composer with CMEK, all the data your Airflow environment stores - the metadata database, DAG files, logs, and underlying storage - is encrypted with a key that you own and manage in Cloud KMS. This article covers the complete setup process.

## What Gets Encrypted with CMEK

A Cloud Composer environment has several data stores, and CMEK protects all of them:

- **Cloud SQL metadata database** - Airflow's metadata (DAG runs, task instances, connections, variables)
- **Cloud Storage bucket** - DAG files, plugins, data, and logs
- **Persistent disks** - Storage used by the underlying compute infrastructure
- **Pub/Sub topics** - Used internally for task scheduling and communication

With CMEK, a single KMS key encrypts all these components. If you disable or destroy the key, the entire environment becomes inaccessible.

## Step 1: Create a Cloud KMS Keyring and Key

First, create a keyring and an encryption key in Cloud KMS:

```bash
# Create a KMS keyring in the same region as your Composer environment
gcloud kms keyrings create composer-keyring \
  --location=us-central1

# Create an encryption key within the keyring
gcloud kms keys create composer-cmek-key \
  --keyring=composer-keyring \
  --location=us-central1 \
  --purpose=encryption \
  --rotation-period=90d \
  --next-rotation-time=$(date -u -d "+90 days" +%Y-%m-%dT%H:%M:%SZ)
```

The `--rotation-period` flag sets up automatic key rotation. Google recommends rotating keys at least every 90 days. When a key is rotated, existing data remains encrypted with the old key version, but new data uses the new version.

Verify the key was created:

```bash
# List keys in the keyring
gcloud kms keys list \
  --keyring=composer-keyring \
  --location=us-central1
```

## Step 2: Grant Encryption Permissions to Service Accounts

Several Google-managed service accounts need permission to use your KMS key. These are the service accounts that Composer's internal components use to encrypt and decrypt data.

First, identify the service accounts that need access:

```bash
# Get your project number
PROJECT_NUMBER=$(gcloud projects describe my-project --format="value(projectNumber)")

# The service accounts that need encrypter/decrypter access:
# 1. Cloud Composer Service Agent
# 2. Compute Engine Service Agent
# 3. Cloud Storage Service Agent
# 4. Artifact Registry Service Agent (for container images)
```

Grant the `cloudkms.cryptoKeyEncrypterDecrypter` role to each service account:

```bash
PROJECT_NUMBER=$(gcloud projects describe my-project --format="value(projectNumber)")
KEY_PATH="projects/my-project/locations/us-central1/keyRings/composer-keyring/cryptoKeys/composer-cmek-key"

# Grant access to the Composer Service Agent
gcloud kms keys add-iam-policy-binding composer-cmek-key \
  --keyring=composer-keyring \
  --location=us-central1 \
  --member="serviceAccount:service-${PROJECT_NUMBER}@cloudcomposer-accounts.iam.gserviceaccount.com" \
  --role="roles/cloudkms.cryptoKeyEncrypterDecrypter"

# Grant access to the Compute Engine Service Agent
gcloud kms keys add-iam-policy-binding composer-cmek-key \
  --keyring=composer-keyring \
  --location=us-central1 \
  --member="serviceAccount:service-${PROJECT_NUMBER}@compute-system.iam.gserviceaccount.com" \
  --role="roles/cloudkms.cryptoKeyEncrypterDecrypter"

# Grant access to the Cloud Storage Service Agent
# First, get the GCS service agent email
GCS_SA=$(gsutil kms serviceaccount -p my-project)

gcloud kms keys add-iam-policy-binding composer-cmek-key \
  --keyring=composer-keyring \
  --location=us-central1 \
  --member="serviceAccount:${GCS_SA}" \
  --role="roles/cloudkms.cryptoKeyEncrypterDecrypter"

# Grant access to the Artifact Registry Service Agent
gcloud kms keys add-iam-policy-binding composer-cmek-key \
  --keyring=composer-keyring \
  --location=us-central1 \
  --member="serviceAccount:service-${PROJECT_NUMBER}@gcp-sa-artifactregistry.iam.gserviceaccount.com" \
  --role="roles/cloudkms.cryptoKeyEncrypterDecrypter"

# Grant access to the Pub/Sub Service Agent
gcloud kms keys add-iam-policy-binding composer-cmek-key \
  --keyring=composer-keyring \
  --location=us-central1 \
  --member="serviceAccount:service-${PROJECT_NUMBER}@gcp-sa-pubsub.iam.gserviceaccount.com" \
  --role="roles/cloudkms.cryptoKeyEncrypterDecrypter"
```

This is the step where most CMEK setups fail. If any service account is missing the permission, environment creation will fail with a cryptic error. Double-check every grant.

## Step 3: Create the CMEK-Encrypted Composer Environment

Now create the Composer environment with your CMEK key:

```bash
# Create a Cloud Composer environment with CMEK encryption
gcloud composer environments create cmek-composer \
  --location=us-central1 \
  --image-version=composer-3-airflow-2.9.3 \
  --environment-size=medium \
  --kms-key=projects/my-project/locations/us-central1/keyRings/composer-keyring/cryptoKeys/composer-cmek-key
```

For a private IP environment with CMEK:

```bash
# Create a private IP Composer environment with CMEK
gcloud composer environments create cmek-private-composer \
  --location=us-central1 \
  --image-version=composer-3-airflow-2.9.3 \
  --environment-size=medium \
  --network=my-vpc \
  --subnetwork=my-subnet \
  --enable-private-environment \
  --kms-key=projects/my-project/locations/us-central1/keyRings/composer-keyring/cryptoKeys/composer-cmek-key
```

The environment creation takes longer with CMEK because each component (database, storage, disks) needs to be individually configured with the encryption key.

## Step 4: Verify CMEK Configuration

After the environment is created, verify that CMEK is properly configured:

```bash
# Check the environment's encryption configuration
gcloud composer environments describe cmek-composer \
  --location=us-central1 \
  --format="yaml(config.encryptionConfig)"
```

The output should show your KMS key path.

Also verify the underlying storage bucket is CMEK-encrypted:

```bash
# Get the environment's storage bucket
BUCKET=$(gcloud composer environments describe cmek-composer \
  --location=us-central1 \
  --format="value(config.dagGcsPrefix)" | cut -d'/' -f1-3)

# Check the bucket's encryption configuration
gsutil kms get ${BUCKET}
```

## Step 5: Set Up Key Monitoring and Alerting

Since your Composer environment depends on the KMS key being available, you should monitor key usage and set up alerts:

```bash
# Create an alerting policy for KMS key operations
gcloud monitoring policies create --policy-from-file=kms-alert-policy.yaml
```

Here is a monitoring approach using Cloud Logging:

```bash
# Create a log-based metric for KMS key usage
gcloud logging metrics create cmek_key_usage \
  --description="Track CMEK key usage for Composer" \
  --log-filter='resource.type="cloudkms_cryptokey" AND resource.labels.key_ring_id="composer-keyring"'
```

## Step 6: Key Rotation

Automatic key rotation is already configured from Step 1, but you can also manually rotate when needed:

```bash
# Manually rotate the encryption key
gcloud kms keys versions create \
  --key=composer-cmek-key \
  --keyring=composer-keyring \
  --location=us-central1

# Check all key versions
gcloud kms keys versions list \
  --key=composer-cmek-key \
  --keyring=composer-keyring \
  --location=us-central1
```

When a key is rotated, existing data stays encrypted with the old version. New data is encrypted with the new version. Both versions must remain enabled for the environment to function.

## Step 7: Understand Key Lifecycle Implications

Be aware of what happens when you change the key state:

**Disabling a key version:**
- Data encrypted with that version becomes temporarily inaccessible
- Re-enabling the version restores access
- If the primary version is disabled, the Composer environment will stop working

**Destroying a key version:**
- There is a 24-hour (default) destruction schedule before the version is actually destroyed
- Once destroyed, data encrypted with that version is permanently lost
- This is irreversible

**Disabling all key versions:**
- The entire Composer environment becomes non-functional
- The metadata database, DAGs, logs, and all storage become inaccessible
- This is essentially a "kill switch" for the environment

```bash
# Disable a specific key version (use with extreme caution)
gcloud kms keys versions disable 1 \
  --key=composer-cmek-key \
  --keyring=composer-keyring \
  --location=us-central1

# Re-enable a disabled key version
gcloud kms keys versions enable 1 \
  --key=composer-cmek-key \
  --keyring=composer-keyring \
  --location=us-central1
```

## Troubleshooting CMEK Issues

**Environment creation fails with permission denied:**
- Review every service account grant from Step 2
- Make sure you granted permissions to the correct project number
- The Cloud Composer Service Agent might not exist until you first enable the Composer API

**Environment becomes unhealthy after key rotation:**
- Verify that both old and new key versions are in the `ENABLED` state
- Check Cloud Logging for KMS-related errors

**Cannot access DAGs or logs:**
- Verify the KMS key is enabled and accessible
- Check that the Cloud Storage service agent still has permissions on the key

## Wrapping Up

CMEK for Cloud Composer gives you full ownership of the encryption keys protecting your Airflow environment. The setup requires careful attention to IAM permissions across multiple service accounts, but once configured, it is transparent to your day-to-day operations. Your DAGs, connections, variables, and logs are all encrypted with a key you control. This is essential for organizations that need to demonstrate encryption key ownership for compliance or that want the ability to cryptographically shred an environment by destroying the key.
