# How to Create GCP Cloud CDN with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Cloud CDN, Infrastructure as Code, Google Cloud, CDN

Description: Learn how to set up Google Cloud CDN using Terraform to accelerate content delivery and reduce latency for your applications.

---

Content delivery networks are a fundamental part of modern web architecture. Google Cloud CDN leverages Google's globally distributed edge points of presence to cache HTTP(S) load balanced content close to your users. Setting this up manually through the console is fine for one-off projects, but when you need repeatable, version-controlled infrastructure, Terraform is the way to go.

In this post, we will walk through creating a complete Cloud CDN setup on GCP using Terraform, from the backend bucket to the URL map and forwarding rules.

## Prerequisites

Before you start, make sure you have:

- A GCP project with billing enabled
- Terraform 1.0 or later installed
- The `gcloud` CLI configured with appropriate permissions
- A Cloud Storage bucket with static content (or you can create one as part of the setup)

## Setting Up the Google Provider

First, configure the Google provider in your Terraform configuration.

```hcl
# main.tf - Provider configuration for GCP
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

# Variables for project configuration
variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The default region for resources"
  type        = string
  default     = "us-central1"
}
```

## Creating the Cloud Storage Backend

Cloud CDN needs a backend to serve content from. The most common setup for static content is a Cloud Storage bucket behind a backend bucket.

```hcl
# storage.tf - Create the storage bucket for static content
resource "google_storage_bucket" "static_content" {
  name     = "${var.project_id}-static-cdn"
  location = "US"

  # Enable uniform bucket-level access for simpler permissions
  uniform_bucket_level_access = true

  # Configure website serving
  website {
    main_page_suffix = "index.html"
    not_found_page   = "404.html"
  }

  # Set CORS rules so browsers can fetch content
  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD"]
    response_header = ["Content-Type"]
    max_age_seconds = 3600
  }
}

# Make the bucket publicly readable
resource "google_storage_bucket_iam_member" "public_read" {
  bucket = google_storage_bucket.static_content.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}
```

## Setting Up the Backend Bucket with CDN

This is where Cloud CDN gets enabled. The `google_compute_backend_bucket` resource ties your storage bucket to the load balancer and lets you toggle CDN caching.

```hcl
# cdn.tf - Backend bucket with Cloud CDN enabled
resource "google_compute_backend_bucket" "cdn_backend" {
  name        = "cdn-backend-bucket"
  description = "Backend bucket for Cloud CDN"
  bucket_name = google_storage_bucket.static_content.name

  # Enable Cloud CDN on this backend
  enable_cdn = true

  # Configure CDN caching policy
  cdn_policy {
    # Cache static content for 1 hour
    default_ttl = 3600

    # Maximum TTL of 24 hours
    max_ttl = 86400

    # Client-facing TTL
    client_ttl = 3600

    # Use CACHE_ALL_STATIC to automatically cache common static file types
    cache_mode = "CACHE_ALL_STATIC"

    # Serve stale content while revalidating
    serve_while_stale = 300

    # Enable negative caching for error responses
    negative_caching = true

    negative_caching_policy {
      code = 404
      ttl  = 60
    }
  }
}
```

## Creating the URL Map

The URL map determines how requests get routed to your backend. For a simple CDN setup, you can route everything to the backend bucket.

```hcl
# url_map.tf - Route requests to the CDN backend
resource "google_compute_url_map" "cdn_url_map" {
  name            = "cdn-url-map"
  description     = "URL map for Cloud CDN"
  default_service = google_compute_backend_bucket.cdn_backend.id

  # You can add path-based routing rules here
  host_rule {
    hosts        = ["cdn.example.com"]
    path_matcher = "static-paths"
  }

  path_matcher {
    name            = "static-paths"
    default_service = google_compute_backend_bucket.cdn_backend.id

    # Route /images/* to the same backend (you could use different backends)
    path_rule {
      paths   = ["/images/*"]
      service = google_compute_backend_bucket.cdn_backend.id
    }
  }
}
```

## Setting Up the HTTPS Proxy and Forwarding Rule

To serve traffic over HTTPS, you need a target proxy and a forwarding rule with a static IP.

