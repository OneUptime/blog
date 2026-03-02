# How to Provision LXD Containers with Terraform on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, LXD, Terraform, Container, Infrastructure as Code

Description: Learn how to use Terraform with the LXD provider to automate the creation and configuration of LXD containers and virtual machines on Ubuntu.

---

LXD is a system container and virtual machine manager from Canonical. System containers behave like lightweight VMs - they run a full Linux userspace, have their own network interfaces, and feel like real servers, but share the host kernel. This makes them significantly more efficient than KVM VMs while offering stronger isolation than application containers like Docker.

Terraform's LXD provider lets you manage LXD instances as code, giving you repeatable, version-controlled container infrastructure.

## LXD Containers vs VMs

LXD supports two instance types:

- **Containers** (`type = "container"`): Share the host kernel. Fast to start, very low overhead. All containers must match the host architecture.
- **Virtual Machines** (`type = "virtual-machine"`): Full VMs with their own kernel via QEMU/KVM. Stronger isolation, support different OS versions.

For most Ubuntu server workloads, containers are sufficient and much more efficient.

## Prerequisites

- Ubuntu 20.04 or 22.04 with LXD installed
- Terraform 1.5+
- LXD initialized and configured

## Installing and Initializing LXD

```bash
# Install LXD via snap (the recommended method)
sudo snap install lxd

# Add your user to the lxd group
sudo usermod -aG lxd $USER
newgrp lxd  # Apply without logout

# Initialize LXD
lxd init --minimal
# For interactive setup (recommended for production):
lxd init
```

During `lxd init`, configure:
- Storage pool: ZFS or dir (ZFS recommended for features and performance)
- Network: create a new bridge (lxdbr0) with NAT by default
- Remote access: enable if Terraform will connect remotely

## Enabling the LXD API for Terraform

Terraform communicates with LXD via the REST API. Enable it and configure a client certificate:

```bash
# List configured remotes
lxc remote list

# If using remote access, the API is on port 8443
# For local Terraform runs, the Unix socket works fine
# Socket path: /var/snap/lxd/common/lxd/unix.socket

# Generate a client certificate for Terraform
# (For local use, Terraform uses the existing client cert)
lxc config trust list
```

## Project Structure

```
lxd-terraform/
  main.tf
  variables.tf
  containers.tf
  outputs.tf
  profiles/
    base.tf
    web.tf
```

## Provider Configuration

```hcl
# main.tf
terraform {
  required_providers {
    lxd = {
      source  = "terraform-lxd/lxd"
      version = "~> 2.0"
    }
  }
}

# Local LXD instance
provider "lxd" {
  # Connects to local LXD via Unix socket by default
  # No configuration needed for local use
}

# Remote LXD instance
# provider "lxd" {
#   remote {
#     name     = "my-server"
#     scheme   = "https"
#     address  = "lxd-host.internal"
#     port     = "8443"
#     password = var.lxd_trust_password
#   }
# }
```

## Creating LXD Profiles

Profiles are reusable configuration blocks. Create a base profile and a web server profile:

```hcl
# profiles/base.tf

resource "lxd_profile" "base" {
  name        = "base"
  description = "Base profile for all containers"

  config = {
    # Limit resource usage
    "limits.cpu"    = "2"
    "limits.memory" = "1GB"

    # Security settings
    "security.nesting"     = "false"
    "security.privileged"  = "false"

    # Boot settings
    "boot.autostart"        = "true"
    "boot.autostart.delay"  = "5"

    # Environment variables
    "environment.LANG" = "en_US.UTF-8"
  }

  device {
    name = "root"
    type = "disk"

    properties = {
      pool = "default"
      path = "/"
      size = "10GB"
    }
  }

  device {
    name = "eth0"
    type = "nic"

    properties = {
      network = "lxdbr0"
    }
  }
}

resource "lxd_profile" "web" {
  name        = "web"
  description = "Profile for web servers"

  config = {
    "limits.cpu"    = "4"
    "limits.memory" = "2GB"
  }

  device {
    name = "root"
    type = "disk"

    properties = {
      pool = "default"
      path = "/"
      size = "20GB"
    }
  }

  # Forward host port to container
  device {
    name = "proxy-http"
    type = "proxy"

    properties = {
      listen  = "tcp:0.0.0.0:8080"
      connect = "tcp:127.0.0.1:80"
    }
  }

  device {
    name = "proxy-https"
    type = "proxy"

    properties = {
      listen  = "tcp:0.0.0.0:8443"
      connect = "tcp:127.0.0.1:443"
    }
  }
}
```

## Creating Containers

