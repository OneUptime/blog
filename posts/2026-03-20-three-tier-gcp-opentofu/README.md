# How to Build a Three-Tier Web Application Architecture with OpenTofu on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Architecture, Three-Tier, OpenTofu, Cloud Load Balancing, Cloud Run, Cloud SQL

Description: Learn how to build a production-ready three-tier web application on GCP using OpenTofu with Cloud Load Balancing, Cloud Run, and Cloud SQL with private connectivity.

## Overview

The GCP three-tier architecture uses Global HTTP(S) Load Balancing for the presentation tier, Cloud Run for serverless application logic, and Cloud SQL for managed relational data with private IP connectivity.

## Step 1: VPC with Private Subnets

```hcl
# main.tf - Three-tier VPC on GCP

resource "google_compute_network" "vpc" {
  name                    = "three-tier-vpc"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "app" {
  name          = "app-subnet"
  network       = google_compute_network.vpc.id
  ip_cidr_range = "10.0.1.0/24"
  region        = "us-central1"

  private_ip_google_access = true  # Access Google APIs without public IP

  secondary_ip_range {
    range_name    = "pod-range"
    ip_cidr_range = "10.1.0.0/16"
  }
}

# Private services access for Cloud SQL
resource "google_compute_global_address" "private_ip_range" {
  name          = "google-managed-services-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range.name]
}
```

## Step 2: Cloud Run (Application Tier)

```hcl
# Cloud Run service
resource "google_cloud_run_v2_service" "app" {
  name     = "three-tier-app"
  location = "us-central1"
  ingress  = "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER"

  invoker_iam_disabled = true

  template {
    scaling {
      min_instance_count = 2
      max_instance_count = 100
    }

    containers {
      image = "us-central1-docker.pkg.dev/${var.project_id}/app/app:latest"

      resources {
        limits = {
          cpu    = "2"
          memory = "1Gi"
        }
        startup_cpu_boost = true
      }

      env {
        name  = "DB_HOST"
        value = google_sql_database_instance.db.private_ip_address
      }

      env {
        name = "DB_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_password.secret_id
            version = "latest"
          }
        }
      }
    }

    vpc_access {
      connector = google_vpc_access_connector.connector.id
      egress    = "PRIVATE_RANGES_ONLY"
    }

    service_account = google_service_account.app.email
  }
}

# VPC connector for Cloud Run to reach private resources
resource "google_vpc_access_connector" "connector" {
  name          = "app-vpc-connector"
  region        = "us-central1"
  network       = google_compute_network.vpc.name
  ip_cidr_range = "10.8.0.0/28"
}
```

## Step 3: Global Load Balancer (Presentation Tier)

```hcl
# Global HTTPS Load Balancer
resource "google_compute_global_forwarding_rule" "https" {
  name       = "three-tier-https"
  target     = google_compute_target_https_proxy.app.id
  port_range = "443"
  ip_address = google_compute_global_address.lb_ip.address
}

resource "google_compute_backend_service" "app" {
  name        = "app-backend"
  protocol    = "HTTP"
  timeout_sec = 30

  backend {
    group = google_compute_region_network_endpoint_group.cloud_run.id
  }

  security_policy = google_compute_security_policy.waf.id
}

# Cloud Run NEG for Load Balancer integration
resource "google_compute_region_network_endpoint_group" "cloud_run" {
  name                  = "cloud-run-neg"
  network_endpoint_type = "SERVERLESS"
  region                = "us-central1"

  cloud_run {
    service = google_cloud_run_v2_service.app.name
  }
}
```

## Step 4: Cloud SQL with Private IP (Data Tier)

```hcl
# Cloud SQL PostgreSQL instance
resource "google_sql_database_instance" "db" {
  name             = "three-tier-db"
  database_version = "POSTGRES_15"
  region           = "us-central1"
  deletion_protection = true

  settings {
    tier = "db-custom-4-15360"

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      backup_retention_settings {
        retained_backups = 14
      }
    }

    ip_configuration {
      ipv4_enabled                                  = false  # No public IP
      private_network                               = google_compute_network.vpc.id
      enable_private_path_for_google_cloud_services = true
    }

    availability_type = "REGIONAL"  # HA with automatic failover
  }

  depends_on = [google_service_networking_connection.private_vpc_connection]
}
```

## Summary

The GCP three-tier architecture built with OpenTofu uses Cloud Run's serverless model to eliminate instance management while the VPC Access Connector enables private connectivity to Cloud SQL. The Global HTTP(S) Load Balancer provides anycast routing to minimize latency worldwide and integrates with Cloud Armor WAF for security. Cloud SQL Regional availability ensures automatic failover within the region with no data loss.
