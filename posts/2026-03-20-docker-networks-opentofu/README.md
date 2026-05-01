# How to Create Docker Networks with OpenTofu - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Docker, Infrastructure as Code, IaC, Docker Network, Networking

Description: Learn how to create Docker bridge, overlay, and macvlan networks with custom IPAM settings using OpenTofu.

## Introduction

This guide covers how to create Docker bridge, overlay, and macvlan networks with OpenTofu using production-ready configurations, best practices, and practical examples.

## Prerequisites

- OpenTofu v1.6+
- Access to a Docker daemon
- Docker Swarm initialized if you plan to create overlay networks
- A Linux host with a valid parent interface if you plan to create macvlan networks

## Step 1: Configure the Provider

```hcl
terraform {
  required_version = ">= 1.6.0"
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 4.0"
    }
  }
}

provider "docker" {
  host = var.docker_host
}
```

## Step 2: Define Variables

```hcl
variable "docker_host" {
  description = "Docker daemon address"
  type        = string
  default     = "unix:///var/run/docker.sock"
}

variable "bridge_network_name" {
  description = "Name of the bridge network"
  type        = string
  default     = "app-bridge"
}

variable "overlay_network_name" {
  description = "Name of the overlay network"
  type        = string
  default     = "app-overlay"
}

variable "macvlan_network_name" {
  description = "Name of the macvlan network"
  type        = string
  default     = "app-macvlan"
}

variable "macvlan_parent" {
  description = "Parent interface for the macvlan network, such as eth0 or eth0.10"
  type        = string
  default     = "eth0"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}
```

## Step 3: Create a Bridge Network

```hcl
resource "docker_network" "bridge" {
  name   = var.bridge_network_name
  driver = "bridge"

  options = {
    "com.docker.network.bridge.host_binding_ipv4" = "127.0.0.1"
  }

  ipam_config {
    subnet   = "172.28.0.0/16"
    gateway  = "172.28.0.1"
    ip_range = "172.28.5.0/24"
    aux_address = {
      reserved = "172.28.5.254"
    }
  }

  labels {
    label = "environment"
    value = var.environment
  }

  labels {
    label = "managed-by"
    value = "opentofu"
  }
}
```

## Step 4: Create an Overlay Network

```hcl
resource "docker_network" "overlay" {
  name       = var.overlay_network_name
  driver     = "overlay"
  attachable = true

  ipam_config {
    subnet   = "10.20.0.0/24"
    gateway  = "10.20.0.1"
    ip_range = "10.20.0.128/25"
  }

  labels {
    label = "environment"
    value = var.environment
  }

  labels {
    label = "managed-by"
    value = "opentofu"
  }
}
```

## Step 5: Create a Macvlan Network

```hcl
resource "docker_network" "macvlan" {
  name   = var.macvlan_network_name
  driver = "macvlan"

  options = {
    parent       = var.macvlan_parent
    macvlan_mode = "bridge"
  }

  ipam_config {
    subnet   = "192.168.50.0/24"
    gateway  = "192.168.50.1"
    ip_range = "192.168.50.128/25"
    aux_address = {
      host = "192.168.50.10"
    }
  }

  labels {
    label = "environment"
    value = var.environment
  }

  labels {
    label = "managed-by"
    value = "opentofu"
  }
}
```

## Step 6: Define Outputs

```hcl
output "bridge_network_id" {
  value = docker_network.bridge.id
}

output "overlay_network_id" {
  value = docker_network.overlay.id
}

output "macvlan_network_id" {
  value = docker_network.macvlan.id
}
```

## Step 7: Deploy

```bash
tofu init
tofu plan
tofu apply
```

## Best Practices

- Use user-defined bridge networks instead of the default `bridge` network
- Initialize Docker Swarm before creating overlay networks, and keep overlay subnets at `/24` when using the default VIP-based service discovery
- Use macvlan only when containers need Layer 2 presence on the physical network; it requires a Linux host and a valid parent interface
- Avoid overlapping Docker, host, and LAN subnets when defining IPAM settings
- Label networks consistently for easier inspection and lifecycle management

## Conclusion

You have successfully configured Docker bridge, overlay, and macvlan networks with OpenTofu. This approach lets you manage Docker networking as code, including repeatable IPAM settings and driver-specific options. Combine these network resources with Docker containers, images, and volumes for a complete infrastructure-as-code workflow.
