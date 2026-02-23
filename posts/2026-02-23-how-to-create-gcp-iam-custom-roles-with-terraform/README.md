# How to Create GCP IAM Custom Roles with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, IAM, Custom Roles, Security, Infrastructure as Code

Description: Learn how to create and manage Google Cloud IAM custom roles using Terraform to implement fine-grained, least-privilege access control.

---

Google Cloud provides hundreds of predefined IAM roles, but sometimes none of them fit what you need. A predefined role might include 50 permissions when your application only needs 5. Or you might need a combination of permissions that does not exist in any single predefined role. That is where custom roles come in.

Custom roles let you define exactly which permissions to grant - nothing more, nothing less. Combined with Terraform, you get version-controlled, reviewable, and reproducible role definitions. This guide covers creating custom roles at both the project and organization level, handling the quirks of the GCP custom roles API, and building a maintainable role management system.

## Project-Level Custom Roles

The most common use case is creating a custom role scoped to a specific project.

```hcl
# Custom role for an application that needs to read from Pub/Sub
# and write to BigQuery, but nothing else
resource "google_project_iam_custom_role" "pubsub_to_bigquery" {
  role_id     = "pubsubToBigquery"
  project     = var.project_id
  title       = "Pub/Sub to BigQuery Pipeline"
  description = "Minimal permissions for a service that reads Pub/Sub messages and writes to BigQuery"

  permissions = [
    # Pub/Sub read permissions
    "pubsub.subscriptions.consume",
    "pubsub.subscriptions.get",
    "pubsub.subscriptions.list",

    # BigQuery write permissions
    "bigquery.tables.get",
    "bigquery.tables.getData",
    "bigquery.tables.updateData",
    "bigquery.datasets.get",
    "bigquery.jobs.create",
  ]

  # ALPHA, BETA, or GA - determines the lifecycle stage
  stage = "GA"
}
```

## Organization-Level Custom Roles

If you need the same custom role across multiple projects, define it at the organization level. Projects within the organization can then reference it.

```hcl
# Organization-level custom role
resource "google_organization_iam_custom_role" "security_auditor" {
  role_id = "securityAuditor"
  org_id  = var.org_id
  title   = "Security Auditor"
  description = "Read-only access to security-related configurations across all projects"

  permissions = [
    # IAM audit permissions
    "iam.roles.list",
    "iam.roles.get",
    "iam.serviceAccounts.list",
    "iam.serviceAccounts.get",
    "resourcemanager.projects.getIamPolicy",

    # Network security
    "compute.firewalls.list",
    "compute.firewalls.get",
    "compute.networks.list",
    "compute.subnetworks.list",

    # Logging
    "logging.logEntries.list",
    "logging.logs.list",

    # Security Command Center
    "securitycenter.findings.list",
    "securitycenter.findings.get",
    "securitycenter.sources.list",
  ]

  stage = "GA"
}
```

## Using Custom Roles in Bindings

After creating a custom role, use it in IAM bindings just like a predefined role.

```hcl
# Bind the custom role to a service account
resource "google_project_iam_member" "pipeline_binding" {
  project = var.project_id
  role    = google_project_iam_custom_role.pubsub_to_bigquery.id
  member  = "serviceAccount:${google_service_account.pipeline_sa.email}"
}

# For organization-level roles, reference with the full path
resource "google_project_iam_member" "auditor_binding" {
  project = var.project_id
  role    = google_organization_iam_custom_role.security_auditor.id
  member  = "group:security-team@example.com"
}
```

## Managing Multiple Custom Roles with a Module

When you have many custom roles, a module keeps things organized.

```hcl
# modules/custom-role/main.tf
variable "project_id" {
  type = string
}

variable "role_id" {
  type = string
}

variable "title" {
  type = string
}

variable "description" {
  type    = string
  default = ""
}

variable "permissions" {
  type = list(string)
}

variable "stage" {
  type    = string
  default = "GA"
}

resource "google_project_iam_custom_role" "role" {
  role_id     = var.role_id
  project     = var.project_id
  title       = var.title
  description = var.description
  permissions = var.permissions
  stage       = var.stage
}

output "role_id" {
  value = google_project_iam_custom_role.role.id
}
```

Then use the module for each role:

```hcl
# Define custom roles using the module
module "storage_reader_role" {
  source = "./modules/custom-role"

  project_id  = var.project_id
  role_id     = "storageReader"
  title       = "Storage Object Reader"
  description = "Read-only access to specific GCS objects"

  permissions = [
    "storage.objects.get",
    "storage.objects.list",
    "storage.buckets.get",
  ]
}

module "monitoring_viewer_role" {
  source = "./modules/custom-role"

  project_id  = var.project_id
  role_id     = "monitoringViewer"
  title       = "Monitoring Metrics Viewer"
  description = "View metrics and dashboards without creating alerts"

  permissions = [
    "monitoring.metricDescriptors.get",
    "monitoring.metricDescriptors.list",
    "monitoring.timeSeries.list",
    "monitoring.dashboards.get",
    "monitoring.dashboards.list",
  ]
}
```

