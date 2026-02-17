# How to Deploy Cloud Run Services with Terraform on Google Cloud Platform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Terraform, Cloud Run, Serverless, Containers, Infrastructure as Code

Description: Learn how to deploy and manage Google Cloud Run services using Terraform, including traffic splitting, custom domains, VPC connectivity, and autoscaling configuration.

---

Cloud Run is one of the best ways to run containers on GCP. You push a container image, and Cloud Run handles scaling, HTTPS, and infrastructure. But clicking through the console for every deployment does not scale. Terraform lets you define your Cloud Run services in code, making deployments repeatable and reviewable.

This guide covers deploying Cloud Run services with Terraform, from basic setup to advanced patterns like traffic splitting, VPC connectivity, and secret management.

## Basic Cloud Run Service

Here is the simplest Cloud Run deployment:

```hcl
# cloudrun.tf - Basic Cloud Run service
resource "google_cloud_run_v2_service" "api" {
  name     = "api-service"
  location = var.region
  project  = var.project_id

  template {
    containers {
      image = "us-central1-docker.pkg.dev/my-project/my-repo/api:latest"

      # Resource limits
      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      # Environment variables
      env {
        name  = "ENV"
        value = "production"
      }

      env {
        name  = "LOG_LEVEL"
        value = "info"
      }

      # Container port
      ports {
        container_port = 8080
      }
    }

    # Scaling configuration
    scaling {
      min_instance_count = 1  # Keep at least 1 instance warm
      max_instance_count = 10
    }

    # Service account for the container
    service_account = google_service_account.api_runner.email
  }
}
```

## Service Account for Cloud Run

Create a dedicated service account with only the permissions your service needs:

```hcl
# service_account.tf - Service account for the Cloud Run service
resource "google_service_account" "api_runner" {
  account_id   = "api-runner"
  display_name = "API Service Cloud Run SA"
  project      = var.project_id
}

# Grant permissions the service needs
resource "google_project_iam_member" "api_runner_sql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.api_runner.email}"
}

resource "google_project_iam_member" "api_runner_storage" {
  project = var.project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.api_runner.email}"
}

resource "google_project_iam_member" "api_runner_secrets" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.api_runner.email}"
}
```

## Using Secrets from Secret Manager

Never put sensitive values in environment variables directly. Use Secret Manager:

```hcl
# cloudrun_with_secrets.tf - Cloud Run with Secret Manager integration
resource "google_cloud_run_v2_service" "api" {
  name     = "api-service"
  location = var.region
  project  = var.project_id

  template {
    containers {
      image = var.api_image

      resources {
        limits = {
          cpu    = "1"
          memory = "512Mi"
        }
      }

      # Regular environment variable
      env {
        name  = "ENV"
        value = "production"
      }

      # Secret from Secret Manager as environment variable
      env {
        name = "DATABASE_URL"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_url.secret_id
            version = "latest"
          }
        }
      }

      # Another secret
      env {
        name = "API_KEY"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.api_key.secret_id
            version = "latest"
          }
        }
      }

      ports {
        container_port = 8080
      }
    }

    scaling {
      min_instance_count = 1
      max_instance_count = 10
    }

    service_account = google_service_account.api_runner.email
  }
}
```

## Configuring Public Access

By default, Cloud Run services require authentication. To make a service publicly accessible:

```hcl
# Allow unauthenticated access (public API)
resource "google_cloud_run_v2_service_iam_member" "public" {
  name     = google_cloud_run_v2_service.api.name
  location = var.region
  project  = var.project_id
  role     = "roles/run.invoker"
  member   = "allUsers"
}
```

For internal services, restrict access to specific service accounts:

```hcl
# Only allow the web frontend to call this API
resource "google_cloud_run_v2_service_iam_member" "frontend_invoker" {
  name     = google_cloud_run_v2_service.api.name
  location = var.region
  project  = var.project_id
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.frontend_runner.email}"
}
```

## VPC Connectivity

If your Cloud Run service needs to connect to resources in a VPC (like Cloud SQL with private IP or Memorystore):

