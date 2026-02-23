# How to Create GCP IAM Workload Identity in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, IAM, Workload Identity, Security, Infrastructure as Code

Description: Learn how to set up GCP Workload Identity Federation in Terraform to securely authenticate external workloads without service account keys.

---

GCP Workload Identity Federation allows external workloads running on AWS, Azure, GitHub Actions, or other identity providers to access Google Cloud resources without using long-lived service account keys. This eliminates the security risk of managing and rotating keys. In this guide, you will learn how to set up Workload Identity pools, providers, and service account bindings using Terraform.

## Understanding Workload Identity Federation

Traditional approaches to authenticating external workloads with GCP involve creating a service account key, storing it securely, and rotating it regularly. Workload Identity Federation replaces this pattern by letting external identity providers issue short-lived tokens that can be exchanged for GCP credentials.

## Setting Up the Provider

```hcl
# Configure the Google Cloud provider
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = "us-central1"
}

variable "project_id" {
  type        = string
  description = "The GCP project ID"
}
```

## Creating a Workload Identity Pool

The Workload Identity pool is a container for external identities:

```hcl
# Create a Workload Identity pool
resource "google_iam_workload_identity_pool" "main" {
  workload_identity_pool_id = "external-workloads"
  display_name              = "External Workloads"
  description               = "Pool for authenticating external CI/CD and cloud workloads"
  project                   = var.project_id

  # Pool must be enabled to accept tokens
  disabled = false
}
```

## Configuring an AWS Provider

If your workloads run on AWS, configure an AWS identity provider:

```hcl
# Configure AWS as a Workload Identity provider
resource "google_iam_workload_identity_pool_provider" "aws" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.main.workload_identity_pool_id
  workload_identity_pool_provider_id = "aws-provider"
  display_name                       = "AWS Provider"
  description                        = "Allows AWS workloads to authenticate with GCP"

  # AWS-specific configuration
  aws {
    # The AWS account ID that is allowed to authenticate
    account_id = var.aws_account_id
  }

  # Map AWS attributes to Google attributes
  attribute_mapping = {
    "google.subject"        = "assertion.arn"
    "attribute.account"     = "assertion.account"
    "attribute.aws_role"    = "assertion.arn.extract('/assumed-role/{role}/')"
  }

  # Only allow specific AWS roles
  attribute_condition = "attribute.aws_role == '${var.allowed_aws_role}'"
}

variable "aws_account_id" {
  type        = string
  description = "AWS account ID allowed to authenticate"
}

variable "allowed_aws_role" {
  type        = string
  description = "AWS IAM role name allowed to authenticate"
}
```

## Configuring a GitHub Actions Provider

GitHub Actions is one of the most popular use cases for Workload Identity:

```hcl
# Configure GitHub Actions as a Workload Identity provider
resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.main.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-actions"
  display_name                       = "GitHub Actions"
  description                        = "Allows GitHub Actions workflows to authenticate with GCP"

  # OIDC configuration for GitHub
  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }

  # Map GitHub token claims to Google attributes
  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.actor"      = "assertion.actor"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }

  # Only allow specific repositories
  attribute_condition = "assertion.repository_owner == '${var.github_org}'"
}

variable "github_org" {
  type        = string
  description = "GitHub organization name"
}
```

## Configuring an Azure AD Provider

For workloads running on Azure:

```hcl
# Configure Azure AD as a Workload Identity provider
resource "google_iam_workload_identity_pool_provider" "azure" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.main.workload_identity_pool_id
  workload_identity_pool_provider_id = "azure-provider"
  display_name                       = "Azure AD Provider"
  description                        = "Allows Azure workloads to authenticate with GCP"

  # OIDC configuration for Azure AD
  oidc {
    issuer_uri        = "https://sts.windows.net/${var.azure_tenant_id}/"
    allowed_audiences = ["api://gcp-workload-identity"]
  }

  # Map Azure token claims to Google attributes
  attribute_mapping = {
    "google.subject"     = "assertion.sub"
    "attribute.tenant"   = "assertion.tid"
    "attribute.app_id"   = "assertion.appid"
  }

  # Only allow specific Azure tenant
  attribute_condition = "attribute.tenant == '${var.azure_tenant_id}'"
}

variable "azure_tenant_id" {
  type        = string
  description = "Azure AD tenant ID"
}
```

