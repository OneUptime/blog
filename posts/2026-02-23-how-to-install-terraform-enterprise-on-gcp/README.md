# How to Install Terraform Enterprise on GCP

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terraform Enterprise, GCP, Google Cloud, Self-Hosted

Description: Deploy Terraform Enterprise on Google Cloud Platform using Compute Engine, Cloud SQL PostgreSQL, and Cloud Storage for production use.

---

Google Cloud Platform offers a solid foundation for hosting Terraform Enterprise. With Compute Engine for the application, Cloud SQL for the managed database, and Cloud Storage for object storage, you get a fully managed infrastructure stack. This guide walks through deploying Terraform Enterprise on GCP using Terraform to provision everything.

## Architecture

The GCP deployment architecture includes:

- Compute Engine VM running the Terraform Enterprise container
- Cloud SQL PostgreSQL instance for the database
- Cloud Storage bucket for state files and artifacts
- HTTPS Load Balancer for external access
- VPC network with private subnets

```text
[Internet]
    |
[HTTPS Load Balancer]
    |
[Compute Engine VM - Private Subnet]
    |              |
[Cloud SQL]   [Cloud Storage]
```

## Step 1: Configure the Provider

```hcl
# provider.tf

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.gcp_project
  region  = var.gcp_region
}
```

## Step 2: Create the VPC Network

```hcl
# networking.tf

# VPC network

resource "google_compute_network" "tfe" {
  name                    = "tfe-network"
  auto_create_subnetworks = false
}

# Subnet for the TFE VM
resource "google_compute_subnetwork" "tfe" {
  name          = "tfe-subnet"
  ip_cidr_range = "10.0.1.0/24"
  region        = var.gcp_region
  network       = google_compute_network.tfe.id

  private_ip_google_access = true
}

# Cloud Router and NAT for outbound internet access
resource "google_compute_router" "tfe" {
  name    = "tfe-router"
  region  = var.gcp_region
  network = google_compute_network.tfe.id
}

resource "google_compute_router_nat" "tfe" {
  name                               = "tfe-nat"
  router                             = google_compute_router.tfe.name
  region                             = var.gcp_region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
}

# Firewall rules
resource "google_compute_firewall" "tfe_https" {
  name    = "tfe-allow-https"
  network = google_compute_network.tfe.id

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }

  # Allow from the load balancer health check ranges and internal
  source_ranges = [
    "130.211.0.0/22",   # GCP health check range
    "35.191.0.0/16",    # GCP health check range
    "10.0.0.0/8"        # Internal
  ]

  target_tags = ["tfe-server"]
}

resource "google_compute_firewall" "tfe_ssh" {
  name    = "tfe-allow-ssh"
  network = google_compute_network.tfe.id

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  # Allow SSH through Identity-Aware Proxy because the VM has no external IP
  source_ranges = ["35.235.240.0/20"]
  target_tags   = ["tfe-server"]
}
```

## Step 3: Create the Cloud SQL Database

```hcl
# database.tf

# Reserve a private IP range for Cloud SQL
resource "google_compute_global_address" "sql_private_ip" {
  name          = "tfe-sql-private-ip"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.tfe.id
}

# Create the private connection
resource "google_service_networking_connection" "sql" {
  network                 = google_compute_network.tfe.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.sql_private_ip.name]
}

# Cloud SQL PostgreSQL instance
resource "google_sql_database_instance" "tfe" {
  name             = "tfe-database"
  database_version = "POSTGRES_15"
  region           = var.gcp_region

  depends_on = [google_service_networking_connection.sql]

  settings {
    tier              = "db-custom-4-16384"  # 4 vCPUs, 16 GB RAM
    availability_type = "REGIONAL"           # High availability
    disk_size         = 100
    disk_type         = "PD_SSD"

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.tfe.id
    }

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      start_time                     = "03:00"
      transaction_log_retention_days = 7
    }

    database_flags {
      name  = "max_connections"
      value = "256"
    }

    maintenance_window {
      day          = 7  # Sunday
      hour         = 4
      update_track = "stable"
    }
  }

  deletion_protection = true
}

resource "google_sql_database" "tfe" {
  name     = "terraform_enterprise"
  instance = google_sql_database_instance.tfe.name
}

resource "google_sql_user" "tfe" {
  name     = "terraform"
  instance = google_sql_database_instance.tfe.name
  password = var.db_password
}
```

## Step 4: Create the Cloud Storage Bucket

