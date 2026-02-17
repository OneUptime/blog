# How to Use Terraform to Create Service Accounts with Least-Privilege IAM Roles Across Multiple GCP Projects

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Terraform, IAM, Service Accounts, Security, Google Cloud Platform

Description: Create GCP service accounts with least-privilege IAM roles across multiple projects using Terraform, including custom roles, cross-project access patterns, and workload identity federation.

---

Over-privileged service accounts are one of the most common security issues in GCP environments. It is tempting to slap `roles/editor` on a service account and move on, but that gives it far more access than it needs. If that service account key gets compromised, the attacker has broad access to your entire project.

Least-privilege means granting only the specific permissions a service needs to do its job - nothing more. With Terraform, you can define these precisely and consistently across all your projects.

## The Problem with Broad Roles

Here is what I commonly see in GCP projects:

```hcl
# DO NOT do this - overly permissive
resource "google_project_iam_member" "bad_example" {
  project = "my-project"
  role    = "roles/editor"
  member  = "serviceAccount:my-app@my-project.iam.gserviceaccount.com"
}
```

`roles/editor` grants thousands of permissions across every GCP service. Your application probably uses three or four services. That gap between what is granted and what is needed is your attack surface.

## Creating Service Accounts with Terraform

Start by creating a dedicated service account for each workload:

```hcl
# service-accounts.tf - One service account per workload

# Service account for the web application
resource "google_service_account" "web_app" {
  project      = var.project_id
  account_id   = "web-app"
  display_name = "Web Application Service Account"
  description  = "Used by the web application running on Cloud Run"
}

# Service account for the background worker
resource "google_service_account" "worker" {
  project      = var.project_id
  account_id   = "background-worker"
  display_name = "Background Worker Service Account"
  description  = "Used by background job processing on GKE"
}

# Service account for the data pipeline
resource "google_service_account" "data_pipeline" {
  project      = var.project_id
  account_id   = "data-pipeline"
  display_name = "Data Pipeline Service Account"
  description  = "Used by Cloud Dataflow jobs for ETL processing"
}
```

## Mapping Permissions to Workloads

The first step to least-privilege is understanding what each service actually does. Document this as a local variable in Terraform:

```hcl
# locals.tf - Permission mapping for each workload
# This documents exactly what each service needs and why

locals {
  # Web application permissions
  # The web app reads from Cloud SQL, writes to Cloud Storage,
  # publishes to Pub/Sub, and reads secrets
  web_app_roles = {
    "roles/cloudsql.client" = {
      project = var.project_id
      reason  = "Connect to Cloud SQL instances"
    }
    "roles/storage.objectCreator" = {
      project = var.project_id
      reason  = "Upload user files to Cloud Storage"
    }
    "roles/pubsub.publisher" = {
      project = var.project_id
      reason  = "Publish events to Pub/Sub topics"
    }
    "roles/secretmanager.secretAccessor" = {
      project = var.project_id
      reason  = "Read application secrets"
    }
  }

  # Background worker permissions
  worker_roles = {
    "roles/pubsub.subscriber" = {
      project = var.project_id
      reason  = "Consume messages from job queues"
    }
    "roles/storage.objectViewer" = {
      project = var.project_id
      reason  = "Read files for processing"
    }
    "roles/storage.objectCreator" = {
      project = var.project_id
      reason  = "Write processed output files"
    }
  }
}
```

## Applying IAM Bindings

Use `google_project_iam_member` for individual bindings (not `google_project_iam_binding` which replaces all members of a role):

```hcl
# iam-bindings.tf - Apply least-privilege roles to service accounts

# Web application IAM bindings
resource "google_project_iam_member" "web_app" {
  for_each = local.web_app_roles

  project = each.value.project
  role    = each.key
  member  = "serviceAccount:${google_service_account.web_app.email}"
}

# Background worker IAM bindings
resource "google_project_iam_member" "worker" {
  for_each = local.worker_roles

  project = each.value.project
  role    = each.key
  member  = "serviceAccount:${google_service_account.worker.email}"
}
```

## Custom Roles for Even Tighter Control

Predefined roles often include more permissions than you need. Custom roles let you specify exactly the permissions required:

```hcl
# custom-roles.tf - Custom roles with minimal permissions

# Custom role for the web app's Cloud Storage access
# Only allows uploading to a specific bucket, not all buckets
resource "google_project_iam_custom_role" "web_storage" {
  project     = var.project_id
  role_id     = "webAppStorage"
  title       = "Web App Storage Access"
  description = "Minimal storage permissions for the web application"

  permissions = [
    "storage.objects.create",
    "storage.objects.get",
    "storage.multipartUploads.create",
    "storage.multipartUploads.abort",
    "storage.multipartUploads.listParts",
  ]
}

# Apply the custom role with a condition limiting it to specific buckets
resource "google_project_iam_member" "web_app_storage_custom" {
  project = var.project_id
  role    = google_project_iam_custom_role.web_storage.id
  member  = "serviceAccount:${google_service_account.web_app.email}"

  condition {
    title      = "restrict-to-upload-bucket"
    expression = "resource.name.startsWith('projects/_/buckets/${var.upload_bucket_name}')"
  }
}
```

