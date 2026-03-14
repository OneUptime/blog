# How to Use cloud-init with Packer for Automated Builds on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Packer, Cloud-init, Automation, Infrastructure as Code

Description: Combine Packer and cloud-init to fully automate Ubuntu VM template builds, using cloud-init autoinstall for unattended OS installation and Packer provisioners for post-install configuration.

---

Ubuntu's `cloud-init` and HashiCorp Packer solve different parts of the automation problem. `cloud-init` handles the OS installation phase - answering installer questions, partitioning disks, creating users, and installing base packages without human interaction. Packer handles the post-installation phase - running scripts, installing software, applying configuration, and packaging the result as a reusable template.

Together, they create a fully automated pipeline from ISO to finished template with no manual steps.

## How the Pieces Fit Together

The build flow works like this:

1. Packer starts a VM from an Ubuntu ISO and serves the cloud-init configuration files via a built-in HTTP server
2. Ubuntu's installer detects the `autoinstall` parameter in the kernel command line and fetches the configuration from Packer's HTTP server
3. The unattended installation completes and the VM reboots
4. Packer connects via SSH and runs provisioner scripts
5. The finished VM image is saved as a template

## cloud-init Autoinstall Configuration

Ubuntu uses `autoinstall` (a superset of cloud-init) for server installations. The configuration lives in two files served by Packer's HTTP server.

Create the directory structure:

```bash
mkdir -p ~/packer/ubuntu-cloudinit/http
mkdir -p ~/packer/ubuntu-cloudinit/scripts
cd ~/packer/ubuntu-cloudinit
```

### user-data File

The `user-data` file drives the entire installation:

```yaml
# http/user-data
#cloud-config
autoinstall:
  version: 1

  # System locale and keyboard
  locale: en_US.UTF-8
  keyboard:
    layout: us
    variant: ""

  # Network configuration during installation
  network:
    network:
      version: 2
      ethernets:
        # Match any ethernet interface
        any-nic:
          match:
            name: "e*"
          dhcp4: true

  # Disk layout - LVM on the first available disk
  storage:
    layout:
      name: lvm
    # For custom partitioning, use the 'config' layout instead:
    # config:
    #   - type: disk
    #     id: disk0
    #     match:
    #       size: largest
    #   - type: partition
    #     id: boot-part
    #     device: disk0
    #     size: 512M
    #     flag: boot

  # User account created during installation
  identity:
    hostname: ubuntu-template
    username: ubuntu
    # Generate with: printf 'ubuntu' | openssl passwd -6 -stdin
    password: "$6$rounds=4096$saltsalt$hash..."
    realname: Ubuntu User

  # SSH configuration
  ssh:
    install-server: true
    # Add SSH public keys for passwordless provisioning
    authorized-keys:
      - "ssh-ed25519 AAAA... your-packer-build-key"
    # Allow password auth during build for Packer's SSH communicator
    allow-pw: true

  # Packages to install during the OS installation phase
  packages:
    - qemu-guest-agent
    - openssh-server
    - curl
    - wget
    - git
    - vim
    - python3
    - python3-pip
    - apt-transport-https
    - ca-certificates
    - gnupg
    - lsb-release

  # Late commands run in the target system's chroot after installation
  late-commands:
    # Allow sudo without password for the ubuntu user (required for Packer provisioners)
    - "echo 'ubuntu ALL=(ALL) NOPASSWD:ALL' > /target/etc/sudoers.d/ubuntu"
    - "chmod 440 /target/etc/sudoers.d/ubuntu"

    # Enable QEMU guest agent for Proxmox/KVM integration
    - "in-target systemctl enable qemu-guest-agent"

    # Set a permanent hostname
    - "echo 'ubuntu-template' > /target/etc/hostname"

    # Disable motd-news which phones home
    - "in-target sed -i 's/^ENABLED=1$/ENABLED=0/' /etc/default/motd-news"

  # Disable confirmation prompts at the end of installation
  user-data:
    disable_root: true

  # Skip the installer's final confirmation screen
  confirm-bugs: false
```

### meta-data File

