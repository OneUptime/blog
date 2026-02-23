# How to Create GCP Cloud NAT with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Cloud NAT, Networking, Cloud Router, Infrastructure as Code

Description: Learn how to set up GCP Cloud NAT with Terraform to provide outbound internet access for private VMs, including IP allocation, logging, and subnet-specific configurations.

---

Cloud NAT (Network Address Translation) lets your private Google Cloud resources access the internet for outbound connections without having external IP addresses. This is a fundamental networking component for any security-conscious GCP architecture. Your VMs can download packages, call external APIs, and push to external services - all without being directly reachable from the internet.

In this post, we will configure Cloud NAT using Terraform, covering everything from basic setups to advanced configurations with manual IP allocation and per-subnet rules.

## How Cloud NAT Works

Cloud NAT sits at the network edge and translates the private IP addresses of your VMs into public IP addresses for outbound traffic. It is fully managed by Google, so there is no VM or appliance to maintain. A few things to understand:

- Cloud NAT works with a Cloud Router, but it does not use BGP. The Cloud Router just provides the control plane.
- It only handles outbound traffic. Inbound connections are not routed through Cloud NAT.
- It works with Compute Engine VMs, GKE nodes, and Cloud Run (via Serverless VPC Access).
- Cloud NAT is regional. You need one per region.

## Provider and Network Setup

```hcl
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
  region  = var.region
}

variable "project_id" {
  type = string
}

variable "region" {
  type    = string
  default = "us-central1"
}

# VPC network - no auto subnets since we want private-only
resource "google_compute_network" "main" {
  name                    = "main-vpc"
  auto_create_subnetworks = false
}

# Private subnet for compute resources
resource "google_compute_subnetwork" "private" {
  name          = "private-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.main.id

  # Enable Private Google Access so VMs can reach Google APIs
  # without going through NAT
  private_ip_google_access = true
}

# A second subnet for other workloads
resource "google_compute_subnetwork" "workload" {
  name          = "workload-subnet"
  ip_cidr_range = "10.0.1.0/24"
  region        = var.region
  network       = google_compute_network.main.id

  private_ip_google_access = true
}
```

## Basic Cloud NAT with Automatic IP Allocation

The simplest Cloud NAT setup lets Google manage the external IP addresses:

```hcl
# Cloud Router - required by Cloud NAT
resource "google_compute_router" "nat_router" {
  name    = "nat-router"
  region  = var.region
  network = google_compute_network.main.id
}

# Cloud NAT with automatic IP allocation
resource "google_compute_router_nat" "main" {
  name                               = "main-cloud-nat"
  router                             = google_compute_router.nat_router.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}
```

This configuration gives every subnet in the region outbound internet access through Cloud NAT. Google automatically allocates and manages the external IP addresses. This is fine for development or when you do not care about the specific external IPs.

## Cloud NAT with Manual IP Allocation

In production, you often want to control which external IPs are used. This is important when external services need to whitelist your IP addresses:

```hcl
# Reserve static external IPs for NAT
resource "google_compute_address" "nat_ip_1" {
  name   = "nat-ip-1"
  region = var.region
}

resource "google_compute_address" "nat_ip_2" {
  name   = "nat-ip-2"
  region = var.region
}

# Cloud Router for manual NAT
resource "google_compute_router" "manual_nat_router" {
  name    = "manual-nat-router"
  region  = var.region
  network = google_compute_network.main.id
}

# Cloud NAT with manually assigned IPs
resource "google_compute_router_nat" "manual" {
  name                               = "manual-cloud-nat"
  router                             = google_compute_router.manual_nat_router.name
  region                             = var.region
  nat_ip_allocate_option             = "MANUAL_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  # Assign our static IPs
  nat_ips = [
    google_compute_address.nat_ip_1.self_link,
    google_compute_address.nat_ip_2.self_link,
  ]

  # Minimum ports per VM - increase for workloads with many connections
  min_ports_per_vm = 256

  # Enable endpoint-independent mapping for better compatibility
  enable_endpoint_independent_mapping = true

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}
```

The `min_ports_per_vm` setting controls how many source ports each VM gets. The default (64) is often too low for busy applications. If you see connection failures in your NAT logs, increase this value.

## Cloud NAT for Specific Subnets

Instead of applying NAT to all subnets, you can target specific ones:

```hcl
# Cloud NAT applied only to selected subnets
resource "google_compute_router_nat" "selective" {
  name                               = "selective-cloud-nat"
  router                             = google_compute_router.nat_router.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "LIST_OF_SUBNETWORKS"

  # Only the private subnet gets NAT
  subnetwork {
    name                    = google_compute_subnetwork.private.id
    source_ip_ranges_to_nat = ["ALL_IP_RANGES"]
  }

  # The workload subnet also gets NAT, but only for primary IP ranges
  # (not secondary ranges used by GKE pods)
  subnetwork {
    name                    = google_compute_subnetwork.workload.id
    source_ip_ranges_to_nat = ["PRIMARY_IP_RANGE"]
  }

  log_config {
    enable = true
    filter = "TRANSLATIONS_ONLY"
  }
}
```