## Defining Roles with Data Sources

You can use the `google_iam_testable_permissions` data source to discover which permissions are available for a resource and then build roles dynamically.

```hcl
# List all testable permissions for a project
data "google_iam_testable_permissions" "project_permissions" {
  full_resource_name = "//cloudresourcemanager.googleapis.com/projects/${var.project_id}"

  # Only include GA permissions
  stages = ["GA"]
}

# You can filter these in a local to build role definitions
locals {
  # Get all compute read permissions
  compute_read_permissions = [
    for p in data.google_iam_testable_permissions.project_permissions.permissions :
    p.name if startswith(p.name, "compute.") && (
      endswith(p.name, ".get") || endswith(p.name, ".list")
    )
  ]
}

# Create a role from the filtered permissions
resource "google_project_iam_custom_role" "compute_reader" {
  role_id     = "computeReader"
  project     = var.project_id
  title       = "Compute Read-Only"
  description = "Read-only access to all Compute Engine resources"
  permissions = local.compute_read_permissions
  stage       = "GA"
}
```

## Handling Role Updates

Custom roles have some behaviors during updates that you should be aware of.

Adding permissions to an existing custom role works fine. Terraform will update the role in place. But removing permissions can break applications that depend on those permissions, so be careful.

If you delete a custom role, it enters a "deleted" state for 7 days before being permanently removed. During that time, the role ID cannot be reused. If Terraform tries to recreate a role with the same ID, it will fail. You can undelete the role or wait for the 7-day period to pass.

```hcl
# If you need to handle the undelete case, use a lifecycle block
resource "google_project_iam_custom_role" "app_role" {
  role_id     = "applicationRole"
  project     = var.project_id
  title       = "Application Role"
  description = "Custom permissions for the application"

  permissions = [
    "storage.objects.get",
    "storage.objects.create",
    "pubsub.topics.publish",
  ]

  stage = "GA"

  # This helps with the case where a role was soft-deleted
  # and needs to be recreated
  lifecycle {
    create_before_destroy = true
  }
}
```

## Permission Testing

Before deploying a custom role to production, it is a good idea to validate that the permissions you listed actually exist and are compatible.

```hcl
# Use a data source to validate permissions are real
data "google_iam_testable_permissions" "validate" {
  full_resource_name = "//cloudresourcemanager.googleapis.com/projects/${var.project_id}"
  stages             = ["GA", "BETA"]
}

locals {
  # Build a set of all valid permissions
  valid_permissions = toset([
    for p in data.google_iam_testable_permissions.validate.permissions : p.name
  ])

  # Permissions you want in your custom role
  desired_permissions = toset([
    "storage.objects.get",
    "storage.objects.list",
    "storage.buckets.get",
  ])

  # Check if all desired permissions are valid
  invalid_permissions = setsubtract(local.desired_permissions, local.valid_permissions)
}

# This will fail the plan if any permissions are invalid
resource "null_resource" "permission_check" {
  count = length(local.invalid_permissions) > 0 ? "Invalid permissions found" : 0
}
```

## Naming Conventions

Consistent naming makes custom roles easier to manage at scale. Here is a pattern that works well:

- Use camelCase for `role_id` (GCP requires this)
- Prefix with the service or team name: `dataTeamBigQueryWriter`
- Use descriptive titles: "Data Team - BigQuery Writer"
- Always include a description explaining why this role exists and what it is for

```hcl
# Well-named custom role
resource "google_project_iam_custom_role" "dataTeamBigQueryWriter" {
  role_id     = "dataTeamBigQueryWriter"
  project     = var.project_id
  title       = "Data Team - BigQuery Writer"
  description = "Allows the data team pipeline service accounts to create and update BigQuery tables and run load jobs. Created because roles/bigquery.dataEditor includes delete permissions we do not want to grant."

  permissions = [
    "bigquery.datasets.get",
    "bigquery.tables.create",
    "bigquery.tables.get",
    "bigquery.tables.getData",
    "bigquery.tables.list",
    "bigquery.tables.updateData",
    "bigquery.jobs.create",
  ]

  stage = "GA"
}
```

## Conclusion

Custom IAM roles are one of the best ways to enforce least-privilege access in GCP. Predefined roles are convenient but often too broad. By defining custom roles in Terraform, you document exactly what permissions each component of your system needs, you can review changes in pull requests, and you can replicate the same access controls across environments. Start by identifying predefined roles that are too permissive for your use case, figure out the minimum set of permissions needed, and create a custom role that fits exactly.

For more on GCP IAM with Terraform, see our guide on [managing GCP IAM roles and service accounts using Terraform](https://oneuptime.com/blog/post/2026-02-17-how-to-manage-gcp-iam-roles-and-service-accounts-using-terraform/view).
