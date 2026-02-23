# How to Create GCP Workload Identity Federation with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Workload Identity Federation, Security, IAM, CI/CD

Description: Learn how to set up GCP Workload Identity Federation with Terraform to let external workloads access Google Cloud without service account keys.

---

Service account keys are a security headache. They are long-lived credentials that can be leaked, stolen, or forgotten in a repository. If someone gets a key file, they have access to whatever that service account can do until you notice and revoke it.

Workload Identity Federation eliminates the need for service account keys by letting external identities - from AWS, Azure, GitHub Actions, GitLab CI, or any OIDC provider - authenticate directly to GCP. The external platform issues a short-lived token, GCP validates it against the identity provider you configured, and grants access. No keys to rotate, no files to manage, no secrets to leak.

This guide covers setting up Workload Identity Federation with Terraform for the most common use cases.

## The Building Blocks

Workload Identity Federation has three main components:

1. **Workload Identity Pool** - A container for external identities. Think of it as a namespace.
2. **Workload Identity Provider** - Configures how to validate tokens from a specific identity provider (GitHub, AWS, etc.).
3. **Service Account Impersonation** - Maps external identities to GCP service accounts so they can access resources.

## Setting Up a Pool and Provider for GitHub Actions

GitHub Actions is probably the most common use case. Here is how to let GitHub Actions authenticate to GCP without a service account key.

```hcl
# Create a Workload Identity Pool
resource "google_iam_workload_identity_pool" "github" {
  project                   = var.project_id
  workload_identity_pool_id = "github-pool"
  display_name              = "GitHub Actions Pool"
  description               = "Pool for GitHub Actions OIDC authentication"

  # Pool must be enabled
  disabled = false
}

# Create a provider within the pool for GitHub Actions
resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub Actions Provider"
  description                        = "OIDC provider for GitHub Actions"

  # Restrict which repositories can authenticate
  attribute_condition = "assertion.repository_owner == '${var.github_org}'"

  # Map GitHub token claims to Google attributes
  attribute_mapping = {
    "google.subject"             = "assertion.sub"
    "attribute.actor"            = "assertion.actor"
    "attribute.repository"       = "assertion.repository"
    "attribute.repository_owner" = "assertion.repository_owner"
    "attribute.ref"              = "assertion.ref"
  }

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}
```

## Granting Service Account Impersonation

The external identity needs permission to impersonate a GCP service account. This is where you control what the external workload can actually do.

```hcl
# Service account that GitHub Actions will impersonate
resource "google_service_account" "github_deploy" {
  account_id   = "github-deploy"
  display_name = "GitHub Actions Deploy"
  description  = "Used by GitHub Actions to deploy infrastructure"
  project      = var.project_id
}

# Grant the necessary roles to the service account
resource "google_project_iam_member" "github_deploy_roles" {
  for_each = toset([
    "roles/compute.admin",
    "roles/storage.admin",
    "roles/iam.serviceAccountUser",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.github_deploy.email}"
}

# Allow the GitHub Actions identity to impersonate this service account
# Restrict to a specific repository
resource "google_service_account_iam_member" "github_impersonation" {
  service_account_id = google_service_account.github_deploy.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_org}/${var.github_repo}"
}
```

## Using It in GitHub Actions

Once Terraform has created the resources, your GitHub Actions workflow uses the `google-github-actions/auth` action:

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write   # Required for OIDC
      contents: read

    steps:
      - uses: actions/checkout@v4

      - id: auth
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/providers/github-provider
          service_account: github-deploy@PROJECT_ID.iam.gserviceaccount.com

      - uses: google-github-actions/setup-gcloud@v2

      - run: gcloud compute instances list
```

## Setting Up for AWS Workloads

If you have workloads running in AWS that need to access GCP, you can federate AWS IAM roles.

```hcl
# Pool for AWS identities
resource "google_iam_workload_identity_pool" "aws" {
  project                   = var.project_id
  workload_identity_pool_id = "aws-pool"
  display_name              = "AWS Workloads Pool"
  description               = "Pool for AWS IAM role federation"
}

