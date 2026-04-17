# How to Implement Zero Trust Network with OpenTofu on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Zero Trust, Security, OpenTofu, IAP, BeyondCorp, VPC Service Controls

Description: Learn how to implement Zero Trust Network Architecture on GCP using OpenTofu with Identity-Aware Proxy, BeyondCorp Enterprise, and VPC Service Controls.

## Overview

GCP's BeyondCorp model implements zero trust by routing all application access through Identity-Aware Proxy (IAP), which verifies identity and device context before granting access. VPC Service Controls create security perimeters around sensitive APIs. OpenTofu configures the complete zero trust setup.

## Step 1: Identity-Aware Proxy for Applications

```hcl
# main.tf - IAP for zero trust application access

resource "google_project_service" "iap" {
  service = "iap.googleapis.com"
}

# Create OAuth credentials for IAP
resource "google_iap_brand" "iap_brand" {
  support_email     = "iap-admin@example.com"
  application_title = "Zero Trust Access"
  project           = var.project_id
  depends_on        = [google_project_service.iap]
}

resource "google_iap_client" "iap_client" {
  display_name = "IAP Client"
  brand        = google_iap_brand.iap_brand.name
}

# Enable IAP on a backend service
resource "google_compute_backend_service" "app" {
  name     = "zero-trust-app"
  protocol = "HTTP"

  iap {
    enabled              = true
    oauth2_client_id     = google_iap_client.iap_client.client_id
    oauth2_client_secret = google_iap_client.iap_client.secret
  }

  backend {
    group = google_compute_instance_group_manager.app.instance_group
  }
}

# Grant access to specific users/groups
resource "google_iap_web_backend_service_iam_binding" "app_access" {
  project         = var.project_id
  web_backend_service = google_compute_backend_service.app.name
  role            = "roles/iap.httpsResourceAccessor"

  members = [
    "group:engineering@example.com",
    "user:admin@example.com",
  ]
}
```

## Step 2: Access Context Manager for Device Trust

```hcl
# Access level requiring corporate device
resource "google_access_context_manager_access_level" "corp_device" {
  parent = "accessPolicies/${google_access_context_manager_access_policy.policy.name}"
  name   = "accessPolicies/${google_access_context_manager_access_policy.policy.name}/accessLevels/corp_device"
  title  = "Corporate Device Required"

  basic {
    conditions {
      device_policy {
        require_corp_owned    = true
        require_screen_lock   = true
        require_admin_approval = false
        os_constraints {
          os_type             = "DESKTOP_CHROME_OS"
          minimum_version     = "91.0.0"
        }
      }
    }
  }
}
```

## Step 3: VPC Service Controls for API Perimeter

```hcl
# VPC Service Controls perimeter for sensitive services
resource "google_access_context_manager_service_perimeter" "sensitive" {
  parent = "accessPolicies/${google_access_context_manager_access_policy.policy.name}"
  name   = "accessPolicies/${google_access_context_manager_access_policy.policy.name}/servicePerimeters/sensitive"
  title  = "Sensitive Data Perimeter"

  status {
    resources = ["projects/${var.sensitive_project_number}"]

    restricted_services = [
      "bigquery.googleapis.com",
      "storage.googleapis.com",
      "cloudkms.googleapis.com",
    ]

    access_levels = [
      google_access_context_manager_access_level.corp_device.name
    ]

    # Allow specific ingress from corp network
    ingress_policies {
      ingress_from {
        sources {
          access_level = google_access_context_manager_access_level.corp_device.name
        }
        identity_type = "ANY_USER_ACCOUNT"
      }
      ingress_to {
        resources = ["*"]
        operations {
          service_name = "bigquery.googleapis.com"
          method_selectors { method = "*" }
        }
      }
    }
  }
}
```

## Step 4: Cloud Armor Security Policies

```hcl
# Cloud Armor WAF and DDoS protection
resource "google_compute_security_policy" "zero_trust" {
  name = "zero-trust-policy"

  # Deny all traffic not from approved regions
  rule {
    action   = "deny(403)"
    priority = 1000
    match {
      expr {
        expression = "!origin.region_code.matches('US|GB|DE|FR')"
      }
    }
  }

  # OWASP Top 10 protection
  rule {
    action   = "deny(403)"
    priority = 2000
    match {
      expr {
        expression = "evaluatePreconfiguredWaf('xss-v33-stable', {'sensitivity': 1})"
      }
    }
  }

  # Default rule (required at priority 2147483647)
  rule {
    action   = "allow"
    priority = 2147483647
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
  }
}
```

## Summary

GCP's BeyondCorp zero trust model implemented with OpenTofu uses IAP to authenticate every request to internal applications with corporate identity and device context, eliminating the need for VPNs. VPC Service Controls create hard perimeters around sensitive APIs like BigQuery and Cloud Storage, with access levels enforcing device compliance before any data access. Cloud Armor provides WAF and geo-restriction at the load balancer layer before requests reach applications.
