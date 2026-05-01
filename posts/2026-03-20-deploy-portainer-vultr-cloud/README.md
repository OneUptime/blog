# How to Deploy Portainer on Vultr Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Vultr, Docker, VPS, Self-Hosted, Cloud

Description: Learn how to provision a Vultr instance and deploy Portainer CE for managing Docker containers on Vultr's global cloud platform.

---

Vultr is a global cloud provider with competitive pricing and data centers on 6 continents. The `vultr/vultr` OpenTofu provider provisions instances and firewalls, while startup scripts bootstrap Docker and Portainer.

---

## Configure the Vultr Provider

```hcl
terraform {
  required_providers {
    vultr = {
      source  = "vultr/vultr"
      version = "~> 2.31"
    }
  }
}

provider "vultr" {
  api_key     = var.vultr_api_key
  rate_limit  = 100
  retry_limit = 3
}
```

---

## Create an Instance

```hcl
resource "vultr_startup_script" "portainer" {
  name   = "install-portainer"
  type   = "boot"
  script = base64encode(<<-EOF
    #!/bin/bash
    apt-get update -y
    apt-get install -y ca-certificates curl
    curl -fsSL https://get.docker.com | sh
    docker volume create portainer_data
    docker run -d       --name portainer       --restart=always       -p 9443:9443       -v /var/run/docker.sock:/var/run/docker.sock       -v portainer_data:/data       portainer/portainer-ce:lts
  EOF
  )
}

resource "vultr_instance" "portainer" {
  plan       = "vc2-1c-1gb"  # 1 vCPU, 1 GB RAM - ~$6/month
  region     = "ewr"          # New Jersey
  os_id      = 1743            # Ubuntu 22.04
  label      = "portainer"

  ssh_key_ids     = [vultr_ssh_key.default.id]
  script_id       = vultr_startup_script.portainer.id
  firewall_group_id = vultr_firewall_group.portainer.id
}

resource "vultr_ssh_key" "default" {
  name    = "portainer-key"
  ssh_key = file(pathexpand("~/.ssh/id_rsa.pub"))
}
```

---

## Firewall Group

```hcl
resource "vultr_firewall_group" "portainer" {
  description = "Portainer firewall"
}

resource "vultr_firewall_rule" "portainer_ui" {
  firewall_group_id = vultr_firewall_group.portainer.id
  protocol          = "tcp"
  ip_type           = "v4"
  subnet            = var.admin_ip
  subnet_size       = 32
  port              = "9443"
  notes             = "Portainer UI"
}
```

---

## Output the URL

```hcl
output "portainer_url" {
  value = "https://${vultr_instance.portainer.main_ip}:9443"
}
```

---

## Summary

Use the `vultr/vultr` provider with a startup script to install Docker and Portainer. Create a firewall group restricting port 9443 to your admin IP. Vultr's `vc2-1c-1gb` plan is sufficient for running Portainer with a few Docker containers. Scale up to `vc2-2c-4gb` for heavier workloads.
