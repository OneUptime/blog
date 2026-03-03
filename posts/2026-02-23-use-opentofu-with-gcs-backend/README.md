# How to Use OpenTofu with GCS Backend

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Google Cloud, GCS, State Management, Backend

Description: Learn how to configure Google Cloud Storage as a backend for OpenTofu state management, including bucket setup, authentication, state locking, encryption, and multi-project organization.

---

Google Cloud Storage (GCS) is the go-to backend for teams running infrastructure on Google Cloud Platform. The GCS backend in OpenTofu supports remote state storage with built-in locking, encryption, and versioning. This guide covers setting it up from scratch.

## Prerequisites

You need the Google Cloud CLI installed and a GCP project:

```bash
# Install gcloud CLI (if not already installed)
# https://cloud.google.com/sdk/docs/install

# Authenticate
gcloud auth login
gcloud auth application-default login

# Set your project
gcloud config set project my-project-id

# Verify
gcloud config list
```

## Creating the GCS Bucket

Create a bucket specifically for OpenTofu state:

```bash
# Set variables
PROJECT_ID="my-project-id"
BUCKET_NAME="${PROJECT_ID}-opentofu-state"
REGION="us-central1"

# Create the bucket
gcloud storage buckets create "gs://${BUCKET_NAME}" \
  --project="${PROJECT_ID}" \
  --location="${REGION}" \
  --uniform-bucket-level-access

# Enable versioning for state history
gcloud storage buckets update "gs://${BUCKET_NAME}" \
  --versioning

# Set a lifecycle rule to clean up old versions
cat > lifecycle.json << 'EOF'
{
  "rule": [
    {
      "action": {"type": "Delete"},
      "condition": {
        "numNewerVersions": 10,
        "isLive": false
      }
    }
  ]
}
EOF

gcloud storage buckets update "gs://${BUCKET_NAME}" \
  --lifecycle-file=lifecycle.json

rm lifecycle.json

echo "Bucket created: ${BUCKET_NAME}"
```

Or create it with OpenTofu (using local state initially):

```hcl
# backend-setup/main.tf
provider "google" {
  project = "my-project-id"
  region  = "us-central1"
}

resource "google_storage_bucket" "state" {
  name     = "${var.project_id}-opentofu-state"
  location = "US"
  project  = var.project_id

  # Prevent accidental deletion
  force_destroy = false

  # Enable versioning
  versioning {
    enabled = true
  }

  # Uniform bucket-level access (recommended)
  uniform_bucket_level_access = true

  # Lifecycle rule to manage old versions
  lifecycle_rule {
    condition {
      num_newer_versions = 10
      with_state         = "ARCHIVED"
    }
    action {
      type = "Delete"
    }
  }
}

variable "project_id" {
  type    = string
  default = "my-project-id"
}

output "bucket_name" {
  value = google_storage_bucket.state.name
}
```

## Configuring the GCS Backend

With the bucket ready, configure your project to use it:

```hcl
# backend.tf
terraform {
  backend "gcs" {
    bucket = "my-project-id-opentofu-state"
    prefix = "production/network"
  }
}
```

The `prefix` parameter organizes state files within the bucket. The actual state file is stored at `<prefix>/default.tfstate`.

```bash
# Initialize with the GCS backend
tofu init

# Verify access
tofu state list
```

## Authentication Methods

### Application Default Credentials (Recommended for Local Development)

```bash
# Login and set up application default credentials
gcloud auth application-default login

# OpenTofu automatically uses these credentials
tofu init
tofu plan
```

### Service Account Key File

For CI/CD environments:

```bash
# Create a service account
gcloud iam service-accounts create opentofu-state \
  --display-name="OpenTofu State Access"

# Grant storage permissions
gcloud storage buckets add-iam-policy-binding \
  "gs://my-project-id-opentofu-state" \
  --member="serviceAccount:opentofu-state@my-project-id.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

# Create and download a key
gcloud iam service-accounts keys create key.json \
  --iam-account="opentofu-state@my-project-id.iam.gserviceaccount.com"
```

```bash
# Set the credentials environment variable
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json"

# Or use GOOGLE_CREDENTIALS with the JSON content
export GOOGLE_CREDENTIALS=$(cat key.json)
```

### Workload Identity Federation

For GitHub Actions and other external CI systems:

```bash
# Create a workload identity pool
gcloud iam workload-identity-pools create "github" \
  --location="global" \
  --display-name="GitHub Actions"

# Create a provider
gcloud iam workload-identity-pools providers create-oidc "github-actions" \
  --location="global" \
  --workload-identity-pool="github" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository"

# Bind the service account
gcloud iam service-accounts add-iam-policy-binding \
  "opentofu-state@my-project-id.iam.gserviceaccount.com" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/myorg/myrepo"
```

### Impersonation

Use service account impersonation for better security:

```hcl
terraform {
  backend "gcs" {
    bucket                      = "my-project-id-opentofu-state"
    prefix                      = "production"
    impersonate_service_account = "opentofu-state@my-project-id.iam.gserviceaccount.com"
  }
}
```

## State Locking

