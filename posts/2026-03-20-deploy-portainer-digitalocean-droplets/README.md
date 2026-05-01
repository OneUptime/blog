# How to Deploy Portainer on DigitalOcean Droplets

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, DigitalOcean, Docker, Self-Hosted, VPS, DevOps

Description: Learn how to create a DigitalOcean Droplet and deploy Portainer CE for managing Docker containers on DigitalOcean.

---

DigitalOcean Droplets are virtual machines that make it simple to run Docker workloads. This guide uses OpenTofu to provision a Droplet and user data to install Docker and Portainer automatically.

---

## Create a Droplet with OpenTofu

```hcl
terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.36"
    }
  }
}

variable "do_token" {
  type      = string
  sensitive = true
}

variable "admin_ip" {
  type = string
}

provider "digitalocean" {
  token = var.do_token
}

resource "digitalocean_droplet" "portainer" {
  name   = "portainer"
  region = "nyc3"
  size   = "s-2vcpu-2gb"
  image  = "ubuntu-22-04-x64"

  ssh_keys = [digitalocean_ssh_key.default.id]

  user_data = <<-EOF
    #!/bin/bash
    apt-get update -y
    curl -fsSL https://get.docker.com | sh

    docker volume create portainer_data

    docker run -d \
      --name portainer \
      --restart=always \
      -p 9443:9443 \
      -v /var/run/docker.sock:/var/run/docker.sock \
      -v portainer_data:/data \
      portainer/portainer-ce:lts
  EOF

  tags = ["portainer", "docker"]
}

resource "digitalocean_ssh_key" "default" {
  name       = "portainer-key"
  public_key = file(pathexpand("~/.ssh/id_rsa.pub"))
}
```

---

## Create a Firewall

```hcl
resource "digitalocean_firewall" "portainer" {
  name = "portainer-firewall"

  droplet_ids = [digitalocean_droplet.portainer.id]

  inbound_rule {
    protocol         = "tcp"
    port_range       = "9443"
    source_addresses = [var.admin_ip]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = [var.admin_ip]
  }

  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}
```

---

## Output the URL

```hcl
output "portainer_url" {
  value = "https://${digitalocean_droplet.portainer.ipv4_address}:9443"
}
```

---

## Summary

Use DigitalOcean's `user_data` to install Docker and launch Portainer on first boot. Create a firewall rule allowing port 9443 only from your admin IP while permitting outbound TCP and UDP traffic. The `digitalocean/digitalocean` OpenTofu provider manages both Droplets and firewall rules. Access Portainer at the output URL once the Droplet finishes initialization (typically 2-3 minutes).
