# How to Provision Ubuntu VMs on Libvirt/KVM with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, KVM, Terraform, Libvirt, Virtualization

Description: Step-by-step guide to using the Terraform libvirt provider to automate provisioning of Ubuntu KVM virtual machines with cloud-init on a local or remote KVM host.

---

KVM (Kernel-based Virtual Machine) with libvirt is a powerful and flexible virtualization stack available natively on Linux. When you need to automate VM creation on a KVM host - whether for development environments, CI runners, or on-premises production workloads - the Terraform libvirt provider is the tool of choice.

## Architecture

The setup involves:

- **KVM host**: The Linux server running KVM/QEMU and libvirtd
- **Terraform**: Runs on your workstation (or CI) and communicates with libvirt over SSH or the local socket
- **Ubuntu cloud image**: The base image used for cloning VMs
- **cloud-init**: Handles per-VM configuration (hostname, SSH keys, packages)

## Prerequisites

- A KVM host running Ubuntu 20.04 or 22.04 with libvirt installed
- Terraform 1.5+ on your workstation
- SSH access to the KVM host
- The `dmidecode` package on the KVM host (needed by some cloud-init features)

## Setting Up the KVM Host

On the KVM host:

```bash
# Install KVM and libvirt
sudo apt-get update
sudo apt-get install -y \
  qemu-kvm \
  libvirt-daemon-system \
  libvirt-clients \
  bridge-utils \
  virtinst \
  cloud-image-utils

# Add your user to the libvirt group
sudo usermod -aG libvirt $USER
sudo usermod -aG kvm $USER

# Enable and start libvirtd
sudo systemctl enable --now libvirtd

# Verify KVM is available
kvm-ok
```

Download the Ubuntu cloud image to the KVM host:

```bash
# Download Ubuntu 22.04 cloud image
wget -P /var/lib/libvirt/images/ \
  https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.img

# Verify the download
ls -lh /var/lib/libvirt/images/jammy-server-cloudimg-amd64.img
```

## Installing Terraform and the libvirt Provider

On your workstation:

```bash
# Install Terraform (if not already installed)
wget -O- https://apt.releases.hashicorp.com/gpg | \
  sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] \
  https://apt.releases.hashicorp.com $(lsb_release -cs) main" | \
  sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt-get update && sudo apt-get install -y terraform
```

The libvirt provider is installed automatically when you run `terraform init` with the correct `required_providers` block.

## Project Structure

```
libvirt-terraform/
  main.tf
  variables.tf
  cloud_init.cfg
  network_config.cfg
  outputs.tf
  terraform.tfvars
```

## Provider Configuration

```hcl
# main.tf
terraform {
  required_providers {
    libvirt = {
      source  = "dmacvicar/libvirt"
      version = "~> 0.7"
    }
  }
}

# Connect to local libvirt socket
provider "libvirt" {
  uri = "qemu:///system"
}

# Or connect to a remote KVM host via SSH
# provider "libvirt" {
#   uri = "qemu+ssh://ubuntu@kvm-host.internal/system?sshauth=agent"
# }
```

## Variables

```hcl
# variables.tf
variable "base_image_path" {
  type    = string
  default = "/var/lib/libvirt/images/jammy-server-cloudimg-amd64.img"
}

variable "storage_pool" {
  type    = string
  default = "default"  # Libvirt pool name
}

variable "network_name" {
  type    = string
  default = "default"
}

variable "ssh_public_key" {
  type = string
}

variable "vms" {
  type = map(object({
    hostname = string
    memory   = number  # MB
    vcpus    = number
    disk_gb  = number
    ip       = string
    gateway  = string
  }))
}
```

```hcl
# terraform.tfvars
ssh_public_key = "ssh-ed25519 AAAAC3... your-key"

vms = {
  "web-01" = {
    hostname = "web-01"
    memory   = 2048
    vcpus    = 2
    disk_gb  = 20
    ip       = "192.168.122.101"
    gateway  = "192.168.122.1"
  }
  "db-01" = {
    hostname = "db-01"
    memory   = 4096
    vcpus    = 4
    disk_gb  = 50
    ip       = "192.168.122.102"
    gateway  = "192.168.122.1"
  }
}
```

## Cloud-Init Templates

```yaml
# cloud_init.cfg
#cloud-config
hostname: ${hostname}
fqdn: ${hostname}.local
manage_etc_hosts: true

users:
  - name: ubuntu
    groups: sudo
    shell: /bin/bash
    sudo: ALL=(ALL) NOPASSWD:ALL
    ssh_authorized_keys:
      - ${ssh_public_key}

package_update: true
package_upgrade: true
packages:
  - qemu-guest-agent
  - curl
  - htop
  - vim

runcmd:
  - systemctl enable qemu-guest-agent
  - systemctl start qemu-guest-agent

# Set timezone
timezone: UTC

# Disable root login via SSH
write_files:
  - path: /etc/ssh/sshd_config.d/99-disable-root.conf
    content: |
      PermitRootLogin no
      PasswordAuthentication no
```

