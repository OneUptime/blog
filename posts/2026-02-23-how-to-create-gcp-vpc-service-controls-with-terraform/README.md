# How to Create GCP VPC Service Controls with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, VPC Service Controls, Security, Network Security, Infrastructure as Code

Description: Learn how to create VPC Service Controls perimeters and access levels on Google Cloud using Terraform to prevent data exfiltration from GCP services.

---

VPC Service Controls is one of the most powerful but underused security features on Google Cloud. It creates a security perimeter around GCP services, preventing data from being accessed or exfiltrated outside the perimeter. Without VPC Service Controls, a compromised service account could copy your BigQuery data to an attacker-controlled project or read your Cloud Storage buckets from outside your organization. With it, those API calls get blocked at the network level.

Setting up VPC Service Controls through the console is tedious and error-prone. There are access levels, perimeters, ingress policies, and egress policies that all need to be configured correctly. Terraform brings all of this under version control and makes it manageable. This guide walks through the setup.

## Understanding the Components

VPC Service Controls has several pieces:

- **Access Policy** - The top-level container, usually one per organization
- **Access Levels** - Conditions that define when access is allowed (IP ranges, device trust, identity)
- **Service Perimeters** - The actual security boundary around a set of projects and services
- **Ingress/Egress Policies** - Rules that allow specific traffic to cross the perimeter boundary

## Creating an Access Policy

An access policy is usually created once per organization. Most organizations will already have one.

```hcl
# Create an access policy for the organization
# Usually you only need one of these
resource "google_access_context_manager_access_policy" "policy" {
  parent = "organizations/${var.org_id}"
  title  = "Organization Access Policy"
}
```

## Defining Access Levels

Access levels specify the conditions under which access is permitted. The most common are IP-based and identity-based levels.

```hcl
# Access level for corporate network
resource "google_access_context_manager_access_level" "corporate_network" {
  parent = "accessPolicies/${google_access_context_manager_access_policy.policy.name}"
  name   = "accessPolicies/${google_access_context_manager_access_policy.policy.name}/accessLevels/corporate_network"
  title  = "Corporate Network Access"

  basic {
    conditions {
      # Allow from corporate IP ranges
      ip_subnetworks = [
        "203.0.113.0/24",
        "198.51.100.0/24",
      ]
    }
  }
}

# Access level for VPN users
resource "google_access_context_manager_access_level" "vpn_users" {
  parent = "accessPolicies/${google_access_context_manager_access_policy.policy.name}"
  name   = "accessPolicies/${google_access_context_manager_access_policy.policy.name}/accessLevels/vpn_users"
  title  = "VPN Users"

  basic {
    conditions {
      ip_subnetworks = [
        "10.0.0.0/8",
      ]
    }
  }
}

# Access level based on identity
resource "google_access_context_manager_access_level" "trusted_identities" {
  parent = "accessPolicies/${google_access_context_manager_access_policy.policy.name}"
  name   = "accessPolicies/${google_access_context_manager_access_policy.policy.name}/accessLevels/trusted_identities"
  title  = "Trusted Identities"

  basic {
    conditions {
      members = [
        "user:admin@example.com",
        "serviceAccount:terraform@${var.project_id}.iam.gserviceaccount.com",
      ]
    }
  }
}

# Combine multiple conditions - all must be true
resource "google_access_context_manager_access_level" "secure_access" {
  parent = "accessPolicies/${google_access_context_manager_access_policy.policy.name}"
  name   = "accessPolicies/${google_access_context_manager_access_policy.policy.name}/accessLevels/secure_access"
  title  = "Secure Access - Corporate Network AND Trusted Identity"

  basic {
    # When combining_function is AND, all conditions must be met
    combining_function = "AND"

    conditions {
      ip_subnetworks = ["203.0.113.0/24"]
    }

    conditions {
      members = [
        "user:admin@example.com",
      ]
    }
  }
}
```

## Creating a Service Perimeter

The service perimeter is the core of VPC Service Controls. It defines which projects are protected and which GCP services are restricted.

