# How to Create and Manage LXC/LXD Containers on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, LXC, LXD, Containers, Virtualization, Tutorial

Description: Complete guide to using LXD for system containers on Ubuntu, providing lightweight virtualization with full OS experience.

---

LXD provides system containers that run a full Linux operating system, similar to virtual machines but with container efficiency. Unlike Docker's application containers, LXD containers boot like regular VMs with init systems, making them ideal for development environments and infrastructure testing.

## Prerequisites

- Ubuntu 20.04, 22.04, or 24.04
- Root or sudo access
- At least 1GB free disk space

## Install LXD

```bash
# Install LXD via snap (recommended)
sudo snap install lxd

# Or install from apt
sudo apt install lxd -y

# Add user to lxd group
sudo usermod -aG lxd $USER
newgrp lxd
```

## Initialize LXD

```bash
# Interactive initialization
lxd init
```

Answer the prompts:
- **Clustering**: no (for single machine)
- **Storage backend**: dir (simplest) or zfs/btrfs (advanced)
- **Storage pool**: default
- **MAAS server**: no
- **Network bridge**: yes
- **Bridge name**: lxdbr0
- **IPv4**: auto
- **IPv6**: auto
- **Remote access**: no (for security)

Or use defaults:

```bash
# Accept all defaults
lxd init --auto
```

## Basic Container Management

### Launch Container

```bash
# Launch Ubuntu container
lxc launch ubuntu:24.04 mycontainer

# Launch with specific name
lxc launch ubuntu:22.04 webserver

# Launch other distributions
lxc launch images:debian/12 debian-container
lxc launch images:centos/9-Stream centos-container
lxc launch images:alpine/3.19 alpine-container
```

### List Containers

```bash
# List all containers
lxc list

# Detailed list
lxc list --columns nsb4tSa

# Filter running containers
lxc list status=running
```

### Container Lifecycle

```bash
# Start container
lxc start mycontainer

# Stop container
lxc stop mycontainer

# Restart container
lxc restart mycontainer

# Force stop
lxc stop mycontainer --force

# Delete container
lxc delete mycontainer

# Delete running container
lxc delete mycontainer --force
```

### Access Container

```bash
# Execute command
lxc exec mycontainer -- ls -la

# Interactive shell
lxc exec mycontainer -- bash

# Execute as specific user
lxc exec mycontainer -- su - ubuntu

# Run command with environment variable
lxc exec mycontainer --env MYVAR=value -- printenv MYVAR
```

## Container Configuration

### View Configuration

```bash
# Show container info
lxc info mycontainer

# Show configuration
lxc config show mycontainer
```

### Modify Resources

```bash
# Set memory limit
lxc config set mycontainer limits.memory 2GB

# Set CPU limit
lxc config set mycontainer limits.cpu 2

# Set CPU priority
lxc config set mycontainer limits.cpu.priority 10

# Limit disk space (requires btrfs/zfs)
lxc config device set mycontainer root size=10GB
```

### Auto-start

```bash
# Enable auto-start
lxc config set mycontainer boot.autostart true

# Set boot delay (seconds)
lxc config set mycontainer boot.autostart.delay 10

# Set boot order
lxc config set mycontainer boot.autostart.priority 50
```

## Networking

### View Network

```bash
# List networks
lxc network list

# Show network details
lxc network show lxdbr0

# Get container IP
lxc list mycontainer --format csv -c 4
```

### Static IP

```bash
# Set static IP
lxc config device override mycontainer eth0 ipv4.address=10.0.0.100
```

### Port Forwarding

```bash
# Forward host port to container
lxc config device add mycontainer http proxy listen=tcp:0.0.0.0:80 connect=tcp:127.0.0.1:80

# Remove port forward
lxc config device remove mycontainer http
```

### Create Custom Network

```bash
# Create network
lxc network create mynet

# Attach container to network
lxc network attach mynet mycontainer eth1

# Set network config
lxc network set mynet ipv4.address 192.168.100.1/24
lxc network set mynet ipv4.nat true
```