```yaml
# network_config.cfg
version: 2
ethernets:
  ens3:
    dhcp4: false
    addresses:
      - ${ip}/24
    gateway4: ${gateway}
    nameservers:
      addresses:
        - 1.1.1.1
        - 8.8.8.8
```

## VM Resources

```hcl
# main.tf (continued)

# Reference the storage pool
data "libvirt_pool" "default" {
  name = var.storage_pool
}

# Create a network (optional - use 'default' network if already exists)
resource "libvirt_network" "vm_network" {
  name      = "terraform-net"
  mode      = "nat"
  domain    = "local"
  addresses = ["192.168.123.0/24"]
  dhcp {
    enabled = false  # We use static IPs via cloud-init
  }
  dns {
    enabled = true
  }
}

# Create VMs using for_each
resource "libvirt_volume" "base_image" {
  name   = "ubuntu-22-04-base"
  pool   = var.storage_pool
  source = var.base_image_path
  format = "qcow2"
}

resource "libvirt_volume" "vm_disk" {
  for_each = var.vms

  name           = "${each.key}-disk.qcow2"
  pool           = var.storage_pool
  base_volume_id = libvirt_volume.base_image.id
  format         = "qcow2"
  size           = each.value.disk_gb * 1073741824  # Convert GB to bytes
}

# Render cloud-init config per VM
resource "libvirt_cloudinit_disk" "cloud_init" {
  for_each = var.vms

  name = "${each.key}-cloudinit.iso"
  pool = var.storage_pool

  user_data = templatefile("${path.module}/cloud_init.cfg", {
    hostname       = each.value.hostname
    ssh_public_key = var.ssh_public_key
  })

  network_config = templatefile("${path.module}/network_config.cfg", {
    ip      = each.value.ip
    gateway = each.value.gateway
  })
}

# Create VMs
resource "libvirt_domain" "vm" {
  for_each = var.vms

  name   = each.key
  memory = each.value.memory
  vcpu   = each.value.vcpus

  # Use the cloud-init ISO
  cloudinit = libvirt_cloudinit_disk.cloud_init[each.key].id

  # Boot from disk
  boot_device {
    dev = ["hd"]
  }

  # Main disk
  disk {
    volume_id = libvirt_volume.vm_disk[each.key].id
    scsi      = true
  }

  # Network interface
  network_interface {
    network_name   = "default"  # Use existing default network
    # Or use the terraform-managed network:
    # network_id   = libvirt_network.vm_network.id
    addresses      = [each.value.ip]
    wait_for_lease = true  # Wait for DHCP lease before completing
  }

  # CPU and features
  cpu {
    mode = "host-passthrough"
  }

  # Graphics (serial console)
  console {
    type        = "pty"
    target_port = "0"
    target_type = "serial"
  }

  # QEMU Guest Agent channel
  qemu_agent = true

  # Firmware
  machine = "pc"

  # Power management
  autostart = true

  xml {
    xslt = file("${path.module}/fixup.xsl")  # Optional XSLT for XML customizations
  }
}
```

## Outputs

```hcl
# outputs.tf
output "vm_info" {
  value = {
    for name, vm in libvirt_domain.vm :
    name => {
      id  = vm.id
      ips = vm.network_interface[0].addresses
    }
  }
}
```

## Deploying

```bash
# Initialize
terraform init

# Plan
terraform plan -out=tfplan

# Apply
terraform apply tfplan

# Connect to a created VM
ssh ubuntu@192.168.122.101

# Destroy
terraform destroy
```

## Working with Existing Libvirt Networks

If you want to use the existing `default` network (192.168.122.0/24 with NAT):

```bash
# Check what networks exist
sudo virsh net-list

# The 'default' network is usually available
# Reference it in Terraform:
network_interface {
  network_name = "default"
}
```

## Using Bridge Networking

For VMs that need to be on the same network as the host:

```bash
# On the KVM host, create a bridge
sudo nmcli con add type bridge ifname br0 con-name br0
sudo nmcli con add type bridge-slave ifname ens3 master br0
sudo nmcli con up br0

# In Terraform
network_interface {
  bridge = "br0"
  mac    = "52:54:00:ab:cd:ef"  # Fixed MAC for static DHCP assignment
}
```

## Troubleshooting

**Permission denied accessing libvirt socket:**
```bash
# On the KVM host
sudo usermod -aG libvirt $USER
newgrp libvirt  # Apply without logging out

# Check socket permissions
ls -la /var/run/libvirt/libvirt-sock
```

**VM created but not getting IP:**
- Check `wait_for_lease = true` is set
- Verify the cloud-init network config is correct
- Look at the VM console: `sudo virsh console vm-name`

**Cloud-init not running:**
```bash
# SSH into the VM and check
sudo cat /var/log/cloud-init-output.log
sudo cloud-init status
```

**Disk size not expanding:**
- The cloud-init disk expand happens on first boot
- Verify `growpart` is available in the image: `which growpart`

The libvirt Terraform provider is well-maintained and handles the full lifecycle of KVM VMs. Once you have the base image and cloud-init templates set up, scaling to a dozen VMs is just a matter of adding entries to the `vms` variable.