```hcl
# Service perimeter protecting sensitive data projects
resource "google_access_context_manager_service_perimeter" "data_perimeter" {
  parent = "accessPolicies/${google_access_context_manager_access_policy.policy.name}"
  name   = "accessPolicies/${google_access_context_manager_access_policy.policy.name}/servicePerimeters/data_perimeter"
  title  = "Data Protection Perimeter"

  # PERIMETER_TYPE_REGULAR is the default
  perimeter_type = "PERIMETER_TYPE_REGULAR"

  status {
    # Projects inside the perimeter
    resources = [
      "projects/${var.data_project_number}",
      "projects/${var.analytics_project_number}",
    ]

    # Services restricted by the perimeter
    restricted_services = [
      "bigquery.googleapis.com",
      "storage.googleapis.com",
      "bigtable.googleapis.com",
      "spanner.googleapis.com",
      "pubsub.googleapis.com",
      "secretmanager.googleapis.com",
      "cloudfunctions.googleapis.com",
    ]

    # Access levels that can bypass the perimeter
    access_levels = [
      google_access_context_manager_access_level.corporate_network.name,
      google_access_context_manager_access_level.trusted_identities.name,
    ]

    # Ingress policies - allow specific traffic into the perimeter
    ingress_policies {
      ingress_from {
        sources {
          access_level = google_access_context_manager_access_level.corporate_network.name
        }
        identity_type = "ANY_IDENTITY"
      }

      ingress_to {
        resources = ["*"]
        operations {
          service_name = "bigquery.googleapis.com"
          method_selectors {
            method = "BigQueryRead"
          }
          method_selectors {
            method = "google.cloud.bigquery.v2.JobService.InsertJob"
          }
        }
      }
    }

    # Egress policies - allow specific traffic out of the perimeter
    egress_policies {
      egress_from {
        identity_type = "ANY_IDENTITY"
      }

      egress_to {
        resources = [
          "projects/${var.reporting_project_number}"
        ]
        operations {
          service_name = "bigquery.googleapis.com"
          method_selectors {
            method = "*"
          }
        }
      }
    }
  }
}
```

## Dry Run Mode

VPC Service Controls can break things if configured incorrectly. Use dry run mode to test your perimeter before enforcing it. In dry run mode, violations are logged but not blocked.

```hcl
# Perimeter in dry-run mode for testing
resource "google_access_context_manager_service_perimeter" "test_perimeter" {
  parent = "accessPolicies/${google_access_context_manager_access_policy.policy.name}"
  name   = "accessPolicies/${google_access_context_manager_access_policy.policy.name}/servicePerimeters/test_perimeter"
  title  = "Test Perimeter (Dry Run)"

  # Use spec for dry-run configuration
  use_explicit_dry_run_spec = true

  spec {
    resources = [
      "projects/${var.test_project_number}",
    ]

    restricted_services = [
      "bigquery.googleapis.com",
      "storage.googleapis.com",
    ]

    access_levels = [
      google_access_context_manager_access_level.corporate_network.name,
    ]
  }
}
```

After reviewing the dry-run logs and confirming there are no unintended blocks, move the configuration to the `status` block to enforce it.

## Perimeter Bridges

If you have multiple perimeters that need to share data, use a perimeter bridge.

```hcl
# Bridge between data and analytics perimeters
resource "google_access_context_manager_service_perimeter" "bridge" {
  parent = "accessPolicies/${google_access_context_manager_access_policy.policy.name}"
  name   = "accessPolicies/${google_access_context_manager_access_policy.policy.name}/servicePerimeters/data_analytics_bridge"
  title  = "Data-Analytics Bridge"

  perimeter_type = "PERIMETER_TYPE_BRIDGE"

  status {
    resources = [
      "projects/${var.data_project_number}",
      "projects/${var.analytics_project_number}",
    ]
  }
}
```

## Managing Perimeters with Variables

For organizations with many projects, use variables to keep the perimeter configuration manageable.

```hcl
variable "perimeter_projects" {
  description = "Project numbers to include in the service perimeter"
  type        = list(string)
}

variable "restricted_services" {
  description = "GCP services to restrict within the perimeter"
  type        = list(string)
  default = [
    "bigquery.googleapis.com",
    "storage.googleapis.com",
    "pubsub.googleapis.com",
    "secretmanager.googleapis.com",
    "spanner.googleapis.com",
    "cloudfunctions.googleapis.com",
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
  ]
}

resource "google_access_context_manager_service_perimeter" "main" {
  parent = "accessPolicies/${google_access_context_manager_access_policy.policy.name}"
  name   = "accessPolicies/${google_access_context_manager_access_policy.policy.name}/servicePerimeters/main"
  title  = "Main Service Perimeter"

  status {
    resources = [for p in var.perimeter_projects : "projects/${p}"]

    restricted_services = var.restricted_services

    access_levels = [
      google_access_context_manager_access_level.corporate_network.name,
    ]
  }
}
```

## Common Gotchas

VPC Service Controls operates on project numbers, not project IDs. If you pass a project ID instead of a number, the perimeter will not work. Use a data source to look up the project number:

```hcl
data "google_project" "data_project" {
  project_id = var.data_project_id
}

# Use data.google_project.data_project.number in the perimeter
```

Service perimeter changes can take several minutes to propagate. Do not panic if things do not work immediately after a `terraform apply`.

The Terraform service account needs the Access Context Manager Admin role at the organization level. This is a powerful role, so limit who can run Terraform for VPC Service Controls.

## Conclusion

VPC Service Controls adds a critical layer of defense against data exfiltration on GCP. Terraform makes the complex configuration manageable and repeatable. Start with dry-run mode, review the logs carefully, and then enforce the perimeter. The initial setup takes effort, but the security benefits are substantial - it is one of the few controls that can prevent a compromised identity from exporting your data to an external project.

For more on GCP network security with Terraform, see our guide on [creating GCP Private Google Access with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-gcp-private-google-access-with-terraform/view).
