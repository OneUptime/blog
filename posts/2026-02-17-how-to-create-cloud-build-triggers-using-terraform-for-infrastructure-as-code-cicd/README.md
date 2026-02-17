# How to Create Cloud Build Triggers Using Terraform for Infrastructure-as-Code CI/CD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Terraform, Cloud Build, CI/CD, Infrastructure as Code, DevOps

Description: Learn how to create Google Cloud Build triggers using Terraform to automate your infrastructure-as-code CI/CD pipeline with plan, approval, and apply workflows.

---

Running Terraform manually from a laptop works for small projects, but it does not scale. You need a CI/CD pipeline that runs `terraform plan` on pull requests and `terraform apply` on merge. Google Cloud Build is a natural choice for this when your infrastructure is on GCP, and managing those build triggers with Terraform closes the loop - your CI/CD pipeline itself is infrastructure as code.

This guide walks through setting up Cloud Build triggers with Terraform for a complete infrastructure CI/CD workflow.

## Prerequisites

Before starting, make sure you have:

- Cloud Build API enabled
- A source repository connected to Cloud Build (GitHub, Cloud Source Repositories, or Bitbucket)
- A service account for Terraform with appropriate permissions
- A GCS bucket for Terraform state

Enable the required APIs:

```bash
# Enable Cloud Build and related APIs
gcloud services enable cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  iam.googleapis.com \
  --project=my-gcp-project
```

## Setting Up the Cloud Build Service Account

Cloud Build uses a default service account, but for Terraform operations you should use a custom one with specific permissions:

```hcl
# service_account.tf - Custom service account for Terraform CI/CD
resource "google_service_account" "terraform_builder" {
  account_id   = "terraform-builder"
  display_name = "Terraform Cloud Build Service Account"
  project      = var.project_id
}

# Grant Terraform the permissions it needs to manage infrastructure
locals {
  terraform_roles = [
    "roles/compute.admin",
    "roles/container.admin",
    "roles/cloudsql.admin",
    "roles/iam.serviceAccountAdmin",
    "roles/storage.admin",
    "roles/run.admin",
    "roles/logging.admin",
    "roles/monitoring.admin",
    "roles/secretmanager.admin",
  ]
}

resource "google_project_iam_member" "terraform_builder_roles" {
  for_each = toset(local.terraform_roles)

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.terraform_builder.email}"
}

# Grant access to the Terraform state bucket
resource "google_storage_bucket_iam_member" "terraform_state_access" {
  bucket = var.state_bucket_name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.terraform_builder.email}"
}

# Allow Cloud Build to use this service account
resource "google_service_account_iam_member" "cloudbuild_sa_user" {
  service_account_id = google_service_account.terraform_builder.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${var.project_number}@cloudbuild.gserviceaccount.com"
}
```

## The Cloud Build Configuration File

Before creating triggers, you need a `cloudbuild.yaml` that defines the build steps. Here is one for Terraform:

```yaml
# cloudbuild.yaml - Terraform CI/CD pipeline
steps:
  # Step 1: Initialize Terraform
  - id: 'terraform-init'
    name: 'hashicorp/terraform:1.7'
    entrypoint: 'sh'
    args:
      - '-c'
      - |
        terraform init -no-color
    dir: 'infrastructure/'

  # Step 2: Validate the configuration
  - id: 'terraform-validate'
    name: 'hashicorp/terraform:1.7'
    entrypoint: 'sh'
    args:
      - '-c'
      - |
        terraform validate -no-color
    dir: 'infrastructure/'
    waitFor: ['terraform-init']

  # Step 3: Run terraform plan
  - id: 'terraform-plan'
    name: 'hashicorp/terraform:1.7'
    entrypoint: 'sh'
    args:
      - '-c'
      - |
        terraform plan -no-color -out=tfplan
    dir: 'infrastructure/'
    waitFor: ['terraform-validate']

  # Step 4: Apply (only on main branch)
  - id: 'terraform-apply'
    name: 'hashicorp/terraform:1.7'
    entrypoint: 'sh'
    args:
      - '-c'
      - |
        if [ "$BRANCH_NAME" = "main" ]; then
          terraform apply -no-color -auto-approve tfplan
        else
          echo "Skipping apply - not on main branch"
        fi
    dir: 'infrastructure/'
    waitFor: ['terraform-plan']

options:
  logging: CLOUD_LOGGING_ONLY

serviceAccount: 'projects/${PROJECT_ID}/serviceAccounts/terraform-builder@${PROJECT_ID}.iam.gserviceaccount.com'
```

