# How to Configure Network Boot (PXE) for Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, PXE, Network Boot, DHCP, TFTP, Kubernetes

Description: A detailed guide to setting up complete PXE network boot infrastructure for automated Talos Linux deployments at scale.

---

Network booting with PXE is the foundation of automated bare metal provisioning. When you have dozens or hundreds of servers to deploy, walking around with USB drives is not practical. A properly configured PXE environment lets you power on a machine, and it automatically downloads Talos Linux over the network, applies configuration, and joins your Kubernetes cluster without any manual intervention.

This guide covers building a complete PXE infrastructure tailored for Talos Linux deployments.

## Architecture Overview

A PXE boot setup for Talos Linux involves several components working together:

```
[Bare Metal Server] --DHCP request--> [DHCP Server]
                    <--IP + boot file--
                    --TFTP request----> [TFTP Server]
                    <--Boot loader-----
                    --HTTP request----> [HTTP Server]
                    <--Kernel + initrd-
                    --HTTP request----> [Config Server]
                    <--Machine config--
                    [Talos Linux boots and joins cluster]
```

Each component has a specific role, and getting them all configured correctly is the key to reliable network booting.

## Prerequisites

You need a server (physical or virtual) to host the PXE services. This server needs:

- A stable IP address on the same network as your target machines
- Linux installed (Ubuntu or Debian work well for this)
- Root access for installing and configuring services
- At least 2GB of free disk space for boot assets

```bash
# Install the required packages on your PXE server
sudo apt-get update
sudo apt-get install -y \
  dnsmasq \
  nginx \
  pxelinux \
  syslinux-common \
  syslinux-efi
```

We use dnsmasq because it combines DHCP and TFTP in one service, which simplifies configuration.

## Step 1: Download Talos Linux Boot Assets

Get the PXE boot files from the Talos Linux release:

```bash
# Create directories for boot assets
sudo mkdir -p /srv/tftp/talos
sudo mkdir -p /srv/www/talos/v1.9.0
sudo mkdir -p /srv/www/talos/configs

# Download the kernel
sudo wget -O /srv/www/talos/v1.9.0/vmlinuz \
  https://github.com/siderolabs/talos/releases/download/v1.9.0/vmlinuz-amd64

# Download the initramfs
sudo wget -O /srv/www/talos/v1.9.0/initramfs.xz \
  https://github.com/siderolabs/talos/releases/download/v1.9.0/initramfs-amd64.xz

# For UEFI PXE boot, download the EFI boot file
sudo wget -O /srv/tftp/talos/ipxe-amd64.efi \
  https://github.com/siderolabs/talos/releases/download/v1.9.0/ipxe-amd64.efi
```

## Step 2: Set Up BIOS PXE Boot Files

For legacy BIOS machines, set up the pxelinux chain:

```bash
# Copy PXE boot files
sudo cp /usr/lib/PXELINUX/pxelinux.0 /srv/tftp/
sudo cp /usr/lib/syslinux/modules/bios/ldlinux.c32 /srv/tftp/
sudo cp /usr/lib/syslinux/modules/bios/menu.c32 /srv/tftp/
sudo cp /usr/lib/syslinux/modules/bios/libutil.c32 /srv/tftp/

# Create the PXE configuration directory
sudo mkdir -p /srv/tftp/pxelinux.cfg

# Create the default boot configuration
sudo tee /srv/tftp/pxelinux.cfg/default << 'PXECFG'
DEFAULT talos
PROMPT 0
TIMEOUT 50

LABEL talos
  MENU LABEL Talos Linux v1.9.0
  KERNEL http://192.168.1.10/talos/v1.9.0/vmlinuz
  INITRD http://192.168.1.10/talos/v1.9.0/initramfs.xz
  APPEND talos.platform=metal console=tty0 console=ttyS0,115200
PXECFG
```

Replace `192.168.1.10` with your PXE server's IP address.

## Step 3: Configure dnsmasq

Configure dnsmasq to serve DHCP and TFTP:

```bash
# Back up the original config
sudo cp /etc/dnsmasq.conf /etc/dnsmasq.conf.backup

# Create a new configuration
sudo tee /etc/dnsmasq.conf << 'DNSMASQ'
# Interface to listen on
interface=eth0
bind-interfaces

# DHCP configuration
dhcp-range=192.168.1.100,192.168.1.250,24h
dhcp-option=option:router,192.168.1.1
dhcp-option=option:dns-server,192.168.1.1

# TFTP server
enable-tftp
tftp-root=/srv/tftp

# PXE boot configuration
# Tag BIOS clients
dhcp-match=set:bios,option:client-arch,0
dhcp-boot=tag:bios,pxelinux.0

# Tag UEFI clients (x86_64)
dhcp-match=set:efi64,option:client-arch,7
dhcp-match=set:efi64,option:client-arch,9
dhcp-boot=tag:efi64,talos/ipxe-amd64.efi

# Logging
log-dhcp
log-queries
DNSMASQ
```

If you already have a DHCP server on your network and do not want dnsmasq to provide DHCP, configure it as a proxy DHCP server:

```bash
# Proxy DHCP mode - does not assign IP addresses
# Only provides PXE boot information
dhcp-range=192.168.1.0,proxy
pxe-service=x86PC,"Talos Linux",pxelinux
pxe-service=x86-64_EFI,"Talos Linux",talos/ipxe-amd64.efi
```

Restart dnsmasq:

```bash
sudo systemctl restart dnsmasq
sudo systemctl enable dnsmasq
```

## Step 4: Configure the HTTP Server

Set up nginx to serve the kernel, initramfs, and configuration files:

