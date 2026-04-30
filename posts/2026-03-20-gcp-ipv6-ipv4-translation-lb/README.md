# How to Configure GCP IPv6-to-IPv4 Translation at Load Balancer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, IPv6, IPv4, Translation, Load Balancer, Cloud

Description: A guide to GCP's built-in IPv6-to-IPv4 translation at the load balancer layer, enabling IPv6 clients to reach IPv4-only backends without modifying the backend infrastructure.

GCP's global external Application Load Balancer can terminate IPv6 client connections and proxy them over IPv4 to IPv4-only backends. This lets you offer IPv6 and IPv4 frontends without requiring your backends to support IPv6 natively.

## How GCP IPv6-to-IPv4 Translation Works

```text
IPv6 Client → GCP global external ALB (IPv6 frontend) → IPv4 backend
              ↑ Translation happens here
              - Allocates a global IPv6 /64 to the forwarding rule
              - Accepts IPv6 connections
              - Proxies to IPv4 for backend communication
              - Preserves the client IPv6 in X-Forwarded-For
```

## Architecture

The key insight: your backends can remain IPv4-only while clients can connect using IPv6. GCP handles the translation transparently.

## Terraform: IPv6 Frontend with IPv4 Backends

```hcl
# Backend with IPv4 instances (no IPv6 required on backends)

resource "google_compute_backend_service" "main" {
  name                  = "main-backend"
  protocol              = "HTTP"
  load_balancing_scheme = "EXTERNAL_MANAGED"
  port_name             = "http"

  backend {
    group = google_compute_instance_group.ipv4_instances.id
  }

  health_checks = [google_compute_health_check.main.id]

  # No IPv6 configuration required here - backends are IPv4
  # The instance group must define the matching named port "http"
}

resource "google_compute_health_check" "main" {
  name = "http-health-check"
  http_health_check {
    port         = 80
    request_path = "/health"
  }
}

resource "google_compute_url_map" "main" {
  name            = "main-url-map"
  default_service = google_compute_backend_service.main.id
}

resource "google_compute_target_https_proxy" "main" {
  name             = "main-https-proxy"
  url_map          = google_compute_url_map.main.id
  ssl_certificates = [google_compute_managed_ssl_certificate.main.id]
}

# IPv4 frontend address
resource "google_compute_global_address" "ipv4" {
  name       = "lb-ipv4"
  ip_version = "IPV4"
}

# IPv6 frontend address (for IPv6 clients)
resource "google_compute_global_address" "ipv6" {
  name       = "lb-ipv6"
  ip_version = "IPV6"
}

# IPv4 forwarding rule
resource "google_compute_global_forwarding_rule" "https_ipv4" {
  name                  = "https-fwd-ipv4"
  target                = google_compute_target_https_proxy.main.id
  port_range            = "443"
  ip_address            = google_compute_global_address.ipv4.id
  load_balancing_scheme = "EXTERNAL_MANAGED"
}

# IPv6 forwarding rule → same HTTPS proxy → same IPv4 backends
resource "google_compute_global_forwarding_rule" "https_ipv6" {
  name                  = "https-fwd-ipv6"
  target                = google_compute_target_https_proxy.main.id
  port_range            = "443"
  ip_address            = google_compute_global_address.ipv6.id
  load_balancing_scheme = "EXTERNAL_MANAGED"
}
```

## Reading the Original IPv6 Client IP in Backends

Since the backend connection is proxied over IPv4, read the original client IPv6 from HTTP headers:

```bash
# Configure your application to read X-Forwarded-For
# Google Cloud appends: <client-ip>, <load-balancer-ip>
# If an upstream proxy already sent X-Forwarded-For, the header becomes:
# X-Forwarded-For: <existing-value>, <client-ip>, <load-balancer-ip>
#
# Example when the client connects via IPv6:
# X-Forwarded-For: 2001:db8:abcd:1::1234, 2607:f8b0:4005:801::200e
#
# The client IP appended by Google Cloud is the second-to-last element.
# The last element is the load balancer's forwarding-rule IP.
```

## Verifying IPv6 Translation

```bash
# Get your load balancer's IPv6 address
# Google Cloud allocates a /64 to the IPv6 forwarding rule; gcloud prints one address from that range.
gcloud compute addresses describe lb-ipv6 --global \
  --format="value(address)"

# Test IPv6 while keeping the HTTPS hostname for SNI and certificate validation
curl -6 --resolve example.com:443:[GCP_IPV6_ADDRESS] https://example.com/

# In application or reverse-proxy logs that record X-Forwarded-For,
# verify it contains the client IPv6 followed by the load balancer IPv6 address
```

## GCP Header Reference

| Header | Contains |
|---|---|
| `X-Forwarded-For` | Existing forwarded IPs (if any), then the client IP, then the load balancer forwarding-rule IP |
| `X-Forwarded-Proto` | Original protocol (http/https) |
| `X-Goog-Iap-Jwt-Assertion` | IAP token if using Cloud IAP |

## Benefits of GCP's Translation Approach

1. **Zero backend changes**: IPv4-only applications work without modification
2. **Gradual migration**: Add IPv6 frontend without touching backends
3. **Same SSL certificate**: One cert works for both IPv4 and IPv6 endpoints
4. **Global anycast**: IPv6 clients reach the nearest GCP point of presence

## Limitations

- Backends receive proxied connections, not direct end-to-end IPv6 client sessions
- Applications must use `X-Forwarded-For` if they need the original client IPv6
- True end-to-end IPv6 requires IPv6-capable backend instances

GCP's IPv6-to-IPv4 translation at the load balancer is the recommended starting point for adding IPv6 support to existing GCP workloads - it enables IPv6 connectivity immediately without any infrastructure changes.