## Creating the Pull Request Trigger

This trigger runs `terraform plan` on every pull request so reviewers can see the planned changes:

```hcl
# triggers.tf - Cloud Build trigger for pull requests
resource "google_cloudbuild_trigger" "terraform_plan" {
  name        = "terraform-plan"
  description = "Run terraform plan on pull requests"
  project     = var.project_id
  location    = var.region

  # Trigger on pull requests to the main branch
  github {
    owner = var.github_owner
    name  = var.github_repo

    pull_request {
      branch          = "^main$"
      comment_control = "COMMENTS_ENABLED"
    }
  }

  # Only trigger when infrastructure files change
  included_files = ["infrastructure/**"]

  # Use the cloudbuild.yaml from the repository
  filename = "infrastructure/cloudbuild-plan.yaml"

  # Use the custom service account
  service_account = google_service_account.terraform_builder.id
}
```

Create a separate `cloudbuild-plan.yaml` that only runs plan (no apply):

```yaml
# infrastructure/cloudbuild-plan.yaml - Plan only, for pull requests
steps:
  - id: 'terraform-init'
    name: 'hashicorp/terraform:1.7'
    entrypoint: 'sh'
    args:
      - '-c'
      - 'terraform init -no-color'
    dir: 'infrastructure/'

  - id: 'terraform-plan'
    name: 'hashicorp/terraform:1.7'
    entrypoint: 'sh'
    args:
      - '-c'
      - 'terraform plan -no-color'
    dir: 'infrastructure/'

options:
  logging: CLOUD_LOGGING_ONLY

serviceAccount: 'projects/$PROJECT_ID/serviceAccounts/terraform-builder@$PROJECT_ID.iam.gserviceaccount.com'
```

## Creating the Apply Trigger

This trigger runs `terraform apply` when changes are merged to main:

```hcl
# triggers.tf - Cloud Build trigger for apply on merge
resource "google_cloudbuild_trigger" "terraform_apply" {
  name        = "terraform-apply"
  description = "Run terraform apply when changes are merged to main"
  project     = var.project_id
  location    = var.region

  # Trigger on push to main branch
  github {
    owner = var.github_owner
    name  = var.github_repo

    push {
      branch = "^main$"
    }
  }

  # Only trigger when infrastructure files change
  included_files = ["infrastructure/**"]

  # Use the full CI/CD pipeline
  filename = "infrastructure/cloudbuild-apply.yaml"

  service_account = google_service_account.terraform_builder.id
}
```

The apply build config:

```yaml
# infrastructure/cloudbuild-apply.yaml - Full plan and apply
steps:
  - id: 'terraform-init'
    name: 'hashicorp/terraform:1.7'
    entrypoint: 'sh'
    args:
      - '-c'
      - 'terraform init -no-color'
    dir: 'infrastructure/'

  - id: 'terraform-plan'
    name: 'hashicorp/terraform:1.7'
    entrypoint: 'sh'
    args:
      - '-c'
      - 'terraform plan -no-color -out=tfplan'
    dir: 'infrastructure/'

  - id: 'terraform-apply'
    name: 'hashicorp/terraform:1.7'
    entrypoint: 'sh'
    args:
      - '-c'
      - 'terraform apply -no-color -auto-approve tfplan'
    dir: 'infrastructure/'

options:
  logging: CLOUD_LOGGING_ONLY

serviceAccount: 'projects/$PROJECT_ID/serviceAccounts/terraform-builder@$PROJECT_ID.iam.gserviceaccount.com'
```

