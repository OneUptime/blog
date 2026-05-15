# How to Build Custom RHEL Images with the Cockpit Web Console

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Cockpit, Image Builder, Web Console, Custom Image, Linux

Description: Use the Cockpit web console to build custom RHEL images through a graphical interface, making it accessible for teams without command-line expertise.

---

The Cockpit web console provides a graphical interface for RHEL Image Builder. You can create blueprints, customize images, and build output for various platforms without touching the command line.

## Setting Up Cockpit with Image Builder

Use the commands for your RHEL version:

```bash
# RHEL 8 and 9: install Cockpit and the Image Builder plugin

sudo dnf install -y osbuild-composer composer-cli cockpit-composer

# Enable and start both sockets
sudo systemctl enable --now osbuild-composer.socket
sudo systemctl enable --now cockpit.socket

# RHEL 10: install Image Builder and the Cockpit plugin
sudo dnf install -y image-builder cockpit-image-builder
sudo systemctl enable --now cockpit.socket

# Allow Cockpit through the firewall
sudo firewall-cmd --permanent --add-service=cockpit
sudo firewall-cmd --reload
```

## Accessing the Web Console

Open your browser and navigate to:

```bash
https://<your-rhel-ip>:9090
```

Log in as the root user, or as a user with the required Image Builder privileges. Click on "Image Builder" in the web console.

## Creating a Blueprint via the Web UI

1. Click "Create Blueprint"
2. Enter a name (e.g., "database-server") and description
3. In the packages page, search for and add packages:
   - postgresql-server
   - postgresql-contrib
   - vim-enhanced
   - tmux
4. Step through the optional customization pages
5. Review the blueprint and click "Create" to save it

## Adding Customizations

Click on your blueprint name, then "Customizations":

- **Users:** Add user accounts with SSH keys or passwords
- **Hostname:** Set the system hostname
- **Services:** Enable or disable systemd services
- **Firewall:** Open specific ports
- **Kernel:** Set custom kernel boot parameters
- **Timezone:** Set the system timezone

## Building an Image

1. Click on your blueprint
2. Click "Create Image"
3. Select the output type:
   - QCOW2 (for KVM/libvirt)
   - Amazon Machine Image (for AWS)
   - Azure Disk Image (for Azure)
   - VMware Virtual Machine Disk (for vSphere)
   - ISO Installer (for bare metal)
4. Click "Create"

## Monitoring and Downloading

The Images tab shows build progress. Once the build completes:

1. Open the node options menu next to the completed image and select "Download image"
2. The image file downloads to your browser

## Comparing CLI and Web Console

For the same blueprint and output type, both methods use the same image-building service. The CLI is better for:

```bash
# Automation - script image builds
# RHEL 8 and 9
composer-cli compose start my-blueprint qcow2

# RHEL 10
image-builder build qcow2 --blueprint my-blueprint

# CI/CD pipelines
# Version-controlled blueprint files (TOML format)
```

The web console is better for:
- Teams unfamiliar with the command line
- Interactive exploration of available packages
- Quick one-off image builds

On RHEL 8 and 9, both approaches use the same osbuild-composer backend, so blueprints created in one are visible in the other. On RHEL 10, both approaches use the Image Builder service and the `image-builder` CLI.
