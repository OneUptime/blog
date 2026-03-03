# How to Call a Module from a GCS Bucket in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, GCP, Google Cloud Storage, Infrastructure as Code, DevOps

Description: Learn how to store and reference Terraform modules in Google Cloud Storage buckets, including packaging, uploading, authentication, and best practices for GCS-hosted modules.

---

If your organization runs on Google Cloud Platform, storing Terraform modules in Google Cloud Storage (GCS) is a natural choice. Terraform supports GCS as a module source out of the box. You package your module as a zip file, upload it to a GCS bucket, and reference it using the `gcs::` prefix. Google Cloud IAM handles access control, and GCS object versioning gives you an audit trail.

This guide walks through the entire workflow, from setting up the bucket to referencing modules in your Terraform configurations.

## How GCS Module Sources Work

Terraform downloads modules from GCS when you use the `gcs::` source prefix. It expects a zip archive containing the module's `.tf` files:

```hcl
# Basic GCS module source
module "network" {
  source = "gcs::https://www.googleapis.com/storage/v1/my-terraform-modules/network/v1.0.0.zip"

  project_id = "my-project"
  region     = "us-central1"
  network_name = "main-vpc"
}
```

When you run `terraform init`, Terraform authenticates with GCP, downloads the zip file, extracts it, and registers the module.

## Packaging Your Module

The module needs to be packaged as a zip file with the `.tf` files at the root level:

```bash
# Navigate to the module directory
cd modules/network

# Create the zip file - files must be at the root of the archive
zip -r /tmp/network-v1.0.0.zip *.tf

# If you have subdirectories (like templates/), include them
zip -r /tmp/network-v1.0.0.zip *.tf templates/

# Verify the structure
unzip -l /tmp/network-v1.0.0.zip
# Archive:  /tmp/network-v1.0.0.zip
#   Length      Date    Time    Name
# ---------  ---------- -----   ----
#      2345  2026-02-23 10:00   main.tf
#       890  2026-02-23 10:00   variables.tf
#       456  2026-02-23 10:00   outputs.tf
#       234  2026-02-23 10:00   versions.tf
```

## Setting Up the GCS Bucket

Create a GCS bucket to host your modules. Here is the Terraform for the bucket itself:

```hcl
# gcs-module-hosting/main.tf

# The bucket for storing Terraform modules
resource "google_storage_bucket" "modules" {
  name          = "myorg-terraform-modules"
  location      = "US"
  project       = var.project_id
  force_destroy = false

  # Enable versioning for audit trail
  versioning {
    enabled = true
  }

  # Uniform bucket-level access (recommended)
  uniform_bucket_level_access = true

  # Lifecycle rule to clean up old versions
  lifecycle_rule {
    condition {
      num_newer_versions = 5
      with_state         = "ARCHIVED"
    }
    action {
      type = "Delete"
    }
  }

  labels = {
    purpose    = "terraform-modules"
    managed_by = "terraform"
  }
}
```

Or create it with `gcloud`:

```bash
# Create the bucket
gcloud storage buckets create gs://myorg-terraform-modules \
  --location=US \
  --uniform-bucket-level-access \
  --project=my-project

# Enable versioning
gcloud storage buckets update gs://myorg-terraform-modules \
  --versioning
```

## Uploading Modules

Upload your packaged module using `gcloud` or `gsutil`:

```bash
# Upload using gcloud
gcloud storage cp /tmp/network-v1.0.0.zip gs://myorg-terraform-modules/network/v1.0.0.zip

# Upload a new version
gcloud storage cp /tmp/network-v1.1.0.zip gs://myorg-terraform-modules/network/v1.1.0.zip

# List available versions
gcloud storage ls gs://myorg-terraform-modules/network/
# gs://myorg-terraform-modules/network/v1.0.0.zip
# gs://myorg-terraform-modules/network/v1.1.0.zip
```

Organize your bucket with a clear structure:

```text
myorg-terraform-modules/
  network/
    v1.0.0.zip
    v1.1.0.zip
    v2.0.0.zip
  gke-cluster/
    v1.0.0.zip
    v1.0.1.zip
  cloud-sql/
    v1.0.0.zip
```

## Referencing GCS Modules

The GCS source URL follows this pattern:

```hcl
# Standard GCS source format
module "network" {
  source = "gcs::https://www.googleapis.com/storage/v1/myorg-terraform-modules/network/v1.0.0.zip"

  project_id   = var.project_id
  network_name = "production-vpc"
  region       = "us-central1"
}
```

The URL format is: `gcs::https://www.googleapis.com/storage/v1/BUCKET_NAME/OBJECT_PATH`

## Authentication

Terraform uses the standard Google Cloud credential chain to authenticate with GCS. Here are the common methods:

### Application Default Credentials

The most common method for local development:

```bash
# Log in with your Google account
gcloud auth application-default login

# Terraform will automatically use these credentials
terraform init
```

### Service Account Key File

For CI/CD pipelines or when you need a specific service account:

```bash
# Set the credentials environment variable
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"

# Terraform will use this service account
terraform init
```

### Workload Identity Federation

For CI/CD systems like GitHub Actions that support workload identity:

```bash
# In GitHub Actions, the google-github-actions/auth action sets this up
# Then Terraform automatically uses the federated credentials
```

### IAM Permissions

The identity running Terraform needs these permissions on the GCS bucket:

```hcl
# IAM binding for module access
resource "google_storage_bucket_iam_member" "module_reader" {
  bucket = google_storage_bucket.modules.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:terraform@my-project.iam.gserviceaccount.com"
}
```

The `roles/storage.objectViewer` role grants read access to objects in the bucket, which is all Terraform needs to download modules.

