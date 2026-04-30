# How to Configure GCS Backend with Workload Identity Federation in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, GCP, Security, CI/CD

Description: Learn how to configure the OpenTofu GCS backend with GCP Workload Identity Federation for keyless authentication from GitHub Actions, GitLab CI, and other OIDC-capable platforms.

## Introduction

Workload Identity Federation allows external identities (like GitHub Actions workflows) to authenticate as a GCP service account without service account keys. This eliminates long-lived credentials from your CI/CD pipelines, significantly improving security. This guide covers the complete setup for GitHub Actions with the GCS backend.

## How Workload Identity Federation Works

1. GitHub Actions generates a short-lived OIDC token for the workflow
2. GCP's Security Token Service exchanges the OIDC token for a federated token
3. The federated token is used to impersonate a service account
4. OpenTofu uses the service account to access the GCS backend

## Step 1: Create the Workload Identity Pool and Provider

Before creating these resources, enable the IAM, Security Token Service, and Service Account Credentials APIs in your GCP project.

```hcl
# workload-identity.tf

# Create the Identity Pool

resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github-pool"
  display_name              = "GitHub Actions Pool"
  description               = "Identity pool for GitHub Actions"
  project                   = var.project_id
}

# Create the OIDC Provider for GitHub
resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub Actions Provider"
  project                            = var.project_id

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }

  attribute_condition = "assertion.repository == 'my-org/my-repo'"
}

# Service account for Terraform operations
resource "google_service_account" "terraform" {
  account_id   = "sa-opentofu-runner"
  display_name = "OpenTofu Runner"
  project      = var.project_id
}

# Allow the GitHub Actions OIDC identity to impersonate the SA
resource "google_service_account_iam_member" "github_impersonation" {
  service_account_id = google_service_account.terraform.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/my-org/my-repo"
}

# Grant the SA access to the state bucket
resource "google_storage_bucket_iam_member" "terraform_state" {
  bucket = "my-terraform-state-bucket"
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.terraform.email}"
}
```

## Step 2: Configure the GCS Backend

```hcl
# backend.tf
terraform {
  backend "gcs" {
    bucket = "my-terraform-state-bucket"
    prefix = "prod"
  }
}
```

## Step 3: Configure GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy Infrastructure

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  id-token: write   # Required for OIDC
  contents: read

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Authenticate to GCP
        uses: google-github-actions/auth@v3
        with:
          workload_identity_provider: projects/${{ vars.GCP_PROJECT_NUMBER }}/locations/global/workloadIdentityPools/github-pool/providers/github-provider
          service_account: sa-opentofu-runner@${{ vars.GCP_PROJECT_ID }}.iam.gserviceaccount.com

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v1

      - name: Plan
        run: |
          tofu init
          tofu plan -out=plan.tfplan

  apply:
    needs: plan
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Authenticate to GCP
        uses: google-github-actions/auth@v3
        with:
          workload_identity_provider: projects/${{ vars.GCP_PROJECT_NUMBER }}/locations/global/workloadIdentityPools/github-pool/providers/github-provider
          service_account: sa-opentofu-runner@${{ vars.GCP_PROJECT_ID }}.iam.gserviceaccount.com

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v1

      - name: Apply
        run: |
          tofu init
          tofu apply -auto-approve
```

## Restricting Access by Branch or Environment

For tighter security, restrict which GitHub Actions runs can assume the role:

```hcl
# Only allow main branch to use production service account
resource "google_service_account_iam_member" "github_main_only" {
  service_account_id = "projects/my-project/serviceAccounts/sa-opentofu-prod@my-project.iam.gserviceaccount.com"
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.ref/refs/heads/main"
}

# Allow any branch to use staging service account
resource "google_service_account_iam_member" "github_all_branches" {
  service_account_id = "projects/my-project/serviceAccounts/sa-opentofu-staging@my-project.iam.gserviceaccount.com"
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/my-org/my-repo"
}
```

## Verifying the Setup

```bash
# Check Workload Identity Pool
gcloud iam workload-identity-pools describe github-pool \
  --location=global \
  --project=my-project

# Test authentication from GitHub Actions
# The auth action creates a credentials file and exports GOOGLE_APPLICATION_CREDENTIALS
# Check GitHub Actions logs for successful authentication
```

## Conclusion

Workload Identity Federation for the GCS backend represents the gold standard for GCP authentication in CI/CD pipelines. With no service account keys to manage, rotate, or accidentally expose, this approach is both more secure and simpler to operate. The OIDC token exchange happens transparently, and you can restrict access by repository, branch, or environment for fine-grained security controls.
