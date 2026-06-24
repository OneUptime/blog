# How to Configure Cloud Run with Dual-Stack IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, IPv6, Cloud Run, Serverless, Dual-Stack, Google Cloud

Description: Configure Google Cloud Run services to accept IPv6 client connections using Global Load Balancer frontend, and enable VPC connectivity for Cloud Run with IPv6 support.

## Introduction

Cloud Run services do not directly expose IPv6 addresses - they receive traffic through Google's global infrastructure. To serve IPv6 clients, you place a global external Application Load Balancer in front of Cloud Run using a Serverless Network Endpoint Group (NEG). The load balancer holds the IPv6 frontend and forwards requests to Cloud Run. For outbound IPv6 connectivity from Cloud Run, use Direct VPC egress with a dual-stack subnet.

## Create Cloud Run Service with IPv6 Frontend

```bash
PROJECT="my-project"
REGION="us-east1"

# Step 1: Deploy Cloud Run service

gcloud run deploy web-service \
    --project="$PROJECT" \
    --region="$REGION" \
    --image=us-docker.pkg.dev/cloudrun/container/hello \
    --platform=managed \
    --allow-unauthenticated \
    --port=8080

# Step 2: Create Serverless NEG for Cloud Run
gcloud compute network-endpoint-groups create cloud-run-neg \
    --project="$PROJECT" \
    --region="$REGION" \
    --network-endpoint-type=SERVERLESS \
    --cloud-run-service=web-service

# Step 3: Create backend service using the NEG
gcloud compute backend-services create cloud-run-backend \
    --project="$PROJECT" \
    --load-balancing-scheme=EXTERNAL_MANAGED \
    --protocol=HTTP \
    --global

gcloud compute backend-services add-backend cloud-run-backend \
    --project="$PROJECT" \
    --global \
    --network-endpoint-group=cloud-run-neg \
    --network-endpoint-group-region="$REGION"

# Step 4: Create URL map
gcloud compute url-maps create cloud-run-map \
    --project="$PROJECT" \
    --default-service=cloud-run-backend

# Step 5: Create HTTPS target proxy
gcloud compute target-https-proxies create cloud-run-proxy \
    --project="$PROJECT" \
    --url-map=cloud-run-map \
    --ssl-certificates=my-ssl-cert

# Step 6: Reserve IPv6 global address
gcloud compute addresses create cloud-run-ipv6 \
    --project="$PROJECT" \
    --ip-version=IPV6 \
    --network-tier=PREMIUM \
    --global

# Step 7: Create IPv6 forwarding rule
IPV6_ADDR=$(gcloud compute addresses describe cloud-run-ipv6 \
    --global \
    --format="get(address)" \
    --project="$PROJECT")

gcloud compute forwarding-rules create cloud-run-ipv6-rule \
    --project="$PROJECT" \
    --address=cloud-run-ipv6 \
    --load-balancing-scheme=EXTERNAL_MANAGED \
    --network-tier=PREMIUM \
    --target-https-proxy=cloud-run-proxy \
    --ports=443 \
    --global

echo "Cloud Run IPv6 address: $IPV6_ADDR"
```

## Terraform Cloud Run with IPv6 Load Balancer

```hcl
# cloud_run_ipv6.tf

variable "project_id" {}
variable "region" { default = "us-east1" }
variable "ssl_certificate_id" {}

# Cloud Run service
resource "google_cloud_run_v2_service" "web" {
  name     = "web-service"
  location = var.region
  project  = var.project_id

  ingress = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = "us-docker.pkg.dev/cloudrun/container/hello"
      ports {
        container_port = 8080
      }
    }
  }
}

# Allow public access
resource "google_cloud_run_v2_service_iam_member" "public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.web.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Serverless NEG
resource "google_compute_region_network_endpoint_group" "cloud_run" {
  name                  = "cloud-run-neg"
  network_endpoint_type = "SERVERLESS"
  region                = var.region
  project               = var.project_id

  cloud_run {
    service = google_cloud_run_v2_service.web.name
  }
}

# Backend service
resource "google_compute_backend_service" "cloud_run" {
  name                  = "cloud-run-backend"
  project               = var.project_id
  protocol              = "HTTP"
  load_balancing_scheme = "EXTERNAL_MANAGED"

  backend {
    group = google_compute_region_network_endpoint_group.cloud_run.id
  }
}

# URL map
resource "google_compute_url_map" "cloud_run" {
  name            = "cloud-run-map"
  project         = var.project_id
  default_service = google_compute_backend_service.cloud_run.id
}

# HTTPS proxy using an existing SSL certificate resource
resource "google_compute_target_https_proxy" "cloud_run" {
  name             = "cloud-run-proxy"
  project          = var.project_id
  url_map          = google_compute_url_map.cloud_run.id
  ssl_certificates = [var.ssl_certificate_id]
}

# Global IPv6 address
resource "google_compute_global_address" "ipv6" {
  name         = "cloud-run-ipv6"
  project      = var.project_id
  ip_version   = "IPV6"
  network_tier = "PREMIUM"
  address_type = "EXTERNAL"
}

# IPv6 forwarding rule
resource "google_compute_global_forwarding_rule" "ipv6_https" {
  name                  = "cloud-run-ipv6-https"
  project               = var.project_id
  target                = google_compute_target_https_proxy.cloud_run.id
  port_range            = "443"
  ip_address            = google_compute_global_address.ipv6.id
  ip_version            = "IPV6"
  load_balancing_scheme = "EXTERNAL_MANAGED"
}
```

## Cloud Run VPC Egress with IPv6

```bash
# Serverless VPC Access connectors do not support IPv6 traffic.
# Use Direct VPC egress on a dual-stack subnet instead.
gcloud run services update web-service \
    --project="$PROJECT" \
    --region="$REGION" \
    --network=vpc-main \
    --subnet=subnet-run \
    --vpc-egress=all-traffic

# If the subnet uses external IPv6, grant the Cloud Run service agent
# roles/compute.publicIpAdmin before deploying the revision.
# Cloud Run with Direct VPC egress on a dual-stack subnet can send IPv6 traffic.
```

## Verify IPv6 Connectivity

```bash
# Test IPv6 access to Cloud Run via LB
IPV6_VIP=$(gcloud compute addresses describe cloud-run-ipv6 \
    --global --format="get(address)" --project="$PROJECT")

curl -6 "https://[$IPV6_VIP]/" \
    -H "Host: api.example.com" \
    -k

# Check DNS resolves to IPv6
dig AAAA api.example.com

# Confirm IPv6 is used
curl -v --ipv6 https://api.example.com/ 2>&1 | grep "Connected to"
```

## Conclusion

Cloud Run services receive IPv6 client connections through a global external Application Load Balancer with a Serverless NEG backend. Reserve a global IPv6 address, create an IPv6 forwarding rule pointing to your HTTPS proxy, and configure the URL map to route to a Cloud Run NEG backend. For outbound IPv6, enable Direct VPC egress on a dual-stack subnet. Add AAAA DNS records pointing to the IPv6 VIP so IPv6 clients resolve your service correctly. If you want dual-stack DNS for both IPv4 and IPv6 clients, add a matching A record for the load balancer's IPv4 frontend.