# AWS provider
resource "google_iam_workload_identity_pool_provider" "aws" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.aws.workload_identity_pool_id
  workload_identity_pool_provider_id = "aws-provider"
  display_name                       = "AWS Provider"
  description                        = "Federate AWS IAM roles to GCP"

  # Only allow specific AWS accounts
  attribute_condition = "assertion.arn.startsWith('arn:aws:sts::${var.aws_account_id}')"

  attribute_mapping = {
    "google.subject"   = "assertion.arn"
    "attribute.account" = "assertion.account"
    "attribute.role"    = "assertion.arn.extract('assumed-role/{role}/')"
  }

  aws {
    account_id = var.aws_account_id
  }
}

# Service account for AWS workloads
resource "google_service_account" "aws_workload" {
  account_id   = "aws-data-sync"
  display_name = "AWS Data Sync"
  description  = "Used by AWS workloads to sync data to GCP"
  project      = var.project_id
}

# Allow the specific AWS role to impersonate the service account
resource "google_service_account_iam_member" "aws_impersonation" {
  service_account_id = google_service_account.aws_workload.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.aws.name}/attribute.role/${var.aws_role_name}"
}
```

## Setting Up for GitLab CI

GitLab CI also supports OIDC, so the setup is similar to GitHub Actions.

```hcl
# Pool for GitLab CI
resource "google_iam_workload_identity_pool" "gitlab" {
  project                   = var.project_id
  workload_identity_pool_id = "gitlab-pool"
  display_name              = "GitLab CI Pool"
}

# GitLab OIDC provider
resource "google_iam_workload_identity_pool_provider" "gitlab" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.gitlab.workload_identity_pool_id
  workload_identity_pool_provider_id = "gitlab-provider"
  display_name                       = "GitLab CI Provider"

  # Restrict to your GitLab group
  attribute_condition = "assertion.namespace_path == '${var.gitlab_group}'"

  attribute_mapping = {
    "google.subject"          = "assertion.sub"
    "attribute.project_path"  = "assertion.project_path"
    "attribute.namespace_path" = "assertion.namespace_path"
    "attribute.ref"           = "assertion.ref"
  }

  oidc {
    issuer_uri        = "https://gitlab.com"
    allowed_audiences = ["https://gitlab.com"]
  }
}
```

## Restricting Access with Attribute Conditions

Attribute conditions are critical for security. Without them, any token from the identity provider can authenticate. Here are some useful patterns:

```hcl
# Only allow a specific repository on the main branch
resource "google_iam_workload_identity_pool_provider" "github_prod" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-prod"
  display_name                       = "GitHub Production Deploys"

  # Multiple conditions combined with &&
  attribute_condition = <<-EOT
    assertion.repository_owner == '${var.github_org}' &&
    assertion.repository == '${var.github_org}/${var.github_repo}' &&
    assertion.ref == 'refs/heads/main'
  EOT

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}
```

## Outputs

Export the values that external systems will need to configure authentication.

```hcl
output "workload_identity_provider" {
  description = "Full provider resource name for use in CI/CD configuration"
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "service_account_email" {
  description = "Service account email for CI/CD to impersonate"
  value       = google_service_account.github_deploy.email
}

output "pool_name" {
  description = "Workload identity pool name"
  value       = google_iam_workload_identity_pool.github.name
}
```

## Common Mistakes to Avoid

The biggest mistake is forgetting the `attribute_condition`. Without it, any repository in your GitHub org (or any project in your AWS account) can authenticate. Always restrict access as tightly as possible.

Another common issue is getting the `member` format wrong in the IAM binding. The format is specific and must match the attribute mapping exactly. Use `principalSet://` for attribute-based matching and `principal://` for exact subject matching.

Finally, remember that Workload Identity Federation does not grant any GCP permissions by itself. It only establishes identity. You still need to grant IAM roles to the service account that gets impersonated.

## Conclusion

Workload Identity Federation is the right way to connect external systems to GCP. It eliminates the security risk of service account keys and integrates naturally with CI/CD platforms. Terraform makes the setup reproducible and auditable, which is exactly what you want for security-critical infrastructure like identity federation. Start by replacing service account keys in your CI/CD pipelines, and then expand to any other external workloads that access GCP resources.
