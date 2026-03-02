# How to Provision Ubuntu VMs on Proxmox with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Proxmox, Terraform, Infrastructure as Code, Virtualization

Description: A complete guide to using Terraform with the Proxmox provider to automate provisioning of Ubuntu virtual machines from cloud-init templates on Proxmox VE.

---

Proxmox VE is a popular open-source hypervisor for home labs and small-to-medium infrastructure. While the Proxmox UI works well for manual VM creation, Terraform lets you define your VMs as code, reproduce environments, and manage them through a consistent workflow.

This guide covers setting up the Proxmox Terraform provider and creating Ubuntu VMs from a cloud-init template.

## Prerequisites

- Proxmox VE 7.x or 8.x with API access
- Terraform 1.5 or newer installed on your workstation
- An Ubuntu cloud image imported into Proxmox as a template
- Network access from your workstation to the Proxmox API

## Creating an Ubuntu Cloud-Init Template on Proxmox

Before Terraform can create VMs, you need a base template. Run these commands on the Proxmox host:

```bash
# Download the Ubuntu 22.04 cloud image
wget https://cloud-images.ubuntu.com/jammy/current/jammy-server-cloudimg-amd64.img

# Install qemu-guest-agent into the image (useful for Proxmox integration)
# This requires libguestfs-tools
sudo apt-get install -y libguestfs-tools
virt-customize -a jammy-server-cloudimg-amd64.img \
  --install qemu-guest-agent \
  --run-command "systemctl enable qemu-guest-agent"

# Create a VM that will become the template
qm create 9000 \
  --name "ubuntu-22-04-template" \
  --memory 2048 \
  --cores 2 \
  --net0 virtio,bridge=vmbr0

# Import the cloud image as the disk
qm importdisk 9000 jammy-server-cloudimg-amd64.img local-lvm

# Attach the imported disk
qm set 9000 --scsihw virtio-scsi-pci --scsi0 local-lvm:vm-9000-disk-0

# Add cloud-init drive
qm set 9000 --ide2 local-lvm:cloudinit

# Set boot order to the disk
qm set 9000 --boot c --bootdisk scsi0

# Enable serial console and agent
qm set 9000 --serial0 socket --vga serial0
qm set 9000 --agent enabled=1

# Convert to template
qm template 9000
```

## Setting Up Proxmox API Access

Terraform needs API credentials to communicate with Proxmox. Create a dedicated API token:

```bash
# In Proxmox, run:
pveum user add terraform@pve --comment "Terraform automation user"
pveum role add TerraformRole \
  --privs "VM.Allocate VM.Clone VM.Config.CDROM VM.Config.CPU VM.Config.Cloudinit VM.Config.Disk VM.Config.HWType VM.Config.Memory VM.Config.Network VM.Config.Options VM.Monitor VM.PowerMgmt Datastore.AllocateSpace Datastore.Audit Pool.Audit Sys.Audit"
pveum aclmod / -user terraform@pve -role TerraformRole

# Create API token (no token expiry for automation)
pveum user token add terraform@pve terraform-token --privsep=0
# Save the token secret displayed - you cannot retrieve it again
```

## Project Structure

```
proxmox-terraform/
  main.tf
  variables.tf
  outputs.tf
  terraform.tfvars
  vms.tf
```

## Provider Configuration

```hcl
# main.tf
terraform {
  required_providers {
    proxmox = {
      source  = "bpg/proxmox"
      version = "~> 0.46"
    }
  }
}

provider "proxmox" {
  endpoint  = var.proxmox_api_url
  api_token = var.proxmox_api_token
  insecure  = false  # Set true only if using self-signed cert without proper CA

  ssh {
    agent       = true
    username    = "root"
    private_key = file("~/.ssh/id_ed25519")
  }
}
```

## Variables

```hcl
# variables.tf
variable "proxmox_api_url" {
  type        = string
  description = "URL for the Proxmox API"
}

variable "proxmox_api_token" {
  type        = string
  sensitive   = true
  description = "Proxmox API token in format user@realm!token-name=token-secret"
}

variable "proxmox_node" {
  type        = string
  description = "Proxmox node name"
}

variable "template_id" {
  type        = number
  description = "VM ID of the Ubuntu cloud-init template"
  default     = 9000
}

variable "storage_pool" {
  type        = string
  description = "Proxmox storage pool for VM disks"
  default     = "local-lvm"
}

variable "ssh_public_key" {
  type        = string
  description = "SSH public key to inject via cloud-init"
}

variable "default_gateway" {
  type        = string
  description = "Default gateway for VMs"
}

variable "dns_servers" {
  type    = list(string)
  default = ["1.1.1.1", "8.8.8.8"]
}
```

```hcl
# terraform.tfvars  (keep this out of version control)
proxmox_api_url   = "https://proxmox.internal:8006/"
proxmox_api_token = "terraform@pve!terraform-token=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
proxmox_node      = "pve01"
ssh_public_key    = "ssh-ed25519 AAAAC3... your-key"
default_gateway   = "192.168.1.1"
```

## Defining VMs

