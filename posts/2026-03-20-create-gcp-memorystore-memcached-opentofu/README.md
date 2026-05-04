# How to Create GCP Memorystore for Memcached with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GCP, Memorystore, Memcached, Infrastructure as Code

Description: Learn how to create GCP Memorystore for Memcached instances with OpenTofu for distributed in-memory caching on Google Cloud.

GCP Memorystore for Memcached provides managed Memcached clusters for workloads that need simple, multi-threaded caching. Managing instances in OpenTofu ensures consistent node configuration, network placement, and parameter tuning.

## Provider Configuration

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
  region  = "us-central1"
}
```

## Memcached Instance

```hcl
resource "google_memcache_instance" "cache" {
  name   = "myapp-memcached"
  region = "us-central1"

  node_count = 3  # Number of Memcached nodes

  node_config {
    cpu_count      = 2       # vCPUs per node
    memory_size_mb = 4096    # MB per node (4 GB)
  }

  memcache_version = "MEMCACHE_1_6_15"

  authorized_network = "projects/${var.project_id}/global/networks/${google_compute_network.main.name}"

  memcache_parameters {
    params = {
      "listen-backlog" = "4096"
      "max-item-size"  = "8388608"  # 8 MB
    }
  }

  maintenance_policy {
    weekly_maintenance_window {
      day      = "SUNDAY"
      start_time {
        hours   = 3
        minutes = 0
      }
      duration = "3600s"
    }
  }

  labels = {
    environment = "production"
    team        = "backend"
  }
}
```

## Discovery Endpoint

Memcached clients use the discovery endpoint to automatically find all nodes:

```hcl
output "discovery_endpoint" {
  description = "Use this endpoint for auto-discovery of all Memcached nodes"
  value       = "${google_memcache_instance.cache.discovery_endpoint}"
}
```

## Multiple Environments

```hcl
locals {
  memcached_config = {
    dev = {
      node_count     = 1
      cpu_count      = 1
      memory_size_mb = 1024
    }
    staging = {
      node_count     = 2
      cpu_count      = 2
      memory_size_mb = 2048
    }
    production = {
      node_count     = 3
      cpu_count      = 4
      memory_size_mb = 8192
    }
  }
}

resource "google_memcache_instance" "envs" {
  for_each = local.memcached_config

  name   = "myapp-memcached-${each.key}"
  region = "us-central1"

  node_count = each.value.node_count

  node_config {
    cpu_count      = each.value.cpu_count
    memory_size_mb = each.value.memory_size_mb
  }

  memcache_version = "MEMCACHE_1_6_15"

  authorized_network = "projects/${var.project_id}/global/networks/${google_compute_network.main.name}"
}
```

## Comparison: Memcached vs Redis on Memorystore

| Feature | Memcached | Redis |
|---|---|---|
| Multi-threading | Yes | No (single-threaded) |
| Data structures | Strings only | Rich types |
| Replication | No | Yes |
| Persistence | No | Yes |
| Cluster mode | Horizontal scale | Partitioned |
| Best for | Simple cache | Session/queues/pub-sub |

## IAM Permissions

```hcl
# Allow application to access Memcached via service account

resource "google_project_iam_member" "memcache_access" {
  project = var.project_id
  role    = "roles/memcache.viewer"
  member  = "serviceAccount:${google_service_account.app.email}"
}
```

## Conclusion

GCP Memorystore for Memcached in OpenTofu provides managed, multi-node distributed caching. Configure the node count and per-node CPU and memory based on your throughput and cache size requirements. Use the auto-discovery endpoint so your application clients automatically detect node changes. Choose Memcached over Redis when you need multi-threaded throughput and simple key-value caching without persistence requirements.
