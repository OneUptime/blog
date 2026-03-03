# How to Configure GCS Backend for Terraform State

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Google Cloud, GCS, State Management, Infrastructure as Code

Description: Complete guide to configuring Google Cloud Storage as a Terraform state backend, covering bucket setup, authentication, state locking, encryption, and best practices.

---

Google Cloud Storage (GCS) is Google Cloud's object storage service, and it works well as a backend for Terraform state. It supports state locking natively, offers multiple encryption options, and integrates with Google Cloud's IAM for access control. If you are running infrastructure on GCP, this is the natural choice for your state backend.

## Creating the GCS Bucket

Before configuring the backend, create a bucket to hold your state files. You can do this with the `gcloud` CLI:

```bash
# Set your project ID
PROJECT_ID="my-gcp-project"

# Create a bucket with versioning enabled
# The bucket name must be globally unique
gsutil mb -p "$PROJECT_ID" -l us-central1 gs://my-terraform-state-bucket/

# Enable versioning so you can recover previous state versions
gsutil versioning set on gs://my-terraform-state-bucket/

# Verify versioning is enabled
gsutil versioning get gs://my-terraform-state-bucket/
```

Versioning is important because it lets you recover previous state file versions if something goes wrong. GCS stores every version of the object, so you can roll back to a known good state.

## Basic Backend Configuration

Here is the minimal configuration to use GCS as your Terraform backend:

```hcl
# backend.tf
terraform {
  backend "gcs" {
    # The GCS bucket name
    bucket = "my-terraform-state-bucket"

    # The path prefix within the bucket
    prefix = "terraform/state"
  }
}
```

The `prefix` parameter determines the directory structure within the bucket. Terraform stores the state as `<prefix>/default.tfstate` by default. With the configuration above, your state file will be at `terraform/state/default.tfstate`.

After adding this configuration, initialize Terraform:

```bash
# Initialize the GCS backend
terraform init

# If migrating from local state, Terraform will ask
# if you want to copy existing state to the new backend
```

## Authentication

The GCS backend needs credentials to access your bucket. There are several ways to provide them.

### Application Default Credentials

The simplest approach is to use Application Default Credentials (ADC). If you have authenticated with `gcloud`, Terraform uses those credentials automatically:

```bash
# Authenticate with gcloud
gcloud auth application-default login

# Terraform will use these credentials for the backend
terraform init
```

### Service Account Key File

For CI/CD pipelines, you typically use a service account key file:

```hcl
terraform {
  backend "gcs" {
    bucket      = "my-terraform-state-bucket"
    prefix      = "terraform/state"

    # Path to the service account key file
    credentials = "service-account-key.json"
  }
}
```

You can also set the credentials via environment variable:

```bash
# Point to the service account key file
export GOOGLE_CREDENTIALS="/path/to/service-account-key.json"

# Or set the content directly
export GOOGLE_CREDENTIALS=$(cat /path/to/service-account-key.json)

terraform init
```

### Workload Identity Federation

For production CI/CD pipelines, Workload Identity Federation is more secure because it avoids long-lived service account keys:

```bash
# Configure workload identity in your CI/CD environment
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/workload-identity-config.json"

terraform init
```

### Service Account Impersonation

You can also impersonate a service account:

```hcl
terraform {
  backend "gcs" {
    bucket                      = "my-terraform-state-bucket"
    prefix                      = "terraform/state"

    # Impersonate a service account for accessing the bucket
    impersonate_service_account = "terraform@my-project.iam.gserviceaccount.com"
  }
}
```

## State Locking

GCS supports state locking natively. No additional configuration is needed. When Terraform starts an operation that writes state, it creates a lock file in the same bucket:

```text
gs://my-terraform-state-bucket/terraform/state/default.tflock
```

This lock prevents concurrent modifications. If you need to force-unlock (for example, if a process crashed without releasing the lock):

```bash
# Force-unlock using the lock ID from the error message
terraform force-unlock LOCK_ID
```

## Encryption Options

GCS provides several encryption approaches for your state data.

### Google-Managed Encryption (Default)

By default, all data in GCS is encrypted with Google-managed keys. No configuration needed.

### Customer-Managed Encryption Keys (CMEK)

Use a Cloud KMS key to encrypt your state:

```bash
# Create a keyring and key
gcloud kms keyrings create terraform-state \
  --location us-central1 \
  --project "$PROJECT_ID"

gcloud kms keys create terraform-state-key \
  --keyring terraform-state \
  --location us-central1 \
  --purpose encryption \
  --project "$PROJECT_ID"

# Grant the storage service account access to the key
SERVICE_ACCOUNT="service-$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')@gs-project-accounts.iam.gserviceaccount.com"

gcloud kms keys add-iam-policy-binding terraform-state-key \
  --keyring terraform-state \
  --location us-central1 \
  --member "serviceAccount:$SERVICE_ACCOUNT" \
  --role roles/cloudkms.cryptoKeyEncrypterDecrypter
```

