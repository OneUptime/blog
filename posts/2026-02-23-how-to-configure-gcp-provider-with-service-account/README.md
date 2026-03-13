# How to Configure GCP Provider with Service Account

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Google Cloud, Service Accounts, Authentication, Provider

Description: Learn how to create a GCP service account and configure it with the Terraform Google provider for secure, automated infrastructure deployments and CI/CD pipelines.

---

Running Terraform against Google Cloud in production means you need a service account. Your personal Google account works fine for experimentation, but automated deployments need a dedicated identity with specific permissions. This guide covers creating a service account, assigning the right roles, and configuring the Terraform Google provider to use it.

## What Is a GCP Service Account

A GCP service account is a special type of Google account that belongs to your project rather than to an individual user. It has:

- An email address (like `terraform@my-project.iam.gserviceaccount.com`)
- A key pair for authentication
- IAM role bindings that determine its permissions

Service accounts are the standard way to authenticate automated workloads including Terraform, CI/CD pipelines, and applications running on GCP.

## Creating a Service Account

### Using gcloud CLI

```bash
# Set your project
export PROJECT_ID="my-project-123"
gcloud config set project $PROJECT_ID

# Create the service account
gcloud iam service-accounts create terraform \
  --display-name="Terraform Service Account" \
  --description="Used by Terraform to manage GCP infrastructure"

# Verify it was created
gcloud iam service-accounts list
```

### Assigning Roles

Grant the service account the permissions it needs. Avoid using the Owner or Editor roles in production - they are too broad.

```bash
# Common roles for Terraform
# Project-level roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:terraform@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/compute.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:terraform@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:terraform@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# If Terraform needs to manage IAM bindings
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:terraform@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/resourcemanager.projectIamAdmin"

# If managing GKE clusters
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:terraform@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/container.admin"

# If managing Cloud SQL
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:terraform@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/cloudsql.admin"
```

For a general-purpose Terraform service account, you might use the Editor role during initial setup and tighten it later:

```bash
# Broad access for initial setup (not recommended for production)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:terraform@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/editor"
```

## Authentication Methods

There are several ways to authenticate Terraform with the service account.

### Method 1 - Service Account Key File

Generate a JSON key and point Terraform at it:

```bash
# Create and download a key file
gcloud iam service-accounts keys create terraform-key.json \
  --iam-account="terraform@${PROJECT_ID}.iam.gserviceaccount.com"

# The file contains private key material - handle it securely
chmod 600 terraform-key.json
```

```hcl
# provider.tf
provider "google" {
  project     = var.project_id
  region      = "us-central1"
  credentials = file("terraform-key.json")
}
```

Or better, use the `GOOGLE_CREDENTIALS` environment variable:

```bash
# Set the credentials via environment variable
export GOOGLE_CREDENTIALS=$(cat terraform-key.json)
# Or point to the file path
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/terraform-key.json"
```

```hcl
# provider.tf - no credentials in code
provider "google" {
  project = var.project_id
  region  = "us-central1"
  # Reads from GOOGLE_CREDENTIALS or GOOGLE_APPLICATION_CREDENTIALS
}
```

**Important security note**: Service account keys are long-lived credentials. If they leak, anyone can impersonate the service account. Prefer keyless authentication methods when possible.

### Method 2 - Workload Identity Federation (Recommended for CI/CD)

Workload Identity Federation lets external identity providers (like GitHub Actions or GitLab) authenticate as a GCP service account without a key file:

```bash
# Create a workload identity pool
gcloud iam workload-identity-pools create "ci-pool" \
  --project=$PROJECT_ID \
  --location="global" \
  --display-name="CI/CD Pool"

# Create a provider for GitHub Actions
gcloud iam workload-identity-pools providers create-oidc "github" \
  --project=$PROJECT_ID \
  --location="global" \
  --workload-identity-pool="ci-pool" \
  --display-name="GitHub Actions" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# Allow the GitHub repo to impersonate the service account
gcloud iam service-accounts add-iam-policy-binding \
  "terraform@${PROJECT_ID}.iam.gserviceaccount.com" \
  --project=$PROJECT_ID \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/ci-pool/attribute.repository/myorg/my-repo"
```

