# How to Configure GCP External Load Balancer with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, IPv6, Load Balancer, Cloud, External, Global

Description: A guide to configuring Google Cloud Platform External HTTP(S) Load Balancer with IPv6 frontend, enabling global IPv6 client access to GCP workloads.

Google Cloud's global external Application Load Balancer supports IPv6 by assigning both IPv4 and IPv6 global anycast addresses to the frontend. This is configured at the frontend forwarding rule level.

## GCP IPv6 Load Balancer Architecture

```text
IPv6 Client → Global Anycast IPv6 → GCP Edge PoP → Backend (IPv4 or IPv6)
```

By default, the load balancer terminates the IPv6 client connection and proxies the request to the backend over IPv4, so backends don't need to be dual-stack. Global external Application Load Balancers can also connect to dual-stack backends over IPv6 when configured with an IP address selection policy.

## Terraform Configuration

```hcl
# Backend service

resource "google_compute_backend_service" "main" {
  name                  = "main-backend"
  port_name             = "http"
  protocol              = "HTTP"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  timeout_sec           = 30

  backend {
    group = google_compute_instance_group_manager.main.instance_group
    balancing_mode = "UTILIZATION"
  }

  health_checks = [google_compute_health_check.main.id]
}

resource "google_compute_health_check" "main" {
  name = "main-health-check"

  http_health_check {
    port = 80
    request_path = "/health"
  }
}

# URL map
resource "google_compute_url_map" "main" {
  name            = "main-url-map"
  default_service = google_compute_backend_service.main.id
}

# HTTP Proxy
resource "google_compute_target_http_proxy" "main" {
  name    = "main-http-proxy"
  url_map = google_compute_url_map.main.id
}

# IPv4 Global Address
resource "google_compute_global_address" "ipv4" {
  name       = "main-lb-ipv4"
  ip_version = "IPV4"
}

# IPv6 Global Address
resource "google_compute_global_address" "ipv6" {
  name       = "main-lb-ipv6"
  ip_version = "IPV6"
}

# IPv4 Forwarding Rule
resource "google_compute_global_forwarding_rule" "ipv4" {
  name                  = "main-lb-forwarding-ipv4"
  target                = google_compute_target_http_proxy.main.id
  port_range            = "80"
  ip_address            = google_compute_global_address.ipv4.address
  ip_protocol           = "TCP"
  load_balancing_scheme = "EXTERNAL_MANAGED"
}

# IPv6 Forwarding Rule
resource "google_compute_global_forwarding_rule" "ipv6" {
  name                  = "main-lb-forwarding-ipv6"
  target                = google_compute_target_http_proxy.main.id
  port_range            = "80"
  ip_address            = google_compute_global_address.ipv6.address
  ip_protocol           = "TCP"
  load_balancing_scheme = "EXTERNAL_MANAGED"
}
```

## gcloud CLI Configuration

```bash
# Reserve a global IPv6 address
gcloud compute addresses create main-lb-ipv6 \
  --global \
  --ip-version IPV6

# Get the IPv6 address
gcloud compute addresses describe main-lb-ipv6 --global \
  --format="value(address)"

# Create IPv6 forwarding rule
gcloud compute forwarding-rules create main-lb-fwd-ipv6 \
  --global \
  --load-balancing-scheme=EXTERNAL_MANAGED \
  --target-http-proxy=main-http-proxy \
  --address=main-lb-ipv6 \
  --ports=80
```

## HTTPS Load Balancer with IPv6

```hcl
# SSL certificate
resource "google_compute_managed_ssl_certificate" "main" {
  name = "main-ssl-cert"
  managed {
    domains = ["example.com", "www.example.com"]
  }
}

# HTTPS Proxy
resource "google_compute_target_https_proxy" "main" {
  name             = "main-https-proxy"
  url_map          = google_compute_url_map.main.id
  ssl_certificates = [google_compute_managed_ssl_certificate.main.id]
}

# IPv6 HTTPS Forwarding Rule
resource "google_compute_global_forwarding_rule" "ipv6_https" {
  name                  = "main-lb-https-ipv6"
  target                = google_compute_target_https_proxy.main.id
  port_range            = "443"
  ip_address            = google_compute_global_address.ipv6.address
  ip_protocol           = "TCP"
  load_balancing_scheme = "EXTERNAL_MANAGED"
}
```

## DNS Configuration

```bash
# Add AAAA record pointing to GCP IPv6 address
gcloud dns record-sets create example.com. \
  --zone=my-zone \
  --type=AAAA \
  --ttl=300 \
  --rrdatas="2600:1901::1"   # Your GCP IPv6 address
```

## Verifying IPv6 Load Balancer

```bash
# Confirm the DNS name resolves to the load balancer's IPv6 address
dig AAAA example.com +short

# Test HTTP over IPv6
curl -6 http://example.com/
curl -6 https://example.com/

# Verify your backend receives the client IPv6 in X-Forwarded-For
# Send a request, then inspect your application logs or echo/debug endpoint
curl -6 https://example.com/
```

Google Cloud's global external Application Load Balancer is one of the easiest ways to add IPv6 support - simply reserve a global IPv6 address, create an IPv6 forwarding rule, and your backend workloads can accept IPv6 client traffic without requiring dual-stack backends.
