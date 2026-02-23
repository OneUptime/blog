# How to Create GCP Memorystore Redis with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Memorystore, Redis, Caching, Infrastructure as Code

Description: Learn how to provision and configure Google Cloud Memorystore for Redis instances using Terraform for managed caching and session storage.

---

Redis is one of those tools that shows up everywhere - caching, session storage, rate limiting, pub/sub messaging, leaderboards. Google Cloud Memorystore for Redis gives you a fully managed Redis instance without the operational burden of running Redis yourself. No patching, no failover configuration, no backup scripts.

Terraform makes it easy to define Memorystore instances as code, so you can spin up identical Redis instances across dev, staging, and production with the same configuration. This guide covers creating Memorystore Redis instances with Terraform, from basic setups to highly available configurations with read replicas.

## Enabling the API

```hcl
# Enable the Memorystore API
resource "google_project_service" "redis" {
  project = var.project_id
  service = "redis.googleapis.com"

  disable_on_destroy = false
}
```

## A Basic Redis Instance

The simplest Memorystore Redis instance is a single-node setup suitable for development and caching.

```hcl
# Basic Redis instance for caching
resource "google_redis_instance" "cache" {
  name           = "app-cache-${var.environment}"
  project        = var.project_id
  region         = var.region
  display_name   = "Application Cache"

  # Redis version
  redis_version = "REDIS_7_0"

  # Instance size - memory in GB
  memory_size_gb = 5

  # Basic tier is single-node, no replication
  tier = "BASIC"

  # Network configuration - must be in a VPC
  authorized_network = var.network_id

  # Redis configuration parameters
  redis_configs = {
    # Eviction policy when memory is full
    maxmemory-policy = "allkeys-lru"

    # Disable keyspace notifications to save CPU
    notify-keyspace-events = ""
  }

  labels = {
    environment = var.environment
    purpose     = "caching"
    managed_by  = "terraform"
  }

  depends_on = [google_project_service.redis]
}
```

## Standard Tier with High Availability

For production workloads, use the Standard tier. It provides automatic failover with a replica in a different zone.

```hcl
# Production Redis instance with high availability
resource "google_redis_instance" "production" {
  name           = "prod-cache-${var.environment}"
  project        = var.project_id
  region         = var.region
  display_name   = "Production Cache"

  redis_version  = "REDIS_7_0"
  memory_size_gb = 10

  # Standard tier includes automatic failover
  tier = "STANDARD_HA"

  # Specify zones for primary and replica
  location_id             = "${var.region}-a"
  alternative_location_id = "${var.region}-b"

  authorized_network = var.network_id

  # Reserve a specific IP range
  reserved_ip_range = "10.0.0.0/28"

  # Connect mode
  connect_mode = "PRIVATE_SERVICE_ACCESS"

  # Redis configuration for production
  redis_configs = {
    maxmemory-policy  = "volatile-lru"
    activedefrag      = "yes"
  }

  # Authentication
  auth_enabled = true

  # In-transit encryption
  transit_encryption_mode = "SERVER_AUTHENTICATION"

  # Maintenance window - Sunday at 2 AM
  maintenance_policy {
    weekly_maintenance_window {
      day = "SUNDAY"
      start_time {
        hours   = 2
        minutes = 0
        seconds = 0
        nanos   = 0
      }
    }
  }

  labels = {
    environment = var.environment
    purpose     = "production-cache"
    tier        = "standard-ha"
  }
}
```

## Read Replicas

For read-heavy workloads, you can add read replicas to distribute the load.

```hcl
# Redis instance with read replicas
resource "google_redis_instance" "read_heavy" {
  name           = "read-replica-cache-${var.environment}"
  project        = var.project_id
  region         = var.region
  display_name   = "Read-Heavy Cache with Replicas"

  redis_version  = "REDIS_7_0"
  memory_size_gb = 16

  tier = "STANDARD_HA"

  # Number of read replicas (1-5)
  replica_count = 3

  # Read endpoint for distributing read traffic
  read_replicas_mode = "READ_REPLICAS_ENABLED"

  authorized_network = var.network_id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"

  auth_enabled            = true
  transit_encryption_mode = "SERVER_AUTHENTICATION"

  redis_configs = {
    maxmemory-policy = "volatile-lru"
  }

  labels = {
    environment = var.environment
    replicas    = "3"
  }
}
```

## Private Service Access