Then configure the backend to use the KMS key:

```hcl
terraform {
  backend "gcs" {
    bucket               = "my-terraform-state-bucket"
    prefix               = "terraform/state"

    # Use a Cloud KMS key for encryption
    kms_encryption_key   = "projects/my-gcp-project/locations/us-central1/keyRings/terraform-state/cryptoKeys/terraform-state-key"
  }
}
```

### Customer-Supplied Encryption Keys (CSEK)

For full control over the encryption key:

```hcl
terraform {
  backend "gcs" {
    bucket         = "my-terraform-state-bucket"
    prefix         = "terraform/state"

    # Base64-encoded 256-bit AES encryption key
    encryption_key = "base64-encoded-32-byte-key"
  }
}
```

Pass the key via environment variable instead of hardcoding it:

```bash
# Set the encryption key through an environment variable
export GOOGLE_ENCRYPTION_KEY="base64-encoded-32-byte-key"

terraform init
```

## IAM Permissions

The identity accessing the bucket needs specific permissions. Here is a minimal IAM configuration:

```bash
# Create a service account for Terraform
gcloud iam service-accounts create terraform \
  --display-name "Terraform State" \
  --project "$PROJECT_ID"

# Grant Storage Object Admin on the specific bucket
gsutil iam ch \
  serviceAccount:terraform@${PROJECT_ID}.iam.gserviceaccount.com:objectAdmin \
  gs://my-terraform-state-bucket

# Grant Storage Legacy Bucket Reader for listing
gsutil iam ch \
  serviceAccount:terraform@${PROJECT_ID}.iam.gserviceaccount.com:legacyBucketReader \
  gs://my-terraform-state-bucket
```

The required roles are:
- `storage.objects.create` - To write state
- `storage.objects.get` - To read state
- `storage.objects.delete` - To delete lock files
- `storage.objects.list` - To list state and lock files
- `storage.buckets.get` - To access bucket metadata

## Organizing Multiple Projects

Use the prefix to organize state for multiple projects or environments:

```hcl
# Networking state
terraform {
  backend "gcs" {
    bucket = "my-terraform-state-bucket"
    prefix = "prod/networking"
  }
}

# Application state
terraform {
  backend "gcs" {
    bucket = "my-terraform-state-bucket"
    prefix = "prod/application"
  }
}
```

Or use workspaces. With GCS, each workspace gets its own state file:

```text
gs://my-terraform-state-bucket/terraform/state/default.tfstate
gs://my-terraform-state-bucket/terraform/state/staging.tfstate
gs://my-terraform-state-bucket/terraform/state/production.tfstate
```

## Lifecycle Rules

Set up lifecycle rules to manage old state versions and reduce storage costs:

```bash
# Create a lifecycle configuration file
cat > lifecycle.json << 'EOF'
{
  "rule": [
    {
      "action": {
        "type": "Delete"
      },
      "condition": {
        "numNewerVersions": 30,
        "isLive": false
      }
    }
  ]
}
EOF

# Apply the lifecycle rule
gsutil lifecycle set lifecycle.json gs://my-terraform-state-bucket/
```

This keeps the 30 most recent versions and deletes older ones.

## Troubleshooting

### 403 Forbidden Errors

If you get permission errors, verify your credentials and IAM bindings:

```bash
# Check current authenticated identity
gcloud auth list

# Verify bucket permissions
gsutil iam get gs://my-terraform-state-bucket/

# Test access directly
gsutil ls gs://my-terraform-state-bucket/
```

### Lock Stuck After Crash

If Terraform crashes during an operation, the lock file might remain:

```bash
# Check for lock files
gsutil ls gs://my-terraform-state-bucket/terraform/state/*.tflock

# Use terraform force-unlock with the lock ID
terraform force-unlock LOCK_ID_FROM_ERROR_MESSAGE
```

## Summary

GCS is an excellent backend for Terraform state when working with Google Cloud infrastructure. It handles state locking automatically, offers multiple layers of encryption, and integrates seamlessly with GCP's IAM. The setup is straightforward - create a versioned bucket, configure the backend block, and initialize. For teams working exclusively in GCP, it provides everything you need for secure, collaborative state management. See also our guide on [Terraform state file encryption](https://oneuptime.com/blog/post/2026-02-23-terraform-state-file-encryption/view) for more on protecting sensitive state data.