```hcl
# VPC connector for Cloud Run
resource "google_vpc_access_connector" "connector" {
  name          = "run-vpc-connector"
  region        = var.region
  project       = var.project_id
  ip_cidr_range = "10.8.0.0/28"
  network       = google_compute_network.main.name

  min_instances = 2
  max_instances = 3
}

# Cloud Run service with VPC access
resource "google_cloud_run_v2_service" "api" {
  name     = "api-service"
  location = var.region
  project  = var.project_id

  template {
    containers {
      image = var.api_image

      resources {
        limits = {
          cpu    = "2"
          memory = "1Gi"
        }
      }

      ports {
        container_port = 8080
      }
    }

    # Connect to VPC
    vpc_access {
      connector = google_vpc_access_connector.connector.id
      egress    = "PRIVATE_RANGES_ONLY"  # Only route private IP traffic through VPC
    }

    scaling {
      min_instance_count = 1
      max_instance_count = 10
    }

    service_account = google_service_account.api_runner.email
  }
}
```

## Traffic Splitting

Cloud Run supports splitting traffic between revisions, which is useful for canary deployments:

```hcl
# Cloud Run service with traffic splitting for canary deployment
resource "google_cloud_run_v2_service" "api" {
  name     = "api-service"
  location = var.region
  project  = var.project_id

  template {
    containers {
      image = var.api_image

      ports {
        container_port = 8080
      }
    }

    scaling {
      min_instance_count = 1
      max_instance_count = 10
    }

    service_account = google_service_account.api_runner.email
  }

  # Traffic configuration
  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 90
  }

  traffic {
    type     = "TRAFFIC_TARGET_ALLOCATION_TYPE_REVISION"
    revision = "api-service-v1"
    percent  = 10
  }
}
```

## Custom Domain Mapping

Map a custom domain to your Cloud Run service:

```hcl
# Custom domain mapping for the Cloud Run service
resource "google_cloud_run_domain_mapping" "api" {
  name     = "api.example.com"
  location = var.region
  project  = var.project_id

  metadata {
    namespace = var.project_id
  }

  spec {
    route_name = google_cloud_run_v2_service.api.name
  }
}

# Output the DNS records that need to be configured
output "domain_mapping_records" {
  description = "DNS records to configure for the custom domain"
  value       = google_cloud_run_domain_mapping.api.status[0].resource_records
}
```

## Health Checks and Probes

Configure startup and liveness probes for reliable operation:

```hcl
# Cloud Run service with health check probes
resource "google_cloud_run_v2_service" "api" {
  name     = "api-service"
  location = var.region
  project  = var.project_id

  template {
    containers {
      image = var.api_image

      ports {
        container_port = 8080
      }

      # Startup probe - checks if the container is ready to receive traffic
      startup_probe {
        http_get {
          path = "/health"
        }
        initial_delay_seconds = 5
        period_seconds        = 10
        failure_threshold     = 3
      }

      # Liveness probe - restarts the container if it becomes unhealthy
      liveness_probe {
        http_get {
          path = "/health"
        }
        period_seconds    = 30
        failure_threshold = 3
      }
    }

    # Timeout and concurrency settings
    timeout = "300s"
    max_instance_request_concurrency = 80

    scaling {
      min_instance_count = 1
      max_instance_count = 10
    }

    service_account = google_service_account.api_runner.email
  }
}
```

## Outputs

```hcl
# outputs.tf
output "service_url" {
  description = "The URL of the Cloud Run service"
  value       = google_cloud_run_v2_service.api.uri
}

output "service_name" {
  description = "The name of the Cloud Run service"
  value       = google_cloud_run_v2_service.api.name
}

output "latest_revision" {
  description = "The latest revision name"
  value       = google_cloud_run_v2_service.api.latest_ready_revision
}
```

## Best Practices

1. **Set min_instance_count to at least 1** for latency-sensitive services. Cold starts add noticeable delay.
2. **Use Secret Manager** for all sensitive configuration. Never put secrets in environment variables or Terraform variables.
3. **Create dedicated service accounts** for each Cloud Run service. Do not use the default compute service account.
4. **Use VPC connectors** when accessing private resources. Do not expose databases to the public internet.
5. **Configure health check probes** so Cloud Run can detect and restart unhealthy containers.
6. **Set appropriate concurrency limits** based on your application's capabilities.
7. **Use traffic splitting** for gradual rollouts instead of deploying directly to 100% of traffic.

## Wrapping Up

Cloud Run with Terraform gives you serverless container deployments that are fully codified and reproducible. The combination of autoscaling, secret management, VPC connectivity, and traffic splitting covers most production use cases. Start with a basic deployment, add VPC connectivity when you need private resource access, and use traffic splitting when your deployment process matures.
