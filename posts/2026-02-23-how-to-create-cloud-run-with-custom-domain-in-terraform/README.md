# How to Create Cloud Run with Custom Domain in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Cloud Run, Serverless, Container, DNS

Description: Learn how to deploy Google Cloud Run services with custom domain mapping using Terraform for production-ready containerized applications with your own domain.

---

Google Cloud Run is a fully managed serverless platform that runs stateless containers. It automatically scales from zero to handle incoming traffic, and you only pay for the resources used during request processing. While Cloud Run provides a default URL for each service, production deployments typically need a custom domain. Terraform makes it easy to provision the Cloud Run service and configure domain mapping in a single declarative configuration.

This guide covers deploying a Cloud Run service with a custom domain, including DNS configuration, SSL certificate management, and authentication settings.

## Prerequisites

Before starting, ensure you have:

- A Google Cloud project with billing enabled
- The Cloud Run API enabled
- A domain you own with access to DNS management
- Terraform configured with Google provider credentials

## Provider Configuration

Set up the Google provider for Terraform:

```hcl
# Configure the Google provider
provider "google" {
  project = var.project_id
  region  = var.region
}

variable "project_id" {
  description = "Google Cloud project ID"
  type        = string
}

variable "region" {
  description = "Region for Cloud Run service"
  type        = string
  default     = "us-central1"
}

variable "domain" {
  description = "Custom domain for the Cloud Run service"
  type        = string
}
```

## Enabling Required APIs

Enable the necessary Google Cloud APIs:

```hcl
# Enable Cloud Run API
resource "google_project_service" "run" {
  project = var.project_id
  service = "run.googleapis.com"

  disable_on_destroy = false
}

# Enable DNS API if using Cloud DNS
resource "google_project_service" "dns" {
  project = var.project_id
  service = "dns.googleapis.com"

  disable_on_destroy = false
}

# Enable Container Registry API
resource "google_project_service" "containerregistry" {
  project = var.project_id
  service = "containerregistry.googleapis.com"

  disable_on_destroy = false
}
```

## Creating the Cloud Run Service

Deploy the Cloud Run service with your container image:

```hcl
# Cloud Run service
resource "google_cloud_run_v2_service" "main" {
  name     = "my-web-app"
  location = var.region

  # Ensure the API is enabled first
  depends_on = [google_project_service.run]

  template {
    # Container configuration
    containers {
      image = "gcr.io/${var.project_id}/my-web-app:latest"

      # Resource limits
      resources {
        limits = {
          cpu    = "2"
          memory = "1Gi"
        }

        # Allow CPU to be available only during requests
        cpu_idle = true

        # Allow startup CPU boost for faster cold starts
        startup_cpu_boost = true
      }

      # Environment variables
      env {
        name  = "NODE_ENV"
        value = "production"
      }

      # Secret environment variables
      env {
        name = "DB_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_password.secret_id
            version = "latest"
          }
        }
      }

      # Container port
      ports {
        container_port = 8080
      }

      # Health check
      startup_probe {
        http_get {
          path = "/health"
        }
        initial_delay_seconds = 5
        period_seconds        = 10
        failure_threshold     = 3
      }

      liveness_probe {
        http_get {
          path = "/health"
        }
        period_seconds = 30
      }
    }

    # Scaling configuration
    scaling {
      min_instance_count = 1   # Keep at least one instance warm
      max_instance_count = 100 # Maximum instances for scaling
    }

    # Service account for runtime permissions
    service_account = google_service_account.cloud_run_sa.email

    # Execution environment (gen2 for better performance)
    execution_environment = "EXECUTION_ENVIRONMENT_GEN2"
  }

  # Traffic routing - all traffic to latest revision
  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}

# Service account for Cloud Run
resource "google_service_account" "cloud_run_sa" {
  account_id   = "cloud-run-sa"
  display_name = "Cloud Run Service Account"
}
```

## Allowing Public Access

By default, Cloud Run services require authentication. For public web apps, allow unauthenticated access:

```hcl
# Allow unauthenticated access to the service
resource "google_cloud_run_v2_service_iam_member" "public" {
  project  = google_cloud_run_v2_service.main.project
  location = google_cloud_run_v2_service.main.location
  name     = google_cloud_run_v2_service.main.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
```

## Mapping a Custom Domain

Map your custom domain to the Cloud Run service:

```hcl
# Domain mapping for Cloud Run
resource "google_cloud_run_domain_mapping" "main" {
  location = var.region
  name     = var.domain

  metadata {
    namespace = var.project_id
  }

  spec {
    route_name = google_cloud_run_v2_service.main.name
  }

  depends_on = [google_cloud_run_v2_service.main]
}
```

## Setting Up DNS with Cloud DNS

If you are using Google Cloud DNS, configure the DNS records automatically:

