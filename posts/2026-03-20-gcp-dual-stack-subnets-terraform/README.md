# How to Configure GCP Dual-Stack Subnets with Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Terraform, IPv6, Dual-Stack, VPC, Subnets

Description: A guide to creating Google Cloud Platform VPC subnets with dual-stack (IPv4 and IPv6) addressing using Terraform.

GCP VPC subnets support a `stack_type` of `IPV4_IPV6` to enable dual-stack. When enabled, GCP automatically assigns an internal IPv6 range to the subnet from the VPC's internal IPv6 range. External IPv6 addressing is also supported for public-facing subnets.

## Step 1: Configure the GCP Provider

```hcl
# provider.tf

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = "us-central1"
}
```

## Step 2: Create a VPC with Internal IPv6 Range

```hcl
# vpc.tf - GCP VPC with internal IPv6 enabled
resource "google_compute_network" "main" {
  name                    = "vpc-dual-stack"
  auto_create_subnetworks = false

  # Enable internal IPv6 for the VPC (required for INTERNAL ipv6_access_type)
  # For EXTERNAL, you don't need this
  enable_ula_internal_ipv6 = true
}
```

## Step 3: Create a Dual-Stack Subnet with Internal IPv6

Internal IPv6 (ULA) is used for private workloads that don't need direct internet IPv6 access:

```hcl
# subnet-internal-ipv6.tf - Dual-stack subnet with internal (ULA) IPv6
resource "google_compute_subnetwork" "internal_ipv6" {
  name          = "snet-internal-ipv6"
  network       = google_compute_network.main.id
  region        = "us-central1"
  ip_cidr_range = "10.0.1.0/24"

  # Enable dual-stack
  stack_type = "IPV4_IPV6"

  # Use INTERNAL for private ULA IPv6 (GCP assigns the /64 automatically)
  ipv6_access_type = "INTERNAL"
}

output "internal_ipv6_cidr" {
  value = google_compute_subnetwork.internal_ipv6.internal_ipv6_prefix
  description = "GCP-assigned internal IPv6 /64 for this subnet"
}
```

## Step 4: Create a Dual-Stack Subnet with External IPv6

External IPv6 is used for subnets that need globally routable IPv6 addresses:

```hcl
# subnet-external-ipv6.tf - Dual-stack subnet with external (GUA) IPv6
resource "google_compute_subnetwork" "external_ipv6" {
  name          = "snet-external-ipv6"
  network       = google_compute_network.main.id
  region        = "us-central1"
  ip_cidr_range = "10.0.2.0/24"

  # Enable dual-stack
  stack_type = "IPV4_IPV6"

  # Use EXTERNAL for globally routable IPv6 addresses
  ipv6_access_type = "EXTERNAL"
}

output "external_ipv6_cidr" {
  value = google_compute_subnetwork.external_ipv6.external_ipv6_prefix
}
```

## Step 5: Create a GCE Instance with Dual-Stack

```hcl
# instance.tf - VM instance in the dual-stack subnet
resource "google_compute_instance" "dual_stack" {
  name         = "vm-dual-stack"
  machine_type = "e2-micro"
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.external_ipv6.id

    # Make the VM network interface dual-stack
    stack_type = "IPV4_IPV6"

    # Request an external IPv4 address
    access_config {}

    # Request an external IPv6 /96 range from the subnet's external IPv6 /64
    ipv6_access_config {
      network_tier = "PREMIUM"
    }
  }
}
```

## Step 6: Create IPv6 Firewall Rules

```hcl
# firewall.tf - Allow ICMPv6 and SSH over IPv6 for the dual-stack subnet
resource "google_compute_firewall" "allow_icmpv6" {
  name    = "allow-icmpv6"
  network = google_compute_network.main.name

  allow {
    # Use IANA protocol number 58 for ICMPv6
    protocol = "58"
  }

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  # Apply to IPv6 traffic from anywhere
  source_ranges = ["::/0"]
}
```

## Step 7: Apply and Verify

```bash
terraform apply

# Check the subnet's external IPv6 /64
gcloud compute networks subnets describe snet-external-ipv6 \
  --region=us-central1 \
  --format='value(externalIpv6Prefix,stackType,ipv6AccessType)'
```

GCP's dual-stack subnets with `EXTERNAL` IPv6 access type provide globally routable IPv6 addresses without requiring additional gateways, simplifying IPv6 deployment on Google Cloud.
