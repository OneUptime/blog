# How to Configure GCP Cloud Load Balancing with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, IPv6, Load Balancing, Google Cloud, Dual-Stack, HTTP Load Balancer

Description: Configure Google Cloud HTTP(S), TCP, and Network load balancers to accept IPv6 client connections and route traffic to IPv4 backends using GCP's built-in IPv6 termination.

## Introduction

Google Cloud Load Balancing supports IPv6 on several frontends, but the behavior differs by load balancer type. The classic Application Load Balancer accepts IPv6 connections from clients and proxies them to IPv4 backends - a process called IPv6 termination. Backend service-based regional external passthrough Network Load Balancers also support IPv6 frontends, but they require dual-stack or IPv6 backends because passthrough load balancers do not terminate IPv6. If you use the newer global external Application Load Balancer (`EXTERNAL_MANAGED`), IPv6 traffic requires dual-stack backends.

## Classic Application Load Balancer with IPv6

This example uses the classic Application Load Balancer (`EXTERNAL`), which supports IPv6 clients with IPv4-only backends.

```bash
PROJECT="my-project"

# Step 1: Reserve a global IPv6 address

gcloud compute addresses create lb-ipv6-vip \
    --project="$PROJECT" \
    --network-tier=PREMIUM \
    --ip-version=IPV6 \
    --global

# Get the assigned IPv6 address
gcloud compute addresses describe lb-ipv6-vip \
    --project="$PROJECT" \
    --global \
    --format="get(address)"

# Step 2: Create a global health check
gcloud compute health-checks create http http-health-check \
    --project="$PROJECT" \
    --port=80

# Step 3: Create backend service
gcloud compute backend-services create web-backend \
    --project="$PROJECT" \
    --protocol=HTTP \
    --port-name=http \
    --health-checks=http-health-check \
    --load-balancing-scheme=EXTERNAL \
    --global

# Step 4: Add an instance group backend
# Assumes web-group exists and exposes a named port called http
gcloud compute backend-services add-backend web-backend \
    --project="$PROJECT" \
    --instance-group=web-group \
    --instance-group-zone=us-east1-b \
    --global

# Step 5: Create URL map
gcloud compute url-maps create web-url-map \
    --project="$PROJECT" \
    --default-service=web-backend

# Step 6: Create HTTPS proxy with SSL certificate
gcloud compute target-https-proxies create web-https-proxy \
    --project="$PROJECT" \
    --url-map=web-url-map \
    --ssl-certificates=my-ssl-cert

# Step 7: Create forwarding rule for IPv6
gcloud compute forwarding-rules create web-ipv6-rule \
    --project="$PROJECT" \
    --load-balancing-scheme=EXTERNAL \
    --network-tier=PREMIUM \
    --address=lb-ipv6-vip \
    --target-https-proxy=web-https-proxy \
    --ports=443 \
    --global
```

## Terraform Classic Application Load Balancer with IPv6

```hcl
# classic_lb_ipv6.tf

# Reserve global IPv6 address
resource "google_compute_global_address" "ipv6" {
  name         = "lb-ipv6-vip"
  project      = var.project_id
  ip_version   = "IPV6"
  network_tier = "PREMIUM"
  address_type = "EXTERNAL"
}

# Instance group as backend
# Replace the instance self_link with an existing VM in the same zone.
resource "google_compute_instance_group" "web" {
  name    = "web-group"
  zone    = "us-east1-b"
  project = var.project_id

  instances = ["projects/${var.project_id}/zones/us-east1-b/instances/web-1"]

  named_port {
    name = "http"
    port = 80
  }
}

# Global health check
resource "google_compute_health_check" "http" {
  name    = "http-health-check"
  project = var.project_id

  http_health_check {
    port = 80
  }
}

# Backend service
resource "google_compute_backend_service" "web" {
  name                  = "web-backend"
  project               = var.project_id
  protocol              = "HTTP"
  port_name             = "http"
  load_balancing_scheme = "EXTERNAL"
  health_checks         = [google_compute_health_check.http.id]

  backend {
    group = google_compute_instance_group.web.id
  }
}

# URL map
resource "google_compute_url_map" "web" {
  name            = "web-url-map"
  project         = var.project_id
  default_service = google_compute_backend_service.web.id
}

# HTTPS proxy
# Replace the SSL certificate self_link with an existing global SSL certificate.
resource "google_compute_target_https_proxy" "web" {
  name             = "web-https-proxy"
  project          = var.project_id
  url_map          = google_compute_url_map.web.id
  ssl_certificates = ["projects/${var.project_id}/global/sslCertificates/my-ssl-cert"]
}

# IPv6 forwarding rule
resource "google_compute_global_forwarding_rule" "ipv6" {
  name                  = "web-ipv6-rule"
  project               = var.project_id
  target                = google_compute_target_https_proxy.web.id
  ip_protocol           = "TCP"
  port_range            = "443"
  ip_address            = google_compute_global_address.ipv6.id
  ip_version            = "IPV6"
  load_balancing_scheme = "EXTERNAL"
  network_tier          = "PREMIUM"
}

# IPv4 forwarding rule (keep both)
resource "google_compute_global_address" "ipv4" {
  name         = "lb-ipv4-vip"
  project      = var.project_id
  ip_version   = "IPV4"
  network_tier = "PREMIUM"
  address_type = "EXTERNAL"
}

resource "google_compute_global_forwarding_rule" "ipv4" {
  name                  = "web-ipv4-rule"
  project               = var.project_id
  target                = google_compute_target_https_proxy.web.id
  ip_protocol           = "TCP"
  port_range            = "443"
  ip_address            = google_compute_global_address.ipv4.id
  load_balancing_scheme = "EXTERNAL"
  network_tier          = "PREMIUM"
}
```

