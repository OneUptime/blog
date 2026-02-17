# How to Build a Terraform Module for Cloud Memorystore Redis with Private Service Access and High Availability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Terraform, Memorystore, Redis, Caching, Google Cloud Platform

Description: Build a Terraform module for Google Cloud Memorystore Redis with private service access for secure connectivity, high availability with automatic failover, and proper monitoring configuration.

---

Every application reaches a point where it needs a cache. Whether it is session storage, rate limiting, or caching database query results, Redis is the go-to choice. Google Cloud Memorystore gives you a fully managed Redis instance, but setting it up properly for production requires more than just creating the instance - you need private networking, high availability, and monitoring.

Here is a reusable Terraform module that covers all of it.

## Module Variables

Start with the inputs. The goal is to provide good defaults for production while allowing customization:

```hcl
# variables.tf - Memorystore Redis module inputs

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for the Redis instance"
  type        = string
  default     = "us-central1"
}

variable "name" {
  description = "Name for the Redis instance"
  type        = string
}

variable "tier" {
  description = "Service tier: BASIC (no replication) or STANDARD_HA (with replica)"
  type        = string
  default     = "STANDARD_HA"

  validation {
    condition     = contains(["BASIC", "STANDARD_HA"], var.tier)
    error_message = "Tier must be BASIC or STANDARD_HA."
  }
}

variable "memory_size_gb" {
  description = "Redis memory size in GB"
  type        = number
  default     = 1
}

variable "redis_version" {
  description = "Redis version (REDIS_7_0, REDIS_6_X, etc.)"
  type        = string
  default     = "REDIS_7_0"
}

variable "vpc_network_id" {
  description = "Self link of the VPC network for private service access"
  type        = string
}

variable "reserved_ip_range" {
  description = "CIDR range for the Redis instance (leave empty for auto-allocation)"
  type        = string
  default     = ""
}

variable "auth_enabled" {
  description = "Enable AUTH for Redis connections"
  type        = bool
  default     = true
}

variable "transit_encryption_mode" {
  description = "Encryption mode: DISABLED or SERVER_AUTHENTICATION"
  type        = string
  default     = "SERVER_AUTHENTICATION"
}

variable "redis_configs" {
  description = "Redis configuration parameters"
  type        = map(string)
  default = {
    "maxmemory-policy" = "allkeys-lru"
    "notify-keyspace-events" = ""
  }
}

variable "maintenance_day" {
  description = "Day of week for maintenance (MONDAY through SUNDAY)"
  type        = string
  default     = "SUNDAY"
}

variable "maintenance_hour" {
  description = "Hour (UTC) for maintenance window start (0-23)"
  type        = number
  default     = 3
}

variable "labels" {
  description = "Labels to apply to the instance"
  type        = map(string)
  default     = {}
}

variable "read_replicas_mode" {
  description = "Read replicas mode: READ_REPLICAS_DISABLED or READ_REPLICAS_ENABLED"
  type        = string
  default     = "READ_REPLICAS_DISABLED"
}

variable "replica_count" {
  description = "Number of read replicas (1-5, only for STANDARD_HA)"
  type        = number
  default     = 0
}
```

## Private Service Access Setup

Memorystore Redis requires private service access to your VPC. This creates a peering connection between your network and Google's managed services network:

```hcl
# private-access.tf - Private service access for Memorystore

# Reserve an IP range for Google managed services
resource "google_compute_global_address" "redis_range" {
  project       = var.project_id
  name          = "${var.name}-redis-ip-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = var.vpc_network_id
}

# Create the service networking connection
# This might already exist if you have Cloud SQL or other managed services
resource "google_service_networking_connection" "redis" {
  network                 = var.vpc_network_id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.redis_range.name]
}
```

## Creating the Redis Instance

The main Redis instance with HA and private networking:

```hcl
# main.tf - Memorystore Redis instance

resource "google_redis_instance" "cache" {
  project        = var.project_id
  name           = var.name
  display_name   = var.name
  region         = var.region
  tier           = var.tier
  memory_size_gb = var.memory_size_gb
  redis_version  = var.redis_version

  # Private network configuration
  authorized_network = var.vpc_network_id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"
  reserved_ip_range  = var.reserved_ip_range != "" ? var.reserved_ip_range : null

  # Authentication - requires a password for connections
  auth_enabled = var.auth_enabled

  # In-transit encryption between client and Redis
  transit_encryption_mode = var.transit_encryption_mode

  # Redis configuration parameters
  redis_configs = var.redis_configs

  # Maintenance window
  maintenance_policy {
    weekly_maintenance_window {
      day = var.maintenance_day
      start_time {
        hours   = var.maintenance_hour
        minutes = 0
        seconds = 0
        nanos   = 0
      }
    }
  }

  # Read replicas for scaling reads
  read_replicas_mode = var.read_replicas_mode
  replica_count      = var.replica_count

  labels = var.labels

  depends_on = [google_service_networking_connection.redis]

  lifecycle {
    prevent_destroy = true
  }
}
```

## Outputs

Expose the connection details that applications need:

