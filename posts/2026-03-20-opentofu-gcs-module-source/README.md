# Using GCS as a Module Source in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, IaC, Module, GCS, GCP

Description: Learn how to use Google Cloud Storage as a module source in OpenTofu for distributing modules within GCP environments.

Google Cloud Storage (GCS) provides a natural module distribution mechanism for GCP-centric organizations. OpenTofu can download module archives from GCS using standard Google Cloud authentication.

## GCS Source Syntax

```hcl
module "gke" {
  source = "gcs::https://www.googleapis.com/storage/v1/my-modules/gke-v1.5.0.zip"

  project     = var.gcp_project
  cluster_name = "production"
  region       = "us-central1"
}
```

## Alternative URL Format

```hcl
# Tar.gz archives and nested object paths are also supported

module "gke" {
  source = "gcs::https://www.googleapis.com/storage/v1/my-modules/modules/gke-v1.5.0.tar.gz"
}
```

## Authentication

```bash
# Application Default Credentials (recommended)
gcloud auth application-default login

# Service account key file
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"

# On GCE/GKE - uses instance/workload identity automatically
```

## GCS Bucket Setup

```hcl
resource "google_storage_bucket" "modules" {
  name          = "my-terraform-modules"
  location      = "US"
  force_destroy = false

  versioning {
    enabled = true
  }

  uniform_bucket_level_access = true
}

resource "google_storage_bucket_iam_member" "ci_reader" {
  bucket = google_storage_bucket.modules.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:terraform@my-project.iam.gserviceaccount.com"
}
```

## Publishing Modules

```bash
#!/bin/bash
MODULE="gke"
VERSION="v1.5.0"
BUCKET="my-terraform-modules"

tar -czf "${MODULE}-${VERSION}.tar.gz" "./modules/${MODULE}/"
gsutil cp "${MODULE}-${VERSION}.tar.gz" "gs://${BUCKET}/modules/${MODULE}-${VERSION}.tar.gz"
echo "Published ${MODULE} ${VERSION}"
```

## Conclusion

GCS module sources integrate naturally with GCP-based infrastructure. They use standard Google Cloud authentication (ADC, service accounts, workload identity) and work seamlessly with IAM-controlled buckets. For GCP-centric teams, GCS is the natural choice for private module distribution.
