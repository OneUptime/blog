# How to Use GCS Bucket Module Sources in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Module, GCP

Description: Learn how to use Google Cloud Storage bucket URLs as module sources in OpenTofu to distribute private modules within GCP environments.

## Introduction

OpenTofu can fetch modules directly from Google Cloud Storage (GCS) buckets using the `gcs::` prefix. This approach is well-suited for GCP-native teams that want IAM-controlled module distribution without operating a separate module registry.

## Syntax

```hcl
module "name" {
  source = "gcs::https://www.googleapis.com/storage/v1/BUCKET/path/to/module.zip"
}
```

## Basic GCS Module Source

```hcl
# Fetch a versioned module from GCS

module "vpc" {
  source = "gcs::https://www.googleapis.com/storage/v1/acme-terraform-modules/vpc/v2.0.0.zip"

  project    = var.gcp_project
  region     = var.gcp_region
  cidr_block = "10.0.0.0/16"
}
```

## Pointing to a Subdirectory

Use the `//` separator to reference a subdirectory inside an archive:

```hcl
module "gke" {
  source = "gcs::https://www.googleapis.com/storage/v1/acme-modules/gcp-infra-v3.zip//gke"

  project      = var.gcp_project
  cluster_name = "prod-cluster"
}
```

## Authentication

OpenTofu uses Application Default Credentials (ADC) for GCS module sources:

```bash
# Option 1: Application Default Credentials (recommended for local dev)
gcloud auth application-default login

# Option 2: Service account key file
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"

# Option 3: Workload Identity (when running on GKE/Cloud Build - no credentials needed)
```

## IAM Policy for Module Access

Grant read access to the GCS bucket for the service account running OpenTofu:

```bash
# Grant storage object viewer to the Terraform service account
gcloud storage buckets add-iam-policy-binding gs://acme-terraform-modules \
  --member="serviceAccount:terraform@my-project.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"
```

## Organizing Modules in GCS

```text
gs://acme-terraform-modules/
├── vpc/
│   ├── v1.0.0.zip
│   └── v2.0.0.zip
├── gke/
│   └── v1.3.0.zip
└── cloudsql/
    └── v1.0.0.zip
```

```hcl
# Multiple modules from the same bucket
module "networking" {
  source = "gcs::https://www.googleapis.com/storage/v1/acme-terraform-modules/vpc/v2.0.0.zip"
  project = var.gcp_project
}

module "database" {
  source = "gcs::https://www.googleapis.com/storage/v1/acme-terraform-modules/cloudsql/v1.0.0.zip"
  vpc_id = module.networking.vpc_id
}
```

## Uploading Modules to GCS

```bash
# Package and upload a module version
zip -r gke-v1.3.0.zip ./modules/gke/
gsutil cp gke-v1.3.0.zip gs://acme-terraform-modules/gke/v1.3.0.zip

# List uploaded versions
gsutil ls gs://acme-terraform-modules/gke/
```

## Using with Cloud Build

```yaml
# cloudbuild.yaml
steps:
  - name: 'ghcr.io/opentofu/opentofu:latest'
    entrypoint: tofu
    args: ['init']
    env:
      - 'GOOGLE_APPLICATION_CREDENTIALS=/workspace/sa-key.json'
  - name: 'ghcr.io/opentofu/opentofu:latest'
    entrypoint: tofu
    args: ['plan']
```

## Important Notes

- Embed the version in the GCS object path to ensure reproducible `tofu init` runs.
- Use GCS bucket versioning as an additional safety net.
- Restrict bucket access using IAM roles - prefer `roles/storage.objectViewer` over broader permissions.
- GCS module sources support all standard archive formats (`.zip`, `.tar.gz`).

## Conclusion

GCS bucket module sources integrate naturally into GCP-native workflows. They leverage IAM for access control, work seamlessly with Workload Identity for keyless authentication, and fit into Cloud Build pipelines. Use versioned object paths to pin modules and ensure consistent deployments across your team.