This is particularly useful when you have GKE clusters. You might want NAT for the node primary IPs but not for pod IPs, which might use a different egress path.

## Cloud NAT with Port Allocation Tuning

For high-throughput workloads, you will need to tune the port allocation:

```hcl
# High-throughput Cloud NAT configuration
resource "google_compute_router_nat" "high_throughput" {
  name                               = "high-throughput-nat"
  router                             = google_compute_router.nat_router.name
  region                             = var.region
  nat_ip_allocate_option             = "MANUAL_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  nat_ips = [
    google_compute_address.nat_ip_1.self_link,
    google_compute_address.nat_ip_2.self_link,
  ]

  # Higher minimum ports for busy workloads
  min_ports_per_vm = 1024

  # Enable dynamic port allocation
  enable_dynamic_port_allocation = true
  max_ports_per_vm               = 65536

  # Longer timeouts for persistent connections
  tcp_established_idle_timeout_sec = 1200
  tcp_transitory_idle_timeout_sec  = 30
  tcp_time_wait_timeout_sec        = 120
  udp_idle_timeout_sec             = 30
  icmp_idle_timeout_sec            = 30

  log_config {
    enable = true
    filter = "ALL"
  }
}
```

Dynamic port allocation (available since the feature went GA) allows Cloud NAT to allocate ports on demand up to `max_ports_per_vm`. This is much more efficient than static allocation because ports are only used when needed.

## Cloud NAT for GKE

When using Cloud NAT with GKE, you typically want to NAT both node IPs and pod IPs:

```hcl
# Subnet with secondary ranges for GKE
resource "google_compute_subnetwork" "gke" {
  name          = "gke-subnet"
  ip_cidr_range = "10.0.10.0/24"
  region        = var.region
  network       = google_compute_network.main.id

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.1.0.0/16"
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.2.0.0/20"
  }

  private_ip_google_access = true
}

# Cloud NAT configured for GKE
resource "google_compute_router_nat" "gke_nat" {
  name                               = "gke-cloud-nat"
  router                             = google_compute_router.nat_router.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "LIST_OF_SUBNETWORKS"

  # NAT for all IP ranges including pod and service CIDRs
  subnetwork {
    name = google_compute_subnetwork.gke.id
    source_ip_ranges_to_nat = [
      "PRIMARY_IP_RANGE",
      "LIST_OF_SECONDARY_IP_RANGES",
    ]
    secondary_ip_range_names = [
      "pods",
      "services",
    ]
  }

  # GKE pods make many outbound connections
  min_ports_per_vm                 = 4096
  enable_dynamic_port_allocation   = true
  max_ports_per_vm                 = 65536

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}
```

## Outputs

```hcl
output "nat_external_ips" {
  description = "External IPs used by Cloud NAT"
  value = [
    google_compute_address.nat_ip_1.address,
    google_compute_address.nat_ip_2.address,
  ]
}

output "nat_name" {
  description = "Name of the Cloud NAT"
  value       = google_compute_router_nat.manual.name
}

output "router_name" {
  description = "Name of the Cloud Router"
  value       = google_compute_router.manual_nat_router.name
}
```

## Monitoring and Troubleshooting

Cloud NAT exposes metrics in Cloud Monitoring. Key metrics to watch:

- `nat_allocation_failed` - Indicates port exhaustion
- `dropped_sent_packets_count` - Packets dropped due to NAT issues
- `open_connections` - Current number of NAT connections

You can set up alerts on these metrics using Terraform:

```hcl
# Alert when NAT port allocation fails
resource "google_monitoring_alert_policy" "nat_exhaustion" {
  display_name = "Cloud NAT Port Exhaustion"
  combiner     = "OR"

  conditions {
    display_name = "NAT allocation failures"
    condition_threshold {
      filter          = "resource.type=\"nat_gateway\" AND metric.type=\"router.googleapis.com/nat/nat_allocation_failed\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0
      duration        = "60s"

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_SUM"
      }
    }
  }

  notification_channels = []  # Add your notification channels here
}
```

## Best Practices

**Use manual IP allocation in production.** External services that whitelist IPs need stable addresses. Auto-allocated IPs can change.

**Enable dynamic port allocation.** It is more efficient and handles bursty workloads better than static allocation.

**Monitor port usage.** Port exhaustion is the most common Cloud NAT issue. Watch the metrics and increase `min_ports_per_vm` proactively.

**Enable Private Google Access on subnets.** Traffic to Google APIs does not need to go through Cloud NAT if you enable this. It reduces NAT port consumption and improves performance.

**Set appropriate timeouts.** The default TCP idle timeout is 1200 seconds. If your application uses long-lived connections, make sure the timeout is longer than your application's keepalive interval.

## Conclusion

Cloud NAT is essential for giving private instances internet access without exposing them to inbound traffic. The Terraform configuration is straightforward, but getting the port allocation and timeouts right takes some thought. Start with dynamic port allocation and generous minimums, then tune based on your actual usage patterns.

For the networking foundation Cloud NAT depends on, check out our post on [creating Cloud Router with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-gcp-cloud-router-with-terraform/view).
