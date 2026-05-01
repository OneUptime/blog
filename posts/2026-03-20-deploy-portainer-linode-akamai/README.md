# How to Deploy Portainer on Linode (Akamai Cloud)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Linode, Akamai, Docker, VPS, Self-Hosted

Description: Learn how to create a Linode instance and deploy Portainer CE for managing Docker containers on Linode/Akamai Cloud Services.

---

Linode (now Akamai Cloud) provides reliable, affordable Linux VPS instances. The `linode/linode` OpenTofu provider creates instances and configures firewall rules, while a StackScript bootstraps Docker and Portainer on first boot.

---

## Configure the Linode Provider

```hcl
terraform {
  required_providers {
    linode = {
      source  = "linode/linode"
      version = "~> 3.11"
    }
  }
}

provider "linode" {
  token = var.linode_token
}
```

---

## Create the Linode Instance

```hcl
resource "linode_instance" "portainer" {
  label      = "portainer"
  region     = "us-east"
  type       = "g6-nanode-1"  # 1 vCPU, 1 GB RAM - ~$5/month
  image      = "linode/ubuntu22.04"

  authorized_keys = [file(pathexpand("~/.ssh/id_rsa.pub"))]
  root_pass       = var.root_password

  stackscript_id   = linode_stackscript.portainer.id
}

resource "linode_stackscript" "portainer" {
  label       = "install-portainer"
  description = "Installs Docker and Portainer CE"
  script      = <<EOF
#!/bin/bash
apt-get update -y
apt-get install -y ca-certificates curl
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
docker volume create portainer_data
docker run -d \
  --name portainer \
  --restart=always \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:sts
EOF
  images          = ["linode/ubuntu22.04"]
  rev_note        = "Initial version"
}
```

---

## Create a Firewall

```hcl
resource "linode_firewall" "portainer" {
  label = "portainer-fw"

  inbound {
    label    = "allow-portainer"
    action   = "ACCEPT"
    protocol = "TCP"
    ports    = "9443"
    ipv4     = ["${var.admin_ip}/32"]
  }

  inbound_policy = "DROP"
  outbound_policy = "ACCEPT"

  linodes = [linode_instance.portainer.id]
}
```

---

## Output the URL

```hcl
output "portainer_url" {
  value = "https://${linode_instance.portainer.ip_address}:9443"
}
```

---

## Summary

Use the `linode/linode` OpenTofu provider with a StackScript to install Docker and Portainer on first boot. Create a `linode_firewall` to restrict port 9443 access. Linode's `g6-nanode-1` (1 vCPU, 1 GB) is sufficient for a Portainer management node with a few containers. Upgrade to `g6-standard-1` (1 vCPU, 2 GB) for heavier workloads.