## Multi-Environment Triggers

For multiple environments, create separate triggers for each:

```hcl
# triggers.tf - Environment-specific triggers
locals {
  environments = {
    dev = {
      branch       = "^develop$"
      workspace    = "dev"
      auto_apply   = true
    }
    staging = {
      branch       = "^staging$"
      workspace    = "staging"
      auto_apply   = true
    }
    production = {
      branch       = "^main$"
      workspace    = "production"
      auto_apply   = false  # Require manual approval
    }
  }
}

resource "google_cloudbuild_trigger" "terraform_deploy" {
  for_each = local.environments

  name        = "terraform-deploy-${each.key}"
  description = "Deploy infrastructure to ${each.key}"
  project     = var.project_id
  location    = var.region

  github {
    owner = var.github_owner
    name  = var.github_repo

    push {
      branch = each.value.branch
    }
  }

  included_files = ["infrastructure/**"]

  # Pass the environment as a substitution variable
  substitutions = {
    _ENVIRONMENT = each.key
    _WORKSPACE   = each.value.workspace
    _AUTO_APPLY  = each.value.auto_apply ? "true" : "false"
  }

  filename        = "infrastructure/cloudbuild-deploy.yaml"
  service_account = google_service_account.terraform_builder.id
}
```

## Adding Approval Gates

For production deployments, require manual approval before applying:

```hcl
# triggers.tf - Production trigger with approval requirement
resource "google_cloudbuild_trigger" "terraform_apply_prod" {
  name        = "terraform-apply-production"
  description = "Apply infrastructure changes to production (requires approval)"
  project     = var.project_id
  location    = var.region

  github {
    owner = var.github_owner
    name  = var.github_repo

    push {
      branch = "^main$"
    }
  }

  included_files = ["infrastructure/**"]
  filename       = "infrastructure/cloudbuild-apply.yaml"

  service_account = google_service_account.terraform_builder.id

  # Require approval before the build runs
  approval_config {
    approval_required = true
  }
}
```

## Notifications for Build Results

Set up Pub/Sub notifications for build results:

```hcl
# notifications.tf - Pub/Sub topic for build notifications
resource "google_pubsub_topic" "build_notifications" {
  name    = "cloud-build-notifications"
  project = var.project_id
}

# Cloud Build automatically publishes to this topic
# You can subscribe to it with Cloud Functions, email, or Slack integrations
```

## Variables

```hcl
# variables.tf
variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "project_number" {
  description = "GCP project number"
  type        = string
}

variable "region" {
  description = "GCP region for Cloud Build"
  type        = string
  default     = "us-central1"
}

variable "github_owner" {
  description = "GitHub repository owner"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository name"
  type        = string
}

variable "state_bucket_name" {
  description = "GCS bucket name for Terraform state"
  type        = string
}
```

## Best Practices

1. **Separate plan and apply triggers.** Plan on PRs, apply on merge. This gives reviewers visibility into changes before they happen.
2. **Use a custom service account** for Cloud Build Terraform runs. The default Cloud Build SA has too many permissions.
3. **Require approval for production applies.** Use Cloud Build approval gates to prevent unreviewed changes.
4. **Use included_files filters** to only trigger builds when infrastructure files change, not on every commit.
5. **Pin the Terraform version** in your Cloud Build steps. Use the exact same version locally and in CI.
6. **Store plan output as an artifact** so you can review it after the build.
7. **Never use -auto-approve on pull request triggers.** Only auto-approve on merge triggers after the plan has been reviewed.

## Wrapping Up

Cloud Build triggers managed with Terraform give you a complete infrastructure CI/CD pipeline where the pipeline itself is code. Pull request triggers run plans for review, merge triggers apply approved changes, and approval gates protect production. This workflow catches configuration errors early, provides an audit trail for every change, and ensures that infrastructure changes go through the same review process as application code.
