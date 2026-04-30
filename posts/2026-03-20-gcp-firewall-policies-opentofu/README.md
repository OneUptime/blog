# How to Create GCP Firewall Policies with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Firewall Policies, Networking, OpenTofu, Security, Organization

Description: Learn how to create GCP hierarchical and network firewall policies with OpenTofu for centralized, consistent network security rule management across projects.

## Overview

GCP Firewall Policies provide a centralized way to manage network security alongside per-VPC firewall rules. Hierarchical policies apply at the organization or folder level, while network policies apply to specific VPCs. Both support FQDN and geo-location based rules not available in traditional firewall rules.

## Step 1: Create a Hierarchical Firewall Policy

```hcl
# main.tf - Organization-level hierarchical firewall policy

resource "google_compute_firewall_policy" "org_policy" {
  parent      = "organizations/${var.org_id}"
  short_name  = "org-firewall-policy"
  description = "Organization-wide baseline firewall rules"
}

# Allow SSH from corporate IP range to all projects
resource "google_compute_firewall_policy_rule" "allow_ssh" {
  firewall_policy = google_compute_firewall_policy.org_policy.name
  priority        = 1000
  description     = "Allow SSH from corporate network"
  action          = "allow"
  direction       = "INGRESS"
  enable_logging  = true

  match {
    src_ip_ranges = ["203.0.113.0/24"]  # Corporate CIDR

    layer4_configs {
      ip_protocol = "tcp"
      ports       = ["22"]
    }
  }
}

# Deny all other SSH as baseline
resource "google_compute_firewall_policy_rule" "deny_ssh" {
  firewall_policy = google_compute_firewall_policy.org_policy.name
  priority        = 65530
  description     = "Deny SSH from internet by default"
  action          = "deny"
  direction       = "INGRESS"

  match {
    src_ip_ranges = ["0.0.0.0/0"]

    layer4_configs {
      ip_protocol = "tcp"
      ports       = ["22"]
    }
  }
}
```

## Step 2: Associate Policy with Organization

```hcl
# Apply the policy to the organization
resource "google_compute_firewall_policy_association" "org_association" {
  name              = "org-policy-association"
  firewall_policy   = google_compute_firewall_policy.org_policy.id
  attachment_target = "organizations/${var.org_id}"
}
```

## Step 3: Network Firewall Policy

```hcl
# Network-level firewall policy (attached to a VPC)
resource "google_compute_network_firewall_policy" "vpc_policy" {
  name        = "vpc-network-firewall-policy"
  project     = var.project_id
  description = "VPC-specific firewall policy with FQDN rules"
}

resource "google_compute_network" "vpc" {
  name                    = "example-vpc"
  project                 = var.project_id
  auto_create_subnetworks = false
}

# Rule allowing access to specific FQDN (e.g., internal API)
resource "google_compute_network_firewall_policy_rule" "allow_internal_api" {
  firewall_policy = google_compute_network_firewall_policy.vpc_policy.name
  project         = var.project_id
  priority        = 1000
  action          = "allow"
  direction       = "EGRESS"
  enable_logging  = true

  match {
    dest_fqdns    = ["api.internal.example.com"]
    dest_ip_ranges = []

    layer4_configs {
      ip_protocol = "tcp"
      ports       = ["443"]
    }
  }
}

# Associate the network policy with a VPC
resource "google_compute_network_firewall_policy_association" "vpc_association" {
  name              = "vpc-policy-association"
  project           = var.project_id
  firewall_policy   = google_compute_network_firewall_policy.vpc_policy.id
  attachment_target = google_compute_network.vpc.id
}
```

## Summary

GCP Firewall Policies with OpenTofu provide centralized, hierarchical network security management. Hierarchical policies enforced at the organization level ensure baseline security rules apply to all projects, while network policies add VPC-specific rules including FQDN-based egress controls not available in traditional firewall rules.