```hcl
# Reserve a global static IP for the CDN
resource "google_compute_global_address" "cdn_ip" {
  name = "cdn-static-ip"
}

# Create a managed SSL certificate
resource "google_compute_managed_ssl_certificate" "cdn_cert" {
  name = "cdn-ssl-cert"

  managed {
    domains = ["cdn.example.com"]
  }
}

# HTTPS proxy that terminates SSL and forwards to the URL map
resource "google_compute_target_https_proxy" "cdn_https_proxy" {
  name             = "cdn-https-proxy"
  url_map          = google_compute_url_map.cdn_url_map.id
  ssl_certificates = [google_compute_managed_ssl_certificate.cdn_cert.id]
}

# Forwarding rule binds the static IP to the HTTPS proxy
resource "google_compute_global_forwarding_rule" "cdn_forwarding_rule" {
  name       = "cdn-forwarding-rule"
  target     = google_compute_target_https_proxy.cdn_https_proxy.id
  port_range = "443"
  ip_address = google_compute_global_address.cdn_ip.address
}
```

## Adding HTTP to HTTPS Redirect

You should also redirect HTTP traffic to HTTPS.

```hcl
# URL map that redirects HTTP to HTTPS
resource "google_compute_url_map" "http_redirect" {
  name = "cdn-http-redirect"

  default_url_redirect {
    https_redirect         = true
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
    strip_query            = false
  }
}

# HTTP proxy for the redirect
resource "google_compute_target_http_proxy" "http_redirect_proxy" {
  name    = "cdn-http-redirect-proxy"
  url_map = google_compute_url_map.http_redirect.id
}

# Forwarding rule for HTTP traffic
resource "google_compute_global_forwarding_rule" "http_redirect_rule" {
  name       = "cdn-http-redirect-rule"
  target     = google_compute_target_http_proxy.http_redirect_proxy.id
  port_range = "80"
  ip_address = google_compute_global_address.cdn_ip.address
}
```

## Outputs

Add some useful outputs to reference after deployment.

```hcl
# outputs.tf - Useful values after deployment
output "cdn_ip_address" {
  description = "The static IP address for the CDN"
  value       = google_compute_global_address.cdn_ip.address
}

output "cdn_backend_bucket" {
  description = "The name of the CDN backend bucket"
  value       = google_compute_backend_bucket.cdn_backend.name
}

output "storage_bucket_url" {
  description = "The URL of the storage bucket"
  value       = google_storage_bucket.static_content.url
}
```

## Deploying the Configuration

Run the standard Terraform workflow to deploy everything.

```bash
# Initialize Terraform and download the Google provider
terraform init

# Preview the changes
terraform plan -var="project_id=my-gcp-project"

# Apply the configuration
terraform apply -var="project_id=my-gcp-project"
```

After applying, it can take 10-15 minutes for the SSL certificate to be provisioned and the CDN to start serving traffic. You can check the status in the GCP Console under Network Services > Cloud CDN.

## Cache Invalidation

When you update content in your storage bucket, you may need to invalidate the CDN cache. You can do this with `gcloud`:

```bash
# Invalidate all cached content
gcloud compute url-maps invalidate-cdn-cache cdn-url-map --path="/*"

# Invalidate specific paths
gcloud compute url-maps invalidate-cdn-cache cdn-url-map --path="/images/logo.png"
```

## Monitoring Your CDN

Once the CDN is running, you should monitor cache hit ratios and latency. Google Cloud provides CDN-specific metrics in Cloud Monitoring, including `cdn/hit_count`, `cdn/miss_count`, and `cdn/fill_bytes`. Low hit ratios often mean your TTL settings need tuning or your content is too dynamic for effective caching.

For production monitoring of your CDN and the applications behind it, consider using [OneUptime](https://oneuptime.com) to track uptime, response times, and error rates across your infrastructure.

## Wrapping Up

Setting up Cloud CDN with Terraform gives you a repeatable, auditable way to manage your content delivery infrastructure. The key resources involved are the storage bucket, backend bucket with CDN policy, URL map, SSL certificate, HTTPS proxy, and forwarding rule. Once this is in place, you can version control your CDN configuration, review changes in pull requests, and roll back if something goes wrong.

If you are looking for more Terraform and GCP content, check out our post on [how to create GCP Certificate Manager with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-gcp-certificate-manager-with-terraform/view).
