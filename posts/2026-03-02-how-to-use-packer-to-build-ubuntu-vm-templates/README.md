# How to Use Packer to Build Ubuntu VM Templates

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Packer, Automation, Infrastructure as Code, Virtualization

Description: Learn how to use HashiCorp Packer to build consistent, reproducible Ubuntu VM templates for various hypervisors, with automated configuration and cloud-init integration.

---

Manually creating VM templates is error-prone and time-consuming. Packer solves this by automating the entire process - from booting the ISO to installing packages, running configuration scripts, and outputting a ready-to-use template. The result is a reproducible, version-controlled template build process where you know exactly what went into each template.

This guide covers building Ubuntu VM templates with Packer for both Proxmox VE and QEMU/KVM targets.

## Installing Packer

Packer is a single binary. Install it from HashiCorp's official repository:

```bash
# Add HashiCorp GPG key
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg

# Add the official HashiCorp Linux repository
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] \
    https://apt.releases.hashicorp.com $(lsb_release -cs) main" | \
    sudo tee /etc/apt/sources.list.d/hashicorp.list

# Install Packer
sudo apt-get update && sudo apt-get install -y packer

# Verify installation
packer version
```

## Packer Template Structure

A Packer template (written in HCL2) has three main sections:

- **variables**: Configurable values that can be overridden at build time
- **source**: Defines the hypervisor/builder and how the initial VM is configured
- **build**: Specifies provisioners that run after the VM boots

Create a project directory:

```bash
mkdir -p ~/packer/ubuntu-template
cd ~/packer/ubuntu-template
```

## Building for QEMU/KVM

### Creating the Autoinstall Configuration

Ubuntu 20.04+ uses `autoinstall` for unattended server installation. Create a cloud-init autoinstall file:

```bash
mkdir -p http
```

```yaml
# http/user-data
#cloud-config
autoinstall:
  version: 1
  locale: en_US.UTF-8
  keyboard:
    layout: us
  network:
    network:
      version: 2
      ethernets:
        ens3:
          dhcp4: true
  storage:
    layout:
      name: lvm
  identity:
    hostname: ubuntu-template
    username: ubuntu
    # Generate password hash with: echo 'password' | openssl passwd -6 -stdin
    password: "$6$rounds=4096$saltsalt$hash..."
  ssh:
    install-server: true
    authorized-keys: []
    allow-pw: true
  packages:
    - qemu-guest-agent
    - curl
    - wget
    - git
    - vim
    - net-tools
  late-commands:
    # Enable QEMU guest agent
    - systemctl enable qemu-guest-agent
    # Allow passwordless sudo for the ubuntu user (for provisioning)
    - "echo 'ubuntu ALL=(ALL) NOPASSWD:ALL' > /target/etc/sudoers.d/ubuntu"
    - "chmod 440 /target/etc/sudoers.d/ubuntu"
```

```yaml
# http/meta-data (required but can be empty)
```

### Writing the Packer Template