## Network Load Balancer with IPv6

Regional external passthrough Network Load Balancers with IPv6 must use backend services. Target pool-based Network Load Balancers remain IPv4-only.

```bash
# Regional external passthrough NLB with IPv6 frontend
# Assumes lb-subnet is dual-stack with an external IPv6 range
# and web-group contains dual-stack backends in us-east1.

# Step 1: Reserve regional IPv6 address
gcloud compute addresses create nlb-ipv6 \
    --project="$PROJECT" \
    --region=us-east1 \
    --subnet=lb-subnet \
    --ip-version=IPV6 \
    --endpoint-type=NETLB

# Step 2: Create a TCP health check
gcloud compute health-checks create tcp tcp-health-check \
    --project="$PROJECT" \
    --region=us-east1 \
    --port=80

# Step 3: Create a regional backend service
gcloud compute backend-services create network-lb-backend-service \
    --project="$PROJECT" \
    --protocol=TCP \
    --health-checks=tcp-health-check \
    --health-checks-region=us-east1 \
    --region=us-east1

# Step 4: Add a dual-stack instance group backend
gcloud compute backend-services add-backend network-lb-backend-service \
    --project="$PROJECT" \
    --instance-group=web-group \
    --instance-group-zone=us-east1-b \
    --region=us-east1

# Step 5: Create forwarding rule for the IPv6 frontend
gcloud compute forwarding-rules create nlb-ipv6-rule \
    --project="$PROJECT" \
    --load-balancing-scheme=EXTERNAL \
    --region=us-east1 \
    --network-tier=PREMIUM \
    --ip-version=IPV6 \
    --subnet=lb-subnet \
    --address=nlb-ipv6 \
    --ports=80 \
    --backend-service=network-lb-backend-service

# Check the IPv6 forwarding rule
gcloud compute forwarding-rules describe nlb-ipv6-rule \
    --project="$PROJECT" \
    --region=us-east1
```

## Verify Load Balancer IPv6 Connectivity

```bash
# Get IPv6 VIP address
IPV6_VIP=$(gcloud compute addresses describe lb-ipv6-vip \
    --project="$PROJECT" \
    --global \
    --format="get(address)")

echo "LB IPv6 VIP: $IPV6_VIP"

# Test HTTPS over IPv6 with the correct Host header and SNI
curl -6 -v --resolve "example.com:443:[$IPV6_VIP]" \
    https://example.com/

# Check AAAA DNS record points to LB IPv6
dig AAAA example.com

# Test connectivity from IPv6-only client
curl -6 https://example.com/
```

## Conclusion

Classic Application Load Balancers accept IPv6 connections natively by reserving a global IPv6 address and creating an IPv6 forwarding rule that points to your HTTPS proxy. In this classic configuration, Google Cloud terminates IPv6 at the frontend and proxies to IPv4 backends. For regional external passthrough Network Load Balancers, use a backend service-based configuration with dual-stack backends, because target pool-based Network Load Balancers remain IPv4-only. Add AAAA DNS records pointing to the IPv6 VIP for full IPv6 client accessibility.
