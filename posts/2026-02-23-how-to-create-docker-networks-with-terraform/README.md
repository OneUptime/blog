# How to Create Docker Networks with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Docker, Networking, Docker Provider, Infrastructure as Code, DevOps

Description: Learn how to create and manage Docker networks with Terraform including bridge, overlay, and macvlan networks with custom configurations and IPAM settings.

---

Docker networks provide isolated communication channels between containers. Without proper networking, containers either cannot talk to each other or are exposed more broadly than necessary. Terraform lets you define Docker networks declaratively, ensuring your network topology is version-controlled and reproducible. This guide covers creating different types of Docker networks with Terraform, from simple bridge networks to complex overlay configurations.

## Understanding Docker Network Types

Docker supports several network drivers, each designed for different use cases:

- **Bridge** - The default network driver. Containers on the same bridge network can communicate with each other. Best for single-host deployments.
- **Overlay** - Enables communication between containers across multiple Docker hosts. Used with Docker Swarm.
- **Macvlan** - Assigns a MAC address to each container, making it appear as a physical device on the network.
- **Host** - Removes network isolation between the container and the Docker host.
- **None** - Disables all networking for the container.

## Prerequisites

To follow this guide, you need:

- Terraform 1.0 or later
- Docker Engine installed and running
- Basic understanding of networking concepts (CIDR notation, subnets, gateways)

## Provider Configuration

```hcl
terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

provider "docker" {}
```

## Creating a Basic Bridge Network

The bridge driver is the most commonly used network type. It creates an isolated network on a single Docker host.

```hcl
# Create a simple bridge network
resource "docker_network" "app" {
  name   = "app-network"
  driver = "bridge"

  # Labels for organization
  labels {
    label = "environment"
    value = "development"
  }

  labels {
    label = "project"
    value = "myapp"
  }
}
```

## Bridge Network with Custom IPAM

For more control over IP addressing, configure custom IPAM (IP Address Management) settings.

```hcl
# Bridge network with custom subnet and gateway
resource "docker_network" "custom_bridge" {
  name   = "custom-bridge"
  driver = "bridge"

  # Custom IP address management
  ipam_config {
    subnet  = "172.20.0.0/16"
    gateway = "172.20.0.1"

    # Restrict the IP range that Docker assigns to containers
    ip_range = "172.20.10.0/24"

    # Auxiliary addresses reserved for non-container use
    aux_address = {
      "load-balancer" = "172.20.10.100"
    }
  }

  # Enable IPv6
  ipv6 = false

  # Internal network - no external access
  internal = false
}
```

## Internal Network for Secure Communication

Internal networks prevent containers from reaching the outside world. This is useful for database and cache containers that should only be accessible from other containers.

```hcl
# Internal-only network for sensitive services
resource "docker_network" "internal" {
  name     = "internal-services"
  driver   = "bridge"
  internal = true  # No external connectivity

  ipam_config {
    subnet  = "172.21.0.0/16"
    gateway = "172.21.0.1"
  }

  labels {
    label = "purpose"
    value = "internal-communication"
  }
}
```

## Multiple Networks for Service Isolation

A common pattern is to create separate networks for different tiers of your application.

```hcl
# Frontend network - containers that need external access
resource "docker_network" "frontend" {
  name   = "frontend-network"
  driver = "bridge"

  ipam_config {
    subnet  = "172.22.0.0/24"
    gateway = "172.22.0.1"
  }

  labels {
    label = "tier"
    value = "frontend"
  }
}

# Backend network - application services
resource "docker_network" "backend" {
  name   = "backend-network"
  driver = "bridge"

  ipam_config {
    subnet  = "172.23.0.0/24"
    gateway = "172.23.0.1"
  }

  labels {
    label = "tier"
    value = "backend"
  }
}

# Data network - databases and caches (internal only)
resource "docker_network" "data" {
  name     = "data-network"
  driver   = "bridge"
  internal = true  # No external access for data services

  ipam_config {
    subnet  = "172.24.0.0/24"
    gateway = "172.24.0.1"
  }

  labels {
    label = "tier"
    value = "data"
  }
}
```

## Connecting Containers to Networks

Here is how to connect containers to the networks you created.

```hcl
# Pull required images
resource "docker_image" "nginx" {
  name = "nginx:1.25-alpine"
}

resource "docker_image" "app" {
  name = "node:20-alpine"
}

resource "docker_image" "postgres" {
  name = "postgres:15-alpine"
}

resource "docker_image" "redis" {
  name = "redis:7-alpine"
}

# Nginx reverse proxy - connected to frontend network
resource "docker_container" "nginx" {
  name  = "nginx-proxy"
  image = docker_image.nginx.image_id

  # Connected to frontend and backend networks
  networks_advanced {
    name    = docker_network.frontend.name
    aliases = ["proxy", "nginx"]
    # Optionally assign a specific IP
    ipv4_address = "172.22.0.10"
  }

  networks_advanced {
    name    = docker_network.backend.name
    aliases = ["proxy"]
    ipv4_address = "172.23.0.10"
  }

  ports {
    internal = 80
    external = 80
  }

  must_run = true
}

# Application server - connected to backend and data networks
resource "docker_container" "app_server" {
  name  = "app-server"
  image = docker_image.app.image_id

  networks_advanced {
    name    = docker_network.backend.name
    aliases = ["app", "api"]
    ipv4_address = "172.23.0.20"
  }

  networks_advanced {
    name    = docker_network.data.name
    aliases = ["app"]
    ipv4_address = "172.24.0.20"
  }

  env = [
    "DATABASE_URL=postgresql://admin:password@postgres:5432/myapp",
    "REDIS_URL=redis://redis:6379",
  ]

  must_run = true
}

# PostgreSQL - only on data network
resource "docker_container" "postgres" {
  name  = "postgres"
  image = docker_image.postgres.image_id

  networks_advanced {
    name         = docker_network.data.name
    aliases      = ["postgres", "database"]
    ipv4_address = "172.24.0.30"
  }

  env = [
    "POSTGRES_DB=myapp",
    "POSTGRES_USER=admin",
    "POSTGRES_PASSWORD=password",
  ]

  must_run = true
}

# Redis - only on data network
resource "docker_container" "redis" {
  name  = "redis"
  image = docker_image.redis.image_id

  networks_advanced {
    name         = docker_network.data.name
    aliases      = ["redis", "cache"]
    ipv4_address = "172.24.0.40"
  }

  must_run = true
}
```

