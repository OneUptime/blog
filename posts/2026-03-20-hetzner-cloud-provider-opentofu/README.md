# How to Configure the Hetzner Cloud Provider in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Hetzner, Infrastructure as Code, IaC, Cloud Provider, European Cloud

Description: Learn how to configure the Hetzner Cloud provider in OpenTofu to manage servers, networks, and load balancers.

## Introduction

This guide covers How to Configure the Hetzner Cloud Provider in OpenTofu using practical examples for servers, private networks, and load balancers.

## Prerequisites

- A current OpenTofu release supported by the provider
- A Hetzner Cloud API token
- Basic understanding of OpenTofu concepts

## Step 1: Install and Configure the Provider

```hcl
terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.60.0"
    }
  }
}
```

## Step 2: Set Up Authentication

```bash
# Preferred: use the provider environment variable
export HCLOUD_TOKEN="your-hetzner-cloud-api-token"
```

```hcl
provider "hcloud" {
  # Uses HCLOUD_TOKEN from the environment
}
```

## Step 3: Create Basic Resources

```hcl
resource "hcloud_network" "main" {
  name     = "production-network"
  ip_range = "10.0.0.0/16"
}

resource "hcloud_network_subnet" "main" {
  network_id   = hcloud_network.main.id
  type         = "cloud"
  network_zone = "eu-central"
  ip_range     = "10.0.1.0/24"
}

resource "hcloud_server" "main" {
  name        = "web-1"
  image       = "ubuntu-24.04"
  server_type = "cx23"
  location    = "nbg1"

  labels = {
    environment = "production"
    managed_by  = "opentofu"
  }
}

resource "hcloud_server_network" "main" {
  server_id = hcloud_server.main.id
  subnet_id = hcloud_network_subnet.main.id
  ip        = "10.0.1.10"
}
```

## Step 4: Configure Advanced Settings

```hcl
resource "hcloud_load_balancer" "main" {
  name               = "web-lb"
  load_balancer_type = "lb11"
  location           = "nbg1"
}

resource "hcloud_load_balancer_network" "main" {
  load_balancer_id = hcloud_load_balancer.main.id
  subnet_id        = hcloud_network_subnet.main.id
  ip               = "10.0.1.11"
}

resource "hcloud_load_balancer_target" "main" {
  type             = "server"
  load_balancer_id = hcloud_load_balancer.main.id
  server_id        = hcloud_server.main.id
  use_private_ip   = true

  # The private network attachments must exist before using private targets.
  depends_on = [
    hcloud_server_network.main,
    hcloud_load_balancer_network.main,
  ]
}

resource "hcloud_load_balancer_service" "main" {
  load_balancer_id = hcloud_load_balancer.main.id
  protocol         = "http"
  listen_port      = 80
  destination_port = 80

  health_check {
    protocol = "http"
    port     = 80
    interval = 10
    timeout  = 5
    retries  = 3

    http {
      path         = "/"
      status_codes = ["200"]
    }
  }
}
```

## Step 5: Define Outputs

```hcl
output "server_id" {
  description = "The ID of the created server"
  value       = hcloud_server.main.id
}

output "network_id" {
  description = "The ID of the private network"
  value       = hcloud_network.main.id
}

output "load_balancer_ipv4" {
  description = "The public IPv4 address of the load balancer"
  value       = hcloud_load_balancer.main.ipv4
}
```

## Step 6: Deploy

```bash
# Initialize OpenTofu and download provider
tofu init

# Validate configuration syntax
tofu validate

# Preview planned changes
tofu plan

# Apply configuration
tofu apply
```

## Common Issues and Solutions

### Authentication Errors
Verify that `HCLOUD_TOKEN` is set correctly or that the token passed in the provider block is valid.

### Rate Limiting
If you run into API rate limiting, increase the provider `poll_interval` from its default `500ms`.

### Provider Version Conflicts
Pin the `hetznercloud/hcloud` provider in `required_providers` and commit `.terraform.lock.hcl` after `tofu init`.

## Conclusion

You have successfully configured the Hetzner Cloud provider in OpenTofu. With the `hcloud` provider, you can manage servers, private networks, and load balancers as code while keeping credentials out of your configuration by using environment variables or other secure secret stores.
