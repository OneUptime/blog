# How to Set Up GCP Access Context Manager with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Access Context Manager, Security, OpenTofu, IAM, Zero Trust

Description: Learn how to configure GCP Access Context Manager with OpenTofu to define access levels based on device and network context for context-aware access control.

## Overview

GCP Access Context Manager lets you define fine-grained access control based on device security posture, network location, and user identity. Access levels are used with VPC Service Controls and IAM Conditions for context-aware authorization.

## Step 1: Create an Access Policy

```hcl
# main.tf - Organization-level access policy

resource "google_access_context_manager_access_policy" "org_policy" {
  parent = "organizations/${var.org_id}"
  title  = "Organization Access Policy"
}
```

## Step 2: Create IP-Based Access Levels

```hcl
# Access level for corporate network access
resource "google_access_context_manager_access_level" "corporate_network" {
  parent = "accessPolicies/${google_access_context_manager_access_policy.org_policy.name}"
  name   = "accessPolicies/${google_access_context_manager_access_policy.org_policy.name}/accessLevels/corporate_network"
  title  = "Corporate Network"

  basic {
    conditions {
      ip_subnetworks = [
        "203.0.113.0/24",   # Corporate CIDR 1
        "198.51.100.0/24",  # Corporate CIDR 2
      ]
    }
  }
}
```

## Step 3: Create Device Policy Access Level

```hcl
# Access level requiring managed corporate devices
resource "google_access_context_manager_access_level" "managed_device" {
  parent = "accessPolicies/${google_access_context_manager_access_policy.org_policy.name}"
  name   = "accessPolicies/${google_access_context_manager_access_policy.org_policy.name}/accessLevels/managed_device"
  title  = "Managed Corporate Device"

  basic {
    conditions {
      device_policy {
        # Require screen lock
        require_screen_lock = true
        # Only allow company-owned devices
        require_corp_owned  = true
        # Require device encryption
        allowed_encryption_statuses = ["ENCRYPTED"]
        # Require operating system constraints
        os_constraints {
          os_type                    = "DESKTOP_CHROME_OS"
          minimum_version            = "107.0.0"
          require_verified_chrome_os = true
        }
      }
    }
  }
}
```

## Step 4: Combine Conditions with AND Logic

```hcl
# Access level requiring BOTH corporate network AND device conditions
resource "google_access_context_manager_access_level" "highly_sensitive" {
  parent = "accessPolicies/${google_access_context_manager_access_policy.org_policy.name}"
  name   = "accessPolicies/${google_access_context_manager_access_policy.org_policy.name}/accessLevels/highly_sensitive"
  title  = "Highly Sensitive Data Access"

  basic {
    # ALL conditions must be true (AND logic)
    combining_function = "AND"

    conditions {
      ip_subnetworks = ["203.0.113.0/24"]
    }

    conditions {
      device_policy {
        require_screen_lock = true
        require_corp_owned  = true
      }
    }
  }
}
```

## Step 5: Access Level Conditions with User Attributes

```hcl
# Access level restricting to specific users
resource "google_access_context_manager_access_level" "admin_access" {
  parent = "accessPolicies/${google_access_context_manager_access_policy.org_policy.name}"
  name   = "accessPolicies/${google_access_context_manager_access_policy.org_policy.name}/accessLevels/admin_access"
  title  = "Admin Users Only"

  basic {
    conditions {
      members = [
        "user:admin@example.com",
        "serviceAccount:deploy-sa@project.iam.gserviceaccount.com",
      ]
    }
  }
}
```

## Summary

GCP Access Context Manager with OpenTofu defines fine-grained access conditions based on network, device health, and user identity. These access levels integrate with VPC Service Controls perimeters and IAM Conditions to implement context-aware access control, enforcing zero-trust principles where access is granted based on verified context rather than network location alone.
