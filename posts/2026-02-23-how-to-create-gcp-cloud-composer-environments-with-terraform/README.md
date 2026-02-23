# How to Create GCP Cloud Composer Environments with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Cloud Composer, Apache Airflow, Data Engineering, Infrastructure as Code

Description: Learn how to provision Google Cloud Composer environments using Terraform for managed Apache Airflow workflow orchestration on GCP.

---

Cloud Composer is Google Cloud's managed Apache Airflow service. It handles the Airflow web server, scheduler, workers, metadata database, and all the infrastructure underneath. You write DAGs, and Composer runs them. But setting up a Composer environment through the console means making dozens of decisions about networking, scaling, Python packages, and Airflow configurations that are hard to reproduce.

Terraform captures all of those decisions in code. When you need a new environment for testing, staging, or a different region, you apply the same configuration and get an identical setup. This guide covers creating Cloud Composer 2 environments with Terraform, from basic setups to production configurations with private networking and custom packages.

## Enabling Required APIs

Cloud Composer depends on several APIs.

```hcl
# Enable Cloud Composer and its dependencies
resource "google_project_service" "composer" {
  project = var.project_id
  service = "composer.googleapis.com"

  disable_on_destroy = false
}

resource "google_project_service" "container" {
  project = var.project_id
  service = "container.googleapis.com"

  disable_on_destroy = false
}
```

## Service Account

Create a dedicated service account for the Composer environment.

```hcl
# Service account for Cloud Composer
resource "google_service_account" "composer_sa" {
  account_id   = "composer-worker"
  display_name = "Cloud Composer Worker"
  project      = var.project_id
}

# Composer workers need the Composer Worker role
resource "google_project_iam_member" "composer_worker" {
  project = var.project_id
  role    = "roles/composer.worker"
  member  = "serviceAccount:${google_service_account.composer_sa.email}"
}

# Grant storage access for DAG files
resource "google_project_iam_member" "storage_access" {
  project = var.project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.composer_sa.email}"
}

# Grant BigQuery access if DAGs interact with BigQuery
resource "google_project_iam_member" "bigquery_access" {
  project = var.project_id
  role    = "roles/bigquery.dataEditor"
  member  = "serviceAccount:${google_service_account.composer_sa.email}"
}
```

## A Basic Composer 2 Environment

Here is a straightforward Composer 2 environment. Composer 2 uses GKE Autopilot under the hood, which simplifies infrastructure management.

```hcl
# Basic Cloud Composer 2 environment
resource "google_composer_environment" "basic" {
  name    = "airflow-${var.environment}"
  project = var.project_id
  region  = var.region

  config {
    # Composer 2 configuration
    software_config {
      image_version = "composer-2.9.7-airflow-2.9.3"

      # Airflow configuration overrides
      airflow_config_overrides = {
        "core-dags_are_paused_at_creation" = "true"
        "core-max_active_runs_per_dag"     = "1"
        "webserver-dag_default_view"       = "graph"
        "scheduler-catchup_by_default"     = "false"
      }

      # Python packages to install
      pypi_packages = {
        "apache-airflow-providers-google" = ">=10.0.0"
        "pandas"                          = ">=2.0.0"
        "requests"                        = ">=2.31.0"
        "google-cloud-bigquery"           = ">=3.0.0"
      }

      # Environment variables available to DAGs
      env_variables = {
        ENVIRONMENT = var.environment
        PROJECT_ID  = var.project_id
      }
    }

    # Workloads configuration - Composer 2 autoscaling
    workloads_config {
      scheduler {
        cpu        = 2
        memory_gb  = 4
        storage_gb = 5
        count      = 1
      }

      web_server {
        cpu        = 1
        memory_gb  = 2
        storage_gb = 5
      }

      worker {
        cpu        = 2
        memory_gb  = 8
        storage_gb = 10
        min_count  = 1
        max_count  = 6
      }
    }

    # Use the dedicated service account
    node_config {
      service_account = google_service_account.composer_sa.email
    }

    # Environment size affects the metadata database and core infrastructure
    environment_size = "ENVIRONMENT_SIZE_SMALL"
  }

  labels = {
    environment = var.environment
    team        = "data-engineering"
    managed_by  = "terraform"
  }

  depends_on = [
    google_project_service.composer,
    google_project_service.container
  ]
}
```

## Production Environment with Private Networking

For production, you want a private environment where the GKE cluster has no public endpoints.

