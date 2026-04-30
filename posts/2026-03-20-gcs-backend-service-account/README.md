# How to Configure GCS Backend with Service Account Authentication in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, GCP, Security

Description: Learn how to authenticate the OpenTofu GCS backend using a Google Cloud Service Account with key files or service account impersonation for CI/CD deployments.

## Introduction

Service Account authentication is the standard approach for OpenTofu CI/CD pipelines on GCP. Service accounts represent non-human identities with specific permissions, making them ideal for automated infrastructure deployments. This guide covers service account key files, environment variable configuration, and service account impersonation.

## Step 1: Create a Service Account

```hcl
# service-account.tf

resource "google_service_account" "terraform" {
  account_id   = "sa-opentofu-runner"
  display_name = "OpenTofu Runner Service Account"
  project      = var.project_id
}

# Grant access to the state bucket
resource "google_storage_bucket_iam_member" "terraform_state" {
  bucket = google_storage_bucket.terraform_state.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.terraform.email}"
}

# Grant the SA permission to create/manage resources
resource "google_project_iam_member" "terraform_editor" {
  project = var.project_id
  role    = "roles/editor"  # Or more specific roles for least privilege
  member  = "serviceAccount:${google_service_account.terraform.email}"
}
```

## Step 2: Create a Service Account Key

```bash
# Create a key file for the service account
gcloud iam service-accounts keys create opentofu-sa-key.json \
  --iam-account=sa-opentofu-runner@my-project.iam.gserviceaccount.com

# Add to .gitignore - never commit key files!
echo "*.json" >> .gitignore
echo "opentofu-sa-key.json" >> .gitignore
```

## Step 3: Configure the Backend

### Option 1: Credentials File Path

```hcl
# backend.tf
terraform {
  backend "gcs" {
    bucket      = "my-terraform-state-bucket"
    prefix      = "prod"
    credentials = "/path/to/opentofu-sa-key.json"
  }
}
```

### Option 2: Environment Variable

```bash
# Set credentials via environment variable (preferred)
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/opentofu-sa-key.json"
```

```hcl
# backend.tf - no credentials field needed when using env var
terraform {
  backend "gcs" {
    bucket = "my-terraform-state-bucket"
    prefix = "prod"
    # Credentials loaded from GOOGLE_APPLICATION_CREDENTIALS
  }
}
```

### Option 3: Backend-Specific Environment Variable

```bash
# Use a backend-specific credentials variable
export GOOGLE_BACKEND_CREDENTIALS="/path/to/opentofu-sa-key.json"
```

```hcl
terraform {
  backend "gcs" {
    bucket = "my-terraform-state-bucket"
    prefix = "prod"
  }
}
```

## Service Account Impersonation (Recommended)

Service account impersonation is more secure than key files - your identity assumes the SA's permissions without needing the SA's key:

```hcl
# backend.tf
terraform {
  backend "gcs" {
    bucket = "my-terraform-state-bucket"
    prefix = "prod"

    # Impersonate the terraform SA
    impersonate_service_account = "sa-opentofu-runner@my-project.iam.gserviceaccount.com"
  }
}
```

```bash
# Grant impersonation permission
gcloud iam service-accounts add-iam-policy-binding \
  sa-opentofu-runner@my-project.iam.gserviceaccount.com \
  --member="user:developer@company.com" \
  --role="roles/iam.serviceAccountTokenCreator"

# Authenticate as yourself
gcloud auth application-default login

# OpenTofu will impersonate the SA automatically
tofu init
```

## Using in GitHub Actions

```yaml
name: Deploy with OpenTofu

on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Authenticate to GCP
        uses: google-github-actions/auth@v3
        with:
          workload_identity_provider: projects/PROJECT_NUM/locations/global/workloadIdentityPools/github-pool/providers/github-provider
          service_account: sa-opentofu-runner@my-project.iam.gserviceaccount.com

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v2

      - name: Deploy
        run: |
          tofu init
          tofu apply -auto-approve
```

## Service Account Best Practices

1. **Use least privilege**: Grant only the permissions needed
2. **Prefer impersonation over key files**: Avoid long-lived credentials
3. **Rotate keys regularly**: If using key files, rotate every 90 days
4. **Audit SA usage**: Enable Cloud Audit Logs for the SA

```bash
# List SA keys and check expiration
gcloud iam service-accounts keys list \
  --iam-account=sa-opentofu-runner@my-project.iam.gserviceaccount.com

# Revoke old keys
gcloud iam service-accounts keys delete KEY_ID \
  --iam-account=sa-opentofu-runner@my-project.iam.gserviceaccount.com
```

## Conclusion

Service Account authentication for the GCS backend provides a reliable mechanism for CI/CD-based infrastructure deployments on GCP. Service account impersonation is the preferred approach as it avoids long-lived key files. For GitHub Actions and other modern CI/CD platforms, Workload Identity Federation provides the most secure setup by eliminating credential storage entirely. Always follow least-privilege principles when granting permissions to your Terraform service accounts.
