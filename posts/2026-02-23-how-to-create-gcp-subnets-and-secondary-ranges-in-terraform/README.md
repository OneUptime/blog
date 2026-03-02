# How to Create GCP Subnets and Secondary Ranges in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Subnet, VPC, Networking, Infrastructure as Code, Google Cloud, GKE

Description: Learn how to create GCP subnets with secondary IP ranges using Terraform, including configurations for GKE pods and services, Private Google Access, and flow logs.

---

Subnets in Google Cloud are regional resources that define IP address ranges within a VPC network. Unlike AWS where subnets are zonal, GCP subnets span all zones within a region, simplifying your network architecture. The real power comes from secondary IP ranges, which let you assign additional CIDR blocks to a subnet - a feature that is essential for GKE clusters where pods and services need their own address space.

This guide dives deep into creating GCP subnets with Terraform, with a focus on secondary ranges, Private Google Access, flow logs, and patterns for GKE networking.

## Understanding GCP Subnet Architecture

A few key differences from other clouds:

- **Regional, not zonal**: A subnet in `us-central1` is available across all zones in that region (us-central1-a, us-central1-b, us-central1-c, us-central1-f).
- **Secondary ranges**: Each subnet can have multiple secondary CIDR ranges, used primarily for GKE pod and service IPs.
- **Custom mode vs auto mode**: Custom mode VPCs let you create subnets manually. Auto mode creates a subnet in every region automatically. For production, always use custom mode.
- **Private Google Access**: Allows VMs without external IPs to reach Google APIs and services.

## Creating a VPC with Custom Subnets

Start with a custom mode VPC and add subnets:

```hcl
# versions.tf
terraform {
  required_version = ">= 1.5.0"

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

# Custom mode VPC network
resource "google_compute_network" "main" {
  name                    = "vpc-prod"
  auto_create_subnetworks = false  # Custom mode
  routing_mode            = "GLOBAL"

  # Delete default routes on creation for full control
  delete_default_routes_on_create = false
}

# Primary subnet for compute workloads
resource "google_compute_subnetwork" "compute" {
  name          = "snet-compute-us-central1"
  ip_cidr_range = "10.0.0.0/20"
  region        = "us-central1"
  network       = google_compute_network.main.id

  # Allow VMs without external IPs to access Google APIs
  private_ip_google_access = true

  # Purpose - default for regular subnets
  purpose = "PRIVATE"

  # Stack type - IPV4 for standard subnets
  stack_type = "IPV4_ONLY"
}
```

## Subnets with Secondary Ranges

Secondary ranges are additional CIDR blocks attached to a subnet. They are mostly used for GKE, where pods and services need their own IP space:

```hcl
# Subnet with secondary ranges for GKE
resource "google_compute_subnetwork" "gke" {
  name          = "snet-gke-us-central1"
  ip_cidr_range = "10.1.0.0/20"    # Primary range for GKE nodes
  region        = "us-central1"
  network       = google_compute_network.main.id

  private_ip_google_access = true

  # Secondary range for GKE pods
  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.16.0.0/14"  # /14 gives ~250,000 pod IPs
  }

  # Secondary range for GKE services
  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.20.0.0/20"  # /20 gives ~4,000 service IPs
  }
}
```

The sizing of these ranges is important. Here is a rough guide:

- **Node range** (`ip_cidr_range`): One IP per node. A /20 gives you 4,096 addresses.
- **Pod range**: By default, GKE assigns a /24 to each node for pods (256 IPs). For 100 nodes, you need 100 x 256 = 25,600 IPs minimum. A /14 (262,144 IPs) is a safe default.
- **Service range**: One IP per Kubernetes service. A /20 (4,096 IPs) is plenty for most clusters.

## Referencing Secondary Ranges in GKE

Here is how the GKE cluster references the secondary ranges:

```hcl
resource "google_container_cluster" "main" {
  name     = "gke-prod-us-central1"
  location = "us-central1"

  # Use the GKE subnet
  network    = google_compute_network.main.name
  subnetwork = google_compute_subnetwork.gke.name

  # VPC-native cluster using secondary ranges
  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"      # Matches the secondary range name
    services_secondary_range_name = "services"   # Matches the secondary range name
  }

  # Remove default node pool and manage pools separately
  remove_default_node_pool = true
  initial_node_count       = 1

  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }
}
```

## Enabling Flow Logs

VPC Flow Logs capture information about network traffic flowing to and from your VM instances:

```hcl
resource "google_compute_subnetwork" "monitored" {
  name          = "snet-monitored-us-central1"
  ip_cidr_range = "10.2.0.0/20"
  region        = "us-central1"
  network       = google_compute_network.main.id

  private_ip_google_access = true

  # Enable VPC Flow Logs
  log_config {
    # How often to sample flows (0.0 to 1.0)
    # 0.5 means 50% of flows are logged - good balance of visibility and cost
    flow_sampling = 0.5

    # Log interval: INTERVAL_5_SEC, INTERVAL_10_MIN, etc.
    aggregation_interval = "INTERVAL_10_MIN"

    # Include metadata in logs for better analysis
    metadata = "INCLUDE_ALL_METADATA"

    # Filter expression - log only specific traffic
    # Empty means log all traffic
    filter_expr = "true"
  }
}
```

Flow logs can generate significant volume and cost. Use sampling rates of 0.1-0.5 for production and 1.0 only for debugging specific issues.

## Multiple Subnets Across Regions

