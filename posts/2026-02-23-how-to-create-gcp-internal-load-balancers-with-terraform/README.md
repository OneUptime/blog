# How to Create GCP Internal Load Balancers with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Load Balancing, Internal Load Balancer, Networking, Infrastructure as Code

Description: Step-by-step guide to creating GCP Internal TCP/UDP and HTTP(S) Load Balancers with Terraform, including health checks, backend services, and forwarding rules.

---

Google Cloud offers two types of internal load balancers: Internal TCP/UDP Load Balancing (Layer 4) and Internal HTTP(S) Load Balancing (Layer 7). Both distribute traffic within your VPC network, meaning they are not accessible from the internet. This makes them ideal for routing traffic between microservices, from application tiers to database tiers, or any scenario where traffic stays inside your network.

In this post, we will set up both types of internal load balancers using Terraform, along with the supporting infrastructure they need.

## Understanding the Architecture

An internal load balancer in GCP consists of several components:

- **Forwarding rule** - Defines the internal IP address and port that receives traffic
- **Backend service** - Points to one or more instance groups that handle the traffic
- **Health check** - Determines which backends are healthy and can receive traffic
- **Backends** - The actual instance groups running your application

For HTTP(S) internal load balancing, you also need a URL map and a target proxy.

## Provider and Network Setup

Let's start with the provider and a custom VPC:

```hcl
terraform {
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
  type = string
}

variable "region" {
  type    = string
  default = "us-central1"
}

# Custom VPC for internal load balancing
resource "google_compute_network" "internal" {
  name                    = "internal-lb-network"
  auto_create_subnetworks = false
}

# Subnet where the load balancer and backends will live
resource "google_compute_subnetwork" "backend" {
  name          = "backend-subnet"
  ip_cidr_range = "10.0.1.0/24"
  region        = var.region
  network       = google_compute_network.internal.id
}

# Proxy-only subnet required for internal HTTP(S) load balancing
# This subnet is used exclusively by Envoy proxies
resource "google_compute_subnetwork" "proxy_only" {
  name          = "proxy-only-subnet"
  ip_cidr_range = "10.0.2.0/24"
  region        = var.region
  network       = google_compute_network.internal.id
  purpose       = "REGIONAL_MANAGED_PROXY"
  role          = "ACTIVE"
}
```

The proxy-only subnet is a requirement for internal HTTP(S) load balancers. GCP uses it to run Envoy proxies that handle the Layer 7 routing. You do not deploy anything into this subnet yourself.

## Creating Backend Instances

We need some instances to serve as backends. Let's create an instance template and a managed instance group:

```hcl
# Instance template for backend servers
resource "google_compute_instance_template" "backend" {
  name_prefix  = "backend-"
  machine_type = "e2-small"
  region       = var.region

  lifecycle {
    create_before_destroy = true
  }

  disk {
    source_image = "debian-cloud/debian-12"
    auto_delete  = true
    boot         = true
  }

  network_interface {
    network    = google_compute_network.internal.id
    subnetwork = google_compute_subnetwork.backend.id
  }

  metadata = {
    startup-script = <<-EOF
      #!/bin/bash
      apt-get update && apt-get install -y nginx
      echo "Response from $(hostname)" > /var/www/html/index.html
      systemctl start nginx
    EOF
  }

  tags = ["backend-server"]
}

# Managed instance group for backends
resource "google_compute_region_instance_group_manager" "backend" {
  name               = "backend-mig"
  base_instance_name = "backend"
  region             = var.region
  target_size        = 3

  version {
    instance_template = google_compute_instance_template.backend.id
  }

  named_port {
    name = "http"
    port = 80
  }
}

# Allow health check probes from Google's health check ranges
resource "google_compute_firewall" "health_check" {
  name    = "allow-health-check"
  network = google_compute_network.internal.id

  allow {
    protocol = "tcp"
    ports    = ["80"]
  }

  # Google Cloud health check IP ranges
  source_ranges = ["130.211.0.0/22", "35.191.0.0/16"]
  target_tags   = ["backend-server"]
}

# Allow traffic from the proxy-only subnet (for HTTP(S) LB)
resource "google_compute_firewall" "proxy_traffic" {
  name    = "allow-proxy-traffic"
  network = google_compute_network.internal.id

  allow {
    protocol = "tcp"
    ports    = ["80"]
  }

  source_ranges = [google_compute_subnetwork.proxy_only.ip_cidr_range]
  target_tags   = ["backend-server"]
}
```

