# How to Create a Cloud SQL Instance with OpenTofu on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GCP, Google Cloud, Infrastructure as Code, IaC, Cloud SQL, Database

Description: Learn how to create a highly available Cloud SQL instance with read replicas, backups, and private IP using OpenTofu.

## Introduction

This guide covers how to create a highly available Cloud SQL for MySQL instance on GCP using OpenTofu with backups, a read replica, private IP, and production-ready configurations.

## Prerequisites

- OpenTofu v1.6+
- Google Cloud SDK installed and authenticated
- GCP project with billing enabled
- IAM permissions to enable APIs, create VPC networks, and administer Cloud SQL

## Step 1: Configure the Provider

```hcl
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 7.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
```

## Step 2: Define Variables

```hcl
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "db_tier" {
  description = "Cloud SQL machine tier"
  type        = string
  default     = "db-custom-2-7680"
}

variable "notification_channel_names" {
  description = "Cloud Monitoring notification channel resource names"
  type        = list(string)
  default     = []
}
```

## Step 3: Enable Required APIs

```hcl
# Enable required GCP service APIs

resource "google_project_service" "required_apis" {
  for_each = toset([
    "compute.googleapis.com",
    "monitoring.googleapis.com",
    "servicenetworking.googleapis.com",
    "sqladmin.googleapis.com"
  ])

  project = var.project_id
  service = each.value

  disable_dependent_services = false
  disable_on_destroy         = false
}
```

## Step 4: Create Primary Resource

```hcl
# Private VPC network for Cloud SQL
resource "google_compute_network" "private_network" {
  name                    = "${var.environment}-cloudsql-network"
  auto_create_subnetworks = false
  depends_on              = [google_project_service.required_apis["compute.googleapis.com"]]
}

resource "google_compute_global_address" "private_ip_alloc" {
  name          = "${var.environment}-cloudsql-private-ip"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.private_network.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.private_network.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_alloc.name]
  depends_on              = [google_project_service.required_apis["servicenetworking.googleapis.com"]]
}

resource "google_sql_database_instance" "primary" {
  name             = "${var.environment}-mysql-primary"
  region           = var.region
  database_version = "MYSQL_8_0"
  depends_on = [
    google_project_service.required_apis["sqladmin.googleapis.com"],
    google_service_networking_connection.private_vpc_connection
  ]

  settings {
    tier              = var.db_tier
    availability_type = "REGIONAL"
    disk_size         = 100
    disk_type         = "PD_SSD"

    backup_configuration {
      enabled            = true
      binary_log_enabled = true
      start_time         = "03:00"
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.private_network.id
    }

    user_labels = {
      environment = var.environment
    }
  }

  deletion_protection = true
}

resource "google_sql_database_instance" "read_replica" {
  name                 = "${var.environment}-mysql-replica"
  master_instance_name = google_sql_database_instance.primary.name
  region               = var.region
  database_version     = "MYSQL_8_0"

  replica_configuration {
    failover_target = false
  }

  settings {
    tier              = var.db_tier
    availability_type = "ZONAL"
    disk_size         = 100
    disk_type         = "PD_SSD"

    user_labels = {
      environment = var.environment
    }
  }

  deletion_protection = true
}
```

## Step 5: Configure Monitoring

```hcl
# Create a monitoring alert policy for Cloud SQL CPU
resource "google_monitoring_alert_policy" "cloudsql_cpu_high" {
  display_name = "Cloud SQL CPU High - ${var.environment}"
  combiner     = "OR"
  project      = var.project_id
  depends_on   = [google_project_service.required_apis["monitoring.googleapis.com"]]

  conditions {
    display_name = "Cloud SQL CPU utilization > 80%"
    condition_threshold {
      filter          = "resource.type = \"cloudsql_database\" AND metric.type = \"cloudsql.googleapis.com/database/cpu/utilization\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0.8
      duration        = "300s"

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }

      trigger {
        count = 1
      }
    }
  }

  notification_channels = var.notification_channel_names
}
```

## Step 6: Define Outputs

```hcl
output "primary_connection_name" {
  description = "Primary Cloud SQL connection name"
  value       = google_sql_database_instance.primary.connection_name
}

output "primary_private_ip_address" {
  description = "Primary Cloud SQL private IP address"
  value       = google_sql_database_instance.primary.private_ip_address
}

output "read_replica_name" {
  description = "Read replica instance name"
  value       = google_sql_database_instance.read_replica.name
}
```

## Step 7: Deploy

```bash
# Authenticate with GCP
gcloud auth application-default login

# Initialize OpenTofu
tofu init

# Preview changes
tofu plan -var="project_id=your-project-id"

# Apply configuration
tofu apply -var="project_id=your-project-id"
```

## Best Practices

- Enable only required GCP APIs to minimize attack surface
- Keep the primary instance regional for HA and enable binary logging on the primary when using MySQL read replicas
- Use private IP with a dedicated VPC network when public access is not required
- Use labels consistently for cost allocation and resource management
- Store state in a GCS bucket with versioning enabled

## Conclusion

You have successfully configured a Cloud SQL for MySQL primary instance with regional high availability, backups, a private IP address, and a read replica using OpenTofu. This configuration follows GCP best practices for networking, monitoring, and resource management. For production deployments, keep deletion protection enabled and store state in a versioned GCS bucket.
