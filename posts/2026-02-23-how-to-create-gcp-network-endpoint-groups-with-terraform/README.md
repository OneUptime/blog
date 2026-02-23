# How to Create GCP Network Endpoint Groups with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Network Endpoint Groups, NEG, Load Balancing, Infrastructure as Code

Description: Learn how to create and manage Network Endpoint Groups on Google Cloud Platform using Terraform for fine-grained load balancing control.

---

Network Endpoint Groups (NEGs) are a GCP load balancing concept that gives you fine-grained control over how traffic gets distributed to your backends. Instead of pointing a load balancer at an instance group and hoping for the best, NEGs let you target individual endpoints - specific IP and port combinations, serverless services, or even external endpoints outside of Google Cloud.

This post walks through creating different types of NEGs with Terraform, including zonal NEGs, serverless NEGs, and internet NEGs.

## Types of Network Endpoint Groups

GCP offers several types of NEGs, each suited for different architectures:

- **Zonal NEGs** - Target individual VM instances or containers by IP and port within a zone
- **Serverless NEGs** - Point to Cloud Run, Cloud Functions, or App Engine services
- **Internet NEGs** - Route traffic to endpoints outside GCP (external IPs or FQDNs)
- **Hybrid NEGs** - Target endpoints in on-premises or other cloud environments via Hybrid Connectivity

## Provider Configuration

```hcl
# main.tf - Standard Google provider setup
terraform {
  required_version = ">= 1.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

variable "project_id" {
  type        = string
  description = "The GCP project ID"
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "zone" {
  type    = string
  default = "us-central1-a"
}
```

## Creating a Zonal NEG

Zonal NEGs are the most common type. They contain endpoints within a single zone, typically GKE pods or VM instances.

```hcl
# First, we need a VPC network and subnet
resource "google_compute_network" "main" {
  name                    = "neg-demo-network"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "main" {
  name          = "neg-demo-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.main.id
}

# Create a zonal NEG for GCE_VM_IP_PORT endpoints
resource "google_compute_network_endpoint_group" "zonal_neg" {
  name                  = "zonal-neg-example"
  zone                  = var.zone
  network               = google_compute_network.main.id
  subnetwork            = google_compute_subnetwork.main.id
  default_port          = 8080
  network_endpoint_type = "GCE_VM_IP_PORT"
}
```

You can then add specific endpoints to the NEG. This is useful when you want to manually control which instances receive traffic.

```hcl
# Add a specific endpoint to the zonal NEG
resource "google_compute_network_endpoint" "endpoint_1" {
  network_endpoint_group = google_compute_network_endpoint_group.zonal_neg.name
  zone                   = var.zone

  instance   = google_compute_instance.web_server.name
  ip_address = google_compute_instance.web_server.network_interface[0].network_ip
  port       = 8080
}
```

## Creating a Serverless NEG for Cloud Run

Serverless NEGs connect your load balancer to serverless backends. This is the standard pattern for putting Cloud Run services behind a global HTTPS load balancer.

```hcl
# serverless_neg.tf - NEG pointing to a Cloud Run service
resource "google_compute_region_network_endpoint_group" "cloud_run_neg" {
  name                  = "cloud-run-neg"
  region                = var.region
  network_endpoint_type = "SERVERLESS"

  cloud_run {
    service = google_cloud_run_service.app.name
  }
}

# Example Cloud Run service
resource "google_cloud_run_service" "app" {
  name     = "my-web-app"
  location = var.region

  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/my-app:latest"

        ports {
          container_port = 8080
        }

        resources {
          limits = {
            cpu    = "1000m"
            memory = "512Mi"
          }
        }
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}
```

You can also create a serverless NEG that uses a URL mask to route to different services based on the request path.

```hcl
# Serverless NEG with URL mask for multi-service routing
resource "google_compute_region_network_endpoint_group" "cloud_run_url_mask" {
  name                  = "cloud-run-url-mask-neg"
  region                = var.region
  network_endpoint_type = "SERVERLESS"

  cloud_run {
    # The URL mask maps request paths to Cloud Run service names
    url_mask = "<service>"
  }
}
```

## Creating a Serverless NEG for Cloud Functions

```hcl
# Cloud Functions NEG
resource "google_compute_region_network_endpoint_group" "cloud_function_neg" {
  name                  = "cloud-function-neg"
  region                = var.region
  network_endpoint_type = "SERVERLESS"

  cloud_function {
    function = "my-function-name"
  }
}
```

