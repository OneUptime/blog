# How to Build a Landing Zone with OpenTofu on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Landing Zone, Architecture, OpenTofu, Resource Hierarchy, Organization Policy, Security

Description: Learn how to build a GCP Landing Zone using OpenTofu with folder hierarchy, organization policies, centralized logging, and security baselines for enterprise governance.

## Overview

A GCP Landing Zone structures the resource hierarchy using folders for environment isolation, enforces organization policies for guardrails, and configures centralized logging and security tooling. OpenTofu provisions the governance foundation.

## Step 1: GCP Folder Hierarchy

```hcl
# main.tf - GCP resource hierarchy

resource "google_folder" "platform" {
  display_name = "Platform"
  parent       = "organizations/${var.org_id}"
}

resource "google_folder" "workloads" {
  display_name = "Workloads"
  parent       = "organizations/${var.org_id}"
}

resource "google_folder" "sandbox" {
  display_name = "Sandbox"
  parent       = "organizations/${var.org_id}"
}

resource "google_folder" "workloads_production" {
  display_name = "Production"
  parent       = google_folder.workloads.name
}

resource "google_folder" "workloads_staging" {
  display_name = "Staging"
  parent       = google_folder.workloads.name
}

# Shared services project under the platform folder
resource "google_project" "connectivity" {
  name            = "connectivity"
  project_id      = "connectivity-${var.org_suffix}"
  folder_id       = google_folder.platform.name
  billing_account = var.billing_account_id
}

# Projects under production folder
resource "google_project" "app_prod" {
  name            = "app-production"
  project_id      = "app-production-${var.org_suffix}"
  folder_id       = google_folder.workloads_production.name
  billing_account = var.billing_account_id
}
```

## Step 2: Organization Policies

```hcl
# Restrict resource creation to approved regions
resource "google_org_policy_policy" "restrict_regions" {
  name   = "organizations/${var.org_id}/policies/gcp.resourceLocations"
  parent = "organizations/${var.org_id}"

  spec {
    rules {
      values {
        allowed_values = [
          "in:us-locations",
          "in:europe-locations"
        ]
      }
    }
  }
}

# Disable service account key creation
resource "google_org_policy_policy" "disable_sa_keys" {
  name   = "organizations/${var.org_id}/policies/iam.disableServiceAccountKeyCreation"
  parent = "organizations/${var.org_id}"

  spec {
    rules {
      enforce = "TRUE"
    }
  }
}

# Require OS Login for VMs
resource "google_org_policy_policy" "require_os_login" {
  name   = "organizations/${var.org_id}/policies/compute.requireOsLogin"
  parent = "organizations/${var.org_id}"

  spec {
    rules {
      enforce = "TRUE"
    }
  }
}

# More permissive policy in sandbox
resource "google_org_policy_policy" "sandbox_sa_keys" {
  name   = "${google_folder.sandbox.name}/policies/iam.disableServiceAccountKeyCreation"
  parent = google_folder.sandbox.name

  spec {
    rules {
      enforce = "FALSE"  # Allow SA keys in sandbox
    }
  }
}
```

## Step 3: Shared VPC Hub

```hcl
# Shared VPC host project
resource "google_compute_shared_vpc_host_project" "host" {
  project = google_project.connectivity.project_id
}

# Attach workload projects to shared VPC
resource "google_compute_shared_vpc_service_project" "app" {
  host_project    = google_project.connectivity.project_id
  service_project = google_project.app_prod.project_id
  depends_on      = [google_compute_shared_vpc_host_project.host]
}

# VPC in host project
resource "google_compute_network" "shared_vpc" {
  name                    = "shared-vpc"
  project                 = google_project.connectivity.project_id
  auto_create_subnetworks = false
  routing_mode            = "GLOBAL"
}
```

## Step 4: Centralized Logging and Security

```hcl
resource "google_storage_bucket" "audit_logs" {
  name                        = "org-audit-logs-${var.org_suffix}"
  project                     = google_project.connectivity.project_id
  location                    = "US"
  uniform_bucket_level_access = true
}

# Organization-wide audit log sink to centralized bucket
resource "google_logging_organization_sink" "audit_logs" {
  name             = "org-audit-logs"
  org_id           = var.org_id
  destination      = "storage.googleapis.com/${google_storage_bucket.audit_logs.name}"

  filter = "logName:\"cloudaudit.googleapis.com\""

  include_children = true  # Captures all folders/projects
}

# Grant log writer permission to the sink
resource "google_storage_bucket_iam_member" "sink_writer" {
  bucket = google_storage_bucket.audit_logs.name
  role   = "roles/storage.objectCreator"
  member = google_logging_organization_sink.audit_logs.writer_identity
}

# Security Command Center finding notifications
resource "google_pubsub_topic" "security_findings" {
  name    = "security-findings"
  project = google_project.connectivity.project_id
}

resource "google_scc_notification_config" "threat_findings" {
  config_id    = "threat-notifications"
  organization = var.org_id
  description  = "Notify on high severity findings"
  pubsub_topic = google_pubsub_topic.security_findings.id

  streaming_config {
    filter = "severity=\"HIGH\" OR severity=\"CRITICAL\""
  }
}
```

## Summary

A GCP Landing Zone built with OpenTofu establishes folder hierarchy for policy inheritance and resource organization. Organization policies set guardrails that apply to all projects within a folder, with folder-level overrides allowing looser restrictions in sandbox environments. Shared VPC centralizes network management while service projects maintain independent IAM boundaries. Organization-wide log sinks with `include_children = true` capture audit logs from all projects into a central storage bucket.