The `meta-data` file is required but can be empty:

```yaml
# http/meta-data
# Empty meta-data file required by cloud-init
```

## Packer Template with cloud-init

Now create the Packer template that uses these files:

```hcl
# ubuntu-cloudinit.pkr.hcl

packer {
  required_plugins {
    qemu = {
      version = ">= 1.0.10"
      source  = "github.com/hashicorp/qemu"
    }
  }
}

# Variables allow customization at build time
variable "ubuntu_iso_url" {
  type    = string
  default = "https://releases.ubuntu.com/22.04/ubuntu-22.04.4-live-server-amd64.iso"
}

variable "ubuntu_iso_checksum" {
  type    = string
  default = "sha256:45f873de9f8cb637345d6e66a583762730bbea30277ef7b32c9c3bd6700a32b2"
}

variable "vm_name" {
  type    = string
  default = "ubuntu-2204-cloudinit"
}

variable "output_dir" {
  type    = string
  default = "output"
}

variable "ssh_username" {
  type    = string
  default = "ubuntu"
}

variable "ssh_password" {
  type      = string
  sensitive = true
  default   = "ubuntu"
}

source "qemu" "ubuntu_cloudinit" {
  iso_url      = var.ubuntu_iso_url
  iso_checksum = var.ubuntu_iso_checksum

  vm_name          = var.vm_name
  output_directory = "${var.output_dir}/${var.vm_name}"

  # VM specifications
  cpus      = 2
  memory    = 2048
  disk_size = "20G"
  format    = "qcow2"

  # Packer's built-in HTTP server serves the cloud-init files
  http_directory = "http"
  http_port_min  = 8100
  http_port_max  = 8199

  # Boot command: Interrupt the boot, add autoinstall kernel parameter
  # HTTPIP and HTTPPort are replaced by Packer with the actual values
  boot_wait = "5s"
  boot_command = [
    # Interrupt boot
    "<wait>",
    "e<wait>",
    # Navigate to the end of the linux line in grub
    "<down><down><down><end>",
    # Add autoinstall kernel parameters
    # ds=nocloud-net sets the datasource URL
    " autoinstall ds=nocloud-net\\;s=http://{{ .HTTPIP }}:{{ .HTTPPort }}/",
    # Boot with the modified command
    "<f10>",
    # Wait for the installer to start and load the config
    "<wait5m>"
  ]

  # SSH communicator - how Packer connects after installation
  communicator = "ssh"
  ssh_username  = var.ssh_username
  ssh_password  = var.ssh_password
  # Long timeout because installation takes time
  ssh_timeout   = "40m"
  # Wait for cloud-init to completely finish before connecting
  ssh_handshake_attempts = 100

  shutdown_command = "sudo shutdown -P now"
  headless         = true
}

build {
  name    = "ubuntu-cloudinit-build"
  sources = ["source.qemu.ubuntu_cloudinit"]

  # Step 1: Wait for cloud-init to fully complete
  # (The SSH connection happens after installation, but cloud-init may still be running)
  provisioner "shell" {
    inline = [
      "echo 'Waiting for cloud-init to complete...'",
      "sudo cloud-init status --wait",
      "echo 'cloud-init complete'"
    ]
  }

  # Step 2: System updates
  provisioner "shell" {
    inline = [
      "sudo apt-get update",
      "sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y",
    ]
    # Retry in case of transient apt failures
    max_retries = 3
  }

  # Step 3: Install additional software from a script file
  provisioner "shell" {
    script          = "scripts/install-software.sh"
    execute_command = "sudo bash '{{.Path}}'"
  }

  # Step 4: Upload configuration files
  provisioner "file" {
    source      = "configs/sysctl.conf"
    destination = "/tmp/sysctl.conf"
  }

  provisioner "shell" {
    inline = ["sudo cp /tmp/sysctl.conf /etc/sysctl.d/99-custom.conf"]
  }

  # Step 5: Template cleanup
  provisioner "shell" {
    script          = "scripts/cleanup.sh"
    execute_command = "sudo bash '{{.Path}}'"
  }

  # After the build, show the output location
  post-processor "manifest" {
    output = "manifest.json"
  }
}
```