## Creating an Internet NEG

Internet NEGs let you route traffic to endpoints outside of GCP. This is useful for hybrid architectures or when you need to load balance across multiple cloud providers.

```hcl
# internet_neg.tf - NEG for external endpoints
resource "google_compute_global_network_endpoint_group" "internet_neg" {
  name                  = "internet-neg-example"
  network_endpoint_type = "INTERNET_FQDN_PORT"
  default_port          = 443
}

# Add an external endpoint by FQDN
resource "google_compute_global_network_endpoint" "external_api" {
  global_network_endpoint_group = google_compute_global_network_endpoint_group.internet_neg.id
  fqdn                         = "api.external-service.com"
  port                         = 443
}

# Add another external endpoint
resource "google_compute_global_network_endpoint" "external_api_secondary" {
  global_network_endpoint_group = google_compute_global_network_endpoint_group.internet_neg.id
  fqdn                         = "api-secondary.external-service.com"
  port                         = 443
}
```

## Connecting NEGs to a Backend Service

NEGs on their own do not do much. You need to attach them to a backend service, which then connects to a load balancer through a URL map.

```hcl
# backend.tf - Backend service using the serverless NEG
resource "google_compute_backend_service" "cloud_run_backend" {
  name        = "cloud-run-backend"
  protocol    = "HTTP"
  port_name   = "http"
  timeout_sec = 30

  # Attach the serverless NEG as a backend
  backend {
    group = google_compute_region_network_endpoint_group.cloud_run_neg.id
  }

  # Enable logging for troubleshooting
  log_config {
    enable      = true
    sample_rate = 1.0
  }
}

# URL map routing to the backend service
resource "google_compute_url_map" "default" {
  name            = "neg-demo-url-map"
  default_service = google_compute_backend_service.cloud_run_backend.id
}

# HTTPS proxy
resource "google_compute_target_https_proxy" "default" {
  name             = "neg-demo-https-proxy"
  url_map          = google_compute_url_map.default.id
  ssl_certificates = [google_compute_managed_ssl_certificate.default.id]
}

# Global forwarding rule
resource "google_compute_global_forwarding_rule" "default" {
  name       = "neg-demo-forwarding-rule"
  target     = google_compute_target_https_proxy.default.id
  port_range = "443"
  ip_address = google_compute_global_address.default.address
}

resource "google_compute_global_address" "default" {
  name = "neg-demo-ip"
}

resource "google_compute_managed_ssl_certificate" "default" {
  name = "neg-demo-cert"
  managed {
    domains = ["app.example.com"]
  }
}
```

## Health Checks for Zonal NEGs

Zonal NEGs used with backend services need health checks to determine which endpoints are healthy.

```hcl
# Health check for zonal NEG endpoints
resource "google_compute_health_check" "neg_health_check" {
  name               = "neg-health-check"
  check_interval_sec = 10
  timeout_sec        = 5

  http_health_check {
    port         = 8080
    request_path = "/healthz"
  }
}

# Backend service for zonal NEG with health check
resource "google_compute_backend_service" "zonal_backend" {
  name                  = "zonal-neg-backend"
  protocol              = "HTTP"
  port_name             = "http"
  timeout_sec           = 30
  health_checks         = [google_compute_health_check.neg_health_check.id]

  backend {
    group           = google_compute_network_endpoint_group.zonal_neg.id
    balancing_mode  = "RATE"
    max_rate_per_endpoint = 100
  }
}
```

## Monitoring and Troubleshooting

After deploying your NEGs, monitor them through Cloud Monitoring. Key metrics to watch include request count, latency, and error rates per NEG. If endpoints are unhealthy, check that your health check configuration matches the actual health endpoint on your backends.

For comprehensive monitoring across your load balancer, NEGs, and backend services, [OneUptime](https://oneuptime.com) can help you track uptime and performance from external vantage points, catching issues that internal health checks might miss.

## Summary

Network Endpoint Groups give you precise control over load balancing targets in GCP. Zonal NEGs work well for VM and container workloads, serverless NEGs connect your load balancer to Cloud Run and Cloud Functions, and internet NEGs handle external endpoints. Combined with Terraform, you can manage all of this as code and maintain consistent infrastructure across environments.
