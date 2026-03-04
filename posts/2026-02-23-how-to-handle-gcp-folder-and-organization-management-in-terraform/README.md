# How to Handle GCP Folder and Organization Management in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Resource Hierarchy, Organizations, Folders, Infrastructure as Code

Description: Learn how to manage GCP organization structure, folders, and resource hierarchy using Terraform for scalable cloud governance.

---

The GCP resource hierarchy is the skeleton of your cloud environment. At the top sits the organization, below it are folders (which can be nested), and at the bottom are projects containing actual resources. Getting this hierarchy right is critical because IAM policies, organization policies, and billing configurations all inherit down the tree. A well-structured hierarchy makes governance easy. A poorly structured one creates a mess of exceptions and overrides.

Terraform is the right tool for managing this hierarchy because changes to folder structure and organization-level policies affect everything beneath them. You want these changes reviewed, approved, and tracked in version control. This guide covers managing the GCP resource hierarchy with Terraform.

## Reading the Organization

You typically do not create the organization itself with Terraform - that is set up when you verify your domain with Google. But you do reference it.

```hcl
# Look up the organization by domain
data "google_organization" "org" {
  domain = var.org_domain
}

# Output the org ID for reference
output "organization_id" {
  value = data.google_organization.org.org_id
}

output "organization_name" {
  value = data.google_organization.org.name
}
```

## Creating the Folder Structure

A common pattern is to organize folders by environment, team, or a combination of both.

```hcl
# Top-level folders for environments
resource "google_folder" "environments" {
  for_each = toset(["Production", "Staging", "Development", "Sandbox"])

  display_name = each.value
  parent       = "organizations/${data.google_organization.org.org_id}"
}

# Team folders under each environment
resource "google_folder" "team_folders" {
  for_each = {
    for pair in setproduct(
      ["Production", "Staging", "Development"],
      ["platform", "data", "ml", "frontend"]
    ) : "${pair[0]}-${pair[1]}" => {
      environment = pair[0]
      team        = pair[1]
    }
  }

  display_name = "Team - ${title(each.value.team)}"
  parent       = google_folder.environments[each.value.environment].name
}
```

An alternative, flatter structure that some organizations prefer:

```hcl
# Folders organized by business unit
resource "google_folder" "business_units" {
  for_each = {
    engineering = "Engineering"
    finance     = "Finance"
    marketing   = "Marketing"
    shared      = "Shared Services"
  }

  display_name = each.value
  parent       = "organizations/${data.google_organization.org.org_id}"
}

# Sub-folders for environments within each business unit
resource "google_folder" "bu_environments" {
  for_each = {
    for pair in setproduct(
      keys(google_folder.business_units),
      ["prod", "nonprod"]
    ) : "${pair[0]}-${pair[1]}" => {
      bu  = pair[0]
      env = pair[1]
    }
  }

  display_name = title(each.value.env)
  parent       = google_folder.business_units[each.value.bu].name
}
```

## Folder-Level IAM

IAM bindings at the folder level are inherited by all projects within the folder. This is powerful for granting team-wide access.

```hcl
# Grant team leads editor access to their team's production folder
resource "google_folder_iam_member" "team_leads" {
  for_each = {
    platform = "group:platform-leads@example.com"
    data     = "group:data-leads@example.com"
    ml       = "group:ml-leads@example.com"
    frontend = "group:frontend-leads@example.com"
  }

  folder = google_folder.team_folders["Production-${each.key}"].name
  role   = "roles/editor"
  member = each.value
}

# Grant developers viewer access to production
resource "google_folder_iam_member" "dev_prod_viewer" {
  folder = google_folder.environments["Production"].name
  role   = "roles/viewer"
  member = "group:all-developers@example.com"
}

# Grant developers editor access to development
resource "google_folder_iam_member" "dev_dev_editor" {
  folder = google_folder.environments["Development"].name
  role   = "roles/editor"
  member = "group:all-developers@example.com"
}

# Security team gets security reviewer across the entire org
resource "google_organization_iam_member" "security_reviewer" {
  org_id = data.google_organization.org.org_id
  role   = "roles/iam.securityReviewer"
  member = "group:security-team@example.com"
}
```

## Organization-Level IAM

Some roles only make sense at the organization level.

```hcl
# Organization administrators
resource "google_organization_iam_member" "org_admins" {
  for_each = toset([
    "group:org-admins@example.com",
  ])

  org_id = data.google_organization.org.org_id
  role   = "roles/resourcemanager.organizationAdmin"
  member = each.value
}

# Billing administrators
resource "google_organization_iam_member" "billing_admins" {
  org_id = data.google_organization.org.org_id
  role   = "roles/billing.admin"
  member = "group:billing-admins@example.com"
}

# Network administrators (for Shared VPC)
resource "google_organization_iam_member" "network_admins" {
  org_id = data.google_organization.org.org_id
  role   = "roles/compute.xpnAdmin"
  member = "group:network-admins@example.com"
}

# Audit log viewers
resource "google_organization_iam_member" "audit_viewers" {
  org_id = data.google_organization.org.org_id
  role   = "roles/logging.viewer"
  member = "group:compliance-team@example.com"
}
```

