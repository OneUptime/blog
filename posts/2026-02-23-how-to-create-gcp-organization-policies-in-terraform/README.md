# How to Create GCP Organization Policies in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Organization Policies, Security, Governance, Infrastructure as Code

Description: Learn how to create and manage Google Cloud Organization Policies using Terraform to enforce governance rules across your entire GCP organization.

---

Google Cloud Organization Policies provide centralized governance controls that apply across your entire GCP organization, folders, or projects. These policies let you define constraints that restrict how resources can be configured, helping you enforce compliance and security standards. This guide shows you how to manage Organization Policies effectively using Terraform.

## Understanding Organization Policies

Organization Policies work through constraints. Google provides a set of predefined constraints covering areas like compute, storage, networking, and IAM. You apply these constraints at the organization, folder, or project level, and they cascade down the resource hierarchy. You can also create custom constraints for more specific governance needs.

## Setting Up the Provider

```hcl
# Configure the Google Cloud provider with organization access
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
  type = string
}

variable "organization_id" {
  type        = string
  description = "GCP organization ID"
}
```

## Restricting Resource Locations

One of the most common organization policies restricts where resources can be created:

```hcl
# Restrict resource locations to specific regions
resource "google_organization_policy" "resource_locations" {
  org_id     = var.organization_id
  constraint = "constraints/gcp.resourceLocations"

  list_policy {
    allow {
      values = [
        "in:us-locations",
        "in:eu-locations"
      ]
    }
  }
}

# Apply a more restrictive location policy to a specific folder
resource "google_folder_organization_policy" "production_locations" {
  folder     = google_folder.production.name
  constraint = "constraints/gcp.resourceLocations"

  list_policy {
    allow {
      values = [
        "us-central1",
        "us-east1",
        "europe-west1"
      ]
    }
  }
}

# Create folder structure
resource "google_folder" "production" {
  display_name = "Production"
  parent       = "organizations/${var.organization_id}"
}
```

## Disabling Service Account Key Creation

Preventing the creation of service account keys is a key security practice:

```hcl
# Disable service account key creation across the organization
resource "google_organization_policy" "disable_sa_key_creation" {
  org_id     = var.organization_id
  constraint = "constraints/iam.disableServiceAccountKeyCreation"

  boolean_policy {
    enforced = true
  }
}

# Allow key creation for a specific project that needs it
resource "google_project_organization_policy" "allow_sa_keys_legacy" {
  project    = "legacy-integration-project"
  constraint = "constraints/iam.disableServiceAccountKeyCreation"

  boolean_policy {
    enforced = false
  }
}
```

## Restricting VM External IP Addresses

Control which VMs can have external IP addresses:

```hcl
# Deny external IP addresses on VMs by default
resource "google_organization_policy" "vm_external_ip" {
  org_id     = var.organization_id
  constraint = "constraints/compute.vmExternalIpAccess"

  list_policy {
    deny {
      all = true
    }
  }
}

# Allow external IPs for specific projects (like DMZ)
resource "google_project_organization_policy" "dmz_external_ip" {
  project    = var.dmz_project_id
  constraint = "constraints/compute.vmExternalIpAccess"

  list_policy {
    allow {
      all = true
    }
  }
}

variable "dmz_project_id" {
  type = string
}
```

## Enforcing Uniform Bucket-Level Access

Ensure all Cloud Storage buckets use uniform bucket-level access:

```hcl
# Require uniform bucket-level access for all storage buckets
resource "google_organization_policy" "uniform_bucket_access" {
  org_id     = var.organization_id
  constraint = "constraints/storage.uniformBucketLevelAccess"

  boolean_policy {
    enforced = true
  }
}
```

## Restricting Shared VPC Host Projects

Control which projects can be Shared VPC hosts:

```hcl
# Restrict which projects can serve as Shared VPC hosts
resource "google_organization_policy" "shared_vpc_host" {
  org_id     = var.organization_id
  constraint = "constraints/compute.restrictSharedVpcHostProjects"

  list_policy {
    allow {
      values = [
        "projects/${var.network_hub_project_id}"
      ]
    }
  }
}

variable "network_hub_project_id" {
  type        = string
  description = "Project ID for the network hub"
}
```

## Disabling Default Network Creation

Prevent automatic creation of the default VPC network in new projects:

```hcl
# Skip default network creation in new projects
resource "google_organization_policy" "skip_default_network" {
  org_id     = var.organization_id
  constraint = "constraints/compute.skipDefaultNetworkCreation"

  boolean_policy {
    enforced = true
  }
}
```

## Restricting Allowed APIs and Services

Control which GCP services can be used:

```hcl
# Restrict which services can be enabled
resource "google_organization_policy" "restrict_services" {
  org_id     = var.organization_id
  constraint = "constraints/serviceuser.services"

  list_policy {
    deny {
      values = [
        "deploymentmanager.googleapis.com",
        "dataflow.googleapis.com"
      ]
    }
  }
}
```

## Domain Restricted Sharing

Ensure resources can only be shared with specific domains:

```hcl
# Restrict sharing to only your organization's domain
resource "google_organization_policy" "domain_restricted_sharing" {
  org_id     = var.organization_id
  constraint = "constraints/iam.allowedPolicyMemberDomains"

  list_policy {
    allow {
      values = [
        "C0xxxxxxx",  # Your Google Workspace customer ID
      ]
    }
  }
}
```

## Creating Custom Organization Policy Constraints

For governance rules not covered by predefined constraints, create custom constraints:

```hcl
# Create a custom constraint to enforce labels on GCE instances
resource "google_org_policy_custom_constraint" "require_vm_labels" {
  name         = "custom.requireVmLabels"
  parent       = "organizations/${var.organization_id}"
  display_name = "Require Labels on VMs"
  description  = "All Compute Engine instances must have an environment and team label"

  action_type    = "ALLOW"
  condition      = "resource.labels.environment != null && resource.labels.team != null"
  method_types   = ["CREATE", "UPDATE"]
  resource_types = ["compute.googleapis.com/Instance"]
}

# Apply the custom constraint as an organization policy
resource "google_organization_policy" "enforce_vm_labels" {
  org_id     = var.organization_id
  constraint = "custom.requireVmLabels"

  boolean_policy {
    enforced = true
  }

  depends_on = [google_org_policy_custom_constraint.require_vm_labels]
}
```

## Managing Policies Across the Hierarchy

Apply different policies at different levels of the resource hierarchy:

```hcl
# Organization-wide policy: restrict locations broadly
resource "google_organization_policy" "org_locations" {
  org_id     = var.organization_id
  constraint = "constraints/gcp.resourceLocations"

  list_policy {
    allow {
      values = ["in:us-locations", "in:eu-locations"]
    }
  }
}

# Folder-level policy: further restrict for production
resource "google_folder_organization_policy" "prod_locations" {
  folder     = google_folder.production.name
  constraint = "constraints/gcp.resourceLocations"

  list_policy {
    allow {
      values = ["us-central1", "us-east1"]
    }
  }
}

# Project-level exception: allow additional regions for DR project
resource "google_project_organization_policy" "dr_locations" {
  project    = var.dr_project_id
  constraint = "constraints/gcp.resourceLocations"

  list_policy {
    allow {
      values = ["us-central1", "us-east1", "us-west1"]
    }
  }
}

variable "dr_project_id" {
  type = string
}
```

## Monitoring Policy Compliance

Set up alerting for policy violations:

```hcl
# Create a log-based metric for organization policy violations
resource "google_logging_metric" "org_policy_violations" {
  name        = "org-policy-violations"
  description = "Count of organization policy violation attempts"
  project     = var.project_id

  filter = "protoPayload.status.code=7 AND protoPayload.status.message:\"orgpolicy\""

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
  }
}
```

## Best Practices

Start with organization-level policies and use folder and project-level exceptions only when necessary. Use the dry-run mode when available to test the impact of new policies before enforcing them. Document the business reason for every exception to organization-wide policies. Combine Organization Policies with IAM controls for defense in depth. Regularly review and audit your policy hierarchy to ensure it reflects current requirements.

For more on securing your GCP environment, see our guide on [GCP IAM Workload Identity](https://oneuptime.com/blog/post/2026-02-23-how-to-create-gcp-iam-workload-identity-in-terraform/view).

## Conclusion

GCP Organization Policies managed through Terraform provide a powerful governance framework that scales across your entire cloud environment. By defining constraints at the organization level and using targeted exceptions at folder and project levels, you can enforce security and compliance standards while allowing flexibility where it is needed. Terraform makes this hierarchy manageable, version-controlled, and repeatable across environments.
