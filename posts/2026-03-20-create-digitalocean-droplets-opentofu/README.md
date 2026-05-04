# How to Create DigitalOcean Droplets with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, DigitalOcean, Droplet, Cloud Infrastructure, Infrastructure as Code

Description: Learn how to provision DigitalOcean Droplets using OpenTofu with the DigitalOcean provider, including SSH keys, user data, and tagging.

DigitalOcean Droplets are Linux virtual machines that can be provisioned quickly via the DigitalOcean provider for OpenTofu. This guide covers creating single Droplets, adding SSH keys, using cloud-init user data, and best practices for production deployments.

## Prerequisites

- DigitalOcean account with a personal access token.
- OpenTofu installed.

## Provider Configuration

```hcl
# versions.tf

terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}

provider "digitalocean" {
  # Set via environment variable: export DIGITALOCEAN_TOKEN="your-token"
  token = var.do_token
}

variable "do_token" {
  description = "DigitalOcean API token"
  type        = string
  sensitive   = true
}
```

## Adding an SSH Key

```hcl
# Reference an existing SSH key by its fingerprint, or add a new one
resource "digitalocean_ssh_key" "default" {
  name       = "opentofu-key"
  public_key = file("~/.ssh/id_ed25519.pub")
}
```

## Creating a Basic Droplet

```hcl
resource "digitalocean_droplet" "web" {
  name   = "web-01"
  region = "nyc3"         # DigitalOcean region slug
  size   = "s-1vcpu-1gb"  # Droplet size slug
  image  = "ubuntu-22-04-x64"

  # Associate the SSH key for access
  ssh_keys = [digitalocean_ssh_key.default.fingerprint]

  tags = ["web", "production", "opentofu"]
}

output "droplet_ip" {
  value = digitalocean_droplet.web.ipv4_address
}
```

## Using Cloud-Init User Data

Configure the Droplet on first boot with a cloud-init script:

```hcl
resource "digitalocean_droplet" "app" {
  name   = "app-01"
  region = "nyc3"
  size   = "s-2vcpu-2gb"
  image  = "ubuntu-22-04-x64"

  ssh_keys = [digitalocean_ssh_key.default.fingerprint]

  # Install and start Nginx on first boot
  user_data = <<-EOT
    #!/bin/bash
    apt-get update -y
    apt-get install -y nginx
    systemctl enable nginx
    systemctl start nginx
  EOT
}
```

## Creating Multiple Droplets

Use `for_each` to create multiple Droplets efficiently:

```hcl
variable "droplets" {
  type = map(object({
    size   = string
    region = string
  }))
  default = {
    "web-01" = { size = "s-1vcpu-1gb", region = "nyc3" }
    "web-02" = { size = "s-1vcpu-1gb", region = "sfo3" }
    "app-01" = { size = "s-2vcpu-2gb", region = "nyc3" }
  }
}

resource "digitalocean_droplet" "servers" {
  for_each = var.droplets

  name     = each.key
  region   = each.value.region
  size     = each.value.size
  image    = "ubuntu-22-04-x64"
  ssh_keys = [digitalocean_ssh_key.default.fingerprint]
}
```

## Placing a Droplet in a VPC

```hcl
resource "digitalocean_vpc" "main" {
  name     = "production-vpc"
  region   = "nyc3"
  ip_range = "10.10.0.0/16"
}

resource "digitalocean_droplet" "private" {
  name     = "private-app"
  region   = "nyc3"
  size     = "s-2vcpu-2gb"
  image    = "ubuntu-22-04-x64"
  vpc_uuid = digitalocean_vpc.main.id
  ssh_keys = [digitalocean_ssh_key.default.fingerprint]
}
```

## Enabling Backups and Monitoring

```hcl
resource "digitalocean_droplet" "production" {
  name      = "prod-web"
  region    = "nyc3"
  size      = "s-4vcpu-8gb"
  image     = "ubuntu-22-04-x64"
  ssh_keys  = [digitalocean_ssh_key.default.fingerprint]
  backups   = true   # Enables automated backups (defaults to daily; use backup_policy to customize)
  monitoring = true  # Enables free Droplet monitoring
  ipv6      = true   # Enable IPv6
}
```

## Conclusion

Creating DigitalOcean Droplets with OpenTofu is straightforward with the DigitalOcean provider. Use `for_each` for multiple Droplets, place them in VPCs for network isolation, and enable backups and monitoring for production workloads. Store your API token as a sensitive variable or environment variable - never hardcode it.
