# How to Deploy Portainer on Hetzner Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Hetzner, Docker, VPS, Self-Hosted, Infrastructure

Description: Learn how to create a Hetzner Cloud server and deploy Portainer CE for managing Docker containers on Hetzner's affordable cloud infrastructure.

---

Hetzner Cloud offers some of the best price-to-performance VPS options in Europe. OpenTofu's `hcloud` provider provisions servers and firewalls, while cloud-init bootstraps Docker and Portainer.

---

## Configure the Hetzner Provider

```hcl
terraform {
  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.60"
    }
  }
}

provider "hcloud" {
  token = var.hcloud_token
}
```

---

## Create the Server

```hcl
resource "hcloud_server" "portainer" {
  name        = "portainer"
  server_type = "cpx11"  # 2 vCPU, 2 GB RAM
  image       = "ubuntu-22.04"
  location    = "nbg1"  # Nuremberg, Germany

  ssh_keys = [hcloud_ssh_key.default.id]
  firewall_ids = [hcloud_firewall.portainer.id]

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
}

resource "hcloud_ssh_key" "default" {
  name       = "portainer-key"
  public_key = file("~/.ssh/id_rsa.pub")
}
```

---

## Create a Firewall

```hcl
resource "hcloud_firewall" "portainer" {
  name = "portainer-fw"

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "9443"
    source_ips = [var.admin_ip]
  }

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "22"
    source_ips = [var.admin_ip]
  }
}
```

---

## Output the URL

```hcl
output "portainer_url" {
  value = "https://${hcloud_server.portainer.ipv4_address}:9443"
}
```

---

## Summary

Use the `hetznercloud/hcloud` provider to provision a `cpx11` server (or larger for heavier workloads). Pass a bash startup script via `user_data` to install Docker and Portainer CE LTS on boot. Create a Hetzner Firewall resource to restrict port 9443 to your admin IP. Hetzner is an excellent choice for cost-effective self-hosted Portainer deployments in Europe.
