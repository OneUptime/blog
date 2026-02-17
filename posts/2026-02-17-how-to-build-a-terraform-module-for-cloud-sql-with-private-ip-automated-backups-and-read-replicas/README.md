# How to Build a Terraform Module for Cloud SQL with Private IP Automated Backups and Read Replicas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Terraform, Cloud SQL, Infrastructure as Code, Google Cloud Platform

Description: Build a production-ready Terraform module for Google Cloud SQL that includes private IP networking, automated backups with point-in-time recovery, and read replicas for scaling reads.

---

Cloud SQL is Google Cloud's managed relational database service, and getting the Terraform configuration right for production use involves more than just spinning up an instance. You need private networking so your database is not exposed to the internet, automated backups for disaster recovery, and read replicas if you need to scale read-heavy workloads.

In this post, I will walk through building a reusable Terraform module that handles all three of these concerns in a clean, configurable way.

## Module Structure

The module follows the standard Terraform module layout:

```
modules/cloud-sql/
  main.tf          # Primary resources
  variables.tf     # Input variables
  outputs.tf       # Output values
  versions.tf      # Provider version constraints
```

## Defining the Variables

First, let us set up the variables that make the module flexible enough to reuse across environments. The key is providing sensible defaults while letting callers override everything.

```hcl
# variables.tf - Input variables for the Cloud SQL module
# Each variable has a description and sensible default where appropriate

variable "project_id" {
  description = "GCP project ID where the Cloud SQL instance will be created"
  type        = string
}

variable "region" {
  description = "GCP region for the primary instance"
  type        = string
  default     = "us-central1"
}

variable "instance_name" {
  description = "Name for the Cloud SQL instance"
  type        = string
}

variable "database_version" {
  description = "Database engine and version (e.g., POSTGRES_15, MYSQL_8_0)"
  type        = string
  default     = "POSTGRES_15"
}

variable "tier" {
  description = "Machine type for the instance (e.g., db-custom-2-8192)"
  type        = string
  default     = "db-custom-2-8192"
}

variable "disk_size_gb" {
  description = "Size of the data disk in GB"
  type        = number
  default     = 20
}

variable "disk_autoresize" {
  description = "Whether the disk should auto-resize when running low on space"
  type        = bool
  default     = true
}

variable "vpc_network_id" {
  description = "Self-link of the VPC network for private IP connectivity"
  type        = string
}

variable "backup_enabled" {
  description = "Whether automated backups are enabled"
  type        = bool
  default     = true
}

variable "backup_start_time" {
  description = "HH:MM time for the daily backup window (UTC)"
  type        = string
  default     = "03:00"
}

variable "point_in_time_recovery" {
  description = "Enable point-in-time recovery (requires binary logging for MySQL)"
  type        = bool
  default     = true
}

variable "backup_retained_count" {
  description = "Number of automated backups to retain"
  type        = number
  default     = 14
}

variable "read_replica_count" {
  description = "Number of read replicas to create"
  type        = number
  default     = 0
}

variable "replica_tier" {
  description = "Machine type for read replicas (defaults to primary tier)"
  type        = string
  default     = ""
}

variable "replica_regions" {
  description = "List of regions for read replicas (for cross-region replicas)"
  type        = list(string)
  default     = []
}

variable "availability_type" {
  description = "REGIONAL for HA (automatic failover), ZONAL for single zone"
  type        = string
  default     = "REGIONAL"
}

variable "maintenance_window_day" {
  description = "Day of week for maintenance (1=Monday, 7=Sunday)"
  type        = number
  default     = 7
}

variable "maintenance_window_hour" {
  description = "Hour of day for maintenance window (0-23, UTC)"
  type        = number
  default     = 4
}

variable "database_flags" {
  description = "Map of database flags to set on the instance"
  type        = map(string)
  default     = {}
}
```

## Setting Up Private IP Networking

The first thing to configure is private service access. This lets Cloud SQL get a private IP address from your VPC, so all traffic stays on Google's internal network.

```hcl
# main.tf - Private service access configuration
# This creates a peering connection between your VPC and Google's service network

# Reserve an IP range in your VPC for Google services
resource "google_compute_global_address" "private_ip_range" {
  project       = var.project_id
  name          = "${var.instance_name}-private-ip"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 20
  network       = var.vpc_network_id
}

# Establish the peering connection with Google's service networking
resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = var.vpc_network_id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range.name]
}
```

## Creating the Primary Cloud SQL Instance

Now the main instance, configured with private IP, automated backups, and high availability:

```hcl
# main.tf - Primary Cloud SQL instance
# This is the main database instance with all production settings

resource "google_sql_database_instance" "primary" {
  project          = var.project_id
  name             = var.instance_name
  database_version = var.database_version
  region           = var.region

  # Wait for the private VPC connection to be established
  depends_on = [google_service_networking_connection.private_vpc_connection]

  # Prevent accidental deletion of the database
  deletion_protection = true

  settings {
    tier              = var.tier
    disk_size         = var.disk_size_gb
    disk_autoresize   = var.disk_autoresize
    availability_type = var.availability_type

    # Configure private IP - no public IP assigned
    ip_configuration {
      ipv4_enabled                                  = false
      private_network                               = var.vpc_network_id
      enable_private_path_for_google_cloud_services = true
    }

    # Automated backup configuration
    backup_configuration {
      enabled                        = var.backup_enabled
      start_time                     = var.backup_start_time
      point_in_time_recovery_enabled = var.point_in_time_recovery
      transaction_log_retention_days = 7

      backup_retention_settings {
        retained_backups = var.backup_retained_count
        retention_unit   = "COUNT"
      }
    }

    # Maintenance window - schedule during low traffic hours
    maintenance_window {
      day          = var.maintenance_window_day
      hour         = var.maintenance_window_hour
      update_track = "stable"
    }

    # Apply any custom database flags
    dynamic "database_flags" {
      for_each = var.database_flags
      content {
        name  = database_flags.key
        value = database_flags.value
      }
    }

    # Insights for query performance monitoring
    insights_config {
      query_insights_enabled  = true
      query_plans_per_minute  = 5
      query_string_length     = 1024
      record_application_tags = true
      record_client_address   = true
    }
  }
}
```

