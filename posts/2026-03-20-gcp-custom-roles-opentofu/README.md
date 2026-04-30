# How to Create GCP Custom Roles with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GCP, IAM, Custom Roles, Google Cloud, Least Privilege, Infrastructure as Code

Description: Learn how to define and manage custom GCP IAM roles using OpenTofu to implement fine-grained permissions that go beyond predefined roles.

---

GCP's predefined roles are convenient but often grant more permissions than needed. Custom roles let you select exactly which permissions to include, enabling true least-privilege access. OpenTofu manages custom roles at both the project and organization level.

## Custom Roles vs Predefined Roles

Custom roles are scoped to either a project or an organization. Project-level custom roles are ideal for application-specific permissions, while organization-level roles can be reused across multiple projects.

## Creating a Project-Level Custom Role

```hcl
# main.tf

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.10"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Custom role allowing read-only access to Cloud SQL instances
resource "google_project_iam_custom_role" "cloudsql_reader" {
  role_id     = "cloudSQLReader"
  title       = "Cloud SQL Reader"
  description = "Read-only access to Cloud SQL instances and databases"
  project     = var.project_id

  permissions = [
    "cloudsql.instances.get",
    "cloudsql.instances.list",
    "cloudsql.databases.get",
    "cloudsql.databases.list",
    "cloudsql.users.list",
  ]

  # ALPHA, BETA, or GA - use GA for stability
  stage = "GA"
}
```

## Creating a CI/CD Deployer Custom Role

This role grants the permissions needed to deploy an existing Artifact Registry image to Cloud Run.

```hcl
# cicd_role.tf
resource "google_project_iam_custom_role" "cicd_deployer" {
  role_id     = "cicdDeployer"
  title       = "CI/CD Deployer"
  description = "Permissions required for CI/CD pipelines to deploy to Cloud Run from Artifact Registry"
  project     = var.project_id

  permissions = [
    # Cloud Run
    "run.services.create",
    "run.services.update",
    "run.services.get",
    "run.operations.get",

    # Artifact Registry
    "artifactregistry.repositories.downloadArtifacts",

    # IAM (to use the Cloud Run service identity)
    "iam.serviceAccounts.actAs",
  ]

  stage = "GA"
}

# Assign the custom role to the CI/CD service account
resource "google_project_iam_member" "cicd_role_binding" {
  project = var.project_id
  role    = google_project_iam_custom_role.cicd_deployer.name
  member  = "serviceAccount:${google_service_account.cicd.email}"
}
```

## Creating an Organization-Level Custom Role

Organization roles can be granted on the organization and on resources within it, making them reusable across multiple projects.

```hcl
# org_role.tf
resource "google_organization_iam_custom_role" "billing_viewer" {
  role_id     = "billingViewer"
  org_id      = var.organization_id
  title       = "Billing Viewer"
  description = "Read-only access to billing accounts, budgets, and spend data across the organization"

  permissions = [
    "billing.accounts.get",
    "billing.accounts.list",
    "billing.accounts.getSpendingInformation",
    "billing.budgets.get",
    "billing.budgets.list",
  ]

  stage = "GA"
}
```

## Disabling vs Deleting Custom Roles

If you need to phase out a custom role, disable it first rather than deleting it immediately. A disabled role remains defined, but its bindings no longer have any effect.

```hcl
# deprecated_role.tf
# Set stage to DISABLED to deactivate the role without permanently deleting it
resource "google_project_iam_custom_role" "legacy_role" {
  role_id     = "legacyAppRole"
  title       = "Legacy App Role (Deprecated)"
  description = "This role is being phased out. Do not assign to new principals."
  project     = var.project_id

  permissions = [
    "storage.objects.get",
  ]

  # Existing bindings remain in IAM policies but have no effect
  stage = "DISABLED"
}
```

## Best Practices

- Use `tofu plan` before applying custom role changes to see exactly which permissions are being added or removed.
- Test custom roles in a non-production project before deploying to production.
- Use the GCP Permissions Reference (cloud.google.com/iam/docs/permissions-reference) to discover available permissions.
- Follow a naming convention like `<team>.<purpose>Role` for role IDs to keep them organized.
- Set the `stage` field to `GA` for stable production roles - avoid `ALPHA` roles that may have breaking changes.