```hcl
# outputs.tf - Connection information for the Redis instance

output "host" {
  description = "Hostname or IP address of the Redis instance"
  value       = google_redis_instance.cache.host
}

output "port" {
  description = "Port number for the Redis instance"
  value       = google_redis_instance.cache.port
}

output "auth_string" {
  description = "AUTH string for the Redis instance (sensitive)"
  value       = google_redis_instance.cache.auth_string
  sensitive   = true
}

output "read_endpoint" {
  description = "Read endpoint IP for read replicas"
  value       = google_redis_instance.cache.read_endpoint
}

output "read_endpoint_port" {
  description = "Read endpoint port for read replicas"
  value       = google_redis_instance.cache.read_endpoint_port
}

output "current_location_id" {
  description = "Current zone where the primary is located"
  value       = google_redis_instance.cache.current_location_id
}

output "server_ca_certs" {
  description = "CA certificates for TLS connections"
  value       = google_redis_instance.cache.server_ca_certs
  sensitive   = true
}

output "connection_string" {
  description = "Redis connection string (without auth)"
  value       = "redis://${google_redis_instance.cache.host}:${google_redis_instance.cache.port}"
}
```

## Storing Credentials in Secret Manager

The Redis AUTH string should be stored securely:

```hcl
# secrets.tf - Store Redis credentials in Secret Manager

resource "google_secret_manager_secret" "redis_auth" {
  project   = var.project_id
  secret_id = "${var.name}-redis-auth"

  replication {
    auto {}
  }

  labels = var.labels
}

resource "google_secret_manager_secret_version" "redis_auth" {
  secret      = google_secret_manager_secret.redis_auth.id
  secret_data = google_redis_instance.cache.auth_string
}

# Store the full connection URL as a secret too
resource "google_secret_manager_secret" "redis_url" {
  project   = var.project_id
  secret_id = "${var.name}-redis-url"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "redis_url" {
  secret      = google_secret_manager_secret.redis_url.id
  secret_data = "rediss://:${google_redis_instance.cache.auth_string}@${google_redis_instance.cache.host}:${google_redis_instance.cache.port}"
}
```

## Monitoring and Alerts

Set up alerts for the metrics that matter:

```hcl
# monitoring.tf - Redis monitoring alerts

# Alert when memory usage is high
resource "google_monitoring_alert_policy" "redis_memory" {
  project      = var.project_id
  display_name = "${var.name} - Redis Memory Usage High"

  conditions {
    display_name = "Memory usage above 80%"

    condition_threshold {
      filter = <<-FILTER
        resource.type = "redis_instance"
        AND resource.labels.instance_id = "${var.name}"
        AND metric.type = "redis.googleapis.com/stats/memory/usage_ratio"
      FILTER

      comparison      = "COMPARISON_GT"
      threshold_value = 0.8
      duration        = "300s"

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = var.notification_channels
}

# Alert when evictions start happening
resource "google_monitoring_alert_policy" "redis_evictions" {
  project      = var.project_id
  display_name = "${var.name} - Redis Evictions Occurring"

  conditions {
    display_name = "Evictions rate above zero"

    condition_threshold {
      filter = <<-FILTER
        resource.type = "redis_instance"
        AND resource.labels.instance_id = "${var.name}"
        AND metric.type = "redis.googleapis.com/stats/evicted_keys"
      FILTER

      comparison      = "COMPARISON_GT"
      threshold_value = 0
      duration        = "60s"

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  notification_channels = var.notification_channels
}

# Alert on high connection count
resource "google_monitoring_alert_policy" "redis_connections" {
  project      = var.project_id
  display_name = "${var.name} - Redis Connected Clients High"

  conditions {
    display_name = "Connected clients above threshold"

    condition_threshold {
      filter = <<-FILTER
        resource.type = "redis_instance"
        AND resource.labels.instance_id = "${var.name}"
        AND metric.type = "redis.googleapis.com/clients/connected"
      FILTER

      comparison      = "COMPARISON_GT"
      threshold_value = var.max_client_alert_threshold
      duration        = "300s"

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = var.notification_channels
}
```

## Using the Module

Here is how to use the module for a production deployment:

```hcl
module "redis" {
  source = "./modules/memorystore-redis"

  project_id     = "my-project"
  name           = "prod-app-cache"
  region         = "us-central1"
  tier           = "STANDARD_HA"
  memory_size_gb = 5
  redis_version  = "REDIS_7_0"
  vpc_network_id = module.vpc.network_self_link

  # Enable authentication and encryption
  auth_enabled            = true
  transit_encryption_mode = "SERVER_AUTHENTICATION"

  # Redis settings tuned for caching
  redis_configs = {
    "maxmemory-policy"       = "allkeys-lru"
    "activedefrag"           = "yes"
    "lfu-decay-time"         = "1"
    "lfu-log-factor"         = "10"
  }

  # Maintenance during low-traffic hours
  maintenance_day  = "SUNDAY"
  maintenance_hour = 4

  labels = {
    environment = "production"
    team        = "backend"
    service     = "app-cache"
  }
}

# Pass the connection details to your application
resource "google_cloud_run_v2_service" "app" {
  # ... other config ...

  template {
    containers {
      env {
        name = "REDIS_HOST"
        value = module.redis.host
      }
      env {
        name = "REDIS_PORT"
        value = tostring(module.redis.port)
      }
      env {
        name = "REDIS_AUTH"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.redis_auth.secret_id
            version = "latest"
          }
        }
      }
    }
  }
}
```

## Summary

This Terraform module gives you a production-ready Memorystore Redis setup with private networking, high availability, authentication, encryption in transit, and monitoring. The private service access configuration ensures your Redis instance is not reachable from the internet, STANDARD_HA tier provides automatic failover, and the monitoring alerts catch memory pressure and eviction issues before they affect your application. Use the module with different variable values for staging (BASIC tier, smaller memory) and production (STANDARD_HA, larger memory) to keep costs in check while maintaining quality where it counts.