The GCS backend uses Cloud Storage object locking. Locking is enabled automatically and does not require any additional resources:

```bash
# Locking happens automatically
tofu plan   # Acquires lock, plans, releases lock
tofu apply  # Acquires lock, applies, releases lock

# Force unlock if needed
tofu force-unlock LOCK_ID
```

## Organizing State with Prefixes

Use the `prefix` parameter to organize state by environment and component:

```hcl
# Production network
terraform {
  backend "gcs" {
    bucket = "my-project-id-opentofu-state"
    prefix = "production/network"
  }
}

# Production compute
terraform {
  backend "gcs" {
    bucket = "my-project-id-opentofu-state"
    prefix = "production/compute"
  }
}

# Staging
terraform {
  backend "gcs" {
    bucket = "my-project-id-opentofu-state"
    prefix = "staging/network"
  }
}
```

This creates a clean structure in the bucket:

```text
gs://my-project-id-opentofu-state/
  production/
    network/
      default.tfstate
    compute/
      default.tfstate
  staging/
    network/
      default.tfstate
```

## Using Customer-Managed Encryption Keys

For compliance requirements, encrypt state with your own KMS key:

```bash
# Create a KMS keyring and key
gcloud kms keyrings create "opentofu" \
  --location="us-central1"

gcloud kms keys create "state-encryption" \
  --location="us-central1" \
  --keyring="opentofu" \
  --purpose="encryption"

# Grant the storage service account access to the key
gcloud kms keys add-iam-policy-binding "state-encryption" \
  --location="us-central1" \
  --keyring="opentofu" \
  --member="serviceAccount:service-PROJECT_NUMBER@gs-project-accounts.iam.gserviceaccount.com" \
  --role="roles/cloudkms.cryptoKeyEncrypterDecrypter"
```

```hcl
terraform {
  backend "gcs" {
    bucket               = "my-project-id-opentofu-state"
    prefix               = "production"
    encryption_key       = ""  # For CSEK
    # Or use the default bucket encryption with CMEK
  }
}
```

Set the default encryption on the bucket:

```bash
gcloud storage buckets update "gs://my-project-id-opentofu-state" \
  --default-encryption-key="projects/my-project-id/locations/us-central1/keyRings/opentofu/cryptoKeys/state-encryption"
```

## Partial Backend Configuration

Avoid hardcoding values by using partial configuration:

```hcl
# backend.tf
terraform {
  backend "gcs" {}
}
```

```bash
# Pass configuration at init
tofu init \
  -backend-config="bucket=my-project-id-opentofu-state" \
  -backend-config="prefix=production/network"

# Or use a config file
cat > backend-prod.hcl << 'EOF'
bucket = "my-project-id-opentofu-state"
prefix = "production/network"
EOF

tofu init -backend-config=backend-prod.hcl
```

## Multi-Project Setup

For organizations with multiple GCP projects:

```hcl
# Central state bucket in a shared project
terraform {
  backend "gcs" {
    bucket = "shared-services-opentofu-state"
    prefix = "project-a/production"
  }
}

# Provider configured for the target project
provider "google" {
  project = "project-a"
  region  = "us-central1"
}
```

Grant cross-project access:

```bash
# Grant the project-a service account access to the shared bucket
gcloud storage buckets add-iam-policy-binding \
  "gs://shared-services-opentofu-state" \
  --member="serviceAccount:opentofu@project-a.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

## Recovering State from Versions

GCS versioning lets you recover previous state:

```bash
# List object versions
gcloud storage objects list "gs://my-project-id-opentofu-state/production/network/" \
  --all-versions

# Download a specific version
gcloud storage cp \
  "gs://my-project-id-opentofu-state/production/network/default.tfstate#GENERATION_NUMBER" \
  ./restored-state.json

# Push the restored state
tofu state push restored-state.json
```

## Best Practices

**Use uniform bucket-level access** instead of per-object ACLs. It simplifies access management and is required for some features.

**Enable audit logging** to track who accessed or modified state:

```bash
# Enable data access logging for the project
gcloud projects add-iam-audit-config my-project-id \
  --service="storage.googleapis.com" \
  --log-type="DATA_READ" \
  --log-type="DATA_WRITE"
```

**Use a dedicated GCP project for state storage** in enterprise environments. This isolates state access from workload permissions.

**Restrict who can modify state** by using fine-grained IAM roles:

```bash
# Read-only access for developers
gcloud storage buckets add-iam-policy-binding \
  "gs://my-project-id-opentofu-state" \
  --member="group:developers@myorg.com" \
  --role="roles/storage.objectViewer"

# Write access only for CI/CD
gcloud storage buckets add-iam-policy-binding \
  "gs://my-project-id-opentofu-state" \
  --member="serviceAccount:cicd@my-project-id.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

The GCS backend is reliable and low-maintenance. Combined with proper IAM controls and versioning, it provides a solid foundation for team-based infrastructure management on Google Cloud.

For more on the OpenTofu registry, see [How to Use OpenTofu Registry for Providers](https://oneuptime.com/blog/post/2026-02-23-use-opentofu-registry-for-providers/view).