```hcl
# storage.tf

resource "google_storage_bucket" "tfe" {
  name          = "tfe-data-${var.gcp_project}"
  location      = var.gcp_region
  force_destroy = false

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  encryption {
    default_kms_key_name = google_kms_crypto_key.tfe.id
  }

  depends_on = [google_kms_crypto_key_iam_member.gcs]
}

# KMS for encryption
resource "google_kms_key_ring" "tfe" {
  name     = "tfe-keyring"
  location = var.gcp_region
}

resource "google_kms_crypto_key" "tfe" {
  name     = "tfe-key"
  key_ring = google_kms_key_ring.tfe.id

  lifecycle {
    prevent_destroy = true
  }
}

data "google_storage_project_service_account" "gcs_account" {
}

resource "google_kms_crypto_key_iam_member" "gcs" {
  crypto_key_id = google_kms_crypto_key.tfe.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:${data.google_storage_project_service_account.gcs_account.email_address}"
}
```

## Step 5: Create the Service Account

```hcl
# iam.tf

# Service account for the TFE VM
resource "google_service_account" "tfe" {
  account_id   = "tfe-server"
  display_name = "Terraform Enterprise Server"
}

# Grant access to Cloud Storage
resource "google_storage_bucket_iam_member" "tfe" {
  bucket = google_storage_bucket.tfe.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.tfe.email}"
}

# Grant access to Cloud SQL
resource "google_project_iam_member" "tfe_sql" {
  project = var.gcp_project
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.tfe.email}"
}

# Grant access to KMS
resource "google_kms_crypto_key_iam_member" "tfe" {
  crypto_key_id = google_kms_crypto_key.tfe.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:${google_service_account.tfe.email}"
}
```

## Step 6: Create the Compute Engine VM

```hcl
# compute.tf

resource "google_compute_instance" "tfe" {
  name         = "tfe-server"
  machine_type = "n2-standard-4"  # 4 vCPUs, 16 GB RAM
  zone         = "${var.gcp_region}-a"

  tags = ["tfe-server"]

  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2204-lts"
      size  = 100
      type  = "pd-ssd"
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.tfe.id
    # No external IP - access through NAT and load balancer
  }

  service_account {
    email  = google_service_account.tfe.email
    scopes = ["cloud-platform"]
  }

  metadata_startup_script = templatefile("${path.module}/templates/startup.sh", {
    tfe_license             = var.tfe_license
    tfe_image_tag           = var.tfe_image_tag
    tfe_hostname            = var.tfe_hostname
    tfe_encryption_password = var.tfe_encryption_password
    db_host                 = google_sql_database_instance.tfe.private_ip_address
    db_username             = google_sql_user.tfe.name
    db_password             = var.db_password
    db_name                 = google_sql_database.tfe.name
    gcs_bucket              = google_storage_bucket.tfe.name
    gcp_project             = var.gcp_project
  })

  metadata = {
    enable-oslogin = "TRUE"
  }

  labels = {
    environment = "production"
    application = "terraform-enterprise"
  }
}
```

## Step 7: Startup Script

```bash
#!/bin/bash
# templates/startup.sh

set -euo pipefail

# Install prerequisites
apt-get update
apt-get install -y ca-certificates curl openssl

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Authenticate with the container registry
echo "${tfe_license}" | docker login images.releases.hashicorp.com \
  --username terraform --password-stdin

# Pull the TFE image
docker pull images.releases.hashicorp.com/hashicorp/terraform-enterprise:${tfe_image_tag}

# Create a backend certificate for the TFE container.
mkdir -p /etc/terraform-enterprise/certs
openssl req -x509 -nodes -newkey rsa:2048 \
  -keyout /etc/terraform-enterprise/certs/key.pem \
  -out /etc/terraform-enterprise/certs/cert.pem \
  -subj "/CN=${tfe_hostname}" \
  -days 365

# Run Terraform Enterprise
docker run -d \
  --name terraform-enterprise \
  --restart always \
  --read-only \
  --tmpfs /tmp:mode=01777 \
  --tmpfs /run \
  --tmpfs /var/log/terraform-enterprise \
  -p 80:80 \
  -p 443:443 \
  -v /var/run/docker.sock:/run/docker.sock \
  -v /etc/terraform-enterprise/certs:/etc/ssl/private/terraform-enterprise:ro \
  -v tfe-cache:/var/cache/tfe-task-worker/terraform \
  -e TFE_LICENSE="${tfe_license}" \
  -e TFE_HOSTNAME="${tfe_hostname}" \
  -e TFE_ENCRYPTION_PASSWORD="${tfe_encryption_password}" \
  -e TFE_OPERATIONAL_MODE="external" \
  -e TFE_RUN_PIPELINE_DRIVER="docker" \
  -e TFE_DISK_CACHE_VOLUME_NAME="tfe-cache" \
  -e TFE_TLS_CERT_FILE="/etc/ssl/private/terraform-enterprise/cert.pem" \
  -e TFE_TLS_KEY_FILE="/etc/ssl/private/terraform-enterprise/key.pem" \
  -e TFE_DATABASE_HOST="${db_host}" \
  -e TFE_DATABASE_USER="${db_username}" \
  -e TFE_DATABASE_PASSWORD="${db_password}" \
  -e TFE_DATABASE_NAME="${db_name}" \
  -e TFE_DATABASE_PARAMETERS="sslmode=require" \
  -e TFE_OBJECT_STORAGE_TYPE="google" \
  -e TFE_OBJECT_STORAGE_GOOGLE_BUCKET="${gcs_bucket}" \
  -e TFE_OBJECT_STORAGE_GOOGLE_PROJECT="${gcp_project}" \
  --cap-add IPC_LOCK \
  images.releases.hashicorp.com/hashicorp/terraform-enterprise:${tfe_image_tag}
```