```hcl
# Production Cloud Composer 2 with private networking
resource "google_composer_environment" "production" {
  name    = "airflow-production"
  project = var.project_id
  region  = var.region

  config {
    software_config {
      image_version = "composer-2.9.7-airflow-2.9.3"

      airflow_config_overrides = {
        "core-dags_are_paused_at_creation" = "true"
        "core-max_active_runs_per_dag"     = "3"
        "scheduler-min_file_process_interval" = "60"
        "celery-worker_concurrency"        = "12"
      }

      pypi_packages = {
        "apache-airflow-providers-google"   = ">=10.0.0"
        "apache-airflow-providers-postgres" = ">=5.0.0"
        "pandas"                            = ">=2.0.0"
        "google-cloud-bigquery"             = ">=3.0.0"
        "sentry-sdk"                        = ">=1.0.0"
      }

      env_variables = {
        ENVIRONMENT   = "production"
        PROJECT_ID    = var.project_id
        SENTRY_DSN    = var.sentry_dsn
      }
    }

    workloads_config {
      scheduler {
        cpu        = 4
        memory_gb  = 8
        storage_gb = 10
        count      = 2  # HA scheduler
      }

      web_server {
        cpu        = 2
        memory_gb  = 4
        storage_gb = 10
      }

      worker {
        cpu        = 4
        memory_gb  = 16
        storage_gb = 20
        min_count  = 2
        max_count  = 12
      }
    }

    # Private environment configuration
    private_environment_config {
      # Enable private environment
      enable_private_endpoint = true

      # Cloud SQL uses a private IP
      cloud_sql_ipv4_cidr_block = "10.0.100.0/24"

      # Master IP range for the GKE control plane
      master_ipv4_cidr_block = "10.0.101.0/28"

      # Composer API uses internal IP
      cloud_composer_network_ipv4_cidr_block = "10.0.102.0/24"
    }

    node_config {
      service_account = google_service_account.composer_sa.email
      network         = var.network_id
      subnetwork      = var.subnet_id

      # IP allocation for GKE pods and services
      ip_allocation_policy {
        cluster_secondary_range_name  = var.pods_range_name
        services_secondary_range_name = var.services_range_name
      }
    }

    # CMEK encryption
    encryption_config {
      kms_key_name = var.kms_key_id
    }

    environment_size = "ENVIRONMENT_SIZE_MEDIUM"

    # Resilience mode for production
    resilience_mode = "HIGH_RESILIENCE"
  }

  labels = {
    environment = "production"
    team        = "data-engineering"
    managed_by  = "terraform"
  }
}
```

## Managing DAG Deployment

Composer stores DAGs in a Cloud Storage bucket. You can upload DAGs with Terraform, though most teams use CI/CD for this.

```hcl
# Get the DAGs bucket from the Composer environment
output "dags_bucket" {
  description = "GCS bucket where DAGs should be uploaded"
  value       = google_composer_environment.basic.config[0].dag_gcs_prefix
}

# Upload a DAG file (useful for bootstrapping)
resource "google_storage_bucket_object" "sample_dag" {
  name   = "dags/sample_dag.py"
  bucket = replace(
    google_composer_environment.basic.config[0].dag_gcs_prefix,
    "gs://", ""
  )
  source = "${path.module}/dags/sample_dag.py"
}
```

## Airflow Variables and Connections

You can set Airflow variables through Terraform, though sensitive connections should be stored in Secret Manager.

```hcl
# Use Airflow config overrides for simple settings
# For complex connections, use Secret Manager backend
resource "google_composer_environment" "with_secrets" {
  name    = "airflow-secrets-${var.environment}"
  project = var.project_id
  region  = var.region

  config {
    software_config {
      image_version = "composer-2.9.7-airflow-2.9.3"

      airflow_config_overrides = {
        # Use Secret Manager as the backend for Airflow connections
        "secrets-backend" = "airflow.providers.google.cloud.secrets.secret_manager.CloudSecretManagerBackend"
        "secrets-backend_kwargs" = jsonencode({
          connections_prefix = "airflow-connections"
          variables_prefix   = "airflow-variables"
          project_id         = var.project_id
        })
      }
    }

    node_config {
      service_account = google_service_account.composer_sa.email
    }

    environment_size = "ENVIRONMENT_SIZE_SMALL"
  }
}

# Grant the Composer SA access to Secret Manager
resource "google_project_iam_member" "secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.composer_sa.email}"
}
```

## Environment Updates

Updating a Composer environment (adding packages, changing configs) triggers an update process that can take 20-40 minutes. Terraform handles this gracefully, but you should be aware of the timing.

Some changes require environment recreation:
- Changing the network or subnetwork
- Changing the service account
- Downgrading the image version

These will cause Terraform to destroy and recreate the environment, which means downtime.

```hcl
# Use lifecycle rules to prevent accidental destruction
resource "google_composer_environment" "protected" {
  name    = "airflow-protected"
  project = var.project_id
  region  = var.region

  config {
    software_config {
      image_version = "composer-2.9.7-airflow-2.9.3"
    }

    node_config {
      service_account = google_service_account.composer_sa.email
    }

    environment_size = "ENVIRONMENT_SIZE_SMALL"
  }

  lifecycle {
    prevent_destroy = true
  }
}
```

## Outputs

```hcl
output "composer_environment_id" {
  value = google_composer_environment.basic.id
}

output "airflow_uri" {
  description = "URI of the Airflow web interface"
  value       = google_composer_environment.basic.config[0].airflow_uri
}

output "gke_cluster" {
  description = "GKE cluster running the Composer environment"
  value       = google_composer_environment.basic.config[0].gke_cluster
}
```

## Conclusion

Cloud Composer environments are complex resources with many configuration options. Terraform captures all of those options in code, making it possible to reproduce environments consistently and track changes over time. The key decisions are around sizing (environment size, worker counts), networking (public vs. private), and security (CMEK, service accounts). Start with a small environment for development, and scale up for production with private networking and HA scheduling.

For related topics, see our guides on [creating GCP Dataflow jobs with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-gcp-dataflow-jobs-with-terraform/view) and [creating GCP Dataproc clusters with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-gcp-dataproc-clusters-with-terraform/view).
