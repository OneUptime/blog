# How to Configure GCP Private Google Access with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Private Google Access, Networking, OpenTofu, Security, VPC

Description: Learn how to configure GCP Private Google Access with OpenTofu to allow VMs without external IPs to access Google APIs and services using internal IPs only.

## Overview

Private Google Access lets VMs without external IP addresses connect to Google APIs and services (like Cloud Storage, BigQuery, Pub/Sub) without assigning public IPs to the VMs. Traffic to Google APIs stays on Google's network, and you can optionally use private DNS with `private.googleapis.com` or `restricted.googleapis.com` VIPs.

## Step 1: Enable Private Google Access on Subnet

```hcl
# main.tf - Subnet with Private Google Access enabled

resource "google_compute_subnetwork" "private_subnet" {
  name          = "private-subnet"
  network       = google_compute_network.vpc.self_link
  region        = "us-central1"
  ip_cidr_range = "10.0.1.0/24"

  # Enable Private Google Access - allows VMs without external IPs
  # to reach Google APIs and services
  private_ip_google_access = true

  private_ipv6_google_access = "DISABLE_GOOGLE_ACCESS"  # IPv6 option
}
```

## Step 2: Create VM Without External IP

```hcl
# VM with no external IP that accesses Google APIs via Private Google Access
resource "google_compute_instance" "private_vm" {
  name         = "private-api-vm"
  machine_type = "e2-medium"
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.private_subnet.self_link
    # No access_config block = no external IP assigned
  }

  service_account {
    email  = google_service_account.api_sa.email
    scopes = ["cloud-platform"]
  }

  metadata_startup_script = <<-SCRIPT
    #!/bin/bash
    # This VM can call Google APIs without an external IP
    # because Private Google Access is enabled on the subnet
    gcloud storage ls gs://my-bucket  # Works without external IP if the service account can access the bucket
  SCRIPT
}
```

## Step 3: Optional DNS and Routes for `restricted.googleapis.com`

```hcl
# If your VPC still has the default 0.0.0.0/0 route to the default internet gateway,
# you can use that instead of creating this custom route.
resource "google_compute_route" "restricted_google_api_route" {
  name             = "restricted-google-api-route"
  network          = google_compute_network.vpc.name
  dest_range       = "199.36.153.4/30"  # restricted.googleapis.com
  priority         = 1000
  next_hop_gateway = "default-internet-gateway"
}

# Private DNS zone for googleapis.com
resource "google_dns_managed_zone" "googleapis_private" {
  name       = "googleapis-private-zone"
  dns_name   = "googleapis.com."
  visibility = "private"

  private_visibility_config {
    networks {
      network_url = google_compute_network.vpc.id
    }
  }
}

# A record for restricted.googleapis.com
resource "google_dns_record_set" "restricted_googleapis_a" {
  name         = "restricted.googleapis.com."
  managed_zone = google_dns_managed_zone.googleapis_private.name
  type         = "A"
  ttl          = 300
  rrdatas      = ["199.36.153.4", "199.36.153.5", "199.36.153.6", "199.36.153.7"]
}

# CNAME record pointing *.googleapis.com to restricted.googleapis.com
resource "google_dns_record_set" "googleapis_cname" {
  name         = "*.googleapis.com."
  managed_zone = google_dns_managed_zone.googleapis_private.name
  type         = "CNAME"
  ttl          = 300
  rrdatas      = ["restricted.googleapis.com."]
}
```

## Step 4: Restricted vs. Private API Access

```hcl
# Alternative route if you choose private.googleapis.com instead
resource "google_compute_route" "private_api_route" {
  name             = "private-api-route"
  network          = google_compute_network.vpc.name
  dest_range       = "199.36.153.8/30"  # private.googleapis.com
  priority         = 1000
  next_hop_gateway = "default-internet-gateway"
}
```

## Summary

GCP Private Google Access with OpenTofu allows VMs without public IPs to access Google services securely. Enable it on subnets so VMs can reach Google APIs without external IPs. If you want to use the `private.googleapis.com` or `restricted.googleapis.com` VIPs, add private DNS and ensure your network has a route through the default internet gateway. For VPC Service Controls compliance, use `restricted.googleapis.com` instead of `private.googleapis.com`.