Memorystore requires Private Service Access to connect to your VPC. If you have not set this up yet, Terraform can handle it.

```hcl
# Reserve an IP range for private service access
resource "google_compute_global_address" "private_ip_range" {
  name          = "redis-private-ip"
  project       = var.project_id
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = var.network_id
}

# Create the private connection
resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = var.network_id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range.name]
}

# Now create the Redis instance that depends on the private connection
resource "google_redis_instance" "private_redis" {
  name           = "private-cache-${var.environment}"
  project        = var.project_id
  region         = var.region
  display_name   = "Private Redis Instance"

  redis_version  = "REDIS_7_0"
  memory_size_gb = 5

  tier = "STANDARD_HA"

  authorized_network = var.network_id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"

  auth_enabled = true

  labels = {
    environment = var.environment
  }

  # Make sure the private connection is set up first
  depends_on = [google_service_networking_connection.private_vpc_connection]
}
```

## Using Outputs for Application Configuration

Your application needs to know the Redis connection details. Export them as outputs.

```hcl
# Output the connection details
output "redis_host" {
  description = "Redis instance IP address"
  value       = google_redis_instance.production.host
}

output "redis_port" {
  description = "Redis instance port"
  value       = google_redis_instance.production.port
}

output "redis_read_endpoint" {
  description = "Redis read endpoint for read replicas"
  value       = google_redis_instance.read_heavy.read_endpoint
}

output "redis_auth_string" {
  description = "Redis AUTH string"
  value       = google_redis_instance.production.auth_string
  sensitive   = true
}

# Connection string for applications
output "redis_connection_url" {
  description = "Redis connection URL"
  value       = "redis://:${google_redis_instance.production.auth_string}@${google_redis_instance.production.host}:${google_redis_instance.production.port}"
  sensitive   = true
}
```

## Multiple Redis Instances with for_each

When you need different Redis instances for different purposes, `for_each` keeps the configuration clean.

```hcl
variable "redis_instances" {
  description = "Map of Redis instance configurations"
  type = map(object({
    memory_size_gb = number
    tier           = string
    redis_version  = string
    maxmemory_policy = string
  }))
  default = {
    "session-store" = {
      memory_size_gb   = 5
      tier             = "STANDARD_HA"
      redis_version    = "REDIS_7_0"
      maxmemory_policy = "volatile-lru"
    }
    "api-cache" = {
      memory_size_gb   = 10
      tier             = "STANDARD_HA"
      redis_version    = "REDIS_7_0"
      maxmemory_policy = "allkeys-lru"
    }
    "rate-limiter" = {
      memory_size_gb   = 2
      tier             = "BASIC"
      redis_version    = "REDIS_7_0"
      maxmemory_policy = "noeviction"
    }
  }
}

resource "google_redis_instance" "instances" {
  for_each = var.redis_instances

  name           = "${each.key}-${var.environment}"
  project        = var.project_id
  region         = var.region
  display_name   = "${each.key} (${var.environment})"

  redis_version  = each.value.redis_version
  memory_size_gb = each.value.memory_size_gb
  tier           = each.value.tier

  authorized_network = var.network_id

  redis_configs = {
    maxmemory-policy = each.value.maxmemory_policy
  }

  labels = {
    environment = var.environment
    purpose     = each.key
    managed_by  = "terraform"
  }
}
```

## Important Considerations

Memorystore Redis instances take several minutes to create. Standard HA instances take even longer because they need to set up replication. Plan for this in your deployment pipeline.

Memory size is the main cost driver. A 10 GB Standard HA instance costs significantly more than a 1 GB Basic instance. Right-size based on your actual usage, and monitor memory utilization after deployment.

The `auth_string` is generated by GCP and stored in Terraform state. Make sure your state backend is encrypted and access-controlled.

Memorystore does not support all Redis commands. Some administrative commands like `CONFIG`, `CLUSTER`, and `DEBUG` are disabled. Check the compatibility matrix if your application relies on specific Redis features.

Scaling memory size on an existing instance causes a brief interruption for Basic tier. Standard HA tier handles it with minimal downtime through failover, but you should still plan for a maintenance window.

## Conclusion

Memorystore Redis is a solid choice for managed caching and session storage on GCP. Terraform lets you define your Redis infrastructure alongside the rest of your stack, making it easy to replicate across environments and track changes in version control. Whether you need a simple cache for development or a highly available instance with read replicas for production, the Terraform resources give you full control over the configuration.
