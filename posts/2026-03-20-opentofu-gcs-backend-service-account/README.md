# How to Configure GCS Backend with Service Account Authentication in OpenTofu (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Backend, GCP

Description: Learn how to configure Service Account authentication for the OpenTofu GCS backend for CI/CD and non-interactive deployments.

## Introduction

Service Account authentication is the standard approach for GCS backend access in CI/CD pipelines. A service account is a non-human identity in Google Cloud with specific IAM roles. OpenTofu uses the service account's credentials to read and write state files.

## Creating the Service Account

```bash
# Create the service account

gcloud iam service-accounts create tofu-state-sa \
  --description="OpenTofu state management" \
  --display-name="OpenTofu State SA"

# Grant access to the state bucket
gcloud storage buckets add-iam-policy-binding gs://my-tofu-state \
  --member="serviceAccount:tofu-state-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

# Create and download a key file
gcloud iam service-accounts keys create tofu-state-key.json \
  --iam-account="tofu-state-sa@my-project.iam.gserviceaccount.com"
```

## Authentication via GOOGLE_APPLICATION_CREDENTIALS

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/tofu-state-key.json"

tofu init
```

## Authentication via credentials in backend.tf

```hcl
terraform {
  backend "gcs" {
    bucket      = "my-tofu-state"
    prefix      = "production"
    credentials = "/path/to/tofu-state-key.json"
  }
}
```

Or pass the credentials file path via a `-backend-config` flag during init:

```bash
tofu init -backend-config="credentials=/path/to/tofu-state-key.json"
```

## GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy Infrastructure

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Setup OpenTofu
        uses: opentofu/setup-opentofu@v1

      - name: Init and Apply
        run: |
          tofu init
          tofu apply -auto-approve
```

## Storing Service Account Key in CI/CD

```bash
# Encode the key file for storage as a CI/CD secret
base64 -w 0 tofu-state-key.json

# Store the output as GCP_SA_KEY in your CI/CD platform

# In GitHub Actions, retrieve and use:
echo "${{ secrets.GCP_SA_KEY }}" | base64 -d > /tmp/sa-key.json
export GOOGLE_APPLICATION_CREDENTIALS=/tmp/sa-key.json
```

## Impersonating a Service Account

For additional security, use short-lived impersonation instead of a key file:

```bash
# Grant impersonation permission
gcloud iam service-accounts add-iam-policy-binding \
  tofu-state-sa@my-project.iam.gserviceaccount.com \
  --member="user:developer@acme-corp.com" \
  --role="roles/iam.serviceAccountTokenCreator"

# Use impersonation
gcloud auth application-default login --impersonate-service-account \
  tofu-state-sa@my-project.iam.gserviceaccount.com

tofu init  # Uses impersonated credentials
```

## Rotating Service Account Keys

```bash
# Create new key
gcloud iam service-accounts keys create new-key.json \
  --iam-account="tofu-state-sa@my-project.iam.gserviceaccount.com"

# Update CI/CD secret with new key
# Test the new key works
GOOGLE_APPLICATION_CREDENTIALS=new-key.json tofu init

# Delete old key
gcloud iam service-accounts keys delete OLD_KEY_ID \
  --iam-account="tofu-state-sa@my-project.iam.gserviceaccount.com"
```

## Conclusion

Service Account authentication for the GCS backend requires creating a service account with `roles/storage.objectAdmin` on the state bucket, generating a key file or using impersonation, and providing credentials via `GOOGLE_APPLICATION_CREDENTIALS`. For GCP-native deployments, prefer Workload Identity to eliminate key file management entirely.
