# How to Set Up GCP Organizations with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GCP, Organization, Folders, Infrastructure as Code

Description: Learn how to set up and manage GCP Organization structure with OpenTofu, including folders, projects, and IAM bindings for governance at scale.

GCP Organizations provide a hierarchy of organization, folders, and projects. Organization-level IAM policies and organization policies apply across descendant resources, while billing is linked to projects through Cloud Billing accounts. OpenTofu lets you define the folder structure and project hierarchy as code.

## Getting the Organization

```hcl
data "google_organization" "main" {
  domain = "mycompany.com"  # Your Google Workspace domain
}

output "organization_id" {
  value = data.google_organization.main.org_id
}
```

## Creating Folders

```hcl
# Top-level folders

resource "google_folder" "workloads" {
  display_name = "workloads"
  parent       = "organizations/${data.google_organization.main.org_id}"
}

resource "google_folder" "platform" {
  display_name = "platform"
  parent       = "organizations/${data.google_organization.main.org_id}"
}

resource "google_folder" "sandbox" {
  display_name = "sandbox"
  parent       = "organizations/${data.google_organization.main.org_id}"
}

# Sub-folders
resource "google_folder" "production" {
  display_name = "production"
  parent       = google_folder.workloads.name
}

resource "google_folder" "nonprod" {
  display_name = "nonprod"
  parent       = google_folder.workloads.name
}
```

## Creating Projects Under Folders

```hcl
resource "google_project" "production_app" {
  name            = "mycompany-production-app"
  project_id      = "mycompany-prod-app"
  folder_id       = google_folder.production.name
  billing_account = var.billing_account_id
}

resource "google_project" "staging_app" {
  name            = "mycompany-staging-app"
  project_id      = "mycompany-staging-app"
  folder_id       = google_folder.nonprod.name
  billing_account = var.billing_account_id
}
```

## Organization-Level IAM Policies

```hcl
# Grant Organization Admin to the platform team
resource "google_organization_iam_binding" "org_admin" {
  org_id = data.google_organization.main.org_id
  role   = "roles/resourcemanager.organizationAdmin"

  members = [
    "group:platform-team@mycompany.com",
  ]
}

# Grant Viewer to all employees at org level
resource "google_organization_iam_binding" "org_viewer" {
  org_id = data.google_organization.main.org_id
  role   = "roles/viewer"

  members = [
    "domain:mycompany.com",  # All users in the domain
  ]
}
```

## Organization Policies (Constraints)

```hcl
# Restrict resource creation to approved regions
resource "google_org_policy_policy" "restrict_locations" {
  name   = "${data.google_organization.main.name}/policies/gcp.resourceLocations"
  parent = data.google_organization.main.name

  spec {
    rules {
      values {
        allowed_values = [
          "in:us-locations",
          "in:europe-locations",
        ]
      }
    }
  }
}

# Require OS Login for VMs
resource "google_org_policy_policy" "require_os_login" {
  name   = "${data.google_organization.main.name}/policies/compute.requireOsLogin"
  parent = data.google_organization.main.name

  spec {
    rules {
      enforce = "TRUE"
    }
  }
}
```

## Folder-Level IAM

```hcl
resource "google_folder_iam_binding" "workloads_editor" {
  folder = google_folder.workloads.name
  role   = "roles/editor"

  members = [
    "group:developers@mycompany.com",
  ]
}
```

## Conclusion

GCP Organization management with OpenTofu starts with getting the organization data source, then creating folders and projects to mirror your team structure. Apply organization constraints to enforce security baselines across all projects, use folder-level IAM for team access, and create projects under the appropriate folder for policy inheritance, with each project linked to the intended billing account.
