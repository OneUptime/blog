# How to Implement Terraform State Management for GCP Using a Cloud Storage Backend with State Locking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Terraform, Cloud Storage, State Management, Infrastructure as Code

Description: Set up Terraform state management on GCP using a Cloud Storage backend with state locking to prevent concurrent modifications and ensure safe collaboration across teams.

---

Terraform state is the single most important file in your infrastructure setup. It maps your Terraform configuration to the real-world resources that exist in GCP. Lose it or corrupt it, and you are in for a bad day. Store it locally on your laptop, and your team cannot collaborate. That is why you need a remote backend.

Google Cloud Storage makes an excellent Terraform backend. It is durable, versioned, and when paired with state locking, it prevents two people from running `terraform apply` at the same time and stomping on each other's changes.

Let me walk you through setting this up properly.

## Why State Locking Matters

Without state locking, here is what can happen:

1. Developer A runs `terraform plan` and sees changes to make
2. Developer B runs `terraform apply` and modifies infrastructure
3. Developer A runs `terraform apply` based on the stale plan
4. Resources get created twice or configuration conflicts arise
5. The state file becomes inconsistent with reality

State locking prevents step 3. When Developer B starts their apply, a lock is acquired. Developer A's apply will fail immediately with a message saying the state is locked.

GCS does not have native locking like DynamoDB for AWS backends. Instead, Terraform uses a lock file stored alongside the state file in the bucket. This works reliably for most team sizes.

## Step 1: Create the State Bucket

The state bucket needs to be created before Terraform can use it. This is a chicken-and-egg problem - you cannot use Terraform to create the bucket that Terraform needs. I recommend creating it with gcloud or a simple bootstrap script.

```bash
# Create the state bucket with versioning enabled
# Versioning is critical - it lets you recover previous state versions
gcloud storage buckets create gs://my-org-terraform-state \
  --project=my-terraform-admin \
  --location=US \
  --uniform-bucket-level-access

# Enable versioning so you can recover from state corruption
gcloud storage buckets update gs://my-org-terraform-state \
  --versioning

# Set a lifecycle policy to clean up old versions after 90 days
# This prevents the bucket from growing indefinitely
cat > /tmp/lifecycle.json << 'EOF'
{
  "lifecycle": {
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
}
EOF

gcloud storage buckets update gs://my-org-terraform-state \
  --lifecycle-file=/tmp/lifecycle.json
```

The lifecycle policy keeps the last 10 versions of each state file. This gives you enough history to recover from mistakes without the bucket growing forever.

## Step 2: Configure the Backend in Terraform

With the bucket created, configure Terraform to use it:

```hcl
# backend.tf - Remote state configuration using GCS
# This block tells Terraform where to store and lock state

terraform {
  backend "gcs" {
    bucket = "my-org-terraform-state"
    prefix = "environments/prod/networking"
  }
}
```

The `prefix` is important. It determines the path within the bucket where the state file is stored. Use a consistent naming scheme that mirrors your infrastructure layout. The state file will be stored at `gs://my-org-terraform-state/environments/prod/networking/default.tfstate`.

## Step 3: Set Up Proper IAM Permissions

Not everyone should have the same level of access to the state bucket. State files contain sensitive information - connection strings, IP addresses, and sometimes secrets.

```hcl
# iam.tf - Bucket-level IAM for the state bucket
# Different roles for CI/CD, developers, and administrators

# CI/CD service account needs full read/write for apply operations
resource "google_storage_bucket_iam_member" "cicd_admin" {
  bucket = "my-org-terraform-state"
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:terraform-cicd@my-terraform-admin.iam.gserviceaccount.com"
}

# Developers need read access for plan operations
resource "google_storage_bucket_iam_member" "dev_viewer" {
  bucket = "my-org-terraform-state"
  role   = "roles/storage.objectViewer"
  member = "group:developers@myorg.com"
}

# Only admins can delete state files or modify bucket settings
resource "google_storage_bucket_iam_member" "admin_full" {
  bucket = "my-org-terraform-state"
  role   = "roles/storage.admin"
  member = "group:infra-admins@myorg.com"
}
```

## Step 4: Enable Encryption

By default, GCS encrypts data at rest with Google-managed keys. For state files, you may want to use Customer-Managed Encryption Keys (CMEK) for additional control:

