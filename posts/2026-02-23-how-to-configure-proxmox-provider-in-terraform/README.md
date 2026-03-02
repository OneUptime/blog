# How to Configure Proxmox Provider in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Provider, Proxmox, Virtualization, Homelab, Infrastructure as Code

Description: Learn how to configure the Proxmox provider in Terraform for managing virtual machines and containers on your Proxmox VE cluster as code.

---

Proxmox Virtual Environment is an open-source virtualization platform that has become hugely popular for homelabs, small businesses, and even production environments. While it comes with a solid web interface, managing dozens of VMs through a GUI gets tedious. The Proxmox Terraform provider lets you define your VMs and containers as code, making it easy to spin up environments, replicate setups, and version control your infrastructure.

The most widely used community provider is `bpg/proxmox`, which has become the standard for Terraform-Proxmox integration. This guide covers setting it up, authenticating, and creating VMs and LXC containers.

## Prerequisites

- Terraform 1.0 or later
- A Proxmox VE server (version 7.x or 8.x)
- An API token or user credentials for Proxmox
- Network access from the Terraform runner to the Proxmox API (typically port 8006)

## Creating a Proxmox API Token

For security, create a dedicated API token instead of using your root password.

1. Log in to the Proxmox web UI
2. Go to Datacenter > Permissions > API Tokens
3. Click Add
4. Select a user (or create a dedicated user first)
5. Set a Token ID
6. Uncheck "Privilege Separation" if you want the token to inherit the user's permissions
7. Copy the token value (it is shown only once)

## Declaring the Provider

```hcl
# versions.tf - Declare the Proxmox provider
terraform {
  required_version = ">= 1.0"

  required_providers {
    proxmox = {
      source  = "bpg/proxmox"
      version = "~> 0.46"
    }
  }
}
```

## Provider Configuration

```hcl
# provider.tf - Connect to Proxmox
provider "proxmox" {
  # Proxmox API endpoint
  endpoint = "https://proxmox.example.com:8006/"

  # API token authentication (recommended)
  api_token = var.proxmox_api_token

  # Accept self-signed certificates (common in Proxmox setups)
  insecure = true

  # SSH connection for certain operations (like uploading ISO files)
  ssh {
    agent = true
  }
}

variable "proxmox_api_token" {
  type        = string
  sensitive   = true
  description = "Proxmox API token in the format user@realm!tokenid=token-value"
}
```

### Username/Password Authentication

```hcl
# Username/password authentication (alternative to API token)
provider "proxmox" {
  endpoint = "https://proxmox.example.com:8006/"
  username = var.proxmox_username
  password = var.proxmox_password
  insecure = true
}
```

### Environment Variables

```bash
# Set credentials via environment variables
export PROXMOX_VE_ENDPOINT="https://proxmox.example.com:8006/"
export PROXMOX_VE_API_TOKEN="terraform@pam!terraform=your-token-uuid"
export PROXMOX_VE_INSECURE="true"
```

## Creating Virtual Machines

### VM from Cloud-Init Template

The most common approach is creating VMs from a cloud-init enabled template.

```hcl
# Create a VM from a cloud-init template
resource "proxmox_virtual_environment_vm" "web_server" {
  name      = "web-server-01"
  node_name = "pve1"
  vm_id     = 200

  # Clone from a template
  clone {
    vm_id = 9000  # Template VM ID
    full  = true
  }

  # CPU configuration
  cpu {
    cores   = 4
    sockets = 1
    type    = "x86-64-v2-AES"
  }

  # Memory configuration
  memory {
    dedicated = 4096  # MB
  }

  # Disk configuration
  disk {
    datastore_id = "local-lvm"
    file_id      = ""  # Empty when cloning
    interface    = "scsi0"
    size         = 50  # GB
  }

  # Network configuration
  network_device {
    bridge  = "vmbr0"
    model   = "virtio"
    vlan_id = 10
  }

  # Cloud-init configuration
  initialization {
    ip_config {
      ipv4 {
        address = "10.0.10.10/24"
        gateway = "10.0.10.1"
      }
    }

    dns {
      servers = ["10.0.0.1", "8.8.8.8"]
      domain  = "example.com"
    }

    user_account {
      keys     = [var.ssh_public_key]
      username = "admin"
      password = var.vm_password
    }
  }

  # Start the VM after creation
  started = true

  # Wait for the VM agent to report
  agent {
    enabled = true
  }

  tags = ["web", "production"]
}
```

### VM from ISO

```hcl
# Download an ISO file
resource "proxmox_virtual_environment_file" "ubuntu_iso" {
  content_type = "iso"
  datastore_id = "local"
  node_name    = "pve1"

  source_file {
    path = "https://releases.ubuntu.com/22.04/ubuntu-22.04.3-live-server-amd64.iso"
  }
}

# Create a VM with an ISO attached
resource "proxmox_virtual_environment_vm" "manual_install" {
  name      = "manual-vm"
  node_name = "pve1"

  cpu {
    cores = 2
  }

  memory {
    dedicated = 2048
  }

  disk {
    datastore_id = "local-lvm"
    interface    = "scsi0"
    size         = 32
    file_format  = "raw"
  }

  cdrom {
    file_id = proxmox_virtual_environment_file.ubuntu_iso.id
  }

  network_device {
    bridge = "vmbr0"
  }

  # Boot from the CD-ROM first
  boot_order = ["scsi0", "ide2"]
}
```