```hcl
# ubuntu-qemu.pkr.hcl

packer {
  required_plugins {
    qemu = {
      version = ">= 1.0.0"
      source  = "github.com/hashicorp/qemu"
    }
  }
}

variable "ubuntu_version" {
  type    = string
  default = "22.04.4"
}

variable "ubuntu_iso_url" {
  type    = string
  default = "https://releases.ubuntu.com/22.04/ubuntu-22.04.4-live-server-amd64.iso"
}

variable "ubuntu_iso_checksum" {
  type    = string
  # Update with actual checksum from Ubuntu download page
  default = "sha256:45f873de9f8cb637345d6e66a583762730bbea30277ef7b32c9c3bd6700a32b2"
}

variable "vm_name" {
  type    = string
  default = "ubuntu-2204-template"
}

variable "disk_size" {
  type    = string
  default = "20G"
}

source "qemu" "ubuntu" {
  # ISO configuration
  iso_url      = var.ubuntu_iso_url
  iso_checksum = var.ubuntu_iso_checksum

  # Output configuration
  vm_name          = var.vm_name
  output_directory = "output-${var.vm_name}"
  disk_image       = false

  # VM hardware configuration
  cpus      = 2
  memory    = 2048
  disk_size = var.disk_size
  format    = "qcow2"

  # Boot configuration for autoinstall
  # The HTTP server serves the cloud-init user-data
  http_directory = "http"
  http_port_min  = 8100
  http_port_max  = 8200

  boot_wait = "5s"
  boot_command = [
    "<wait>",
    "e<wait>",
    "<down><down><down><end>",
    # Pass autoinstall URL to kernel
    " autoinstall ds=nocloud-net\\;s=http://{{ .HTTPIP }}:{{ .HTTPPort }}/",
    "<f10><wait>"
  ]

  # SSH connection settings (for provisioners after installation)
  communicator     = "ssh"
  ssh_username     = "ubuntu"
  ssh_password     = "ubuntu"
  ssh_timeout      = "30m"
  shutdown_command = "sudo shutdown -P now"

  # Headless build (no GUI)
  headless = true

  # QEMU-specific settings for performance
  qemuargs = [
    ["-m", "2048M"],
    ["-cpu", "host"],
    ["-smp", "2"]
  ]
}

build {
  name    = "ubuntu-template"
  sources = ["source.qemu.ubuntu"]

  # Update packages after installation
  provisioner "shell" {
    inline = [
      # Wait for cloud-init to complete
      "sudo cloud-init status --wait",
      # Update all packages
      "sudo apt-get update",
      "sudo apt-get upgrade -y",
      # Install common utilities
      "sudo apt-get install -y \
        htop \
        iotop \
        tcpdump \
        nmap \
        jq \
        unzip",
    ]
  }

  # Run a configuration script from a file
  provisioner "shell" {
    script = "scripts/configure-template.sh"
  }

  # Clean up before creating template
  provisioner "shell" {
    inline = [
      # Remove SSH host keys (they'll be regenerated on first boot)
      "sudo rm -f /etc/ssh/ssh_host_*",
      # Clean cloud-init so it runs fresh on first boot
      "sudo cloud-init clean --logs",
      # Clear bash history
      "cat /dev/null > ~/.bash_history",
      "sudo sh -c 'cat /dev/null > /var/log/syslog'",
      # Remove temporary files
      "sudo apt-get autoremove -y",
      "sudo apt-get autoclean",
    ]
  }
}
```

Create the configuration script:

```bash
mkdir -p scripts
```

```bash
#!/bin/bash
# scripts/configure-template.sh
# Apply standard configuration to all templates derived from this build

set -euo pipefail

# Configure sysctl settings for a server workload
cat >> /etc/sysctl.d/99-template.conf << 'EOF'
# Increase network buffer sizes
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
# Enable IP forwarding (useful for containers/VMs)
net.ipv4.ip_forward = 1
EOF

# Set timezone
timedatectl set-timezone UTC

# Configure journald to limit log size
sed -i 's/#SystemMaxUse=/SystemMaxUse=500M/' /etc/systemd/journald.conf

# Enable and configure chrony for NTP
apt-get install -y chrony
systemctl enable chrony

echo "Template configuration complete"
```

```bash
chmod +x scripts/configure-template.sh
```

### Building the Template

```bash
# Initialize Packer plugins
packer init .

# Validate the template before building
packer validate ubuntu-qemu.pkr.hcl

# Build the template (takes 10-30 minutes)
packer build ubuntu-qemu.pkr.hcl

# Override variables at build time
packer build \
    -var "vm_name=ubuntu-2204-minimal" \
    -var "disk_size=10G" \
    ubuntu-qemu.pkr.hcl
```

## Building for Proxmox VE

For Proxmox, use the Proxmox builder which creates the template directly in Proxmox:

