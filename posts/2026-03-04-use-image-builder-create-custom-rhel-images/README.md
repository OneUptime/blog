# How to Use Image Builder to Create Custom RHEL Images

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Image Builder, Custom Images, osbuild, System Administration, Linux

Description: A practical guide to using RHEL Image Builder for creating custom OS images across multiple output formats and deployment targets.

---

RHEL Image Builder (osbuild-composer) creates custom images for physical servers, virtual machines, and cloud platforms. This guide covers the end-to-end workflow from blueprint creation to image deployment.

## Quick Start

Install and start Image Builder:

```bash
# Install required packages
sudo dnf install -y osbuild-composer composer-cli

# Enable the service
sudo systemctl enable --now osbuild-composer.socket

# Verify the service
composer-cli status show
```

## Step 1: Define a Blueprint

```toml
# app-server.toml
name = "app-server"
description = "Application server base image"
version = "1.0.0"

[[packages]]
name = "python3"
version = "*"

[[packages]]
name = "nginx"
version = "*"

[[packages]]
name = "redis"
version = "*"

[[packages]]
name = "git"
version = "*"

[[customizations.user]]
name = "appuser"
groups = ["wheel"]
key = "ssh-ed25519 AAAAC3NzaC1... appuser@dev"

[customizations.services]
enabled = ["nginx", "redis", "sshd", "firewalld"]

[customizations.firewall]
ports = ["22:tcp", "80:tcp", "443:tcp"]

[customizations.timezone]
timezone = "UTC"
```

## Step 2: Push and Validate

```bash
# Push the blueprint
composer-cli blueprints push app-server.toml

# Validate by resolving dependencies
composer-cli blueprints depsolve app-server
```

## Step 3: Build for Your Target

```bash
# List available output types
composer-cli compose types

# Build for different targets
# KVM/libvirt
composer-cli compose start app-server qcow2

# VMware
composer-cli compose start app-server vmdk

# AWS
composer-cli compose start app-server ami

# Azure
composer-cli compose start app-server vhd

# Bare metal ISO
composer-cli compose start app-server image-installer
```

## Step 4: Monitor and Download

```bash
# Check build status
composer-cli compose status

# View detailed info for a specific build
composer-cli compose info <uuid>

# View build logs
composer-cli compose log <uuid>

# Download the completed image
composer-cli compose image <uuid>
```

## Step 5: Deploy

For QCOW2 images on KVM:

```bash
# Copy to libvirt storage
sudo cp <uuid>-disk.qcow2 /var/lib/libvirt/images/app-server.qcow2

# Create the VM
sudo virt-install \
  --name app-server \
  --memory 4096 \
  --vcpus 2 \
  --disk /var/lib/libvirt/images/app-server.qcow2 \
  --import \
  --os-variant rhel9.4 \
  --network bridge=virbr0 \
  --noautoconsole
```

## Cleanup

```bash
# Delete old composes to free disk space
composer-cli compose delete <uuid>

# Delete a blueprint
composer-cli blueprints delete app-server
```

Image Builder provides a consistent workflow for producing images across all deployment targets from a single blueprint definition.
