# How to Create Custom RHEL ISO Images Using Image Builder CLI (composer-cli)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Image Builder, composer-cli, Custom ISO, System Administration, Linux

Description: Use the composer-cli command-line tool to create custom RHEL ISO images with pre-installed packages, users, and configurations.

---

The composer-cli tool lets you build custom RHEL ISO images from the command line. These ISOs can include your own package selections, user accounts, and system configurations for automated deployments.

## Creating a Blueprint for the ISO

Define a blueprint with your desired packages and customizations:

```toml
# webserver-iso.toml
name = "webserver-iso"
description = "Custom RHEL ISO for web servers"
version = "1.0.0"
distro = "rhel-94"

# Packages to include
[[packages]]
name = "httpd"
version = "*"

[[packages]]
name = "mod_ssl"
version = "*"

[[packages]]
name = "firewalld"
version = "*"

[[packages]]
name = "vim-enhanced"
version = "*"

# Create a user account
[[customizations.user]]
name = "webadmin"
description = "Web Server Administrator"
groups = ["wheel"]
password = "$6$rounds=4096$randomsalt$hashedpassword"

# Set the hostname
[customizations]
hostname = "webserver"

# Enable services
[customizations.services]
enabled = ["httpd", "firewalld", "sshd"]

# Configure the firewall
[[customizations.firewall.ports]]
port = "443"
protocol = "tcp"
```

## Building the ISO

```bash
# Push the blueprint to Image Builder
composer-cli blueprints push webserver-iso.toml

# Verify the blueprint
composer-cli blueprints show webserver-iso

# Resolve dependencies to check for issues
composer-cli blueprints depsolve webserver-iso

# Start an ISO build
composer-cli compose start webserver-iso image-installer

# For a live ISO without installer
# composer-cli compose start webserver-iso iso
```

## Monitoring the Build

```bash
# Check build status
composer-cli compose status

# Watch the build progress
watch composer-cli compose status

# View build logs if something goes wrong
composer-cli compose log <compose-uuid>
```

## Downloading the ISO

```bash
# Once status shows FINISHED, download the ISO
composer-cli compose image <compose-uuid>

# The ISO is downloaded to the current directory
ls -lh *.iso
```

## Writing the ISO to USB

```bash
# Write the ISO to a USB drive for bare-metal installation
sudo dd if=<compose-uuid>-image-installer.iso of=/dev/sdc bs=4M status=progress oflag=sync
```

## Cleaning Up

```bash
# Remove completed composes to free disk space
composer-cli compose delete <compose-uuid>

# List all composes including finished ones
composer-cli compose list
```

The resulting ISO contains a fully automated RHEL installation with your specified packages, users, and services pre-configured.
