# How to Install and Configure Incus on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Incus, Containers, Virtualization, System Administration

Description: Install and configure Incus on Ubuntu for system container and virtual machine management, the community fork of LXD maintained after Canonical's project changes.

---

Incus is a modern system container and virtual machine manager, originally forked from LXD after Canonical moved LXD's development under the Canonical umbrella and changed its licensing terms. Incus is maintained by the Linux Containers project and provides the same powerful functionality - managing lightweight system containers (LXC) and QEMU-based virtual machines through a unified REST API and command-line tool.

## What Incus Provides

Incus manages two types of instances:

- **System containers** - LXC-based containers that share the host kernel. Very lightweight, near-native performance, great for running multiple isolated Linux environments.
- **Virtual machines** - QEMU-based VMs for full OS isolation, different kernels, or workloads that need hardware access.

Both types are managed with the same `incus` command, the same REST API, and the same workflow.

## Installation

Incus packages are available through the Zabbly repository, which is the recommended installation method on Ubuntu:

```bash
# Add the Zabbly repository for Incus
sudo mkdir -p /etc/apt/keyrings/
sudo curl -fsSL https://pkgs.zabbly.com/key.asc \
    -o /etc/apt/keyrings/zabbly.asc

# Add the stable repository (Ubuntu 22.04/24.04)
sudo sh -c 'cat > /etc/apt/sources.list.d/zabbly-incus-stable.sources << EOF
Enabled: yes
Types: deb
URIs: https://pkgs.zabbly.com/incus/stable
Suites: $(. /etc/os-release && echo $VERSION_CODENAME)
Components: main
Architectures: amd64 arm64
Signed-By: /etc/apt/keyrings/zabbly.asc
EOF'

# Update and install
sudo apt-get update
sudo apt-get install -y incus incus-tools

# Verify installation
incus --version
```

## Add Your User to the incus-admin Group

```bash
# Add your user to the incus-admin group to run incus without sudo
sudo adduser $USER incus-admin

# Apply group membership (or log out and back in)
newgrp incus-admin
```

## Initialize Incus

Run the initialization wizard to configure storage, networking, and other settings:

```bash
sudo incus admin init
```

The wizard asks several questions:

```text
Would you like to use clustering? (yes/no) [default=no]: no
Do you want to configure a new storage pool? (yes/no) [default=yes]: yes
Name of the new storage pool [default=default]: default
Name of the storage backend to use [dir, btrfs, lvm, zfs, ceph] [default=zfs]: btrfs
Create a new BTRFS pool? (yes/no) [default=yes]: yes
Use an existing block device? (yes/no) [default=no]: no
Size in GiB of the new loop device (1GiB minimum) [default=30GiB]: 50GiB
Would you like to connect to a MAAS server? (yes/no) [default=no]: no
Would you like to create a new local network bridge? (yes/no) [default=yes]: yes
What should the new bridge be called? [default=incusbr0]: incusbr0
What IPv4 address should be used? [default=auto]: auto
What IPv6 address should be used? [default=auto]: auto
Would you like the LXD server to be available over the network? (yes/no) [default=no]: no
Would you like stale cached images to be updated automatically? (yes/no) [default=yes]: yes
Would you like a YAML "preseed" to be printed? (yes/no) [default=no]: no
```

For non-interactive initialization (useful for automation):

```bash
cat <<EOF | sudo incus admin init --preseed
config: {}
networks:
- config:
    ipv4.address: auto
    ipv6.address: auto
  description: ""
  name: incusbr0
  type: bridge
storage_pools:
- config:
    size: 50GiB
  description: ""
  name: default
  driver: btrfs
profiles:
- config: {}
  description: ""
  devices:
    eth0:
      name: eth0
      network: incusbr0
      type: nic
    root:
      path: /
      pool: default
      type: disk
  name: default
EOF
```

## Create Your First Container

