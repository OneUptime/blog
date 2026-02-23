# How to Create GCP Organization Policies with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Organization Policy, Governance, Security, Infrastructure as Code

Description: Learn how to define and enforce Google Cloud Organization Policies using Terraform for governance guardrails across your entire GCP organization.

---

Organization policies are guardrails for your entire GCP organization. They let you define constraints that apply to all projects, folders, or the whole organization - things like "no one can create public Cloud Storage buckets" or "VMs can only be created in specific regions." Without organization policies, every project team has to remember and follow these rules manually. With them, the rules are enforced by GCP itself.

Terraform is the right tool for managing organization policies because these are high-impact, organization-wide configurations. You want them reviewed, approved, and tracked in version control. A misconfigured org policy can block legitimate work across your entire company. This guide covers the most common and useful organization policy constraints.

## Prerequisites

You need the Organization Policy Administrator role at the organization level to create and modify organization policies. The Terraform service account needs this role too.

```hcl
# Provider configuration
provider "google" {
  project = var.project_id
  region  = var.region
}

# Data source for the organization
data "google_organization" "org" {
  domain = var.org_domain
}
```

## Restricting Resource Locations

One of the most common policies is restricting where resources can be created. This is essential for data residency and sovereignty requirements.

```hcl
# Restrict resource locations to specific regions
resource "google_org_policy_policy" "restrict_locations" {
  name   = "organizations/${data.google_organization.org.org_id}/policies/gcp.resourceLocations"
  parent = "organizations/${data.google_organization.org.org_id}"

  spec {
    rules {
      values {
        allowed_values = [
          "in:us-locations",        # All US regions
          "in:europe-locations",    # All European regions
        ]
      }
    }
  }
}
```

If you need more granular control at the folder level:

```hcl
# More restrictive policy for a specific folder (e.g., EU data projects)
resource "google_org_policy_policy" "eu_only_locations" {
  name   = "folders/${var.eu_folder_id}/policies/gcp.resourceLocations"
  parent = "folders/${var.eu_folder_id}"

  spec {
    rules {
      values {
        allowed_values = [
          "in:europe-locations",
        ]
      }
    }
  }
}
```

## Disabling Public Access

Preventing resources from being exposed to the internet is a top priority for most organizations.

```hcl
# Disable public access on Cloud Storage buckets
resource "google_org_policy_policy" "uniform_bucket_access" {
  name   = "organizations/${data.google_organization.org.org_id}/policies/storage.uniformBucketLevelAccess"
  parent = "organizations/${data.google_organization.org.org_id}"

  spec {
    rules {
      enforce = "TRUE"
    }
  }
}

# Disable public IP addresses on Cloud SQL instances
resource "google_org_policy_policy" "no_public_sql" {
  name   = "organizations/${data.google_organization.org.org_id}/policies/sql.restrictPublicIp"
  parent = "organizations/${data.google_organization.org.org_id}"

  spec {
    rules {
      enforce = "TRUE"
    }
  }
}

# Prevent sharing resources with external domains
resource "google_org_policy_policy" "domain_restricted_sharing" {
  name   = "organizations/${data.google_organization.org.org_id}/policies/iam.allowedPolicyMemberDomains"
  parent = "organizations/${data.google_organization.org.org_id}"

  spec {
    rules {
      values {
        allowed_values = [
          # Only allow identities from your organization
          "is:${data.google_organization.org.directory_customer_id}",
        ]
      }
    }
  }
}
```

## Restricting VM Creation

Control which VM types and configurations are allowed.

```hcl
# Disable serial port access on VMs
resource "google_org_policy_policy" "disable_serial_port" {
  name   = "organizations/${data.google_organization.org.org_id}/policies/compute.disableSerialPortAccess"
  parent = "organizations/${data.google_organization.org.org_id}"

  spec {
    rules {
      enforce = "TRUE"
    }
  }
}

# Require shielded VMs
resource "google_org_policy_policy" "shielded_vms" {
  name   = "organizations/${data.google_organization.org.org_id}/policies/compute.requireShieldedVm"
  parent = "organizations/${data.google_organization.org.org_id}"

  spec {
    rules {
      enforce = "TRUE"
    }
  }
}

# Disable VM nested virtualization
resource "google_org_policy_policy" "no_nested_virt" {
  name   = "organizations/${data.google_organization.org.org_id}/policies/compute.disableNestedVirtualization"
  parent = "organizations/${data.google_organization.org.org_id}"

  spec {
    rules {
      enforce = "TRUE"
    }
  }
}

# Restrict which VM external IP addresses are allowed
resource "google_org_policy_policy" "vm_external_ip" {
  name   = "organizations/${data.google_organization.org.org_id}/policies/compute.vmExternalIpAccess"
  parent = "organizations/${data.google_organization.org.org_id}"

  spec {
    rules {
      # Deny all external IPs by default
      values {
        denied_values = ["all"]
      }
    }
  }
}
```

## Service Account Key Restrictions

Service account keys are a common attack vector. Restrict their creation.