```hcl
# ubuntu-proxmox.pkr.hcl

packer {
  required_plugins {
    proxmox = {
      version = ">= 1.1.0"
      source  = "github.com/hashicorp/proxmox"
    }
  }
}

variable "proxmox_url" {
  type    = string
  default = "https://192.168.1.100:8006/api2/json"
}

variable "proxmox_username" {
  type    = string
  default = "root@pam"
}

variable "proxmox_password" {
  type      = string
  sensitive = true
}

variable "proxmox_node" {
  type    = string
  default = "pve1"
}

source "proxmox-iso" "ubuntu" {
  proxmox_url              = var.proxmox_url
  username                 = var.proxmox_username
  password                 = var.proxmox_password
  node                     = var.proxmox_node
  insecure_skip_tls_verify = true

  # VM configuration
  vm_id   = 9000
  vm_name = "ubuntu-2204-template"
  cores   = 2
  memory  = 2048

  # ISO - upload to Proxmox or reference existing
  iso_url      = "https://releases.ubuntu.com/22.04/ubuntu-22.04.4-live-server-amd64.iso"
  iso_checksum = "sha256:45f873de9f8cb637345d6e66a583762730bbea30277ef7b32c9c3bd6700a32b2"
  iso_storage_pool = "local"
  unmount_iso = true

  # Network
  network_adapters {
    model  = "virtio"
    bridge = "vmbr0"
  }

  # Disk
  disks {
    disk_size    = "20G"
    storage_pool = "local-lvm"
    type         = "scsi"
    format       = "raw"
  }

  # Autoinstall via cloud-init HTTP server
  http_directory = "http"
  http_port_min  = 8100
  http_port_max  = 8200

  boot_command = [
    "<wait>",
    "e<wait>",
    "<down><down><down><end>",
    " autoinstall ds=nocloud-net\\;s=http://{{ .HTTPIP }}:{{ .HTTPPort }}/",
    "<f10><wait>"
  ]
  boot_wait = "5s"

  ssh_username = "ubuntu"
  ssh_password = "ubuntu"
  ssh_timeout  = "30m"

  shutdown_command = "sudo shutdown -P now"

  # Convert to Proxmox template after build
  template_name        = "ubuntu-2204-template"
  template_description = "Ubuntu 22.04 LTS template built with Packer"
}

build {
  sources = ["source.proxmox-iso.ubuntu"]

  provisioner "shell" {
    inline = [
      "sudo cloud-init status --wait",
      "sudo apt-get update && sudo apt-get upgrade -y",
    ]
  }

  provisioner "shell" {
    script = "scripts/configure-template.sh"
  }

  provisioner "shell" {
    inline = [
      "sudo rm -f /etc/ssh/ssh_host_*",
      "sudo cloud-init clean --logs",
      "sudo truncate -s 0 /etc/machine-id",
    ]
  }
}
```

Build it:

```bash
packer init .
packer build \
    -var "proxmox_password=your_root_password" \
    ubuntu-proxmox.pkr.hcl
```

## Using Variables Files

For managing sensitive values and environment-specific settings:

```hcl
# proxmox.pkrvars.hcl
proxmox_url      = "https://192.168.1.100:8006/api2/json"
proxmox_username = "root@pam"
proxmox_password = "your_secure_password"
proxmox_node     = "pve1"
```

```bash
# Use the variables file during build
packer build \
    -var-file="proxmox.pkrvars.hcl" \
    ubuntu-proxmox.pkr.hcl
```

Add `*.pkrvars.hcl` to `.gitignore` to avoid committing credentials.

## Summary

Packer transforms template creation from a manual, error-prone process into a reproducible automated build. Key practices:

- Store Packer templates in version control alongside application code
- Use variables files for environment-specific settings, never hardcode credentials
- Run `packer validate` in CI before committing template changes
- Tag and version templates with build timestamps for traceability
- Clean cloud-init and SSH host keys before templating to ensure VMs cloned from the template get fresh identities

With a working Packer pipeline, creating a new template variation (minimal, with Docker, with monitoring agents) becomes a matter of adding a provisioner block rather than a full manual rebuild.
