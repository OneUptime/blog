# How to Configure GCP Firewall Rules for IPv4 Using Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Terraform, GCP, Firewall Rules, IPv4, Infrastructure as Code, Google Cloud

Description: Configure GCP VPC firewall rules for IPv4 using Terraform, covering ingress/egress direction, source/target tags, priority, and service account-based rules.

## Introduction

GCP firewall rules apply at the VPC level and filter traffic by protocol, port, source/destination CIDR, and network tags. Terraform manages these rules with full lifecycle support.

## Allow HTTP/HTTPS (Tag-Based)

```hcl
# firewall.tf

resource "google_compute_firewall" "allow_http_https" {
  name    = "allow-http-https"
  network = google_compute_network.main.name

  direction = "INGRESS"
  priority  = 1000

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["web-server"]

  description = "Allow HTTP and HTTPS to web servers"
}
```

## Allow SSH from Management IP

```hcl
resource "google_compute_firewall" "allow_ssh_mgmt" {
  name    = "allow-ssh-management"
  network = google_compute_network.main.name

  direction     = "INGRESS"
  priority      = 1000
  source_ranges = ["10.1.99.0/27"]  # Management subnet

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  target_tags = ["allow-ssh"]
}
```

## Allow Internal VPC Traffic

```hcl
resource "google_compute_firewall" "allow_internal" {
  name    = "allow-internal"
  network = google_compute_network.main.name

  direction     = "INGRESS"
  priority      = 1000
  source_ranges = [google_compute_subnetwork.main.ip_cidr_range]

  allow {
    protocol = "all"
  }

  # Or specify CIDR of your subnets
  # source_ranges = ["10.192.0.0/16"]
}
```

## Deny All Inbound (Lowest Priority Catch-All)

```hcl
resource "google_compute_firewall" "deny_all_ingress" {
  name     = "deny-all-ingress"
  network  = google_compute_network.main.name
  priority = 65534

  direction = "INGRESS"

  deny {
    protocol = "all"
  }

  source_ranges = ["0.0.0.0/0"]
  description   = "Deny all inbound - catch-all"
}
```

## Egress Rule (Restrict Outbound)

```hcl
resource "google_compute_firewall" "allow_egress_http" {
  name     = "allow-egress-http"
  network  = google_compute_network.main.name
  priority = 1000

  direction          = "EGRESS"
  destination_ranges = ["0.0.0.0/0"]

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }
}

resource "google_compute_firewall" "deny_all_egress" {
  name     = "deny-all-egress"
  network  = google_compute_network.main.name
  priority = 65534

  direction          = "EGRESS"
  destination_ranges = ["0.0.0.0/0"]

  deny {
    protocol = "all"
  }
}
```

## Service Account-Based Rule

```hcl
resource "google_compute_firewall" "allow_from_sa" {
  name    = "allow-from-frontend-sa"
  network = google_compute_network.main.name

  direction = "INGRESS"
  allow {
    protocol = "tcp"
    ports    = ["8080"]
  }

  source_service_accounts = [
    "frontend-sa@${var.project_id}.iam.gserviceaccount.com"
  ]
  target_service_accounts = [
    "backend-sa@${var.project_id}.iam.gserviceaccount.com"
  ]
}
```

## Conclusion

GCP firewall rules in Terraform use `google_compute_firewall` resources with `allow` or `deny` blocks. Prefer tag-based targeting over CIDR-based for dynamic VM fleets - VMs automatically receive firewall rules when tagged. Service account-based rules are more secure for GCP-native workloads. Use priority 65534 for a deny-all catch-all rule.