```hcl
# containers.tf

# Single container
resource "lxd_instance" "web_server" {
  name     = "web-01"
  image    = "ubuntu:22.04"
  type     = "container"  # or "virtual-machine"
  profiles = [lxd_profile.base.name, lxd_profile.web.name]

  # Static IP address
  config = {
    "user.access_interface" = "eth0"
    # Cloud-init user data
    "user.user-data" = <<-EOF
      #cloud-config
      package_update: true
      packages:
        - nginx
        - curl
      runcmd:
        - systemctl enable nginx
        - systemctl start nginx
    EOF
  }

  # Network interface with static IP
  device {
    name = "eth0"
    type = "nic"

    properties = {
      network  = "lxdbr0"
      ipv4.address = "10.0.0.101"
    }
  }

  # Start on creation
  running = true

  # Wait for network before completing
  wait_for_network = true

  # Provisioning via file upload
  file {
    source_path    = "${path.module}/files/nginx.conf"
    target_path    = "/etc/nginx/nginx.conf"
    uid            = 0
    gid            = 0
    mode           = "0644"
    create_directories = true
  }
}

# Multiple containers using for_each
variable "app_containers" {
  type = map(object({
    image   = string
    memory  = string
    cpu     = string
    disk_gb = string
    ip      = string
  }))
  default = {
    "app-01" = { image = "ubuntu:22.04", memory = "2GB", cpu = "2", disk_gb = "20GB", ip = "10.0.0.111" }
    "app-02" = { image = "ubuntu:22.04", memory = "2GB", cpu = "2", disk_gb = "20GB", ip = "10.0.0.112" }
    "app-03" = { image = "ubuntu:22.04", memory = "4GB", cpu = "4", disk_gb = "30GB", ip = "10.0.0.113" }
  }
}

resource "lxd_instance" "app" {
  for_each = var.app_containers

  name  = each.key
  image = each.value.image
  type  = "container"

  profiles = ["default", lxd_profile.base.name]

  config = {
    "limits.cpu"    = each.value.cpu
    "limits.memory" = each.value.memory
  }

  device {
    name = "root"
    type = "disk"
    properties = {
      pool = "default"
      path = "/"
      size = each.value.disk_gb
    }
  }

  device {
    name = "eth0"
    type = "nic"
    properties = {
      network      = "lxdbr0"
      ipv4.address = each.value.ip
    }
  }

  running = true
}
```

## Shared Storage Between Containers

LXD supports shared directories between the host and containers, or between containers:

```hcl
resource "lxd_instance" "shared_storage" {
  name     = "storage-consumer"
  image    = "ubuntu:22.04"
  profiles = ["default"]

  # Mount a host directory into the container
  device {
    name = "shared-data"
    type = "disk"

    properties = {
      source = "/data/shared"  # Host path
      path   = "/mnt/shared"  # Container path
    }
  }
}
```

## LXD Networks

```hcl
# Create a managed network
resource "lxd_network" "app_network" {
  name = "app-net"
  type = "bridge"

  config = {
    "ipv4.address"  = "10.100.0.1/24"
    "ipv4.nat"      = "true"
    "ipv4.dhcp"     = "false"  # Disable DHCP, use static IPs
    "ipv6.address"  = "none"
  }
}

# Use the custom network
resource "lxd_instance" "on_custom_net" {
  name  = "custom-net-container"
  image = "ubuntu:22.04"

  device {
    name = "eth0"
    type = "nic"

    properties = {
      network      = lxd_network.app_network.name
      ipv4.address = "10.100.0.101"
    }
  }
}
```

## Storage Pools

```hcl
# Create a ZFS storage pool
resource "lxd_storage_pool" "zfs_pool" {
  name   = "zfs-pool"
  driver = "zfs"

  config = {
    "zfs.pool_name" = "lxd-data"
    "size"          = "100GB"
  }
}

# Use the pool in a profile
resource "lxd_profile" "zfs" {
  name = "zfs-storage"

  device {
    name = "root"
    type = "disk"

    properties = {
      pool = lxd_storage_pool.zfs_pool.name
      path = "/"
    }
  }
}
```

## Deploying

```bash
# Initialize
terraform init

# Plan
terraform plan

# Apply
terraform apply

# Verify containers
lxc list

# Access a container
lxc exec web-01 -- bash

# Or SSH if the container has SSH configured
ssh ubuntu@10.0.0.101
```

## Useful LXD Commands Alongside Terraform

```bash
# List all instances
lxc list

# Check resource usage
lxc info app-01

# View console output
lxc console app-01 --show-log

# Snapshot a container
lxc snapshot web-01 pre-upgrade

# Restore a snapshot
lxc restore web-01 pre-upgrade

# Move a container to another host (requires clustering)
lxc move web-01 remote2:web-01
```

## Troubleshooting

**Container fails to start:**
```bash
# Check LXD logs
journalctl -u snap.lxd.daemon -f

# Check instance configuration
lxc config show web-01

# View container console
lxc console web-01
```

**IP address not assigned:**
- Verify the network bridge exists: `lxc network list`
- Check `ipv4.dhcp` is enabled on the network or a static IP is configured

**Terraform can't connect to LXD:**
```bash
# Check socket permissions
ls -la /var/snap/lxd/common/lxd/unix.socket
# Ensure current user is in the lxd group
groups $USER
```

LXD containers are an excellent choice for running multiple isolated Ubuntu environments on a single host. They are far more resource-efficient than full VMs while providing meaningful isolation for most service workloads. Terraform makes it practical to manage dozens of containers consistently, with full version control over your infrastructure definition.