## Creating Service Accounts and Bindings

External workloads need to impersonate a GCP service account:

```hcl
# Create a service account for external workloads
resource "google_service_account" "workload" {
  account_id   = "external-workload-sa"
  display_name = "External Workload Service Account"
  description  = "Service account used by external workloads via Workload Identity"
  project      = var.project_id
}

# Grant the service account necessary permissions
resource "google_project_iam_member" "workload_storage" {
  project = var.project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.workload.email}"
}

# Allow the GitHub Actions provider to impersonate this service account
resource "google_service_account_iam_binding" "github_workload_identity" {
  service_account_id = google_service_account.workload.name
  role               = "roles/iam.workloadIdentityUser"

  members = [
    # Allow any workflow from the specific repository
    "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.main.name}/attribute.repository/${var.github_org}/${var.github_repo}"
  ]
}

# Allow the AWS provider to impersonate this service account
resource "google_service_account_iam_binding" "aws_workload_identity" {
  service_account_id = google_service_account.workload.name
  role               = "roles/iam.workloadIdentityUser"

  members = [
    "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.main.name}/attribute.aws_role/${var.allowed_aws_role}"
  ]
}

variable "github_repo" {
  type        = string
  description = "GitHub repository name"
}
```

## Configuring GKE Workload Identity

For Kubernetes workloads running on GKE, Workload Identity connects Kubernetes service accounts to GCP service accounts:

```hcl
# Create a GKE cluster with Workload Identity enabled
resource "google_container_cluster" "main" {
  name     = "main-cluster"
  location = "us-central1"

  # Enable Workload Identity at the cluster level
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Use default node pool settings
  initial_node_count = 1

  node_config {
    # Enable Workload Identity on nodes
    workload_metadata_config {
      mode = "GKE_METADATA"
    }
  }
}

# Create a GCP service account for the Kubernetes workload
resource "google_service_account" "k8s_workload" {
  account_id   = "k8s-app-workload"
  display_name = "Kubernetes Application Workload"
  project      = var.project_id
}

# Bind the Kubernetes service account to the GCP service account
resource "google_service_account_iam_binding" "k8s_workload_identity" {
  service_account_id = google_service_account.k8s_workload.name
  role               = "roles/iam.workloadIdentityUser"

  members = [
    "serviceAccount:${var.project_id}.svc.id.goog[default/app-workload]"
  ]
}

# Grant the GCP service account access to Cloud SQL
resource "google_project_iam_member" "k8s_cloudsql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.k8s_workload.email}"
}
```

## Output Configuration for CI/CD

Provide the configuration values needed by your CI/CD pipelines:

```hcl
# Output the Workload Identity provider resource name
output "github_workload_identity_provider" {
  value       = google_iam_workload_identity_pool_provider.github.name
  description = "Full resource name of the GitHub Workload Identity provider"
}

output "service_account_email" {
  value       = google_service_account.workload.email
  description = "Service account email for workload impersonation"
}

# Output the configuration for GitHub Actions workflow
output "github_actions_config" {
  value = {
    workload_identity_provider = google_iam_workload_identity_pool_provider.github.name
    service_account            = google_service_account.workload.email
    project_id                 = var.project_id
  }
  description = "Configuration for GitHub Actions workflow"
}
```

## Best Practices

Use attribute conditions to restrict which external identities can authenticate. Never grant broad access without conditions since this would allow any identity from the external provider to access your GCP resources. Create separate service accounts for different workloads rather than sharing a single service account. Use the principle of least privilege when granting IAM roles to service accounts. Regularly audit your Workload Identity pool bindings to ensure only expected workloads have access.

For managing organization-wide security policies, check out our guide on [GCP Organization Policies](https://oneuptime.com/blog/post/2026-02-23-how-to-create-gcp-organization-policies-in-terraform/view).

## Conclusion

GCP Workload Identity Federation managed through Terraform provides a secure, keyless authentication mechanism for external workloads. By eliminating service account keys, you remove a significant attack vector while simplifying credential management. Whether your workloads run on AWS, Azure, GitHub Actions, or Kubernetes, Workload Identity Federation offers a consistent approach to cross-platform authentication that you can fully automate with Terraform.
