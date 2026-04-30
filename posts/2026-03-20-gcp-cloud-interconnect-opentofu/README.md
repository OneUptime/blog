# How to Create GCP Cloud Interconnect Attachments with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GCP, Cloud Interconnect, Networking, Hybrid Cloud, Infrastructure as Code

Description: Learn how to create GCP Cloud Interconnect VLAN attachments and configure Cloud Routers for dedicated and partner interconnect connectivity using OpenTofu.

## Introduction

GCP Cloud Interconnect provides high-bandwidth, low-latency connections from your data center to GCP. Dedicated Interconnect uses direct physical connections at colocation facilities; Partner Interconnect uses a service provider. OpenTofu manages VLAN attachments and Cloud Router configurations.

## Cloud Router

Both Dedicated and Partner Interconnect require a Cloud Router for BGP.

```hcl
resource "google_compute_router" "interconnect" {
  name    = "${var.app_name}-interconnect-router"
  project = var.project_id
  region  = var.region
  network = google_compute_network.main.id

  bgp {
    asn               = 16550  # Required for Partner Interconnect; also valid for Dedicated Interconnect
    advertise_mode    = "CUSTOM"
    advertised_groups = ["ALL_SUBNETS"]
  }
}
```

## Dedicated Interconnect VLAN Attachment

```hcl
resource "google_compute_interconnect_attachment" "dedicated" {
  name                     = "${var.app_name}-dedicated-vlan-${var.environment}"
  project                  = var.project_id
  region                   = var.region
  router                   = google_compute_router.interconnect.id
  interconnect             = var.interconnect_id  # the Dedicated Interconnect resource ID
  type                     = "DEDICATED"
  bandwidth                = "BPS_10G"
  vlan_tag8021q            = 100  # 802.1Q VLAN tag

  admin_enabled = true

  timeouts {
    create = "20m"
  }
}
```

## Partner Interconnect VLAN Attachment

```hcl
resource "google_compute_interconnect_attachment" "partner" {
  name          = "${var.app_name}-partner-vlan-${var.environment}"
  project       = var.project_id
  region        = var.region
  router        = google_compute_router.interconnect.id
  type          = "PARTNER"
  admin_enabled = true

  # Share the generated pairing_key with your service provider
  # after the attachment is created
}
```

## Router Interface for VLAN Attachment

```hcl
resource "google_compute_router_interface" "interconnect" {
  name                    = "if-interconnect"
  project                 = var.project_id
  router                  = google_compute_router.interconnect.name
  region                  = var.region
  ip_range                = "${google_compute_interconnect_attachment.dedicated.cloud_router_ip_address}"
  interconnect_attachment = google_compute_interconnect_attachment.dedicated.name
}
```

## BGP Peer Configuration

```hcl
resource "google_compute_router_peer" "interconnect" {
  name            = "bgp-interconnect-peer"
  project         = var.project_id
  router          = google_compute_router.interconnect.name
  region          = var.region
  peer_ip_address = split("/", google_compute_interconnect_attachment.dedicated.customer_router_ip_address)[0]
  peer_asn        = var.onprem_bgp_asn
  interface       = google_compute_router_interface.interconnect.name

  advertised_route_priority = 100
}
```

## Outputs

```hcl
output "pairing_key" {
  description = "Provide this key to your Partner Interconnect service provider"
  value       = google_compute_interconnect_attachment.partner.pairing_key
}

output "google_reference_id" {
  value = google_compute_interconnect_attachment.dedicated.google_reference_id
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

GCP Cloud Interconnect provides enterprise-grade, high-bandwidth hybrid connectivity. OpenTofu manages VLAN attachments, Cloud Router BGP configuration, and router interfaces as code - enabling consistent, auditable interconnect deployments.
