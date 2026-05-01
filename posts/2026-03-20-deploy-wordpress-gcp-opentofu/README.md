# How to Deploy a WordPress Site with OpenTofu on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, WordPress, GCP, Cloud Run, Cloud SQL, Infrastructure as Code

Description: Learn how to deploy a production-ready WordPress site on GCP using OpenTofu, with Cloud Run for serverless containers, Cloud SQL for MySQL, and Filestore for shared storage.

## Introduction

Deploying WordPress on GCP with OpenTofu uses Cloud Run for serverless container execution, Cloud SQL for managed MySQL, and Filestore for shared WordPress content. Cloud Run supports scaling to zero when not in use, though this configuration keeps one instance warm to reduce cold starts.

## VPC and Networking

```hcl
resource "google_compute_network" "wordpress" {
  name                    = "wordpress-vpc"
  auto_create_subnetworks = false
  project                 = var.project_id
}

resource "google_compute_subnetwork" "wordpress" {
  name          = "wordpress-subnet"
  ip_cidr_range = "10.0.1.0/24"
  region        = var.region
  network       = google_compute_network.wordpress.id
  project       = var.project_id
}

resource "google_compute_global_address" "wordpress_private_ip" {
  name          = "wordpress-${var.environment}-private-ip"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.wordpress.id
  project       = var.project_id
}

resource "google_service_networking_connection" "wordpress" {
  network                 = google_compute_network.wordpress.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.wordpress_private_ip.name]
}
```

## Cloud SQL MySQL

```hcl
resource "google_sql_database_instance" "wordpress" {
  name             = "wordpress-${var.environment}-mysql"
  database_version = "MYSQL_8_0"
  region           = var.region
  project          = var.project_id
  depends_on       = [google_service_networking_connection.wordpress]

  settings {
    tier              = "db-custom-2-7680"
    availability_type = "REGIONAL"

    backup_configuration {
      enabled            = true
      binary_log_enabled = true
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.wordpress.id
    }
  }

  deletion_protection = true
}

resource "google_sql_database" "wordpress" {
  name     = "wordpress"
  instance = google_sql_database_instance.wordpress.name
  project  = var.project_id
}

resource "google_sql_user" "wordpress" {
  name     = "wordpress"
  instance = google_sql_database_instance.wordpress.name
  password = var.db_password
  project  = var.project_id
}
```

## Secret Manager for Database Password

```hcl
resource "google_secret_manager_secret" "db_password" {
  secret_id = "wordpress-${var.environment}-db-password"
  project   = var.project_id

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.name
  secret_data = var.db_password
}

resource "google_service_account" "wordpress" {
  account_id   = "wordpress-${var.environment}"
  display_name = "WordPress Cloud Run service account"
  project      = var.project_id
}

resource "google_secret_manager_secret_iam_member" "db_password" {
  secret_id = google_secret_manager_secret.db_password.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.wordpress.email}"
}
```

## Filestore for WordPress Content

```hcl
resource "google_filestore_instance" "wordpress" {
  name     = "wordpress-${var.environment}-nfs"
  location = "${var.region}-b"
  tier     = "BASIC_HDD"
  project  = var.project_id

  file_shares {
    capacity_gb = 1024
    name        = "wp_content"
  }

  networks {
    network = google_compute_network.wordpress.name
    modes   = ["MODE_IPV4"]
  }
}
```

## Cloud Run Service

```hcl
resource "google_cloud_run_v2_service" "wordpress" {
  name     = "wordpress-${var.environment}"
  location = var.region
  project  = var.project_id

  template {
    execution_environment = "EXECUTION_ENVIRONMENT_GEN2"
    service_account       = google_service_account.wordpress.email

    scaling {
      min_instance_count = 1
      max_instance_count = 10
    }

    vpc_access {
      network_interfaces {
        network    = google_compute_network.wordpress.name
        subnetwork = google_compute_subnetwork.wordpress.name
      }
    }

    volumes {
      name = "nfs-wp-content"
      nfs {
        server    = google_filestore_instance.wordpress.networks[0].ip_addresses[0]
        path      = "/wp_content"
        read_only = false
      }
    }

    containers {
      image = "wordpress:6.4-apache"

      ports {
        container_port = 80
      }

      env {
        name  = "WORDPRESS_DB_HOST"
        value = google_sql_database_instance.wordpress.private_ip_address
      }

      env {
        name  = "WORDPRESS_DB_NAME"
        value = "wordpress"
      }

      env {
        name  = "WORDPRESS_DB_USER"
        value = "wordpress"
      }

      env {
        name = "WORDPRESS_DB_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_password.secret_id
            version = "latest"
          }
        }
      }

      volume_mounts {
        name       = "nfs-wp-content"
        mount_path = "/var/www/html/wp-content"
      }
    }
  }

  depends_on = [
    google_secret_manager_secret_version.db_password,
    google_secret_manager_secret_iam_member.db_password
  ]
}

# Allow public access to Cloud Run service

resource "google_cloud_run_v2_service_iam_member" "public" {
  location = google_cloud_run_v2_service.wordpress.location
  name     = google_cloud_run_v2_service.wordpress.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
```

## Outputs

```hcl
output "wordpress_url" {
  value       = google_cloud_run_v2_service.wordpress.uri
  description = "WordPress site URL"
}

output "db_connection_name" {
  value       = google_sql_database_instance.wordpress.connection_name
  description = "Cloud SQL connection name"
}
```

## Summary

Deploying WordPress on GCP with OpenTofu uses Cloud Run for serverless container execution, Cloud SQL for managed MySQL with private networking, Filestore for NFS-based shared content storage, and Secret Manager for database credentials. The private networking setup ensures the database is not accessible from the internet, while Direct VPC egress lets Cloud Run reach both Cloud SQL and Filestore over internal addresses. Cloud Run's pay-per-request billing remains cost-effective for WordPress sites with variable traffic, though this configuration keeps one minimum instance running to reduce cold starts.