```hcl
# Disable service account key creation
resource "google_org_policy_policy" "disable_sa_key_creation" {
  name   = "organizations/${data.google_organization.org.org_id}/policies/iam.disableServiceAccountKeyCreation"
  parent = "organizations/${data.google_organization.org.org_id}"

  spec {
    rules {
      enforce = "TRUE"
    }
  }
}

# Disable service account key upload
resource "google_org_policy_policy" "disable_sa_key_upload" {
  name   = "organizations/${data.google_organization.org.org_id}/policies/iam.disableServiceAccountKeyUpload"
  parent = "organizations/${data.google_organization.org.org_id}"

  spec {
    rules {
      enforce = "TRUE"
    }
  }
}
```

## Conditional Policies with Tags

You can use resource tags to create exceptions for specific projects.

```hcl
# Create a tag for projects that are allowed exceptions
resource "google_tags_tag_key" "environment" {
  parent      = "organizations/${data.google_organization.org.org_id}"
  short_name  = "environment"
  description = "Environment classification"
}

resource "google_tags_tag_value" "sandbox" {
  parent      = google_tags_tag_key.environment.id
  short_name  = "sandbox"
  description = "Sandbox environment with relaxed policies"
}

# Policy that enforces everywhere except sandbox-tagged resources
resource "google_org_policy_policy" "conditional_external_ip" {
  name   = "organizations/${data.google_organization.org.org_id}/policies/compute.vmExternalIpAccess"
  parent = "organizations/${data.google_organization.org.org_id}"

  spec {
    # Default rule: deny all
    rules {
      values {
        denied_values = ["all"]
      }
    }

    # Exception for sandbox environments
    rules {
      allow_all = "TRUE"

      condition {
        expression  = "resource.matchTag('${data.google_organization.org.org_id}/environment', 'sandbox')"
        title       = "Sandbox Exception"
        description = "Allow external IPs in sandbox environments"
      }
    }
  }
}
```

## Restricting APIs and Services

Control which GCP services can be used within the organization.

```hcl
# Restrict which services can be enabled
resource "google_org_policy_policy" "restrict_services" {
  name   = "organizations/${data.google_organization.org.org_id}/policies/serviceuser.services"
  parent = "organizations/${data.google_organization.org.org_id}"

  spec {
    rules {
      values {
        # Deny services that are not approved
        denied_values = [
          "deploymentmanager.googleapis.com",  # Use Terraform instead
          "appengine.googleapis.com",          # Deprecated, use Cloud Run
        ]
      }
    }
  }
}
```

## Project-Level Policy Overrides

Sometimes a specific project needs an exception to an organization-wide policy. You can override at the project level.

```hcl
# Allow external IPs for a specific load balancer project
resource "google_org_policy_policy" "project_external_ip_exception" {
  name   = "projects/${var.lb_project_id}/policies/compute.vmExternalIpAccess"
  parent = "projects/${var.lb_project_id}"

  spec {
    # Reset the policy to allow - overrides the org-level deny
    reset = true
  }
}
```

## Listing Available Constraints

You can discover available constraints using a data source.

```hcl
# List all available org policy constraints
data "google_organization" "current" {
  domain = var.org_domain
}

# You can also query constraints in gcloud:
# gcloud org-policies list --organization=ORG_ID
```

## A Comprehensive Security Baseline

Here is a set of policies that form a solid security baseline for most organizations:

```hcl
# Local map of boolean constraint policies
locals {
  boolean_policies = {
    "compute.disableSerialPortAccess"          = true
    "compute.requireShieldedVm"                = true
    "compute.disableNestedVirtualization"       = true
    "compute.requireOsLogin"                    = true
    "storage.uniformBucketLevelAccess"          = true
    "sql.restrictPublicIp"                      = true
    "iam.disableServiceAccountKeyCreation"      = true
    "iam.disableServiceAccountKeyUpload"        = true
    "iam.automaticIamGrantsForDefaultServiceAccounts" = true
  }
}

resource "google_org_policy_policy" "boolean_policies" {
  for_each = local.boolean_policies

  name   = "organizations/${data.google_organization.org.org_id}/policies/${each.key}"
  parent = "organizations/${data.google_organization.org.org_id}"

  spec {
    rules {
      enforce = each.value ? "TRUE" : "FALSE"
    }
  }
}
```

## Testing Policies

Before applying organization policies broadly, test them on a single project or folder first.

```hcl
# Test the policy on a specific folder before rolling out org-wide
resource "google_org_policy_policy" "test_policy" {
  name   = "folders/${var.test_folder_id}/policies/compute.requireShieldedVm"
  parent = "folders/${var.test_folder_id}"

  spec {
    rules {
      enforce = "TRUE"
    }
  }
}
```

## Conclusion

Organization policies are the most effective way to enforce security and governance standards across a GCP organization. They operate at the API level, so no user or service account can bypass them regardless of their IAM permissions. Terraform is the natural way to manage these policies - you get version control, code review, and consistent deployment. Start with the security baseline constraints, test them on a limited scope, and then roll them out organization-wide. The upfront effort pays for itself by preventing misconfigurations that would otherwise require manual remediation across dozens or hundreds of projects.
