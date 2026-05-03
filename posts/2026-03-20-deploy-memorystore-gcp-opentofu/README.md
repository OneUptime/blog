# How to Deploy Memorystore (Redis) on GCP with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Memorystore, Redis, GCP, Cache, Infrastructure as Code

Description: Learn how to deploy Google Cloud Memorystore for Redis using OpenTofu - including instance configuration, private service access, high availability, and AUTH token management.

## Introduction

GCP Memorystore for Redis with OpenTofu uses `google_redis_instance` for standard Redis or `google_redis_cluster` for Redis Cluster mode. Memorystore uses private service access - no public IPs, connections route through your VPC.

## Private Service Access (Required for Memorystore)

```hcl
# Enable Redis API

resource "google_project_service" "redis" {
  service            = "redis.googleapis.com"
  disable_on_destroy = false
}

# Memorystore uses the service networking connection (same as Cloud SQL)
resource "google_compute_global_address" "private_ip_range" {
  name          = "${var.environment}-redis-private-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.main.id
}

resource "google_service_networking_connection" "private_connection" {
  network                 = google_compute_network.main.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range.name]
}
```

## Basic Redis Instance

```hcl
resource "google_redis_instance" "main" {
  name           = "${var.environment}-redis"
  display_name   = "${var.environment} Redis Cache"
  tier           = var.environment == "prod" ? "STANDARD_HA" : "BASIC"
  memory_size_gb = var.redis_memory_gb  # 1-300 GB

  region     = var.gcp_region
  location_id = "${var.gcp_region}-a"   # Primary zone
  alternative_location_id = "${var.gcp_region}-b"  # Replica zone (STANDARD_HA only)

  # Network
  authorized_network = google_compute_network.main.id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"  # Use private IP

  # Redis version
  redis_version = "REDIS_7_0"

  # AUTH
  auth_enabled = true

  # TLS
  transit_encryption_mode = "SERVER_AUTHENTICATION"

  # Configuration
  redis_configs = {
    maxmemory-policy = "allkeys-lru"
    activerehashing  = "yes"
    lazyfree-lazy-eviction = "yes"
  }

  # Maintenance
  maintenance_policy {
    weekly_maintenance_window {
      day = "MONDAY"
      start_time {
        hours   = 4
        minutes = 0
        seconds = 0
        nanos   = 0
      }
    }
  }

  labels = {
    environment = var.environment
    managed-by  = "opentofu"
  }

  depends_on = [google_service_networking_connection.private_connection]
}
```

## Redis AUTH Token

```hcl
# Get the AUTH string from the instance
output "redis_auth_string" {
  sensitive = true
  value     = google_redis_instance.main.auth_string
}

# Store in Secret Manager
resource "google_secret_manager_secret" "redis_auth" {
  secret_id = "${var.environment}-redis-auth"
  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "redis_auth" {
  secret      = google_secret_manager_secret.redis_auth.id
  secret_data = google_redis_instance.main.auth_string
}
```

## Redis Cluster Mode (for Large Datasets)

```hcl
resource "google_redis_cluster" "main" {
  name     = "${var.environment}-redis-cluster"
  shard_count = 3  # 3 shards × 2 nodes = 6 nodes total

  # Network
  psc_configs {
    network = google_compute_network.main.id
  }

  region = var.gcp_region

  # Replica count per shard
  replica_count = 1

  # Node type
  node_type = "REDIS_STANDARD_SMALL"  # or REDIS_SHARED_CORE_NANO / REDIS_HIGHMEM_MEDIUM / REDIS_HIGHMEM_XLARGE

  # TLS
  transit_encryption_mode = "TRANSIT_ENCRYPTION_MODE_SERVER_AUTHENTICATION"

  # AUTH
  authorization_mode = "AUTH_MODE_IAM_AUTH"  # IAM-based auth

  deletion_protection_enabled = var.environment == "prod"

  zone_distribution_config {
    mode = "MULTI_ZONE"
  }
}
```

## Connecting from GKE

```hcl
# If using GKE, configure Redis connection via workload identity
resource "google_service_account" "redis_client" {
  account_id   = "${var.environment}-redis-client"
  display_name = "Redis Client Service Account"
}

# Grant Redis client role
resource "google_project_iam_member" "redis_client" {
  project = var.gcp_project_id
  role    = "roles/redis.editor"  # or roles/redis.viewer
  member  = "serviceAccount:${google_service_account.redis_client.email}"
}
```

## Firewall Rule

```hcl
resource "google_compute_firewall" "allow_redis" {
  name    = "${var.environment}-allow-redis"
  network = google_compute_network.main.id

  allow {
    protocol = "tcp"
    ports    = ["6379", "6378"]  # 6378 for TLS
  }

  source_tags = ["app-server"]  # Only allow from tagged app instances
  target_tags = ["redis-client"]
}
```

## Outputs

```hcl
output "redis_host" {
  value       = google_redis_instance.main.host
  description = "Redis instance IP address"
}

output "redis_port" {
  value = google_redis_instance.main.port
}

output "redis_connection" {
  value       = "${google_redis_instance.main.host}:${google_redis_instance.main.port}"
  description = "Redis connection string (host:port)"
}
```

## Conclusion

GCP Memorystore Redis with OpenTofu requires private service access networking before creating instances. Use `STANDARD_HA` tier for production (automatic replication to a secondary zone) and `BASIC` for development. Enable AUTH and TLS for security. For large datasets requiring horizontal partitioning, use `google_redis_cluster` with multiple shards. Store the AUTH string in Secret Manager and grant applications access via IAM rather than hardcoding the token.
