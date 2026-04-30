# How to Configure Cloud CDN on GCP with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GCP, Cloud CDN, Load Balancer, Infrastructure as Code, Performance, Google Cloud

Description: Learn how to configure GCP Cloud CDN using OpenTofu by integrating it with an HTTP(S) Load Balancer for global content acceleration with backend buckets and services.

---

GCP Cloud CDN is tightly integrated with the GCP HTTP(S) Load Balancer. Enabling CDN is a property on a backend bucket or service, not a separate resource. With OpenTofu, you define the full load balancer and CDN configuration as code, creating a consistent delivery architecture.

## Full Load Balancer + CDN Setup

```mermaid
graph LR
    A[Internet] --> B[Global External HTTP(S) LB]
    B --> C[URL Map]
    C -->|default| D[Backend Bucket<br/>CDN Enabled]
    C -->|/api/*| E[Backend Service<br/>Cloud Run/GCE]
    D --> F[Cloud Storage Bucket]
```

## Creating the Infrastructure

```hcl
# main.tf

terraform {
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

# Storage bucket for static content
resource "google_storage_bucket" "static" {
  name     = "${var.project_id}-static-assets"
  location = "US"

  website {
    main_page_suffix = "index.html"
    not_found_page   = "404.html"
  }
}

# Make bucket objects publicly readable
resource "google_storage_bucket_iam_member" "public_read" {
  bucket = google_storage_bucket.static.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# Backend bucket with CDN enabled
resource "google_compute_backend_bucket" "static" {
  name        = "static-backend-bucket"
  bucket_name = google_storage_bucket.static.name
  enable_cdn  = true

  cdn_policy {
    # Set 1-hour TTL defaults when the origin doesn't send a valid TTL
    default_ttl = 3600
    max_ttl     = 86400  # 24 hours max
    client_ttl  = 3600

    # Cache common static content types and honor valid origin cache headers
    cache_mode = "CACHE_ALL_STATIC"

    # Serve stale cached content for up to 1 day during revalidation or refresh errors
    serve_while_stale = 86400
  }
}

# Reserve a global static IP
resource "google_compute_global_address" "default" {
  name = "${var.project_name}-global-ip"
}

# SSL certificate
resource "google_compute_managed_ssl_certificate" "default" {
  name = "${var.project_name}-ssl-cert"

  managed {
    domains = [var.domain_name]
  }
}

# Target HTTPS proxy
resource "google_compute_target_https_proxy" "default" {
  name             = "${var.project_name}-https-proxy"
  url_map          = google_compute_url_map.default.id
  ssl_certificates = [google_compute_managed_ssl_certificate.default.id]
}

# HTTPS forwarding rule
resource "google_compute_global_forwarding_rule" "https" {
  name                  = "${var.project_name}-https-forwarding-rule"
  target                = google_compute_target_https_proxy.default.id
  port_range            = "443"
  ip_protocol           = "TCP"
  ip_address            = google_compute_global_address.default.address
  load_balancing_scheme = "EXTERNAL_MANAGED"
}

# HTTP to HTTPS redirect
resource "google_compute_url_map" "http_redirect" {
  name = "${var.project_name}-http-redirect"

  default_url_redirect {
    https_redirect         = true
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
    strip_query            = false
  }
}

resource "google_compute_target_http_proxy" "redirect" {
  name    = "${var.project_name}-http-proxy"
  url_map = google_compute_url_map.http_redirect.id
}

resource "google_compute_global_forwarding_rule" "http" {
  name                  = "${var.project_name}-http-forwarding-rule"
  target                = google_compute_target_http_proxy.redirect.id
  port_range            = "80"
  ip_protocol           = "TCP"
  ip_address            = google_compute_global_address.default.address
  load_balancing_scheme = "EXTERNAL_MANAGED"
}
```

## URL Map for Path-Based Routing

```hcl
# url_map.tf
resource "google_compute_url_map" "default" {
  name            = "${var.project_name}-url-map"
  default_service = google_compute_backend_bucket.static.id

  host_rule {
    hosts        = [var.domain_name]
    path_matcher = "main"
  }

  path_matcher {
    name            = "main"
    default_service = google_compute_backend_bucket.static.id

    # Route API traffic to an existing backend service (for example, Cloud Run or GCE)
    path_rule {
      paths   = ["/api/*"]
      service = var.api_backend_service_id
    }
  }
}
```

## Best Practices

- Use `CACHE_ALL_STATIC` cache mode for static asset backends - it automatically caches images, JS, CSS, and other static types.
- Set `serve_while_stale` to let Cloud CDN serve stale cached content during revalidation or refresh errors - this can reduce user-visible latency when stale content is acceptable.
- Use managed SSL certificates rather than self-managed certificates - GCP handles renewal automatically.
- Monitor Cache Hit Rate in Cloud Monitoring - low hit rates indicate over-personalized responses or missing cache headers.
- Enable Cloud Armor (WAF) on the backend service for DDoS protection and security policy enforcement.