## Adding Read Replicas

Read replicas are created as separate `google_sql_database_instance` resources that reference the primary. The module supports creating multiple replicas, optionally in different regions:

```hcl
# main.tf - Read replicas
# Creates the specified number of read replicas, inheriting settings from primary

locals {
  # Use primary tier if no replica-specific tier is provided
  effective_replica_tier = var.replica_tier != "" ? var.replica_tier : var.tier

  # If specific regions are provided, use them; otherwise default to primary region
  effective_replica_regions = length(var.replica_regions) > 0 ? var.replica_regions : [
    for i in range(var.read_replica_count) : var.region
  ]
}

resource "google_sql_database_instance" "read_replica" {
  count = var.read_replica_count

  project              = var.project_id
  name                 = "${var.instance_name}-replica-${count.index}"
  master_instance_name = google_sql_database_instance.primary.name
  database_version     = var.database_version
  region               = local.effective_replica_regions[count.index]

  # Replicas do not need deletion protection since they can be recreated
  deletion_protection = false

  replica_configuration {
    failover_target = false
  }

  settings {
    tier            = local.effective_replica_tier
    disk_autoresize = var.disk_autoresize

    # Replicas also use private IP
    ip_configuration {
      ipv4_enabled    = false
      private_network = var.vpc_network_id
    }

    # No backup config needed for replicas - they inherit from primary
  }

  depends_on = [google_sql_database_instance.primary]
}
```

## Module Outputs

Expose the important values so other modules can reference the database:

```hcl
# outputs.tf - Values other modules need to connect to the database

output "instance_name" {
  description = "Name of the primary Cloud SQL instance"
  value       = google_sql_database_instance.primary.name
}

output "private_ip_address" {
  description = "Private IP address of the primary instance"
  value       = google_sql_database_instance.primary.private_ip_address
}

output "connection_name" {
  description = "Connection name for Cloud SQL Proxy"
  value       = google_sql_database_instance.primary.connection_name
}

output "replica_private_ips" {
  description = "Private IP addresses of all read replicas"
  value       = google_sql_database_instance.read_replica[*].private_ip_address
}

output "replica_connection_names" {
  description = "Connection names for all read replicas"
  value       = google_sql_database_instance.read_replica[*].connection_name
}
```

## Using the Module

Here is how you call the module from your environment configuration:

```hcl
# Deploy a production Cloud SQL instance with 2 read replicas
module "cloud_sql" {
  source = "../../modules/cloud-sql"

  project_id       = "my-prod-project"
  instance_name    = "prod-app-db"
  region           = "us-central1"
  database_version = "POSTGRES_15"
  tier             = "db-custom-4-16384"
  disk_size_gb     = 100
  vpc_network_id   = module.vpc.network_self_link

  # HA configuration
  availability_type = "REGIONAL"

  # Backup settings
  backup_enabled         = true
  backup_start_time      = "02:00"
  point_in_time_recovery = true
  backup_retained_count  = 30

  # Read replicas
  read_replica_count = 2
  replica_regions    = ["us-central1", "us-east1"]

  # PostgreSQL performance flags
  database_flags = {
    "max_connections"          = "200"
    "shared_buffers"           = "4096MB"
    "work_mem"                 = "64MB"
    "log_min_duration_statement" = "1000"
  }
}
```

## Handling the Private Service Connection Edge Case

One thing that trips people up is that the private service connection is a one-per-VPC resource. If you are creating multiple Cloud SQL instances in the same VPC, you only want one `google_service_networking_connection`. You can handle this by either pulling the connection into a separate module or using a conditional:

```hcl
# Optional: skip creating the peering if it already exists
variable "create_private_connection" {
  description = "Set to false if private service access already exists for this VPC"
  type        = bool
  default     = true
}

resource "google_service_networking_connection" "private_vpc_connection" {
  count                   = var.create_private_connection ? 1 : 0
  network                 = var.vpc_network_id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range.name]
}
```

## Monitoring Your Cloud SQL Deployment

Once deployed, make sure you set up monitoring. Cloud SQL exposes metrics through Cloud Monitoring, and you can use tools like OneUptime to track database availability, replication lag on read replicas, and backup success rates.

Key metrics to watch include CPU utilization, memory usage, disk usage (especially if auto-resize is disabled), replication lag for read replicas, and the number of active connections.

## Summary

This module gives you a production-grade Cloud SQL setup with private networking, automated backups, and read replicas - all configurable through simple variable inputs. The key design decisions are keeping the database off the public internet with private IP, enabling point-in-time recovery for data protection, and making read replicas optional so the same module works for both simple and scaled deployments.
