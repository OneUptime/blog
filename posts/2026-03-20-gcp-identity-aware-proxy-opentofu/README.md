# How to Set Up GCP Identity-Aware Proxy with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, IAP, Identity-Aware Proxy, OpenTofu, Zero Trust, Security

Description: Learn how to configure GCP Identity-Aware Proxy (IAP) with OpenTofu to secure internal applications with Google identity verification without VPN.

## Overview

GCP Identity-Aware Proxy (IAP) controls access to your applications and VMs based on identity and context rather than network perimeter. It acts as a BeyondCorp access layer, allowing secure access to internal apps without a VPN.

## Step 1: Enable the IAP API

```hcl
# main.tf - Enable IAP API

resource "google_project_service" "iap" {
  project = var.project_id
  service = "iap.googleapis.com"
}
```

## Step 2: Use the Google-managed OAuth client or a pre-created custom client

For new IAP-enabled resources, Google can use a Google-managed OAuth client automatically. If you need custom branding or external-user access, create a custom OAuth client in the Google Cloud console and attach it through the resource's native API. The `google_iap_brand` and `google_iap_client` OpenTofu resources rely on the deprecated IAP OAuth Admin API and should not be used for new setups.

## Step 3: Secure a Web App Backend Service

```hcl
# Enable IAP on an HTTP(S) load balancer backend service
resource "google_compute_backend_service" "app_backend" {
  project               = var.project_id
  name                  = "internal-tools-backend"
  protocol              = "HTTP"
  load_balancing_scheme = "EXTERNAL"

  iap {
    enabled = true
  }
}

# Grant access to the IAP-protected backend service
resource "google_iap_web_backend_service_iam_binding" "app_iap" {
  project             = var.project_id
  web_backend_service = google_compute_backend_service.app_backend.name
  role                = "roles/iap.httpsResourceAccessor"

  # Allow specific users and groups
  members = [
    "user:engineer@example.com",
    "group:engineering-team@example.com",
    "domain:example.com",  # Allow entire domain
  ]
}
```

If the backend is Cloud Run behind a load balancer, disable the default `run.app` URL or restrict ingress so traffic cannot bypass IAP.

## Step 4: Secure Compute Engine-backed web apps

```hcl
# Project-level IAP policy for Compute Engine-backed web apps
resource "google_iap_web_type_compute_iam_member" "gce_iap" {
  project = var.project_id
  role    = "roles/iap.httpsResourceAccessor"
  member  = "group:developers@example.com"
}
```

## Step 5: Tunnel to VM Instances via IAP

```hcl
# Grant IAP tunnel access to VMs (for SSH/RDP without external IPs)
resource "google_iap_tunnel_instance_iam_member" "vm_tunnel_access" {
  project  = var.project_id
  zone     = "us-central1-a"
  instance = google_compute_instance.private_vm.name
  role     = "roles/iap.tunnelResourceAccessor"
  member   = "user:sysadmin@example.com"
}
```

You also need a firewall rule that allows ingress from `35.235.240.0/20` to the ports you want to reach, such as `22` for SSH or `3389` for RDP.

## Step 6: Grant App Engine IAP access

```hcl
# Grant access to an App Engine app protected by IAP
resource "google_iap_web_type_app_engine_iam_binding" "app_engine_iap" {
  project = var.project_id
  app_id  = google_app_engine_application.app.app_id
  role    = "roles/iap.httpsResourceAccessor"

  members = [
    "group:internal-users@example.com",
  ]
}
```

## Summary

GCP Identity-Aware Proxy with OpenTofu helps replace VPN-based access with identity-aware, context-sensitive security. By enabling IAP on supported backends and granting IAP roles to users and groups, you control who can access applications and VMs based on Google identity. IAP tunnel access enables SSH/RDP to private VMs without external IPs when combined with the required firewall rules, fulfilling zero-trust remote access requirements.