## Internal TCP/UDP Load Balancer (Layer 4)

The internal TCP/UDP load balancer is the simpler option. It works at the transport layer and passes through connections directly to backends:

```hcl
# Health check for the L4 load balancer
resource "google_compute_region_health_check" "tcp_health" {
  name   = "tcp-health-check"
  region = var.region

  tcp_health_check {
    port = 80
  }

  check_interval_sec  = 10
  timeout_sec         = 5
  healthy_threshold   = 2
  unhealthy_threshold = 3
}

# Backend service for L4 internal load balancer
resource "google_compute_region_backend_service" "tcp_backend" {
  name                  = "tcp-backend-service"
  region                = var.region
  protocol              = "TCP"
  load_balancing_scheme = "INTERNAL"
  health_checks         = [google_compute_region_health_check.tcp_health.id]

  backend {
    group          = google_compute_region_instance_group_manager.backend.instance_group
    balancing_mode = "CONNECTION"
  }

  # Session affinity ensures requests from the same client
  # go to the same backend
  session_affinity = "CLIENT_IP"

  # Connection draining timeout
  connection_draining_timeout_sec = 300
}

# Forwarding rule - this creates the actual internal IP
resource "google_compute_forwarding_rule" "tcp_ilb" {
  name                  = "tcp-internal-lb"
  region                = var.region
  load_balancing_scheme = "INTERNAL"
  backend_service       = google_compute_region_backend_service.tcp_backend.id
  ip_protocol           = "TCP"
  ports                 = ["80"]
  network               = google_compute_network.internal.id
  subnetwork            = google_compute_subnetwork.backend.id

  # Optionally specify a static internal IP
  # ip_address = "10.0.1.100"

  # Allow global access so clients in other regions can reach this LB
  allow_global_access = true
}
```

The `allow_global_access` flag is worth noting. By default, an internal load balancer is only reachable from the same region. Setting this to `true` lets clients from any region in the same VPC reach the load balancer.

## Internal HTTP(S) Load Balancer (Layer 7)

The internal HTTP(S) load balancer gives you URL-based routing, header-based routing, and other Layer 7 features:

```hcl
# Health check for the L7 load balancer
resource "google_compute_region_health_check" "http_health" {
  name   = "http-health-check"
  region = var.region

  http_health_check {
    port         = 80
    request_path = "/health"
  }

  check_interval_sec  = 10
  timeout_sec         = 5
  healthy_threshold   = 2
  unhealthy_threshold = 3
}

# Backend service for L7 internal load balancer
resource "google_compute_region_backend_service" "http_backend" {
  name                  = "http-backend-service"
  region                = var.region
  protocol              = "HTTP"
  load_balancing_scheme = "INTERNAL_MANAGED"
  health_checks         = [google_compute_region_health_check.http_health.id]

  backend {
    group           = google_compute_region_instance_group_manager.backend.instance_group
    balancing_mode  = "UTILIZATION"
    capacity_scaler = 1.0
  }

  # Enable connection draining
  connection_draining_timeout_sec = 300

  # Logging for debugging
  log_config {
    enable      = true
    sample_rate = 1.0
  }
}

# URL map defines routing rules
resource "google_compute_region_url_map" "http_lb" {
  name            = "http-internal-lb-url-map"
  region          = var.region
  default_service = google_compute_region_backend_service.http_backend.id

  # Add path-based routing rules
  host_rule {
    hosts        = ["*"]
    path_matcher = "api-paths"
  }

  path_matcher {
    name            = "api-paths"
    default_service = google_compute_region_backend_service.http_backend.id

    path_rule {
      paths   = ["/api/*"]
      service = google_compute_region_backend_service.http_backend.id
    }
  }
}

# Target HTTP proxy
resource "google_compute_region_target_http_proxy" "http_lb" {
  name    = "http-internal-lb-proxy"
  region  = var.region
  url_map = google_compute_region_url_map.http_lb.id
}

# Forwarding rule for the L7 internal load balancer
resource "google_compute_forwarding_rule" "http_ilb" {
  name                  = "http-internal-lb"
  region                = var.region
  load_balancing_scheme = "INTERNAL_MANAGED"
  target                = google_compute_region_target_http_proxy.http_lb.id
  ip_protocol           = "TCP"
  port_range            = "80"
  network               = google_compute_network.internal.id
  subnetwork            = google_compute_subnetwork.backend.id
  allow_global_access   = true

  depends_on = [google_compute_subnetwork.proxy_only]
}
```