## Managing Tags

Tags let you categorize resources for policy evaluation and cost tracking.

```hcl
# Create a tag key for environment classification
resource "google_tags_tag_key" "environment" {
  parent      = "organizations/${data.google_organization.org.org_id}"
  short_name  = "environment"
  description = "Environment classification for resources"

  purpose = "GCE_FIREWALL"

  purpose_data = {
    network = "${var.project_id}/${var.network_name}"
  }
}

# Tag values
resource "google_tags_tag_value" "prod" {
  parent      = google_tags_tag_key.environment.id
  short_name  = "production"
  description = "Production environment"
}

resource "google_tags_tag_value" "staging" {
  parent      = google_tags_tag_key.environment.id
  short_name  = "staging"
  description = "Staging environment"
}

resource "google_tags_tag_value" "dev" {
  parent      = google_tags_tag_key.environment.id
  short_name  = "development"
  description = "Development environment"
}

# Bind tags to folders
resource "google_tags_tag_binding" "prod_folder" {
  parent    = "//cloudresourcemanager.googleapis.com/${google_folder.environments["Production"].name}"
  tag_value = google_tags_tag_value.prod.id
}
```

## Billing Account Management

While you cannot create billing accounts with Terraform, you can manage the association.

```hcl
# Look up existing billing accounts
data "google_billing_account" "main" {
  display_name = "Main Billing Account"
  open         = true
}

# Associate billing with a project
resource "google_project" "new_project" {
  name            = "New Project"
  project_id      = "new-project-${random_id.suffix.hex}"
  folder_id       = google_folder.team_folders["Development-platform"].name
  billing_account = data.google_billing_account.main.id

  auto_create_network = false
}
```

## A Complete Hierarchy Example

Here is a real-world hierarchy structure for a mid-sized company.

```hcl
locals {
  # Define the folder structure as data
  hierarchy = {
    "Shared Services" = {
      subfolders = ["Networking", "Security", "Logging"]
    }
    "Production" = {
      subfolders = ["Platform", "Data", "ML", "Frontend"]
    }
    "Non-Production" = {
      subfolders = ["Staging", "Development", "QA"]
    }
    "Sandbox" = {
      subfolders = []
    }
  }
}

# First level folders
resource "google_folder" "l1" {
  for_each = local.hierarchy

  display_name = each.key
  parent       = "organizations/${data.google_organization.org.org_id}"
}

# Second level folders
resource "google_folder" "l2" {
  for_each = merge([
    for parent, config in local.hierarchy : {
      for sub in config.subfolders :
      "${parent}/${sub}" => {
        display_name = sub
        parent_key   = parent
      }
    }
  ]...)

  display_name = each.value.display_name
  parent       = google_folder.l1[each.value.parent_key].name
}
```

## Moving Projects Between Folders

Terraform can move projects between folders by changing the `folder_id` attribute. Be careful though - this also changes which IAM policies and organization policies apply to the project.

```hcl
# Moving a project from dev to staging
resource "google_project" "movable_project" {
  name            = "My App"
  project_id      = "my-app-12ab"
  folder_id       = google_folder.l2["Non-Production/Staging"].name  # Changed from Development
  billing_account = var.billing_account_id
}
```

## Importing Existing Hierarchy

If your organization already has a folder structure, import it into Terraform.

```bash
# Import an existing folder
terraform import google_folder.environments[\"Production\"] folders/FOLDER_ID

# Import an organization IAM binding
terraform import google_organization_iam_member.org_admins "ORG_ID roles/resourcemanager.organizationAdmin group:org-admins@example.com"
```

## Best Practices

Keep the hierarchy shallow. GCP supports up to 10 levels of folder nesting, but more than 3 levels becomes hard to navigate and debug.

Use groups for IAM bindings, not individual users. When someone joins or leaves a team, you update the group membership rather than the IAM configuration.

Apply organization policies at the highest level that makes sense, then override at lower levels for exceptions. This is easier to audit than applying policies at the project level.

Put the organization hierarchy Terraform configuration in its own repository with restricted access. Changes to the hierarchy affect everyone, so they should be reviewed carefully.

## Conclusion

The GCP resource hierarchy is the foundation of your cloud governance. A well-designed folder structure makes IAM management, policy enforcement, and cost tracking straightforward. Terraform lets you define this structure as code, track changes over time, and ensure consistency. Start with a simple hierarchy, add complexity as needed, and always test IAM changes in non-production folders before applying them to production.

For related topics, see our guide on [handling GCP project creation with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-gcp-project-creation-with-terraform/view).
