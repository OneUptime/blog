# How to Install and Configure RHEL Image Builder on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Image Builder, composer-cli, osbuild, System Administration, Linux

Description: Install and configure RHEL Image Builder (osbuild-composer) to create custom RHEL images for bare metal, virtual machines, and cloud deployments.

---

RHEL Image Builder (osbuild-composer) lets you create custom RHEL images tailored to your needs. You can build images for various targets including bare metal ISOs, VMware, QCOW2, AWS AMIs, and Azure VHDs.

## Installing Image Builder

```bash
# Install the Image Builder packages
sudo dnf install -y osbuild-composer composer-cli cockpit-composer

# Enable and start the osbuild-composer service
sudo systemctl enable --now osbuild-composer.socket

# Verify the service is running
sudo systemctl status osbuild-composer.socket
```

## Configuring Access

Add your user to the weldr group to use composer-cli without sudo:

```bash
# Add your user to the weldr group
sudo usermod -aG weldr $(whoami)

# Log out and back in for group membership to take effect
# Or use newgrp
newgrp weldr
```

## Verifying the Installation

```bash
# Check composer-cli can communicate with the service
composer-cli status show

# List available image types
composer-cli compose types
```

You should see output listing available image formats:

```
ami
azure-image
edge-commit
edge-installer
guest-image
image-installer
iso
oci
openstack
qcow2
vhd
vmdk
vsphere
```

## Enabling the Cockpit Web Interface

```bash
# Enable and start Cockpit
sudo systemctl enable --now cockpit.socket

# Allow Cockpit through the firewall
sudo firewall-cmd --permanent --add-service=cockpit
sudo firewall-cmd --reload
```

Access the web interface at `https://<your-rhel-ip>:9090` and navigate to the Image Builder section.

## Creating a Basic Blueprint

Test Image Builder with a simple blueprint:

```bash
# Create a basic blueprint
cat > basic-server.toml << 'TOML'
name = "basic-server"
description = "Basic RHEL server image"
version = "1.0.0"

[[packages]]
name = "vim-enhanced"
version = "*"

[[packages]]
name = "tmux"
version = "*"

[[packages]]
name = "bash-completion"
version = "*"
TOML

# Push the blueprint to Image Builder
composer-cli blueprints push basic-server.toml

# Verify it was imported
composer-cli blueprints list
composer-cli blueprints show basic-server
```

Image Builder is now ready to build custom RHEL images from your blueprints.