## Step 8: Create the HTTPS Load Balancer

```hcl
# loadbalancer.tf

# Health check
resource "google_compute_health_check" "tfe" {
  name = "tfe-health-check"

  http_health_check {
    port         = 80
    request_path = "/api/v1/health/readiness"
  }

  check_interval_sec  = 30
  timeout_sec         = 10
  healthy_threshold   = 3
  unhealthy_threshold = 3
}

# Instance group
resource "google_compute_instance_group" "tfe" {
  name      = "tfe-instance-group"
  zone      = "${var.gcp_region}-a"
  instances = [google_compute_instance.tfe.id]

  named_port {
    name = "http"
    port = 80
  }
}

# Backend service
resource "google_compute_backend_service" "tfe" {
  name          = "tfe-backend"
  protocol      = "HTTP"
  port_name     = "http"
  health_checks = [google_compute_health_check.tfe.id]

  backend {
    group = google_compute_instance_group.tfe.id
  }
}

# URL map
resource "google_compute_url_map" "tfe" {
  name            = "tfe-url-map"
  default_service = google_compute_backend_service.tfe.id
}

# HTTPS proxy
resource "google_compute_target_https_proxy" "tfe" {
  name             = "tfe-https-proxy"
  url_map          = google_compute_url_map.tfe.id
  ssl_certificates = [google_compute_managed_ssl_certificate.tfe.id]
}

# Managed SSL certificate
resource "google_compute_managed_ssl_certificate" "tfe" {
  name = "tfe-ssl-cert"

  managed {
    domains = [var.tfe_hostname]
  }
}

# Global forwarding rule
resource "google_compute_global_forwarding_rule" "tfe" {
  name       = "tfe-forwarding-rule"
  target     = google_compute_target_https_proxy.tfe.id
  port_range = "443"
  ip_address = google_compute_global_address.tfe_lb.address
}

# Reserve a static IP for the load balancer
resource "google_compute_global_address" "tfe_lb" {
  name = "tfe-lb-ip"
}

# DNS record
resource "google_dns_record_set" "tfe" {
  name         = "${var.tfe_hostname}."
  type         = "A"
  ttl          = 300
  managed_zone = var.dns_zone_name
  rrdatas      = [google_compute_global_address.tfe_lb.address]
}
```

## Variables

```hcl
# variables.tf

variable "gcp_project" {
  type        = string
  description = "GCP project ID"
}

variable "gcp_region" {
  type    = string
  default = "us-central1"
}

variable "tfe_hostname" {
  type        = string
  description = "Hostname for Terraform Enterprise"
}

variable "tfe_license" {
  type        = string
  sensitive   = true
  description = "Terraform Enterprise license"
}

variable "tfe_image_tag" {
  type        = string
  description = "Explicit Terraform Enterprise image tag, for example v202507-1"
}

variable "tfe_encryption_password" {
  type        = string
  sensitive   = true
  description = "Encryption password for TFE data"
}

variable "db_password" {
  type        = string
  sensitive   = true
  description = "PostgreSQL database password"
}

variable "dns_zone_name" {
  type        = string
  description = "Cloud DNS managed zone name"
}
```

## Deploying

```bash
# Authenticate with GCP
gcloud auth application-default login

# Initialize and deploy
terraform init
terraform plan -var-file="production.tfvars"
terraform apply -var-file="production.tfvars"
```

## Verification

```bash
# Check the VM status
gcloud compute instances describe tfe-server \
  --zone=us-central1-a \
  --format='get(status)'

# SSH into the instance
gcloud compute ssh tfe-server --zone=us-central1-a --tunnel-through-iap

# On the VM, check TFE status
sudo docker ps
sudo docker logs terraform-enterprise
sudo docker exec terraform-enterprise tfectl app health readiness
```

## Summary

Deploying Terraform Enterprise on GCP leverages Google's managed services for a reliable, low-maintenance installation. Cloud SQL handles database management, Cloud Storage provides durable object storage, and the HTTPS Load Balancer with managed SSL certificates simplifies TLS configuration. Use the service account with appropriate IAM roles for secure, credential-free access between GCP services. After deployment, configure DNS, create your admin user, and connect your VCS provider to start using Terraform Enterprise.