## Cross-Project Access

If the module bucket is in a different GCP project, grant IAM permissions to the service account that runs Terraform:

```hcl
# Grant access to a service account in a different project
resource "google_storage_bucket_iam_member" "cross_project" {
  bucket = google_storage_bucket.modules.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:terraform@other-project.iam.gserviceaccount.com"
}
```

## Automating Module Publishing

Create a script to automate the packaging and upload process:

```bash
#!/bin/bash
# publish-gcs-module.sh - Package and upload a Terraform module to GCS

MODULE_NAME=$1
VERSION=$2
MODULE_DIR="modules/${MODULE_NAME}"
BUCKET="myorg-terraform-modules"

# Validate inputs
if [ -z "$MODULE_NAME" ] || [ -z "$VERSION" ]; then
  echo "Usage: ./publish-gcs-module.sh <module-name> <version>"
  echo "Example: ./publish-gcs-module.sh network v1.2.0"
  exit 1
fi

if [ ! -d "$MODULE_DIR" ]; then
  echo "Error: Module directory not found: $MODULE_DIR"
  exit 1
fi

# Create temp directory for the zip
TEMP_DIR=$(mktemp -d)
ZIP_FILE="${TEMP_DIR}/${MODULE_NAME}-${VERSION}.zip"

# Package the module
echo "Packaging module ${MODULE_NAME}..."
cd "$MODULE_DIR"
zip -r "$ZIP_FILE" *.tf README.md 2>/dev/null
cd - > /dev/null

# Check if version already exists
if gcloud storage ls "gs://${BUCKET}/${MODULE_NAME}/${VERSION}.zip" 2>/dev/null; then
  echo "Warning: Version ${VERSION} already exists. Overwriting."
fi

# Upload to GCS
echo "Uploading to gs://${BUCKET}/${MODULE_NAME}/${VERSION}.zip..."
gcloud storage cp "$ZIP_FILE" "gs://${BUCKET}/${MODULE_NAME}/${VERSION}.zip"

# Clean up
rm -rf "$TEMP_DIR"

echo "Published ${MODULE_NAME} ${VERSION} successfully."
echo "Source: gcs::https://www.googleapis.com/storage/v1/${BUCKET}/${MODULE_NAME}/${VERSION}.zip"
```

## A Complete Working Example

Here is a full project using GCS-hosted modules:

```hcl
# versions.tf
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  backend "gcs" {
    bucket = "myorg-terraform-state"
    prefix = "prod/infrastructure"
  }
}

# main.tf
provider "google" {
  project = var.project_id
  region  = var.region
}

# Network module from GCS
module "network" {
  source = "gcs::https://www.googleapis.com/storage/v1/myorg-terraform-modules/network/v2.1.0.zip"

  project_id   = var.project_id
  network_name = "${var.environment}-vpc"
  region       = var.region

  subnets = [
    {
      name          = "app-subnet"
      ip_cidr_range = "10.0.1.0/24"
      region        = var.region
    },
    {
      name          = "data-subnet"
      ip_cidr_range = "10.0.2.0/24"
      region        = var.region
    },
  ]
}

# GKE cluster module from GCS
module "gke" {
  source = "gcs::https://www.googleapis.com/storage/v1/myorg-terraform-modules/gke-cluster/v1.5.0.zip"

  project_id   = var.project_id
  cluster_name = "${var.environment}-gke"
  region       = var.region
  network      = module.network.network_name
  subnetwork   = module.network.subnet_names[0]

  node_count    = var.environment == "prod" ? 3 : 1
  machine_type  = var.environment == "prod" ? "e2-standard-4" : "e2-medium"
}

# Cloud SQL module from GCS
module "database" {
  source = "gcs::https://www.googleapis.com/storage/v1/myorg-terraform-modules/cloud-sql/v1.2.0.zip"

  project_id    = var.project_id
  instance_name = "${var.environment}-postgres"
  region        = var.region
  database_version = "POSTGRES_15"
  tier          = var.environment == "prod" ? "db-custom-4-16384" : "db-f1-micro"

  network       = module.network.network_self_link
  enable_private_ip = true
}

# variables.tf
variable "project_id" {
  type = string
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "environment" {
  type    = string
  default = "dev"
}
```

## Updating Modules

When updating to a new version, change the version in the source URL and re-initialize:

```bash
# After changing v2.1.0 to v2.2.0 in the source URL
terraform init -upgrade

# Review the changes
terraform plan
```

## GCS vs Other Module Sources

GCS-hosted modules make sense when:
- Your infrastructure runs on GCP
- You want private module hosting without extra tooling
- Your CI/CD pipeline already has GCP credentials
- You need cross-project module sharing within your GCP organization

The trade-off compared to the Terraform Registry is that you lose version constraint syntax (`~>`, `>=`) and automatic documentation generation. Compared to Git, you lose code review integration for module changes but gain simpler distribution.

## Summary

GCS provides a straightforward way to host private Terraform modules for GCP-focused organizations. Package modules as zip files, upload to a GCS bucket with a version-based path, and reference them with the `gcs::` prefix. Authentication flows through the standard Google Cloud credential chain, and IAM policies control who can download modules. With a simple publish script and a consistent naming convention, you have a module distribution system that requires no additional infrastructure beyond what GCP already provides.

For AWS-based module hosting, see [How to Call a Module from an S3 Bucket in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-call-a-module-from-an-s3-bucket-in-terraform/view). For public module discovery, check out [How to Call a Module from the Terraform Registry](https://oneuptime.com/blog/post/2026-02-23-how-to-call-a-module-from-the-terraform-registry/view).