```hcl
# kms.tf - Customer-managed encryption for the state bucket

# Create a KMS key ring and key for state encryption
resource "google_kms_key_ring" "terraform" {
  project  = "my-terraform-admin"
  name     = "terraform-state-keyring"
  location = "us"
}

resource "google_kms_crypto_key" "terraform_state" {
  name     = "terraform-state-key"
  key_ring = google_kms_key_ring.terraform.id

  # Rotate the key automatically every 90 days
  rotation_period = "7776000s"

  lifecycle {
    prevent_destroy = true
  }
}
```

Then reference the key in your backend configuration:

```hcl
terraform {
  backend "gcs" {
    bucket               = "my-org-terraform-state"
    prefix               = "environments/prod/networking"
    encryption_key       = ""  # Set via GOOGLE_ENCRYPTION_KEY env var
  }
}
```

In practice, most teams set the encryption key through an environment variable rather than hardcoding it.

## Step 5: Initialize the Backend

When switching from local state to the GCS backend, run the init command with migration:

```bash
# Initialize and migrate existing state to the GCS backend
terraform init -migrate-state

# Terraform will prompt you to confirm the migration
# After migration, verify the state was uploaded
gcloud storage ls gs://my-org-terraform-state/environments/prod/networking/
```

## Working with State Locking in Practice

Here is what state locking looks like when it works:

```bash
# Developer A starts an apply
$ terraform apply
Acquiring state lock. This may take a few moments...
# Lock acquired, apply proceeds

# Developer B tries to apply at the same time
$ terraform apply
Acquiring state lock. This may take a few moments...

Error: Error acquiring the state lock

Error message: writing "gs://my-org-terraform-state/environments/prod/
networking/default.tflock" failed: googleapi: Error 412:
At least one of the pre-conditions you specified did not hold.

Lock Info:
  ID:        1708123456789
  Path:      environments/prod/networking/default.tfstate
  Operation: OperationTypeApply
  Who:       developer-a@laptop
  Created:   2026-02-17 10:30:00 UTC
```

If a lock gets stuck (for example, someone's laptop crashes mid-apply), you can force unlock it:

```bash
# Only use this when you are sure no apply is actually running
terraform force-unlock LOCK_ID
```

## Organizing State Files for Multiple Environments

A good state organization scheme separates environments and components:

```
gs://my-org-terraform-state/
  environments/
    dev/
      networking/default.tfstate
      gke/default.tfstate
      databases/default.tfstate
    staging/
      networking/default.tfstate
      gke/default.tfstate
      databases/default.tfstate
    prod/
      networking/default.tfstate
      gke/default.tfstate
      databases/default.tfstate
  shared/
    iam/default.tfstate
    dns/default.tfstate
```

This structure keeps blast radius small. A bad apply to the networking state does not affect the database state. Each component can be planned and applied independently.

## Accessing State from Other Configurations

Sometimes one Terraform configuration needs to read another's state. Use `terraform_remote_state` for this:

```hcl
# Read the networking state to get VPC and subnet IDs
data "terraform_remote_state" "networking" {
  backend = "gcs"

  config = {
    bucket = "my-org-terraform-state"
    prefix = "environments/prod/networking"
  }
}

# Use the outputs from the networking state
resource "google_container_cluster" "primary" {
  network    = data.terraform_remote_state.networking.outputs.network_self_link
  subnetwork = data.terraform_remote_state.networking.outputs.subnet_self_link
}
```

## Backup and Recovery

Even with versioning, you should have a backup strategy:

```bash
# Download the current state as a backup before risky operations
terraform state pull > backup-$(date +%Y%m%d-%H%M%S).tfstate

# List previous versions of the state file
gcloud storage ls -a gs://my-org-terraform-state/environments/prod/networking/

# Restore a previous version if needed
gcloud storage cp \
  gs://my-org-terraform-state/environments/prod/networking/default.tfstate#GENERATION_NUMBER \
  gs://my-org-terraform-state/environments/prod/networking/default.tfstate
```

## Summary

Setting up Terraform state management with GCS is straightforward but the details matter. Enable versioning from day one, use a consistent prefix scheme, set up proper IAM controls, and consider CMEK encryption for sensitive environments. State locking prevents the most common collaboration issues, and the GCS backend's reliability means you rarely have to think about the state infrastructure itself - it just works.
