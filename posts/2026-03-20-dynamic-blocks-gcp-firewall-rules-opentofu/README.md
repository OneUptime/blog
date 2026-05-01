# How to Use Dynamic Blocks for GCP Firewall Rules in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, GCP, Firewall, Dynamic Blocks, Google Cloud

Description: Learn how to use dynamic blocks in OpenTofu to generate GCP VPC firewall rules from variable-driven allow and deny rule lists.

## Introduction

GCP firewall rules use `allow` and `deny` blocks within a `google_compute_firewall` resource. When multiple ports or protocols need to be permitted or blocked, dynamic blocks make the configuration concise and data-driven.

## Dynamic Allow Rules

```hcl
variable "firewall_allow_rules" {
  description = "Allow rules for the application firewall"
  type = list(object({
    protocol = string
    ports    = list(string)
  }))
  default = [
    { protocol = "tcp", ports = ["443", "80"] },
    { protocol = "tcp", ports = ["8080-8090"] },
    { protocol = "icmp", ports = null }
  ]
}

resource "google_compute_firewall" "app_allow" {
  name    = "app-allow-rules"
  network = var.network_self_link

  direction     = "INGRESS"
  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["app-server"]

  # Generate one allow block per rule object
  dynamic "allow" {
    for_each = var.firewall_allow_rules
    content {
      protocol = allow.value.protocol
      ports    = allow.value.ports
    }
  }
}
```

## Dynamic Deny Rules with Priority Control

```hcl
variable "firewall_deny_rules" {
  type = list(object({
    protocol = string
    ports    = list(string)
  }))
  default = [
    { protocol = "tcp", ports = ["23", "21"] },  # Telnet and FTP
    { protocol = "tcp", ports = ["3389"] }         # RDP
  ]
}

resource "google_compute_firewall" "app_deny" {
  name     = "app-deny-rules"
  network  = var.network_self_link
  priority = 900  # Higher priority number = lower priority in GCP

  direction     = "INGRESS"
  source_ranges = ["0.0.0.0/0"]

  dynamic "deny" {
    for_each = var.firewall_deny_rules
    content {
      protocol = deny.value.protocol
      ports    = deny.value.ports
    }
  }
}
```

## Per-Environment Firewall Rules

Different environments may have different firewall configurations. Use a map to define per-environment rules.

```hcl
locals {
  env_firewall_rules = {
    "dev" = {
      allow = [
        { protocol = "tcp", ports = ["22", "443", "80", "8080"] },
        { protocol = "icmp", ports = null }
      ]
      source_ranges = ["10.0.0.0/8", "172.16.0.0/12"]  # Internal only
    }
    "prod" = {
      allow = [
        { protocol = "tcp", ports = ["443", "80"] }
      ]
      source_ranges = ["0.0.0.0/0"]  # Public
    }
  }
}

resource "google_compute_firewall" "env_rules" {
  for_each = local.env_firewall_rules

  name          = "${each.key}-app-firewall"
  network       = var.network_self_link
  source_ranges = each.value.source_ranges
  target_tags   = ["${each.key}-app"]

  dynamic "allow" {
    for_each = each.value.allow
    content {
      protocol = allow.value.protocol
      ports    = allow.value.ports
    }
  }
}
```

## Service Account Target Filtering

GCP supports targeting firewall rules at specific service accounts. You can still use a dynamic block to generate multiple `allow` rules.

```hcl
variable "target_service_accounts" {
  type = list(string)
  default = []
}

variable "ingress_allow_rules" {
  type = list(object({
    protocol = string
    ports    = list(string)
  }))
}

resource "google_compute_firewall" "sa_targeted" {
  name    = "sa-targeted-firewall"
  network = var.network_self_link

  direction = "INGRESS"
  # When provided, target specific service accounts instead of network tags
  target_service_accounts = length(var.target_service_accounts) > 0 ? var.target_service_accounts : null
  source_ranges           = ["10.0.0.0/8"]

  dynamic "allow" {
    for_each = var.ingress_allow_rules
    content {
      protocol = allow.value.protocol
      ports    = allow.value.ports
    }
  }
}
```

## Conclusion

Dynamic blocks for GCP firewall rules let you manage complex network policies through simple lists of protocol and port objects. Whether you need to allow multiple protocols, block specific ports, or create per-environment policies, this approach keeps your OpenTofu configuration DRY and easy to audit.