```hcl
# vms.tf

# Single VM resource
resource "proxmox_virtual_environment_vm" "web_server" {
  name      = "web-01"
  node_name = var.proxmox_node
  vm_id     = 201

  # Clone from template
  clone {
    vm_id   = var.template_id
    full    = true      # Full clone (not linked)
    retries = 3
  }

  # CPU
  cpu {
    cores   = 2
    sockets = 1
    type    = "host"  # Pass through host CPU features
  }

  # Memory (in MB)
  memory {
    dedicated = 4096
    floating  = 4096  # Enable ballooning
  }

  # Disk
  disk {
    datastore_id = var.storage_pool
    interface    = "scsi0"
    size         = 40  # GB
    iothread     = true
    ssd          = true
  }

  # Network
  network_device {
    bridge   = "vmbr0"
    model    = "virtio"
  }

  # Enable QEMU guest agent
  agent {
    enabled = true
  }

  # Cloud-init configuration
  initialization {
    ip_config {
      ipv4 {
        address = "192.168.1.201/24"
        gateway = var.default_gateway
      }
    }

    dns {
      servers = var.dns_servers
    }

    user_account {
      username = "ubuntu"
      keys     = [var.ssh_public_key]
    }

    # Cloud-init user data
    user_data_file_id = proxmox_virtual_environment_file.cloud_init_web.id
  }

  # Boot order
  boot_order = ["scsi0"]

  # Start VM after creation
  started = true

  # OS type (helps Proxmox with ACPI settings)
  operating_system {
    type = "l26"  # Linux 2.6+ kernel
  }

  tags = ["ubuntu", "web", "production"]
}

# Cloud-init user data snippet
resource "proxmox_virtual_environment_file" "cloud_init_web" {
  content_type = "snippets"
  datastore_id = "local"
  node_name    = var.proxmox_node

  source_raw {
    file_name = "cloud-init-web-01.yml"
    data = <<-EOF
      #cloud-config
      package_update: true
      packages:
        - nginx
        - curl
        - htop
      runcmd:
        - systemctl enable nginx
        - systemctl start nginx
      users:
        - name: ubuntu
          groups: sudo
          shell: /bin/bash
          sudo: ALL=(ALL) NOPASSWD:ALL
    EOF
  }
}
```

## Creating Multiple VMs with for_each

```hcl
# vms.tf - multiple VMs

variable "vms" {
  type = map(object({
    vm_id  = number
    ip     = string
    cores  = number
    memory = number
    disk   = number
  }))
  default = {
    "app-01" = { vm_id = 211, ip = "192.168.1.211", cores = 4, memory = 8192, disk = 50 }
    "app-02" = { vm_id = 212, ip = "192.168.1.212", cores = 4, memory = 8192, disk = 50 }
    "app-03" = { vm_id = 213, ip = "192.168.1.213", cores = 2, memory = 4096, disk = 30 }
  }
}

resource "proxmox_virtual_environment_vm" "app_servers" {
  for_each = var.vms

  name      = each.key
  node_name = var.proxmox_node
  vm_id     = each.value.vm_id

  clone {
    vm_id = var.template_id
    full  = true
  }

  cpu {
    cores = each.value.cores
    type  = "host"
  }

  memory {
    dedicated = each.value.memory
  }

  disk {
    datastore_id = var.storage_pool
    interface    = "scsi0"
    size         = each.value.disk
    iothread     = true
  }

  network_device {
    bridge = "vmbr0"
    model  = "virtio"
  }

  agent { enabled = true }

  initialization {
    ip_config {
      ipv4 {
        address = "${each.value.ip}/24"
        gateway = var.default_gateway
      }
    }

    user_account {
      username = "ubuntu"
      keys     = [var.ssh_public_key]
    }
  }

  started = true
  tags    = ["ubuntu", "application"]
}
```

## Outputs

```hcl
# outputs.tf
output "vm_ips" {
  description = "IP addresses of created VMs"
  value = {
    for name, vm in proxmox_virtual_environment_vm.app_servers :
    name => vm.initialization[0].ip_config[0].ipv4[0].address
  }
}
```

## Deploying

```bash
# Initialize the provider
terraform init

# Preview what will be created
terraform plan

# Apply
terraform apply

# Destroy when done
terraform destroy
```

## Troubleshooting

**Clone fails with "unable to parse qemu config":**
- Ensure the template VM has been properly converted with `qm template <id>`
- Check the template ID in `terraform.tfvars`

**Cloud-init doesn't apply:**
- Verify the cloud-init drive is attached to the template (`qm config 9000 | grep ide2`)
- Check Proxmox logs: `journalctl -u pvedaemon`

**API connection refused:**
```bash
# Test the API
curl -k "https://proxmox.internal:8006/api2/json/version" \
  -H "Authorization: PVEAPIToken=terraform@pve!terraform-token=your-token"
```

**VM boots but SSH is unavailable:**
- The qemu-guest-agent needs to be running for Proxmox to report the IP
- Wait for cloud-init to complete (can take 1-3 minutes on first boot)
- Check cloud-init log on the VM: `sudo cat /var/log/cloud-init-output.log`

Once this workflow is established, spinning up a new Ubuntu VM takes about 60 seconds of terraform apply time. The real value comes when you need to create consistent environments across multiple Proxmox nodes or reproduce a full stack for testing.
