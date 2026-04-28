# How to Configure GCS Backend with Workload Identity Federation in OpenTofu (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Backend, GCP

Description: Learn how to configure the OpenTofu GCS backend with Workload Identity Federation for keyless authentication from external CI/CD systems like GitHub Actions.

## Introduction

Workload Identity Federation allows external identities (GitHub Actions, GitLab CI, etc.) to authenticate with Google Cloud without service account key files. External tokens are exchanged for short-lived Google Cloud credentials, eliminating the security risks associated with long-lived key management.

## GitHub Actions with Workload Identity

### Step 1: Create the Workload Identity Pool

```bash
# Create the pool

gcloud iam workload-identity-pools create "github-actions-pool" \
  --project="my-project" \
  --location="global" \
  --display-name="GitHub Actions Pool"

# Create the provider
gcloud iam workload-identity-pools providers create-oidc "github-actions-provider" \
  --project="my-project" \
  --location="global" \
  --workload-identity-pool="github-actions-pool" \
  --display-name="GitHub Actions Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository_owner == 'acme-org'" \
  --issuer-uri="https://token.actions.githubusercontent.com"
```

### Step 2: Grant Access to the Service Account

```bash
# Create the service account
gcloud iam service-accounts create tofu-state-sa \
  --project="my-project"

# Grant GCS access
gcloud storage buckets add-iam-policy-binding gs://my-tofu-state \
  --member="serviceAccount:tofu-state-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

# Allow GitHub Actions to impersonate the service account
gcloud iam service-accounts add-iam-policy-binding \
  tofu-state-sa@my-project.iam.gserviceaccount.com \
  --project="my-project" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-actions-pool/attribute.repository/acme-org/infra-repo"
```

### Step 3: GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy Infrastructure

on:
  push:
    branches: [main]

permissions:
  id-token: write    # Required for Workload Identity Federation
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: "projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-actions-pool/providers/github-actions-provider"
          service_account: "tofu-state-sa@my-project.iam.gserviceaccount.com"

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v1

      - name: Deploy
        run: |
          tofu init
          tofu plan
          tofu apply -auto-approve
```

## GKE Workload Identity

For OpenTofu running on GKE, configure the pod service account to impersonate a GCP service account:

```hcl
# Kubernetes service account with Workload Identity annotation
resource "kubernetes_service_account" "tofu" {
  metadata {
    name      = "tofu-runner"
    namespace = "terraform"
    annotations = {
      "iam.gke.io/gcp-service-account" = "tofu-state-sa@my-project.iam.gserviceaccount.com"
    }
  }
}

# Allow the Kubernetes SA to impersonate the GCP SA
resource "google_service_account_iam_member" "workload_identity" {
  service_account_id = google_service_account.tofu_state.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:my-project.svc.id.goog[terraform/tofu-runner]"
}
```

## No Changes Needed in Backend Configuration

The backend configuration remains unchanged - authentication is handled by the environment:

```hcl
terraform {
  backend "gcs" {
    bucket = "my-tofu-state"
    prefix = "production"
    # No credentials block needed - uses ADC from Workload Identity
  }
}
```

## Conclusion

Workload Identity Federation for GCS backend access is the modern, keyless authentication approach. It works for GitHub Actions, GitLab CI, and GKE workloads. No service account key files to create, store, rotate, or accidentally expose. The external OIDC token is automatically exchanged for short-lived GCP credentials via the Workload Identity pool.