### Method 3 - Service Account Impersonation

If you want to use your personal credentials during development but act as the service account:

```bash
# Your personal account needs the Service Account Token Creator role
gcloud iam service-accounts add-iam-policy-binding \
  "terraform@${PROJECT_ID}.iam.gserviceaccount.com" \
  --member="user:your-email@company.com" \
  --role="roles/iam.serviceAccountTokenCreator"
```

```hcl
provider "google" {
  project = var.project_id
  region  = "us-central1"

  # Impersonate the service account
  impersonate_service_account = "terraform@${var.project_id}.iam.gserviceaccount.com"
}
```

This is great for development because:
- No key files to manage
- All API calls are logged as the service account, matching production behavior
- Your personal credentials handle the initial authentication

## CI/CD Integration

### GitHub Actions with Workload Identity Federation

```yaml
# .github/workflows/terraform.yml
name: Terraform
on:
  push:
    branches: [main]

permissions:
  contents: read
  id-token: write  # Required for Workload Identity Federation

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - id: auth
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: "projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/ci-pool/providers/github"
          service_account: "terraform@my-project-123.iam.gserviceaccount.com"

      - uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init

      - name: Terraform Plan
        run: terraform plan -out=tfplan

      - name: Terraform Apply
        if: github.ref == 'refs/heads/main'
        run: terraform apply tfplan
```

### GitHub Actions with Key File

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3

      - name: Setup GCP Credentials
        run: echo '${{ secrets.GCP_CREDENTIALS }}' > /tmp/gcp-key.json

      - name: Terraform Init
        env:
          GOOGLE_APPLICATION_CREDENTIALS: /tmp/gcp-key.json
        run: terraform init

      - name: Terraform Apply
        env:
          GOOGLE_APPLICATION_CREDENTIALS: /tmp/gcp-key.json
        run: terraform apply -auto-approve
```

## Remote State with Service Account

Store Terraform state in a GCS bucket, authenticated with the same service account:

```bash
# Create the state bucket
gsutil mb -p $PROJECT_ID -l us-central1 gs://my-terraform-state-bucket

# Enable versioning for state recovery
gsutil versioning set on gs://my-terraform-state-bucket

# The service account needs storage access (already granted if it has storage.admin)
```

```hcl
terraform {
  backend "gcs" {
    bucket = "my-terraform-state-bucket"
    prefix = "terraform/state"
    # Credentials are inherited from the provider or GOOGLE_APPLICATION_CREDENTIALS
  }

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}
```

## Key Rotation

If you use key files, rotate them regularly:

```bash
# List existing keys
gcloud iam service-accounts keys list \
  --iam-account="terraform@${PROJECT_ID}.iam.gserviceaccount.com"

# Create a new key
gcloud iam service-accounts keys create new-terraform-key.json \
  --iam-account="terraform@${PROJECT_ID}.iam.gserviceaccount.com"

# Update your CI/CD secrets with the new key

# Delete the old key
gcloud iam service-accounts keys delete OLD_KEY_ID \
  --iam-account="terraform@${PROJECT_ID}.iam.gserviceaccount.com"
```

Better yet, avoid key files entirely and use Workload Identity Federation or impersonation.

## Troubleshooting

### "403 Forbidden" or "Permission Denied"

The service account is missing a required IAM role. Check the error message for the specific permission needed:

```bash
# List current roles
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:terraform@${PROJECT_ID}.iam.gserviceaccount.com" \
  --format="table(bindings.role)"
```

### "API not enabled"

GCP requires you to enable APIs before using them:

```bash
# Enable common APIs
gcloud services enable compute.googleapis.com
gcloud services enable container.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable storage.googleapis.com
```

### "Service account does not exist"

Double-check the email format. It should be `NAME@PROJECT_ID.iam.gserviceaccount.com`.

## Summary

Service accounts are the foundation of secure Terraform automation on GCP. Create a dedicated service account with the minimum required roles, prefer keyless authentication through Workload Identity Federation or impersonation, and fall back to key files only when necessary. Whichever method you choose, keep credentials out of your Terraform code and use environment variables or the provider's built-in credential chain.