## Storage

### Storage Pools

```bash
# List storage pools
lxc storage list

# Create storage pool
lxc storage create mypool dir source=/data/lxd

# View pool info
lxc storage info default
```

### Volumes

```bash
# Create volume
lxc storage volume create default mydata

# Attach volume to container
lxc config device add mycontainer data disk pool=default source=mydata path=/data

# Detach volume
lxc config device remove mycontainer data

# Delete volume
lxc storage volume delete default mydata
```

### Bind Mount Host Directory

```bash
# Mount host directory
lxc config device add mycontainer shared disk source=/host/path path=/container/path

# Mount read-only
lxc config device add mycontainer shared disk source=/host/path path=/container/path readonly=true
```

## Profiles

### View Profiles

```bash
# List profiles
lxc profile list

# Show default profile
lxc profile show default
```

### Create Custom Profile

```bash
# Create profile
lxc profile create webserver

# Edit profile
lxc profile edit webserver
```

```yaml
config:
  limits.cpu: "2"
  limits.memory: 2GB
  boot.autostart: "true"
devices:
  http:
    listen: tcp:0.0.0.0:80
    connect: tcp:127.0.0.1:80
    type: proxy
```

### Apply Profile

```bash
# Launch with profile
lxc launch ubuntu:24.04 web1 --profile webserver

# Add profile to existing container
lxc profile add mycontainer webserver

# Remove profile
lxc profile remove mycontainer webserver
```

## Images

### List Images

```bash
# List local images
lxc image list

# List available remote images
lxc image list images:
lxc image list ubuntu:
```

### Image Management

```bash
# Download image
lxc image copy ubuntu:24.04 local: --alias ubuntu-24.04

# Create image from container
lxc publish mycontainer --alias my-custom-image

# Delete image
lxc image delete my-custom-image

# Export image
lxc image export my-custom-image /tmp/
```

## Snapshots

```bash
# Create snapshot
lxc snapshot mycontainer snap1

# List snapshots
lxc info mycontainer

# Restore snapshot
lxc restore mycontainer snap1

# Delete snapshot
lxc delete mycontainer/snap1
```

## Copy and Move

```bash
# Copy container (creates clone)
lxc copy mycontainer mycontainer-copy

# Move/rename container
lxc move mycontainer new-name

# Copy to remote (if configured)
lxc copy mycontainer remote:mycontainer
```

## File Transfer

```bash
# Copy file to container
lxc file push localfile.txt mycontainer/root/

# Copy file from container
lxc file pull mycontainer/root/file.txt ./

# Copy directory
lxc file push -r mydir mycontainer/root/

# Edit file in container
lxc file edit mycontainer/etc/hosts
```

## Monitoring

```bash
# Container resource usage
lxc info mycontainer

# All containers stats
lxc list -c nsb4t

# Live monitoring
watch -n 1 lxc list

# Container processes
lxc exec mycontainer -- top
```

## Backup and Restore

### Export Container

```bash
# Export container to file
lxc export mycontainer /backup/mycontainer.tar.gz

# Export with snapshots
lxc export mycontainer /backup/mycontainer.tar.gz --instance-only=false
```

### Import Container

```bash
# Import container
lxc import /backup/mycontainer.tar.gz

# Import with new name
lxc import /backup/mycontainer.tar.gz --name restored-container
```

## Troubleshooting

### Container Won't Start

```bash
# View logs
lxc info mycontainer --show-log

# Check storage
lxc storage info default
```

### Network Issues

```bash
# Check network
lxc network show lxdbr0

# Verify container network
lxc exec mycontainer -- ip addr
lxc exec mycontainer -- ping 8.8.8.8
```

### Permission Denied

```bash
# Check group membership
groups

# Re-login to apply group
newgrp lxd
```

---

LXD provides the isolation benefits of containers with the full OS experience of virtual machines. It's ideal for development environments, CI/CD, and testing infrastructure changes without the overhead of full VMs.
