# How to Create GCP Internal Load Balancers with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Internal Load Balancer, Networking, OpenTofu, Infrastructure, Microservice

Description: Learn how to create GCP Internal Load Balancers with OpenTofu for distributing traffic between backend services within a VPC without internet exposure.

## Overview

GCP Internal Load Balancers distribute traffic to backend instances using private IP addresses within your VPC. They're ideal for microservice architectures where services communicate internally. OpenTofu manages the core load balancer resources, but regional internal Application Load Balancers also require a proxy-only subnet and firewall rules that allow health checks and proxy traffic.

## Step 1: Create Backend Service and Health Check

```hcl
# main.tf - Regional internal HTTP load balancer

resource "google_compute_region_health_check" "internal_http_hc" {
  name               = "internal-app-health-check"
  region             = "us-central1"
  check_interval_sec = 10
  timeout_sec        = 5

  http_health_check {
    port_specification = "USE_SERVING_PORT"
    request_path       = "/health"
  }
}

# Backend service using the instance group
resource "google_compute_region_backend_service" "internal_backend" {
  name                  = "internal-app-backend"
  region                = "us-central1"
  protocol              = "HTTP"
  port_name             = "app-port"  # app_mig must expose named_port "app-port" on port 8080
  load_balancing_scheme = "INTERNAL_MANAGED"  # Internal Application LB
  timeout_sec           = 30

  backend {
    group           = google_compute_region_instance_group_manager.app_mig.instance_group
    balancing_mode  = "UTILIZATION"
    capacity_scaler = 1.0
  }

  health_checks = [google_compute_region_health_check.internal_http_hc.id]
}
```

## Step 2: URL Map and Target Proxy

```hcl
# URL map for routing rules
resource "google_compute_region_url_map" "internal_url_map" {
  name            = "internal-url-map"
  region          = "us-central1"
  default_service = google_compute_region_backend_service.internal_backend.id
}

# Target HTTP proxy
resource "google_compute_region_target_http_proxy" "internal_http_proxy" {
  name    = "internal-http-proxy"
  region  = "us-central1"
  url_map = google_compute_region_url_map.internal_url_map.id
}
```

## Step 3: Forwarding Rule

```hcl
# Proxy-only subnet required by regional INTERNAL_MANAGED load balancers
resource "google_compute_subnetwork" "proxy_only_subnet" {
  name          = "internal-lb-proxy-only"
  ip_cidr_range = "10.10.0.0/24"
  region        = "us-central1"
  purpose       = "REGIONAL_MANAGED_PROXY"
  role          = "ACTIVE"
  network       = google_compute_network.vpc.id
}

# Reserve a static internal IP for the load balancer
resource "google_compute_address" "internal_lb_ip" {
  name         = "internal-lb-ip"
  subnetwork   = google_compute_subnetwork.app_subnet.id
  address_type = "INTERNAL"
  purpose      = "SHARED_LOADBALANCER_VIP"
  region       = "us-central1"
}

# Internal forwarding rule (the VIP clients connect to)
resource "google_compute_forwarding_rule" "internal_forwarding_rule" {
  name                  = "internal-lb-forwarding-rule"
  region                = "us-central1"
  depends_on            = [google_compute_subnetwork.proxy_only_subnet]
  load_balancing_scheme = "INTERNAL_MANAGED"
  ip_address            = google_compute_address.internal_lb_ip.id
  ip_protocol           = "TCP"
  port_range            = "80"
  target                = google_compute_region_target_http_proxy.internal_http_proxy.id
  network               = google_compute_network.vpc.self_link
  subnetwork            = google_compute_subnetwork.app_subnet.self_link

  # Keep access regional unless clients in other VPC regions need to connect
  allow_global_access = false
}
```

## Step 4: Internal TCP/UDP Load Balancer (Pass-Through)

```hcl
# Regional backend service for the pass-through ILB
resource "google_compute_region_health_check" "db_hc" {
  name   = "internal-db-health-check"
  region = "us-central1"

  tcp_health_check {
    port = 5432
  }
}

resource "google_compute_region_backend_service" "db_backend" {
  name                  = "internal-db-backend"
  region                = "us-central1"
  protocol              = "TCP"
  load_balancing_scheme = "INTERNAL"
  health_checks         = [google_compute_region_health_check.db_hc.id]

  backend {
    group          = google_compute_region_instance_group_manager.db_mig.instance_group
    balancing_mode = "CONNECTION"
  }
}

# Pass-through internal LB for TCP/UDP (no TLS termination)
resource "google_compute_forwarding_rule" "tcp_ilb" {
  name                  = "tcp-internal-lb"
  region                = "us-central1"
  load_balancing_scheme = "INTERNAL"
  ip_address            = google_compute_address.internal_lb_ip.id
  ip_protocol           = "TCP"
  ports                 = ["5432"]  # PostgreSQL port
  backend_service       = google_compute_region_backend_service.db_backend.id
  network               = google_compute_network.vpc.self_link
  subnetwork            = google_compute_subnetwork.app_subnet.self_link
}
```

## Step 5: Outputs

```hcl
output "internal_lb_ip" {
  value       = google_compute_address.internal_lb_ip.address
  description = "Internal IP address for the load balancer"
}
```

## Summary

GCP Internal Load Balancers with OpenTofu enable private service-to-service communication within a VPC. Use INTERNAL_MANAGED for HTTP/HTTPS traffic with URL-based routing, and INTERNAL for pass-through TCP/UDP load balancing. Internal LBs are essential for microservice architectures that require service discovery via stable IP addresses. Regional INTERNAL_MANAGED deployments also require a REGIONAL_MANAGED_PROXY subnet, and both load balancer types need firewall rules that allow health checks and backend traffic.