## Cross-Project Access

Many architectures have service accounts in one project accessing resources in another. Here is how to handle that:

```hcl
# cross-project.tf - Service accounts accessing resources in other projects

variable "projects" {
  description = "Map of project IDs and their roles"
  type = map(object({
    project_id = string
    roles      = list(string)
  }))
}

# The data pipeline in the ETL project needs to read from the app project
# and write to the analytics project
resource "google_project_iam_member" "data_pipeline_source" {
  project = var.app_project_id
  role    = "roles/bigquery.dataViewer"
  member  = "serviceAccount:${google_service_account.data_pipeline.email}"
}

resource "google_project_iam_member" "data_pipeline_destination" {
  project = var.analytics_project_id
  role    = "roles/bigquery.dataEditor"
  member  = "serviceAccount:${google_service_account.data_pipeline.email}"
}

resource "google_project_iam_member" "data_pipeline_job_runner" {
  project = var.analytics_project_id
  role    = "roles/bigquery.jobUser"
  member  = "serviceAccount:${google_service_account.data_pipeline.email}"
}
```

## Workload Identity for GKE

For workloads running on GKE, use Workload Identity instead of service account keys. This is more secure because there are no keys to leak:

```hcl
# workload-identity.tf - Bind Kubernetes service accounts to GCP service accounts

# Allow the Kubernetes service account to impersonate the GCP service account
resource "google_service_account_iam_member" "workload_identity" {
  service_account_id = google_service_account.worker.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[${var.k8s_namespace}/${var.k8s_service_account}]"
}

# The Kubernetes service account annotation
resource "kubernetes_service_account" "worker" {
  metadata {
    name      = var.k8s_service_account
    namespace = var.k8s_namespace

    annotations = {
      "iam.gke.io/gcp-service-account" = google_service_account.worker.email
    }
  }
}
```

## Workload Identity Federation for External Workloads

For CI/CD systems like GitHub Actions, use workload identity federation instead of service account keys:

```hcl
# wif.tf - Workload Identity Federation for GitHub Actions

resource "google_iam_workload_identity_pool" "github" {
  project                   = var.project_id
  workload_identity_pool_id = "github-pool"
  display_name              = "GitHub Actions Pool"
}

resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = var.project_id
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub Actions Provider"

  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
    "attribute.ref"        = "assertion.ref"
  }

  # Only allow tokens from your GitHub organization
  attribute_condition = "assertion.repository_owner == '${var.github_org}'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# Service account for CI/CD
resource "google_service_account" "cicd" {
  project      = var.project_id
  account_id   = "github-cicd"
  display_name = "GitHub Actions CI/CD"
}

# Allow the GitHub repo to impersonate the CI/CD service account
resource "google_service_account_iam_member" "cicd_wif" {
  service_account_id = google_service_account.cicd.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_org}/${var.github_repo}"
}
```

## Auditing Service Account Permissions

Create a script to audit what permissions your service accounts actually use versus what they are granted:

```bash
# List all IAM bindings for a service account across projects
gcloud asset search-all-iam-policies \
  --scope="organizations/YOUR_ORG_ID" \
  --query="policy:web-app@my-project.iam.gserviceaccount.com" \
  --format="table(resource, policy.bindings.role)"

# Check if a service account has been using specific permissions
# using Policy Analyzer
gcloud access-context-manager policies list --organization=YOUR_ORG_ID
```

## Key Rotation

If you must use service account keys (try to avoid them), rotate them regularly:

```hcl
# key-rotation.tf - Service account key with rotation tracking

resource "google_service_account_key" "external_service" {
  service_account_id = google_service_account.external_connector.name

  # Keys are base64-encoded JSON
  # Store in Secret Manager, not in Terraform state
}

# Store the key in Secret Manager for secure access
resource "google_secret_manager_secret" "sa_key" {
  project   = var.project_id
  secret_id = "external-connector-sa-key"

  replication {
    auto {}
  }

  # Rotation reminder
  rotation {
    rotation_period = "7776000s"  # 90 days
  }
}
```

## Summary

Least-privilege service accounts are a foundational security practice for GCP. With Terraform, you can systematically create dedicated service accounts for each workload, grant only the specific roles needed, use custom roles for even tighter control, and add IAM conditions to restrict access to specific resources. Prefer Workload Identity over service account keys wherever possible, and use Workload Identity Federation for external CI/CD systems. The extra effort to define precise permissions pays off significantly in reduced blast radius when (not if) a security incident occurs.