```bash
sudo tee /etc/nginx/sites-available/pxe << 'NGINX'
server {
    listen 80;
    server_name _;

    root /srv/www;

    location /talos/ {
        autoindex on;
    }

    # Serve machine configurations
    location /talos/configs/ {
        autoindex on;
        default_type application/x-yaml;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/pxe /etc/nginx/sites-enabled/default
sudo systemctl restart nginx
```

## Step 5: Generate Machine Configurations

Create the Talos machine configurations and make them available over HTTP:

```bash
# Install talosctl on the PXE server
curl -sL https://talos.dev/install | sh

# Generate cluster configuration
talosctl gen config pxe-cluster https://192.168.1.100:6443

# Copy configs to the HTTP server
sudo cp controlplane.yaml /srv/www/talos/configs/
sudo cp worker.yaml /srv/www/talos/configs/
```

## Step 6: Auto-Apply Configuration via Kernel Parameters

To fully automate the deployment, tell Talos where to find its configuration:

```bash
# Update the PXE config to include the config URL
sudo tee /srv/tftp/pxelinux.cfg/default << 'PXECFG'
DEFAULT talos
PROMPT 0
TIMEOUT 50

LABEL talos
  MENU LABEL Talos Linux v1.9.0
  KERNEL http://192.168.1.10/talos/v1.9.0/vmlinuz
  INITRD http://192.168.1.10/talos/v1.9.0/initramfs.xz
  APPEND talos.platform=metal talos.config=http://192.168.1.10/talos/configs/controlplane.yaml console=tty0
PXECFG
```

## Step 7: Per-Machine Configuration

For clusters where different machines need different roles, create per-MAC-address PXE configurations:

```bash
# Create a config for a specific machine (MAC: aa:bb:cc:dd:ee:01)
# PXE uses the MAC with dashes and a 01- prefix
sudo tee /srv/tftp/pxelinux.cfg/01-aa-bb-cc-dd-ee-01 << 'PXECFG'
DEFAULT talos-cp
PROMPT 0
TIMEOUT 30

LABEL talos-cp
  MENU LABEL Talos Linux - Control Plane
  KERNEL http://192.168.1.10/talos/v1.9.0/vmlinuz
  INITRD http://192.168.1.10/talos/v1.9.0/initramfs.xz
  APPEND talos.platform=metal talos.config=http://192.168.1.10/talos/configs/controlplane.yaml console=tty0
PXECFG

# Worker node (MAC: aa:bb:cc:dd:ee:04)
sudo tee /srv/tftp/pxelinux.cfg/01-aa-bb-cc-dd-ee-04 << 'PXECFG'
DEFAULT talos-worker
PROMPT 0
TIMEOUT 30

LABEL talos-worker
  MENU LABEL Talos Linux - Worker
  KERNEL http://192.168.1.10/talos/v1.9.0/vmlinuz
  INITRD http://192.168.1.10/talos/v1.9.0/initramfs.xz
  APPEND talos.platform=metal talos.config=http://192.168.1.10/talos/configs/worker.yaml console=tty0
PXECFG
```

## Step 8: Boot Machines and Bootstrap

Power on your machines. They should automatically PXE boot, download Talos Linux, and apply their configuration.

```bash
# After machines have booted and configured themselves:

# Set up talosctl
export TALOSCONFIG="talosconfig"
talosctl config endpoint 192.168.1.100
talosctl config node 192.168.1.100

# Bootstrap the cluster (only on the first control plane node)
talosctl bootstrap

# Wait for health
talosctl health --wait-timeout 10m

# Get kubeconfig
talosctl kubeconfig ./kubeconfig
kubectl --kubeconfig=./kubeconfig get nodes
```

## Testing the PXE Setup

Before deploying to your full fleet, test with a single machine:

```bash
# Monitor DHCP and TFTP requests
sudo journalctl -u dnsmasq -f

# In another terminal, monitor HTTP requests
sudo tail -f /var/log/nginx/access.log

# Power on a test machine and watch the logs
```

You should see:
1. A DHCP request and response
2. A TFTP request for the bootloader
3. HTTP requests for the kernel, initramfs, and configuration

## Troubleshooting

### Machine Does Not PXE Boot

```bash
# Verify DHCP is responding
sudo tcpdump -i eth0 port 67 or port 68 -vvv

# Check that TFTP is serving files
sudo tcpdump -i eth0 port 69

# Test TFTP manually from another machine
tftp 192.168.1.10 -c get pxelinux.0
```

### Kernel Downloads But Fails to Boot

```bash
# Verify the kernel and initramfs are not corrupted
ls -la /srv/www/talos/v1.9.0/
md5sum /srv/www/talos/v1.9.0/vmlinuz
# Compare with the upstream checksum
```

### Configuration Is Not Applied

```bash
# Verify the config URL is accessible
curl -I http://192.168.1.10/talos/configs/controlplane.yaml

# Check that the YAML is valid
talosctl validate -m metal -c controlplane.yaml
```

## Security Considerations

PXE booting has inherent security risks since machines trust what the network tells them. In production environments:

- Use VLAN isolation for the PXE network
- Consider HTTPS for serving configurations (requires certificate management)
- Restrict the DHCP scope to known MAC addresses
- Monitor for rogue DHCP servers on the network

## Conclusion

A well-configured PXE environment transforms Talos Linux deployment from a manual process into a fully automated one. Machines boot, download their OS, apply configuration, and join the cluster without anyone touching them. This infrastructure pays for itself quickly when you are managing more than a few nodes, and it provides a consistent, repeatable deployment process that eliminates human error from the provisioning workflow.
