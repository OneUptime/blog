# How to Manage GCP IAM Roles and Service Accounts Using Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Terraform, IAM, Service Accounts, Security, Infrastructure as Code

Description: Learn how to manage Google Cloud IAM roles, service accounts, and access policies using Terraform with least-privilege principles and security best practices.

---

IAM is the security foundation of every GCP project. Who can access what, and what they can do with that access, determines your entire security posture. Managing IAM through the Cloud Console might seem easier, but it leads to permission sprawl, undocumented access, and zero audit trail for changes.

Terraform brings IAM under version control. Every permission grant is reviewed in a pull request, tracked in Git history, and reproducible across environments. Let me walk through how to manage IAM properly with Terraform on GCP.

## Understanding GCP IAM Concepts

Before jumping into Terraform code, here is a quick refresher on GCP IAM:

- **Members**: Who is being granted access (user, service account, group)
- **Roles**: What permissions are granted (viewer, editor, custom role)
- **Policy Bindings**: The connection between a member and a role on a resource
- **Service Accounts**: Machine identities used by applications and services

## The Three Terraform IAM Resource Types

GCP's Terraform provider offers three ways to manage IAM, and choosing the right one is critical:

### google_project_iam_policy (Authoritative for the project)

This replaces the entire IAM policy for the project. If a binding is not in your Terraform config, it gets removed. This is dangerous and should only be used if Terraform manages all IAM for the project.

### google_project_iam_binding (Authoritative for a role)

This manages all members for a specific role. If a member has the role but is not in your config, they lose it. Use this when one team owns a role completely.

### google_project_iam_member (Non-authoritative)

This adds a single member to a role without affecting other members of that role. This is the safest option and what most teams should use.

```hcl
# SAFE - adds a member without affecting others
resource "google_project_iam_member" "viewer" {
  project = var.project_id
  role    = "roles/viewer"
  member  = "user:developer@example.com"
}

# CAUTION - manages ALL members of this role
resource "google_project_iam_binding" "editors" {
  project = var.project_id
  role    = "roles/editor"
  members = [
    "user:admin@example.com",
    "serviceAccount:deploy@project.iam.gserviceaccount.com",
  ]
}
```

My recommendation: use `google_project_iam_member` unless you have a specific reason to be authoritative. It is much safer for incremental adoption.

## Creating Service Accounts

Service accounts are machine identities. Every application and service should have its own service account with minimal permissions:

```hcl
# service_accounts.tf - Application service accounts

# Service account for the web application
resource "google_service_account" "web_app" {
  account_id   = "web-app"
  display_name = "Web Application Service Account"
  description  = "Used by the web application to access Cloud SQL and Cloud Storage"
  project      = var.project_id
}

# Service account for the background worker
resource "google_service_account" "worker" {
  account_id   = "background-worker"
  display_name = "Background Worker Service Account"
  description  = "Used by background job processors to access Pub/Sub and Cloud Storage"
  project      = var.project_id
}

# Service account for CI/CD deployments
resource "google_service_account" "deployer" {
  account_id   = "ci-deployer"
  display_name = "CI/CD Deployer Service Account"
  description  = "Used by CI/CD pipeline to deploy services"
  project      = var.project_id
}
```

## Assigning Roles to Service Accounts

Follow the principle of least privilege - only grant the permissions each service actually needs:

```hcl
# iam_bindings.tf - Role assignments for service accounts

# Web app needs Cloud SQL access and Cloud Storage read
resource "google_project_iam_member" "web_app_sql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.web_app.email}"
}

resource "google_project_iam_member" "web_app_storage" {
  project = var.project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.web_app.email}"
}

# Background worker needs Pub/Sub subscriber and Storage writer
resource "google_project_iam_member" "worker_pubsub" {
  project = var.project_id
  role    = "roles/pubsub.subscriber"
  member  = "serviceAccount:${google_service_account.worker.email}"
}

resource "google_project_iam_member" "worker_storage" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.worker.email}"
}

# Deployer needs permissions to manage Cloud Run and GKE
resource "google_project_iam_member" "deployer_run" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.deployer.email}"
}

resource "google_project_iam_member" "deployer_gke" {
  project = var.project_id
  role    = "roles/container.developer"
  member  = "serviceAccount:${google_service_account.deployer.email}"
}
```

## Using for_each for Cleaner IAM Management

When a service account needs multiple roles, using `for_each` keeps the code clean:

```hcl
# Clean IAM assignment using for_each
locals {
  web_app_roles = [
    "roles/cloudsql.client",
    "roles/storage.objectViewer",
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
    "roles/cloudtrace.agent",
  ]

  worker_roles = [
    "roles/pubsub.subscriber",
    "roles/storage.objectAdmin",
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
  ]
}

resource "google_project_iam_member" "web_app_roles" {
  for_each = toset(local.web_app_roles)

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.web_app.email}"
}

resource "google_project_iam_member" "worker_roles" {
  for_each = toset(local.worker_roles)

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.worker.email}"
}
```

## Creating Custom Roles

When predefined roles give too much or too little access, create custom roles:

```hcl
# custom_roles.tf - Custom IAM roles with specific permissions

# A role that only allows reading and listing specific resource types
resource "google_project_iam_custom_role" "app_reader" {
  role_id     = "appReader"
  title       = "Application Reader"
  description = "Read-only access to application-related resources"
  project     = var.project_id

  permissions = [
    "compute.instances.get",
    "compute.instances.list",
    "run.services.get",
    "run.services.list",
    "cloudsql.instances.get",
    "cloudsql.instances.list",
    "logging.logEntries.list",
    "monitoring.timeSeries.list",
  ]
}

# Assign the custom role
resource "google_project_iam_member" "dev_app_reader" {
  project = var.project_id
  role    = google_project_iam_custom_role.app_reader.id
  member  = "group:developers@example.com"
}
```

## Workload Identity for GKE

For GKE workloads, use Workload Identity instead of service account keys:

```hcl
# workload_identity.tf - Bind Kubernetes service accounts to GCP service accounts

# Allow the Kubernetes service account to impersonate the GCP service account
resource "google_service_account_iam_member" "workload_identity_binding" {
  service_account_id = google_service_account.web_app.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[default/web-app]"
}
```

## Resource-Level IAM

Some resources need their own IAM policies separate from project-level IAM:

```hcl
# Bucket-level IAM - grant specific access to a single bucket
resource "google_storage_bucket_iam_member" "uploads_writer" {
  bucket = google_storage_bucket.uploads.name
  role   = "roles/storage.objectCreator"
  member = "serviceAccount:${google_service_account.web_app.email}"
}

# Pub/Sub topic-level IAM
resource "google_pubsub_topic_iam_member" "publisher" {
  topic  = google_pubsub_topic.events.name
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:${google_service_account.web_app.email}"
}

# Secret Manager - grant access to specific secrets
resource "google_secret_manager_secret_iam_member" "db_password_accessor" {
  secret_id = google_secret_manager_secret.db_password.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.web_app.email}"
}
```

## Conditional IAM Bindings

Use IAM conditions for time-limited or context-based access:

```hcl
# Grant access only during business hours
resource "google_project_iam_member" "conditional_access" {
  project = var.project_id
  role    = "roles/compute.admin"
  member  = "user:contractor@example.com"

  condition {
    title       = "business_hours_only"
    description = "Access limited to business hours"
    expression  = "request.time.getHours('America/New_York') >= 9 && request.time.getHours('America/New_York') <= 17"
  }
}

# Grant temporary access that expires
resource "google_project_iam_member" "temporary_access" {
  project = var.project_id
  role    = "roles/viewer"
  member  = "user:auditor@example.com"

  condition {
    title       = "expires_march_2026"
    description = "Temporary access for Q1 2026 audit"
    expression  = "request.time < timestamp('2026-04-01T00:00:00Z')"
  }
}
```

## Auditing IAM Configuration

Create outputs that help you review the current IAM setup:

```hcl
# outputs.tf - IAM configuration outputs for review
output "service_accounts" {
  description = "Service accounts managed by Terraform"
  value = {
    web_app = google_service_account.web_app.email
    worker  = google_service_account.worker.email
    deployer = google_service_account.deployer.email
  }
}
```

## Best Practices

1. **Use google_project_iam_member** for incremental IAM management. Avoid `iam_policy` unless you fully control all IAM.
2. **Prefer groups over individual users.** Grant roles to Google Groups, then manage group membership outside Terraform.
3. **Use resource-level IAM** when possible. Granting `storage.objectViewer` at the project level gives access to all buckets. Grant it on specific buckets instead.
4. **Never create service account keys** through Terraform. Use Workload Identity or impersonation instead.
5. **Review IAM changes carefully** in pull requests. A single wrong role can expose your entire project.
6. **Use custom roles** to follow least privilege when predefined roles are too broad.
7. **Add conditions** for temporary access instead of granting and manually revoking later.

## Wrapping Up

Managing GCP IAM with Terraform brings discipline and auditability to your access control. Every permission change goes through code review, every binding is documented in code, and you can reproduce your security posture across environments. Start with `google_project_iam_member` for safety, use service accounts for every application, and follow least privilege consistently. Your security auditors will thank you.