## Overlay Network for Multi-Host Deployments

Overlay networks enable container communication across multiple Docker hosts in a Swarm cluster.

```hcl
# Overlay network for Docker Swarm services
resource "docker_network" "overlay" {
  name   = "service-mesh"
  driver = "overlay"

  # Enable encryption for overlay traffic
  options = {
    "encrypted" = "true"
  }

  ipam_config {
    subnet  = "10.10.0.0/16"
    gateway = "10.10.0.1"
  }

  # Make the network attachable so standalone containers can join
  attachable = true

  labels {
    label = "type"
    value = "overlay"
  }
}
```

## Macvlan Network

Macvlan networks give containers their own MAC address, making them appear as physical devices on the network.

```hcl
# Macvlan network for containers that need to appear on the physical network
resource "docker_network" "macvlan" {
  name   = "physical-network"
  driver = "macvlan"

  options = {
    "parent" = "eth0"  # Parent network interface
  }

  ipam_config {
    subnet  = "192.168.1.0/24"
    gateway = "192.168.1.1"
    ip_range = "192.168.1.128/25"  # Use upper half for containers
  }
}
```

## Network with Custom Driver Options

Configure network driver options for fine-tuned behavior.

```hcl
# Bridge network with custom MTU and ICC settings
resource "docker_network" "custom_options" {
  name   = "custom-options-network"
  driver = "bridge"

  options = {
    # Custom MTU size
    "com.docker.network.driver.mtu" = "1400"

    # Enable inter-container communication (default is true)
    "com.docker.network.bridge.enable_icc" = "true"

    # Enable IP masquerading
    "com.docker.network.bridge.enable_ip_masquerade" = "true"

    # Custom bridge name on the host
    "com.docker.network.bridge.name" = "custom-br0"
  }

  ipam_config {
    subnet  = "172.25.0.0/24"
    gateway = "172.25.0.1"
  }
}
```

## Dynamic Network Creation with for_each

Create multiple networks dynamically from a configuration map.

```hcl
# Define network configurations
variable "networks" {
  description = "Map of network names to their configurations"
  type = map(object({
    subnet   = string
    gateway  = string
    internal = bool
    labels   = map(string)
  }))
  default = {
    "web-tier" = {
      subnet   = "172.30.0.0/24"
      gateway  = "172.30.0.1"
      internal = false
      labels   = { tier = "web" }
    }
    "app-tier" = {
      subnet   = "172.31.0.0/24"
      gateway  = "172.31.0.1"
      internal = false
      labels   = { tier = "application" }
    }
    "db-tier" = {
      subnet   = "172.32.0.0/24"
      gateway  = "172.32.0.1"
      internal = true
      labels   = { tier = "database" }
    }
  }
}

# Create networks dynamically
resource "docker_network" "tiered" {
  for_each = var.networks

  name     = each.key
  driver   = "bridge"
  internal = each.value.internal

  ipam_config {
    subnet  = each.value.subnet
    gateway = each.value.gateway
  }

  dynamic "labels" {
    for_each = each.value.labels
    content {
      label = labels.key
      value = labels.value
    }
  }
}
```

## Outputs

Export network details for reference.

```hcl
output "frontend_network_id" {
  description = "ID of the frontend network"
  value       = docker_network.frontend.id
}

output "network_subnets" {
  description = "Map of network names to their subnets"
  value = {
    frontend = "172.22.0.0/24"
    backend  = "172.23.0.0/24"
    data     = "172.24.0.0/24"
  }
}

output "tiered_networks" {
  description = "Map of dynamically created network IDs"
  value = {
    for k, v in docker_network.tiered : k => v.id
  }
}
```

## Best Practices

When creating Docker networks with Terraform, follow these practices. Use separate networks for different application tiers to enforce isolation. Mark networks as `internal = true` when containers should not have external access. Assign explicit subnets to avoid IP conflicts. Use network aliases instead of container names for service discovery, as aliases can be changed without affecting other configuration. Document your network topology with labels.

## Monitoring Network Health with OneUptime

Network connectivity issues between containers can be difficult to debug. Use [OneUptime](https://oneuptime.com) to monitor the health of services running across your Docker networks and get alerts when inter-service communication breaks down.

## Conclusion

Docker networks are fundamental to building secure, well-organized container deployments. Terraform gives you declarative control over your network topology, making it easy to create tiered architectures with proper isolation. Whether you need simple bridge networks for development or complex overlay networks for multi-host deployments, the Docker provider has you covered. By defining your networks as code, you ensure that your network architecture is consistent and reproducible.

For more Docker with Terraform content, see our guides on [Docker containers](https://oneuptime.com/blog/post/2026-02-23-how-to-create-docker-containers-with-terraform/view) and [Docker volumes](https://oneuptime.com/blog/post/2026-02-23-how-to-create-docker-volumes-with-terraform/view).
