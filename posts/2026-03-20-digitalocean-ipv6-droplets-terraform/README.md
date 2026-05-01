# How to Configure DigitalOcean IPv6 Droplets with Terraform

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DigitalOcean, Terraform, IPv6, Droplet, Networking, Cloud

Description: A guide to creating DigitalOcean Droplets with IPv6 networking enabled using Terraform, including DNS record management.

DigitalOcean provides free IPv6 addresses for all Droplets. Enabling IPv6 on a Droplet assigns it a globally routable IPv6 address from DigitalOcean's pool. This guide covers creating IPv6-enabled Droplets and configuring DNS with Terraform.

## Step 1: Configure the DigitalOcean Provider

```hcl
# provider.tf

terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}

provider "digitalocean" {
  # Set DIGITALOCEAN_TOKEN env var. Provide ssh_key_name via
  # TF_VAR_ssh_key_name or when Terraform prompts for it.
}

variable "ssh_key_name" {
  type = string
}

data "digitalocean_ssh_key" "main" {
  name = var.ssh_key_name
}
```

## Step 2: Create a Droplet with IPv6 Enabled

```hcl
# droplet.tf - DigitalOcean Droplet with IPv6 networking
resource "digitalocean_droplet" "web" {
  name   = "web-ipv6"
  image  = "ubuntu-22-04-x64"
  size   = "s-1vcpu-1gb"
  region = "nyc3"

  # Enable IPv6 on the Droplet
  ipv6 = true

  # Optional: place the Droplet in a specific VPC
  # vpc_uuid = "your-vpc-uuid"

  # SSH key for access
  ssh_keys = [data.digitalocean_ssh_key.main.id]

  # Optional user data to verify IPv6 at boot
  user_data = <<-EOF
    #!/bin/bash
    # Verify IPv6 is configured
    ip -6 addr show eth0
  EOF

  tags = ["web", "ipv6"]
}

output "droplet_ipv4_address" {
  value = digitalocean_droplet.web.ipv4_address
}

output "droplet_ipv6_address" {
  value = digitalocean_droplet.web.ipv6_address
}
```

## Step 3: Create Multiple IPv6 Droplets

```hcl
# multiple-droplets.tf - Create a fleet of IPv6-enabled Droplets
resource "digitalocean_droplet" "app" {
  count  = 3
  name   = "app-${count.index + 1}-ipv6"
  image  = "ubuntu-22-04-x64"
  size   = "s-2vcpu-2gb"
  region = "nyc3"
  ipv6   = true

  ssh_keys = [data.digitalocean_ssh_key.main.id]

  tags = ["app", "ipv6"]
}

output "app_ipv6_addresses" {
  value = digitalocean_droplet.app[*].ipv6_address
}
```

## Step 4: Add AAAA DNS Records for the Droplets

```hcl
# dns.tf - AAAA records for the IPv6 Droplets
resource "digitalocean_domain" "main" {
  name = "example.com"
}

resource "digitalocean_record" "web_aaaa" {
  domain = digitalocean_domain.main.id
  type   = "AAAA"
  name   = "web"
  value  = digitalocean_droplet.web.ipv6_address
  ttl    = 300
}

# AAAA records for all app Droplets (useful as round-robin)
resource "digitalocean_record" "app_aaaa" {
  count  = length(digitalocean_droplet.app)
  domain = digitalocean_domain.main.id
  type   = "AAAA"
  name   = "app"
  value  = digitalocean_droplet.app[count.index].ipv6_address
  ttl    = 300
}
```

## Step 5: Add a DigitalOcean Load Balancer with Dual-Stack IPv4/IPv6

DigitalOcean external regional Load Balancers support both IPv4-only and dual-stack IPv4/IPv6 networking. Set `network_stack = "DUALSTACK"` if you want the load balancer to accept IPv6 traffic.

```hcl
# lb.tf - External regional Load Balancer with dual-stack IPv4/IPv6
resource "digitalocean_loadbalancer" "main" {
  name          = "app-lb"
  region        = "nyc3"
  network_stack = "DUALSTACK"

  forwarding_rule {
    entry_port     = 80
    entry_protocol = "http"
    target_port    = 80
    target_protocol = "http"
  }

  healthcheck {
    port     = 80
    protocol = "tcp"
  }

  droplet_ids = digitalocean_droplet.app[*].id
}
```

## Step 6: Apply and Test

```bash
terraform apply

# Get the IPv6 address
WEB_IPV6=$(terraform output -raw droplet_ipv6_address)

# Test SSH over IPv6
ssh -6 root@"$WEB_IPV6"

# Test HTTP over IPv6
curl -6 "http://[$WEB_IPV6]/"
```

DigitalOcean makes IPv6 adoption effortless by providing free IPv6 addresses for every Droplet - enabling it through Terraform is a single `ipv6 = true` attribute.