## Supporting Scripts

### install-software.sh

```bash
#!/bin/bash
# scripts/install-software.sh
# Install software that will be present in all VMs from this template

set -euo pipefail

echo "Installing Docker..."
# Add Docker's official GPG key
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add default user to docker group
usermod -aG docker ubuntu

echo "Installing common utilities..."
apt-get install -y \
    htop \
    iotop \
    ncdu \
    tmux \
    jq \
    unzip \
    nmap \
    netcat-openbsd \
    tcpdump \
    dnsutils \
    net-tools

echo "Software installation complete"
```

### cleanup.sh

```bash
#!/bin/bash
# scripts/cleanup.sh
# Clean up the template before packaging

set -euo pipefail

echo "Cleaning up template..."

# Remove SSH host keys (regenerated on first boot from template)
rm -f /etc/ssh/ssh_host_*

# Clean cloud-init state (runs fresh for each VM cloned from template)
cloud-init clean --logs --machine-id

# Remove machine-id (assigned fresh on first boot)
truncate -s 0 /etc/machine-id
rm -f /var/lib/dbus/machine-id
# Some systems need this symlink intact
ln -sf /etc/machine-id /var/lib/dbus/machine-id

# Remove package cache
apt-get autoremove -y
apt-get autoclean
rm -rf /var/lib/apt/lists/*

# Clear bash history for all users
for user_home in /root /home/*; do
    truncate -s 0 "$user_home/.bash_history" 2>/dev/null || true
done

# Clear system logs
journalctl --rotate
journalctl --vacuum-time=1s
truncate -s 0 /var/log/syslog 2>/dev/null || true
truncate -s 0 /var/log/auth.log 2>/dev/null || true

# Remove temporary files
rm -rf /tmp/* /var/tmp/*

echo "Cleanup complete"
```

### configs/sysctl.conf

```ini
# configs/sysctl.conf
# Custom kernel parameters applied to all VMs from this template

# Network performance
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 87380 16777216
net.ipv4.tcp_wmem = 4096 65536 16777216

# Security
net.ipv4.conf.default.rp_filter = 1
net.ipv4.conf.all.rp_filter = 1
net.ipv4.tcp_syncookies = 1

# Container-friendly settings
net.ipv4.ip_forward = 1
net.bridge.bridge-nf-call-iptables = 1
```

## Building the Template

```bash
# Initialize Packer plugins
packer init .

# Validate the configuration
packer validate ubuntu-cloudinit.pkr.hcl

# Build (takes 20-40 minutes depending on network and hardware)
packer build ubuntu-cloudinit.pkr.hcl

# Build with a specific variable override
packer build \
    -var "vm_name=ubuntu-2204-docker" \
    -var "output_dir=/mnt/templates" \
    ubuntu-cloudinit.pkr.hcl

# Debug mode shows more output if the build fails
PACKER_LOG=1 packer build ubuntu-cloudinit.pkr.hcl
```

## Troubleshooting Failed Builds

Common issues and their solutions:

```bash
# Issue: SSH timeout - the installer didn't finish in time
# Solution: Increase ssh_timeout and check boot_command timing

# Issue: cloud-init didn't fetch the autoinstall config
# Fix: Enable Packer debug mode to see the HTTP server URL
PACKER_LOG=1 packer build ubuntu-cloudinit.pkr.hcl 2>&1 | grep "HTTP"

# Issue: user-data syntax errors
# Validate your user-data before building
python3 -c "import yaml; yaml.safe_load(open('http/user-data'))"

# Issue: Build hangs at installation prompt
# The autoinstall may not be loading - check the boot_command syntax
```

## Summary

The Packer plus cloud-init combination automates the full template build pipeline. cloud-init's `autoinstall` eliminates the manual installation phase, while Packer's provisioners handle post-installation customization and the final cleanup for templating.

The resulting build process is: run `packer build`, wait 30 minutes, get a clean template. Version control the Packer templates and cloud-init configs together, and rebuilding a template after a security update becomes a one-command operation.