```bash
# List available images
incus image list images:ubuntu

# Launch an Ubuntu 22.04 container
incus launch images:ubuntu/22.04 my-container

# Check the container status
incus list

# Open a shell inside the container
incus exec my-container -- bash

# From inside the container, verify it is running Ubuntu
cat /etc/os-release
exit

# Stop the container
incus stop my-container

# Delete it
incus delete my-container
```

## Create a Virtual Machine

```bash
# Launch a VM (note the --vm flag)
incus launch images:ubuntu/22.04 my-vm --vm

# Check status
incus list

# Connect to the VM console
incus console my-vm

# Or use exec (requires the incus-agent to be running inside the VM)
incus exec my-vm -- bash
```

## Configure Resource Limits

Set CPU and memory limits on a container:

```bash
# Launch a container with resource limits
incus launch images:ubuntu/22.04 limited-container

# Set memory limit
incus config set limited-container limits.memory 512MB

# Set CPU limit (number of cores)
incus config set limited-container limits.cpu 2

# Set CPU pinning to specific cores
incus config set limited-container limits.cpu.allowance 2-3

# Verify configuration
incus config show limited-container
```

## Configure Persistent Storage

Mount a directory from the host into a container:

```bash
# Add a disk device from the host to a container
incus config device add my-container data-disk disk \
    source=/data/myapp \
    path=/opt/myapp

# Verify the mount
incus exec my-container -- ls /opt/myapp

# Remove the device when done
incus config device remove my-container data-disk
```

## Network Configuration

```bash
# Check the default bridge network
incus network list

# Show network details including DHCP leases
incus network show incusbr0

# Create a macvlan network for containers to appear on your LAN
incus network create macvlan-net \
    --type macvlan \
    parent=ens3

# Create a container with a specific network profile
incus launch images:ubuntu/22.04 networked-container

# Add a network interface to an existing container
incus config device add networked-container eth1 nic \
    nictype=bridged \
    parent=incusbr0
```

## Use Profiles for Consistent Configuration

Profiles allow you to define configurations that can be applied to multiple instances:

```bash
# Create a profile for web server containers
incus profile create webserver

# Set profile configuration
incus profile set webserver limits.memory 1GB
incus profile set webserver limits.cpu 2

# Add devices to the profile
incus profile device add webserver root disk \
    path=/ \
    pool=default \
    size=20GB

# Launch a container with this profile
incus launch images:ubuntu/22.04 web1 --profile default --profile webserver

# List profiles
incus profile list

# Show a profile's full configuration
incus profile show webserver
```

## Manage Images

```bash
# List cached images
incus image list

# Download an image without launching a container
incus image copy images:ubuntu/22.04 local: --alias ubuntu-2204

# Create a snapshot of a container
incus snapshot create my-container baseline

# List snapshots
incus snapshot list my-container

# Restore from a snapshot
incus snapshot restore my-container baseline

# Create an image from a container (for use as a base image)
incus snapshot create my-container configured-state
incus publish my-container/configured-state --alias my-custom-image
```

## Security Hardening

By default, containers run as unprivileged (mapped UIDs/GIDs). This is safe for most use cases. For additional security:

```bash
# Verify a container is unprivileged
incus config show my-container | grep privileged
# Should show: security.privileged: "false"

# Enable AppArmor for container isolation
incus config set my-container security.apparmor true

# Restrict container from mounting filesystems
incus config set my-container security.syscalls.deny_compat true

# Drop capabilities not needed
incus config set my-container raw.lxc 'lxc.cap.drop = sys_module mac_admin mac_override sys_time'
```

## Monitor Resource Usage

```bash
# Show resource usage across all containers
incus list --format csv -c ns,s,4,m

# Detailed stats for a specific container
incus info my-container

# Show real-time top-like stats
incus top

# Check storage pool usage
incus storage info default
```

Incus is a mature, well-maintained system container and VM manager that works reliably on Ubuntu. Once initialized, the workflow is straightforward and the unified management of containers and VMs through a single tool is a genuine productivity advantage over managing multiple separate tools.
