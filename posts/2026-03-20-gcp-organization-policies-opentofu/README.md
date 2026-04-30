# How to Create GCP Organization Policies with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Organization Policies, Governance, OpenTofu, Compliance, Security

Description: Learn how to create GCP Organization Policies with OpenTofu to enforce security and compliance guardrails across your entire GCP organization or specific folders and projects.

## Overview

GCP Organization Policies let you centrally constrain and enforce security configurations across your resource hierarchy. Child resources inherit these policies by default, but lower-level policies can override them or restore the constraint's default behavior when exceptions are needed. OpenTofu manages these policies at organization, folder, and project levels.

## Step 1: Restrict Allowed Resource Locations

```hcl
# main.tf - Restrict resource creation to specific locations

resource "google_org_policy_policy" "restrict_regions" {
  name   = "organizations/${var.org_id}/policies/gcp.resourceLocations"
  parent = "organizations/${var.org_id}"

  spec {
    rules {
      values {
        # Only allow resources in US locations
        allowed_values = [
          "in:us-locations"
        ]
      }
    }
  }
}
```

## Step 2: Require OS Login

```hcl
# Require OS Login on all compute instances
resource "google_org_policy_policy" "require_os_login" {
  name   = "organizations/${var.org_id}/policies/compute.requireOsLogin"
  parent = "organizations/${var.org_id}"

  spec {
    rules {
      enforce = "TRUE"
    }
  }
}
```

## Step 3: Disable External IPs on VMs

```hcl
# Prevent VMs from having external IP addresses
resource "google_org_policy_policy" "no_external_ips" {
  name   = "organizations/${var.org_id}/policies/compute.vmExternalIpAccess"
  parent = "organizations/${var.org_id}"

  spec {
    rules {
      deny_all = "TRUE"
    }
  }
}
```

## Step 4: Restrict Service Account Key Creation

```hcl
# Prevent creation of long-lived service account keys
resource "google_org_policy_policy" "restrict_sa_key_creation" {
  name   = "organizations/${var.org_id}/policies/iam.disableServiceAccountKeyCreation"
  parent = "organizations/${var.org_id}"

  spec {
    rules {
      enforce = "TRUE"
    }
  }
}
```

## Step 5: Project-Level Policy Override

```hcl
# Restore the default policy at project level to allow external IPs for a specific project
resource "google_org_policy_policy" "allow_external_ip_project" {
  name   = "projects/${var.exception_project_id}/policies/compute.vmExternalIpAccess"
  parent = "projects/${var.exception_project_id}"

  spec {
    reset = true
  }
}
```

## Step 6: Restrict Domain Policy

```hcl
# Restrict IAM role grants to identities in a specific Google Workspace customer
resource "google_org_policy_policy" "restrict_domains" {
  name   = "organizations/${var.org_id}/policies/iam.allowedPolicyMemberDomains"
  parent = "organizations/${var.org_id}"

  spec {
    rules {
      values {
        allowed_values = [
          "is:C03g5e3bc"  # Your Google Workspace customer ID
        ]
      }
    }
  }
}
```

## Summary

GCP Organization Policies with OpenTofu enforce security guardrails at scale. Start with resource location restrictions and OS Login requirements, add VM external IP prevention, and restrict service account key creation for a strong security baseline. Project-level exceptions can restore the default behavior for specific use cases while maintaining organization-wide guardrails.