Create subnets in multiple regions using `for_each`:

```hcl
variable "subnets" {
  description = "Map of subnet configurations"
  type = map(object({
    region         = string
    ip_cidr_range  = string
    purpose        = string
    secondary_ranges = map(string)
  }))
  default = {
    "compute-us-central1" = {
      region        = "us-central1"
      ip_cidr_range = "10.0.0.0/20"
      purpose       = "PRIVATE"
      secondary_ranges = {}
    }
    "compute-us-east1" = {
      region        = "us-east1"
      ip_cidr_range = "10.1.0.0/20"
      purpose       = "PRIVATE"
      secondary_ranges = {}
    }
    "gke-us-central1" = {
      region        = "us-central1"
      ip_cidr_range = "10.4.0.0/20"
      purpose       = "PRIVATE"
      secondary_ranges = {
        "pods"     = "10.16.0.0/14"
        "services" = "10.20.0.0/20"
      }
    }
    "gke-us-east1" = {
      region        = "us-east1"
      ip_cidr_range = "10.5.0.0/20"
      purpose       = "PRIVATE"
      secondary_ranges = {
        "pods"     = "10.24.0.0/14"
        "services" = "10.28.0.0/20"
      }
    }
  }
}

resource "google_compute_subnetwork" "subnets" {
  for_each = var.subnets

  name          = "snet-${each.key}"
  ip_cidr_range = each.value.ip_cidr_range
  region        = each.value.region
  network       = google_compute_network.main.id
  purpose       = each.value.purpose

  private_ip_google_access = true

  dynamic "secondary_ip_range" {
    for_each = each.value.secondary_ranges

    content {
      range_name    = secondary_ip_range.key
      ip_cidr_range = secondary_ip_range.value
    }
  }

  dynamic "log_config" {
    for_each = var.enable_flow_logs ? [1] : []

    content {
      aggregation_interval = "INTERVAL_10_MIN"
      flow_sampling        = 0.5
      metadata             = "INCLUDE_ALL_METADATA"
    }
  }
}
```

## Proxy-Only Subnets for Load Balancers

Internal HTTP(S) load balancers require a proxy-only subnet:

```hcl
# Proxy-only subnet for internal HTTP(S) load balancers
resource "google_compute_subnetwork" "proxy_only" {
  name          = "snet-proxy-only-us-central1"
  ip_cidr_range = "10.3.0.0/24"
  region        = "us-central1"
  network       = google_compute_network.main.id

  # REGIONAL_MANAGED_PROXY indicates this is for load balancer proxies
  purpose = "REGIONAL_MANAGED_PROXY"

  # Proxy-only subnets must have this role
  role = "ACTIVE"
}
```

## Private Service Connect Subnets

For Private Service Connect to access Google APIs:

```hcl
# Subnet for Private Service Connect
resource "google_compute_subnetwork" "psc" {
  name          = "snet-psc-us-central1"
  ip_cidr_range = "10.8.0.0/24"
  region        = "us-central1"
  network       = google_compute_network.main.id
  purpose       = "PRIVATE_SERVICE_CONNECT"
}
```

## Outputs

```hcl
output "subnet_ids" {
  description = "Map of subnet names to their self_links"
  value       = { for k, v in google_compute_subnetwork.subnets : k => v.self_link }
}

output "gke_subnet_id" {
  description = "Self link of the GKE subnet"
  value       = google_compute_subnetwork.gke.self_link
}

output "gke_pod_range_name" {
  description = "Name of the secondary range for pods"
  value       = "pods"
}

output "gke_service_range_name" {
  description = "Name of the secondary range for services"
  value       = "services"
}
```

## IP Address Planning

Planning your IP address space is critical. Here is a template for a medium-sized organization:

```
10.0.0.0/8 (entire private space)
  10.0.0.0/16  - US Central region
    10.0.0.0/20  - Compute subnet
    10.0.16.0/20 - Database subnet
    10.0.32.0/20 - GKE nodes
  10.1.0.0/16  - US East region
    10.1.0.0/20  - Compute subnet
    10.1.16.0/20 - Database subnet
    10.1.32.0/20 - GKE nodes
  10.16.0.0/12 - GKE pods (shared across regions)
  10.32.0.0/16 - GKE services (shared across regions)
```

Leave plenty of room between ranges for growth. Running out of IP space is a painful problem to fix retroactively.

## Best Practices

**Plan IP ranges before deploying.** Changing subnet CIDR ranges requires deleting and recreating the subnet (and everything in it). Get it right the first time.

**Size secondary ranges generously.** GKE pod ranges especially need to be large. A cluster that grows from 10 to 100 nodes will need 10x more pod IPs.

**Enable Private Google Access.** There is no cost for this, and it lets VMs without external IPs access Google APIs - which is how all production VMs should be configured.

**Use descriptive range names.** Secondary range names like "pods" and "services" are referenced by name in GKE configuration. Make them clear and consistent.

**Enable flow logs selectively.** Flow logs on every subnet can get expensive. Enable them on sensitive subnets and use sampling to reduce volume.

## Wrapping Up

GCP subnets with secondary ranges give you the flexibility to separate concerns within a single subnet - node IPs, pod IPs, and service IPs each get their own CIDR block while sharing the same subnet resource. Terraform makes it straightforward to define these ranges, create subnets across regions, and reference them in GKE configurations. Plan your IP address space carefully upfront, size ranges generously, and enable Private Google Access on every subnet.