Notice the `depends_on` for the proxy-only subnet. The internal HTTP(S) load balancer requires this subnet to exist before the forwarding rule can be created. Without the explicit dependency, Terraform might try to create the forwarding rule before the subnet is ready.

## Adding HTTPS with TLS

For internal HTTPS, you need a certificate and use a target HTTPS proxy instead:

```hcl
# Self-signed certificate for internal use
resource "google_compute_region_ssl_certificate" "internal" {
  name        = "internal-cert"
  region      = var.region
  private_key = file("${path.module}/certs/private.key")
  certificate = file("${path.module}/certs/certificate.crt")
}

# Target HTTPS proxy
resource "google_compute_region_target_https_proxy" "https_lb" {
  name             = "https-internal-lb-proxy"
  region           = var.region
  url_map          = google_compute_region_url_map.http_lb.id
  ssl_certificates = [google_compute_region_ssl_certificate.internal.id]
}

# HTTPS forwarding rule
resource "google_compute_forwarding_rule" "https_ilb" {
  name                  = "https-internal-lb"
  region                = var.region
  load_balancing_scheme = "INTERNAL_MANAGED"
  target                = google_compute_region_target_https_proxy.https_lb.id
  ip_protocol           = "TCP"
  port_range            = "443"
  network               = google_compute_network.internal.id
  subnetwork            = google_compute_subnetwork.backend.id
  allow_global_access   = true

  depends_on = [google_compute_subnetwork.proxy_only]
}
```

## Outputs

```hcl
# Output the internal IP addresses of the load balancers
output "tcp_ilb_ip" {
  description = "Internal IP of the TCP load balancer"
  value       = google_compute_forwarding_rule.tcp_ilb.ip_address
}

output "http_ilb_ip" {
  description = "Internal IP of the HTTP load balancer"
  value       = google_compute_forwarding_rule.http_ilb.ip_address
}
```

## Tips for Production

**Always create firewall rules for health checks.** The Google Cloud health check probes come from specific IP ranges (130.211.0.0/22 and 35.191.0.0/16). Without firewall rules allowing this traffic, your backends will always appear unhealthy.

**Use the proxy-only subnet wisely.** You only need one per region per network. All internal HTTP(S) load balancers in the same region share it.

**Enable logging during initial setup.** Set `sample_rate` to 1.0 while debugging, then lower it to 0.1 or less in production to reduce costs.

**Consider connection draining.** The `connection_draining_timeout_sec` gives existing connections time to complete before a backend is removed. Set it based on your longest expected request duration.

## Conclusion

Internal load balancers are a critical part of any GCP architecture that involves service-to-service communication. The TCP/UDP variant is great for simple pass-through scenarios, while the HTTP(S) variant gives you advanced routing capabilities. With Terraform, the entire setup is reproducible and can be version-controlled alongside your application code.

For related networking topics, see our guide on [creating Cloud Router with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-gcp-cloud-router-with-terraform/view) and [configuring Cloud NAT](https://oneuptime.com/blog/post/2026-02-23-how-to-create-gcp-cloud-nat-with-terraform/view).
