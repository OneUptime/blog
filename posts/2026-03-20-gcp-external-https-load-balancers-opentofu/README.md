# How to Create GCP External HTTP(S) Load Balancers with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Load Balancer, HTTPS, OpenTofu, Networking, Infrastructure

Description: Learn how to create GCP External HTTP(S) Load Balancers with OpenTofu for global traffic distribution with SSL termination and URL-based routing.

## Overview

GCP global external Application Load Balancer is a global, proxy-based Layer 7 load balancer that can distribute traffic across multiple regions. It provides SSL termination, URL-based routing, Cloud CDN integration, and Cloud Armor support. OpenTofu manages the full load balancer configuration.

## Step 1: Create Backend Buckets and Services

```hcl
# main.tf - Backend service for the load balancer

resource "google_compute_health_check" "http_hc" {
  name = "web-http-health-check"

  http_health_check {
    port         = 80
    request_path = "/health"
  }
}

resource "google_compute_backend_service" "web_backend" {
  name                  = "web-backend-service"
  protocol              = "HTTP"
  port_name             = "http"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  timeout_sec           = 30
  enable_cdn            = true  # Enable Cloud CDN

  backend {
    group          = google_compute_instance_group_manager.web_mig.instance_group
    balancing_mode = "RATE"
    max_rate_per_instance = 100
  }

  health_checks = [google_compute_health_check.http_hc.id]

  log_config {
    enable      = true
    sample_rate = 1.0
  }
}

resource "google_compute_backend_service" "api_backend" {
  name                  = "api-backend-service"
  protocol              = "HTTP"
  port_name             = "http"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  timeout_sec           = 30

  backend {
    group                 = google_compute_instance_group_manager.web_mig.instance_group
    balancing_mode        = "RATE"
    max_rate_per_instance = 100
  }

  health_checks = [google_compute_health_check.http_hc.id]
}

# Backend bucket for static assets
resource "google_compute_backend_bucket" "static_assets" {
  name        = "static-assets-backend"
  bucket_name = google_storage_bucket.assets_bucket.name
  enable_cdn  = true
}
```

## Step 2: URL Map with Path-Based Routing

```hcl
# URL map routes requests to different backends based on path
resource "google_compute_url_map" "lb_url_map" {
  name            = "web-lb-url-map"
  default_service = google_compute_backend_service.web_backend.id

  host_rule {
    hosts        = ["example.com", "www.example.com"]
    path_matcher = "web-paths"
  }

  path_matcher {
    name            = "web-paths"
    default_service = google_compute_backend_service.web_backend.id

    path_rule {
      paths   = ["/static/*", "/assets/*"]
      service = google_compute_backend_bucket.static_assets.id
    }

    path_rule {
      paths   = ["/api/*"]
      service = google_compute_backend_service.api_backend.id
    }
  }
}

# URL map used by the HTTP proxy to redirect requests to HTTPS
resource "google_compute_url_map" "https_redirect_map" {
  name = "web-https-redirect-map"

  default_url_redirect {
    https_redirect         = true
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
    strip_query            = false
  }
}
```

## Step 3: SSL Certificate and HTTPS Proxy

```hcl
# Google-managed SSL certificate
resource "google_compute_managed_ssl_certificate" "web_cert" {
  name = "web-ssl-certificate"

  managed {
    domains = ["example.com", "www.example.com"]
  }
}

# HTTPS target proxy with the SSL certificate
resource "google_compute_target_https_proxy" "https_proxy" {
  name             = "web-https-proxy"
  url_map          = google_compute_url_map.lb_url_map.id
  ssl_certificates = [google_compute_managed_ssl_certificate.web_cert.id]
}

# HTTP proxy for redirect to HTTPS
resource "google_compute_target_http_proxy" "http_proxy" {
  name    = "web-http-proxy"
  url_map = google_compute_url_map.https_redirect_map.id
}
```

## Step 4: Forwarding Rules and Static IP

```hcl
# Reserve a global static IP
resource "google_compute_global_address" "lb_ip" {
  name = "web-lb-ip"
}

# HTTPS forwarding rule
resource "google_compute_global_forwarding_rule" "https_rule" {
  name                  = "https-forwarding-rule"
  ip_address            = google_compute_global_address.lb_ip.id
  ip_protocol           = "TCP"
  port_range            = "443"
  target                = google_compute_target_https_proxy.https_proxy.id
  load_balancing_scheme = "EXTERNAL_MANAGED"
}

# HTTP forwarding rule (redirect to HTTPS)
resource "google_compute_global_forwarding_rule" "http_rule" {
  name                  = "http-forwarding-rule"
  ip_address            = google_compute_global_address.lb_ip.id
  ip_protocol           = "TCP"
  port_range            = "80"
  target                = google_compute_target_http_proxy.http_proxy.id
  load_balancing_scheme = "EXTERNAL_MANAGED"
}
```

## Step 5: Outputs

```hcl
output "load_balancer_ip" {
  value = google_compute_global_address.lb_ip.address
}
```

## Summary

GCP global external HTTPS Application Load Balancer with OpenTofu provides global traffic distribution with SSL termination and URL-based routing. The combination of Cloud CDN for static assets, path-based routing for APIs, and Google-managed certificates creates a production-ready global web infrastructure.