```hcl
# Cloud DNS managed zone (if managing DNS in GCP)
resource "google_dns_managed_zone" "main" {
  name     = "my-domain-zone"
  dns_name = "${var.domain}."

  dnssec_config {
    state = "on"
  }
}

# DNS records for domain verification and routing
# Cloud Run domain mapping provides the required DNS records
resource "google_dns_record_set" "cloud_run_cname" {
  name         = "${var.domain}."
  managed_zone = google_dns_managed_zone.main.name
  type         = "CNAME"
  ttl          = 300
  rrdatas      = ["ghs.googlehosted.com."]
}

# For apex domain (no subdomain), use A records
resource "google_dns_record_set" "cloud_run_a" {
  count        = var.is_apex_domain ? 1 : 0
  name         = "${var.domain}."
  managed_zone = google_dns_managed_zone.main.name
  type         = "A"
  ttl          = 300

  # Google-provided IP addresses for Cloud Run custom domains
  rrdatas = [
    "216.239.32.21",
    "216.239.34.21",
    "216.239.36.21",
    "216.239.38.21"
  ]
}

# AAAA records for IPv6 support
resource "google_dns_record_set" "cloud_run_aaaa" {
  count        = var.is_apex_domain ? 1 : 0
  name         = "${var.domain}."
  managed_zone = google_dns_managed_zone.main.name
  type         = "AAAA"
  ttl          = 300

  rrdatas = [
    "2001:4860:4802:32::15",
    "2001:4860:4802:34::15",
    "2001:4860:4802:36::15",
    "2001:4860:4802:38::15"
  ]
}
```

## Using a Global Load Balancer (Alternative Approach)

For more control over SSL and traffic management, use a global load balancer:

```hcl
# Serverless NEG for Cloud Run
resource "google_compute_region_network_endpoint_group" "cloud_run_neg" {
  name                  = "cloud-run-neg"
  region                = var.region
  network_endpoint_type = "SERVERLESS"

  cloud_run {
    service = google_cloud_run_v2_service.main.name
  }
}

# Backend service
resource "google_compute_backend_service" "cloud_run_backend" {
  name = "cloud-run-backend"

  backend {
    group = google_compute_region_network_endpoint_group.cloud_run_neg.id
  }

  # Enable Cloud CDN for caching
  enable_cdn = true

  cdn_policy {
    cache_mode                   = "CACHE_ALL_STATIC"
    default_ttl                  = 3600
    signed_url_cache_max_age_sec = 7200
  }
}

# URL map
resource "google_compute_url_map" "main" {
  name            = "cloud-run-url-map"
  default_service = google_compute_backend_service.cloud_run_backend.id
}

# Managed SSL certificate
resource "google_compute_managed_ssl_certificate" "main" {
  name = "cloud-run-ssl-cert"

  managed {
    domains = [var.domain]
  }
}

# HTTPS proxy
resource "google_compute_target_https_proxy" "main" {
  name             = "cloud-run-https-proxy"
  url_map          = google_compute_url_map.main.id
  ssl_certificates = [google_compute_managed_ssl_certificate.main.id]
}

# Global forwarding rule
resource "google_compute_global_forwarding_rule" "main" {
  name       = "cloud-run-forwarding-rule"
  target     = google_compute_target_https_proxy.main.id
  port_range = "443"
  ip_address = google_compute_global_address.main.address
}

# Reserve a global static IP
resource "google_compute_global_address" "main" {
  name = "cloud-run-global-ip"
}

# HTTP to HTTPS redirect
resource "google_compute_url_map" "redirect" {
  name = "http-redirect"

  default_url_redirect {
    https_redirect = true
    strip_query    = false
  }
}

resource "google_compute_target_http_proxy" "redirect" {
  name    = "http-redirect-proxy"
  url_map = google_compute_url_map.redirect.id
}

resource "google_compute_global_forwarding_rule" "redirect" {
  name       = "http-redirect-rule"
  target     = google_compute_target_http_proxy.redirect.id
  port_range = "80"
  ip_address = google_compute_global_address.main.address
}
```

## Outputs

```hcl
output "cloud_run_url" {
  description = "Default Cloud Run service URL"
  value       = google_cloud_run_v2_service.main.uri
}

output "custom_domain" {
  description = "Custom domain for the service"
  value       = var.domain
}

output "global_ip" {
  description = "Global IP address for DNS configuration"
  value       = google_compute_global_address.main.address
}
```

## Monitoring with OneUptime

After deploying your Cloud Run service with a custom domain, monitoring both the service and the domain health is important. OneUptime can monitor your custom domain endpoint, track SSL certificate expiration, and alert you when the service becomes unreachable. Visit [OneUptime](https://oneuptime.com) to set up uptime monitoring for your Cloud Run deployments.

## Conclusion

Deploying Google Cloud Run with a custom domain in Terraform gives you a production-ready serverless container platform with your own branding. The direct domain mapping approach is simpler and suitable for most use cases, while the global load balancer approach gives you additional features like CDN caching, custom SSL management, and advanced traffic routing. Terraform ensures your entire setup is reproducible and version-controlled, from the Cloud Run service configuration to the DNS records and SSL certificates.

For more container deployment patterns, see [How to Create App Runner with Custom VPC in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-app-runner-with-custom-vpc-in-terraform/view) and [How to Create Azure Container Apps Environment in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-azure-container-apps-environment-in-terraform/view).
