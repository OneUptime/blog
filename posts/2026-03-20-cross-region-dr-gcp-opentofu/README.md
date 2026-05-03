# How to Set Up Cross-Region Disaster Recovery with OpenTofu on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Disaster Recovery, Cross-Region, OpenTofu, Cloud SQL, GCS, Cloud DNS

Description: Learn how to implement cross-region disaster recovery on GCP using OpenTofu with Cloud SQL cross-region replicas, multi-region GCS buckets, and Cloud DNS failover policies.

## Overview

GCP cross-region DR uses Cloud SQL cross-region read replicas for database replication, multi-region GCS buckets for data durability, and Cloud DNS routing policies for health-check based failover. OpenTofu provisions all DR components.

## Step 1: Cloud SQL Cross-Region Replica

```hcl
# main.tf - Cloud SQL with cross-region read replica

resource "google_sql_database_instance" "primary" {
  name             = "app-db-primary"
  database_version = "POSTGRES_15"
  region           = "us-central1"
  deletion_protection = true

  settings {
    tier              = "db-n1-standard-4"
    availability_type = "REGIONAL"  # HA in primary region

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      location                       = "us"
    }
  }
}

# Cross-region read replica for DR
resource "google_sql_database_instance" "dr_replica" {
  name                 = "app-db-dr-replica"
  database_version     = "POSTGRES_15"
  region               = "europe-west1"
  master_instance_name = google_sql_database_instance.primary.name

  replica_configuration {
    failover_target = false  # Set to true to promote during failover
  }

  settings {
    tier              = "db-n1-standard-2"  # Smaller DR instance
    availability_type = "ZONAL"
  }
}
```

## Step 2: Multi-Region GCS Bucket

```hcl
# Multi-region bucket for automatic geo-redundancy
resource "google_storage_bucket" "app_data" {
  name     = "app-data-multi-region"
  location = "US"  # Multi-region: US, EU, ASIA

  uniform_bucket_level_access = true
  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }
}

# Dual-region bucket for specific compliance
resource "google_storage_bucket" "dual_region" {
  name     = "app-data-dual-region"
  location = "US-CENTRAL1+US-EAST1"  # Dual-region

  rpo = "ASYNC_TURBO"  # Turbo replication: 15 min RPO

  uniform_bucket_level_access = true
}
```

## Step 3: Cloud DNS Routing Policy for Failover

```hcl
# Cloud DNS zone for the application
resource "google_dns_managed_zone" "app" {
  name     = "app-zone"
  dns_name = "app.example.com."
}

# DNS record with health-check based routing
resource "google_dns_record_set" "failover" {
  name         = "api.${google_dns_managed_zone.app.dns_name}"
  type         = "A"
  ttl          = 30
  managed_zone = google_dns_managed_zone.app.name

  routing_policy {
    primary_backup {
      trickle_ratio = 0  # No traffic trickling to backup

      primary {
        internal_load_balancers {
          load_balancer_type = "regionalL4ilb"
          ip_address         = google_compute_forwarding_rule.primary.ip_address
          port               = "443"
          ip_protocol        = "tcp"
          region             = "us-central1"
          network_url        = google_compute_network.vpc.id
        }
      }

      backup_geo {
        location = "europe-west1"
        rrdatas  = [google_compute_forwarding_rule.dr.ip_address]
      }
    }
  }
}
```

## Step 4: Cloud Storage for Snapshot Backup

```hcl
# Scheduled Cloud SQL export to GCS for long-term backup
resource "google_cloud_scheduler_job" "sql_backup" {
  name     = "sql-daily-backup"
  schedule = "0 2 * * *"
  region   = "us-central1"

  http_target {
    uri         = "https://sqladmin.googleapis.com/v1/projects/${var.project_id}/instances/${google_sql_database_instance.primary.name}/export"
    http_method = "POST"

    body = base64encode(jsonencode({
      exportContext = {
        fileType  = "SQL"
        uri       = "gs://${google_storage_bucket.app_data.name}/backups/${google_sql_database_instance.primary.name}/"
        databases = ["appdb"]
      }
    }))

    oauth_token {
      service_account_email = google_service_account.backup_sa.email
    }
  }
}
```

## Summary

GCP cross-region DR configured with OpenTofu uses Cloud SQL cross-region read replicas with point-in-time recovery for sub-minute RPO. Multi-region GCS buckets with Turbo replication provide 15-minute RPO for object storage. Cloud DNS primary-backup routing policies provide automatic failover based on health check status, redirecting traffic to the DR region without manual intervention when the primary region becomes unavailable.
