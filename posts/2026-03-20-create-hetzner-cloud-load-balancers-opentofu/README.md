# How to Create Hetzner Cloud Load Balancers with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Hetzner Cloud, Load Balancer, Infrastructure as Code, Networking

Description: Learn how to create Hetzner Cloud Load Balancers with OpenTofu, including services, health checks, and target server attachments.

Hetzner Cloud Load Balancers distribute traffic across servers with built-in health checks and TLS termination. OpenTofu lets you define the load balancer configuration, services, and targets as code.

## Creating a Basic Load Balancer

```hcl
resource "hcloud_load_balancer" "web" {
  name               = "web-lb"
  load_balancer_type = "lb11"  # lb11, lb21, lb31
  location           = "nbg1"

  labels = {
    environment = "production"
    managed_by  = "opentofu"
  }
}
```

## Adding a Service

```hcl
resource "hcloud_load_balancer_service" "http" {
  load_balancer_id = hcloud_load_balancer.web.id
  protocol         = "http"  # http, https, tcp
  listen_port      = 80
  destination_port = 8080

  health_check {
    protocol = "http"
    port     = 8080
    interval = 10  # seconds between checks
    timeout  = 5   # seconds before timeout
    retries  = 3

    http {
      path         = "/health"
      status_codes = ["200"]
    }
  }
}
```

## Adding HTTPS Service with TLS Termination

```hcl
resource "hcloud_load_balancer_service" "https" {
  load_balancer_id = hcloud_load_balancer.web.id
  protocol         = "https"
  listen_port      = 443
  destination_port = 8080

  # Upload a managed TLS certificate
  http {
    certificates = [hcloud_managed_certificate.web.id]
    redirect_http = true  # Redirect HTTP to HTTPS
  }

  health_check {
    protocol = "http"
    port     = 8080
    interval = 10
    timeout  = 5
    retries  = 3

    http {
      path         = "/health"
      status_codes = ["200"]
    }
  }
}

resource "hcloud_managed_certificate" "web" {
  name         = "web-cert"
  domain_names = ["example.com", "www.example.com"]
}
```

## Attaching Servers as Targets

```hcl
# Attach individual servers to the load balancer

resource "hcloud_load_balancer_target" "web" {
  count            = length(hcloud_server.web)
  load_balancer_id = hcloud_load_balancer.web.id
  type             = "server"
  server_id        = hcloud_server.web[count.index].id
  use_private_ip   = true  # Use private IP for backend traffic
}
```

## Using Label Selectors for Dynamic Targets

```hcl
# Target all servers with label role=web automatically
resource "hcloud_load_balancer_target" "web_label" {
  load_balancer_id = hcloud_load_balancer.web.id
  type             = "label_selector"
  label_selector   = "role=web"
}
```

## Attaching to a Private Network

```hcl
resource "hcloud_load_balancer_network" "web" {
  load_balancer_id = hcloud_load_balancer.web.id
  network_id       = hcloud_network.main.id
  ip               = "10.0.1.100"
}
```

## Conclusion

Hetzner Cloud Load Balancers are cost-effective and easy to configure with OpenTofu. Define services with health checks, attach servers as targets (individually or via label selectors for dynamic scaling), and enable TLS termination with managed certificates. Place the load balancer in your private network to route backend traffic over private IPs.
