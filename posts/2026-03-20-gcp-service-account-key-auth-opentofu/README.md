# How to Authenticate with GCP Using Service Account Keys in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GCP, Google Cloud, Infrastructure as Code, IaC, Service Account, Authentication

Description: Learn how to create and configure GCP Service Account keys for OpenTofu authentication, including key rotation and least-privilege IAM roles.

## Introduction

Service Account keys allow OpenTofu to authenticate with GCP APIs. While this method works, it requires careful key management. This guide covers creating service accounts, generating keys, and configuring OpenTofu to use them.

## Step 1: Create Service Account

```bash
# Create a service account for OpenTofu

gcloud iam service-accounts create opentofu-sa \
  --display-name="OpenTofu Service Account" \
  --project="${PROJECT_ID}"

# Example broad role for testing only
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:opentofu-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/editor"

# Generate a JSON key
gcloud iam service-accounts keys create opentofu-key.json \
  --iam-account="opentofu-sa@${PROJECT_ID}.iam.gserviceaccount.com"
```

## Step 2: Configure Provider with Key File

```hcl
provider "google" {
  project     = var.project_id
  region      = var.region
  credentials = file(var.credentials_file)
}

variable "credentials_file" {
  description = "Path to GCP service account key JSON"
  type        = string
  default     = "opentofu-key.json"
}
```

## Step 3: Use Environment Variable (Recommended)

```bash
# Set the credentials path via environment variable
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/opentofu-key.json"
# Or use inline JSON
export GOOGLE_CREDENTIALS="$(cat opentofu-key.json)"
```

```hcl
provider "google" {
  project = var.project_id
  region  = var.region
  # Automatically uses Application Default Credentials
}
```

## Step 4: Store Key in CI/CD Secret

```yaml
# GitHub Actions example
- name: Set up GCP credentials
  run: printf '%s' '${{ secrets.GCP_SA_KEY }}' > /tmp/gcp-key.json

- name: Run OpenTofu
  env:
    GOOGLE_APPLICATION_CREDENTIALS: /tmp/gcp-key.json
  run: |
    tofu init
    tofu apply -auto-approve
```

## Step 5: Least Privilege Roles

```bash
# Exact roles depend on the resources in your configuration
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:opentofu-sa@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/compute.admin"
```

## Conclusion

You have configured GCP Service Account key authentication for OpenTofu. Service account keys should be rotated regularly and stored in secure secret managers. For production environments, prefer Workload Identity Federation which eliminates the need for long-lived keys entirely.