### Multiple VMs with for_each

```hcl
# Define VM specifications
locals {
  vms = {
    "web-01" = {
      cores  = 4
      memory = 4096
      ip     = "10.0.10.10"
      disk   = 50
    }
    "web-02" = {
      cores  = 4
      memory = 4096
      ip     = "10.0.10.11"
      disk   = 50
    }
    "db-01" = {
      cores  = 8
      memory = 16384
      ip     = "10.0.10.20"
      disk   = 200
    }
  }
}

resource "proxmox_virtual_environment_vm" "servers" {
  for_each = local.vms

  name      = each.key
  node_name = "pve1"

  clone {
    vm_id = 9000
    full  = true
  }

  cpu {
    cores = each.value.cores
  }

  memory {
    dedicated = each.value.memory
  }

  disk {
    datastore_id = "local-lvm"
    interface    = "scsi0"
    size         = each.value.disk
  }

  network_device {
    bridge = "vmbr0"
  }

  initialization {
    ip_config {
      ipv4 {
        address = "${each.value.ip}/24"
        gateway = "10.0.10.1"
      }
    }

    user_account {
      keys     = [var.ssh_public_key]
      username = "admin"
    }
  }

  started = true
}
```

## LXC Containers

```hcl
# Download a container template
resource "proxmox_virtual_environment_file" "ubuntu_ct" {
  content_type = "vztmpl"
  datastore_id = "local"
  node_name    = "pve1"

  source_file {
    path = "http://download.proxmox.com/images/system/ubuntu-22.04-standard_22.04-1_amd64.tar.zst"
  }
}

# Create an LXC container
resource "proxmox_virtual_environment_container" "nginx" {
  description = "Nginx reverse proxy"
  node_name   = "pve1"
  vm_id       = 300

  initialization {
    hostname = "nginx-proxy"

    ip_config {
      ipv4 {
        address = "10.0.10.50/24"
        gateway = "10.0.10.1"
      }
    }

    dns {
      servers = ["10.0.0.1"]
    }

    user_account {
      keys     = [var.ssh_public_key]
      password = var.ct_password
    }
  }

  cpu {
    cores = 2
  }

  memory {
    dedicated = 1024
    swap      = 512
  }

  disk {
    datastore_id = "local-lvm"
    size         = 10
  }

  network_interface {
    name   = "eth0"
    bridge = "vmbr0"
  }

  operating_system {
    template_file_id = proxmox_virtual_environment_file.ubuntu_ct.id
    type             = "ubuntu"
  }

  started     = true
  unprivileged = true

  tags = ["proxy", "production"]
}
```

## Cloud-Init Templates

To use cloud-init templates, you first need to create them in Proxmox. Here is how to download a cloud image and register it.

```hcl
# Download a cloud image for use as a template
resource "proxmox_virtual_environment_file" "cloud_image" {
  content_type = "iso"
  datastore_id = "local"
  node_name    = "pve1"

  source_file {
    path      = "https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.img"
    file_name = "jammy-server-cloudimg-amd64.img"
  }
}
```

## Resource Pools

```hcl
# Create a resource pool for organizing VMs
resource "proxmox_virtual_environment_pool" "production" {
  pool_id = "production"
  comment = "Production environment VMs"
}
```

## Networking

```hcl
# Create a Linux bridge on the Proxmox host
resource "proxmox_virtual_environment_network_linux_bridge" "internal" {
  node_name = "pve1"
  name      = "vmbr1"
  comment   = "Internal network bridge"

  address      = "10.0.20.1/24"
  autostart    = true
}
```

## Data Sources

```hcl
# Look up available nodes
data "proxmox_virtual_environment_nodes" "available" {}

output "node_names" {
  value = data.proxmox_virtual_environment_nodes.available.names
}

# Get information about a specific VM
data "proxmox_virtual_environment_vm" "existing" {
  node_name = "pve1"
  vm_id     = 100
}
```

## Best Practices

1. Create cloud-init templates for your base images. Cloning is much faster than installing from ISO.

2. Use API tokens instead of username/password authentication. Tokens can be revoked without changing the user's password.

3. Assign static VM IDs in your Terraform configuration to avoid conflicts with manually created VMs.

4. Use resource pools and tags to organize VMs by environment or application.

5. For homelab setups, set `insecure = true` in the provider since Proxmox uses self-signed certificates by default.

6. Back up your Proxmox configuration and Terraform state separately. They complement each other but serve different purposes.

## Wrapping Up

The Proxmox Terraform provider transforms how you manage your virtualization infrastructure. Instead of clicking through the web UI to create and configure VMs, you define everything in code. This is especially valuable for homelabs where you frequently tear down and rebuild environments, and for production setups where consistency matters.

For monitoring your Proxmox VMs and the services running on them, [OneUptime](https://oneuptime.com) provides infrastructure monitoring that works with any virtualization platform.
