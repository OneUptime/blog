# How to Install and Initialize LXD on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, LXD, Container, Virtualization

Description: A complete guide to installing LXD on Ubuntu and running through the interactive initialization process to configure storage, networking, and cluster settings.

---

LXD (pronounced "lex-dee") is a container and virtual machine manager developed by Canonical. It sits on top of LXC (Linux Containers) and adds a REST API, a proper CLI, clustering, storage pools, networking primitives, and support for VM instances alongside traditional system containers. On Ubuntu, it is the recommended way to manage containers for development and infrastructure use cases.

## LXD vs Docker

LXD and Docker solve different problems:

- **Docker** - application containers, single-process per container, designed for packaging and distributing apps
- **LXD** - system containers and VMs, full OS inside, designed for running environments

An LXD container feels like a lightweight VM with almost bare-metal performance. It runs systemd, has its own init process, and behaves like a full Ubuntu installation.

## Installation

### Via Snap (Recommended)

LXD is distributed as a snap package:

```bash
# Install LXD snap
sudo snap install lxd

# If upgrading from the older apt package
sudo apt remove lxd lxd-client
sudo snap install lxd
```

### Adding Your User to the LXD Group

```bash
# Add your user to the lxd group
sudo usermod -aG lxd $USER

# Apply group membership (or log out and back in)
newgrp lxd

# Verify
groups | grep lxd
```

Without this, every `lxc` command requires `sudo`.

## Running LXD Init

`lxd init` is the interactive setup wizard that configures storage, networking, and optional clustering. Run it once after installation:

```bash
lxd init
```

You will be prompted through a series of questions. Here is what each question means:

### Clustering

```text
Would you like to use LXD clustering? (yes/no) [default=no]:
```

Choose **no** for a single-node setup. Clustering is for multi-server deployments where containers can be migrated between nodes.

### Storage Backend

```text
Do you want to configure a new storage pool? (yes/no) [default=yes]:

Name of the new storage pool [default=default]:

Name of the storage backend to use (btrfs, dir, lvm, zfs, ceph) [default=zfs]:
```

Recommended backends:
- **ZFS** - best choice if ZFS is available (copy-on-write, snapshots, deduplication)
- **btrfs** - good alternative if btrfs is preferred
- **dir** - simplest, just uses regular directories (no copy-on-write)
- **LVM** - good for block storage environments

For a development machine, ZFS is ideal:

```text
Name of the storage backend to use (btrfs, dir, lvm, zfs, ceph) [default=zfs]: zfs

Create a new ZFS pool? (yes/no) [default=yes]: yes

Would you like to use an existing empty block device (e.g. a disk or partition)? (yes/no) [default=no]: no

Size in GiB of the new loop device (1GiB minimum) [default=5GiB]: 30
```

If you have a dedicated disk for LXD, use it instead of a loop device:

```text
Would you like to use an existing empty block device? (yes/no) [default=no]: yes
Path to the existing block device: /dev/sdb
```

### Networking (MAAS)

```text
Would you like to connect to a MAAS server? (yes/no) [default=no]:
```

Choose **no** unless you are using Canonical's Metal as a Service platform.

### Bridge Networking

```text
Would you like to create a new local network bridge? (yes/no) [default=yes]:

What should the new bridge be called? [default=lxdbr0]:

What IPv4 address should be used? (CIDR subnet notation, "auto" or "none") [default=auto]:

What IPv6 address should be used? (CIDR subnet notation, "auto" or "none") [default=auto]:
```

Accept defaults. LXD creates a `lxdbr0` bridge with NAT, giving containers internet access and a private subnet for container-to-container communication.

### Remote Access

```text
Would you like the LXD server to be available over the network? (yes/no) [default=no]:
```

Choose **no** for a local setup. For remote management or clustering, choose yes and set up certificates.

### Stale Image Caching

```text
Would you like stale cached images to be updated automatically? (yes/no) [default=yes]:
```

Choose **yes**. LXD caches downloaded container images locally and refreshes them periodically.

### YAML Seed Configuration

Alternatively, skip the interactive wizard and provide a YAML configuration:

```bash
# Create a minimal seed config
cat > /tmp/lxd-init.yaml <<'EOF'
config: {}
networks:
  - config:
      ipv4.address: 10.200.0.1/24
      ipv4.nat: "true"
      ipv6.address: none
    description: ""
    name: lxdbr0
    type: bridge
storage_pools:
  - config:
      size: 30GiB
    description: ""
    driver: zfs
    name: default
profiles:
  - config: {}
    description: ""
    devices:
      eth0:
        name: eth0
        network: lxdbr0
        type: nic
      root:
        path: /
        pool: default
        type: disk
    name: default
projects: []
cluster: null
EOF

# Initialize with seed config
lxd init --preseed < /tmp/lxd-init.yaml
```

## Verifying the Installation

```bash
# Check LXD status
lxc info

# Expected output includes:
# config: {}
# api_extensions: [...]
# api_status: stable
# api_version: "1.0"
# auth: trusted
# environment:
#   storage: zfs
#   ...

# Check storage pools
lxc storage list

# Check networks
lxc network list

# Check profiles
lxc profile list
```

## Your First Container

Once initialized, test with a simple container:

```bash
# Launch an Ubuntu 24.04 container
lxc launch ubuntu:24.04 test-container

# List running containers
lxc list

# Get a shell inside
lxc exec test-container -- bash

# Inside the container, you have a full Ubuntu system
cat /etc/os-release
systemctl status

# Exit
exit

# Delete the test container
lxc stop test-container
lxc delete test-container
```

## Understanding the Default Profile

After init, LXD creates a `default` profile that all new containers inherit:

```bash
# View the default profile
lxc profile show default
```

```yaml
config: {}
description: Default LXD profile
devices:
  eth0:
    name: eth0
    network: lxdbr0
    type: nic
  root:
    path: /
    pool: default
    size: ""
    type: disk
name: default
```

This profile attaches containers to the `lxdbr0` bridge and the `default` storage pool. You can create additional profiles for different configurations.

## Updating LXD

```bash
# Check current version
snap info lxd | grep installed

# Update to latest
sudo snap refresh lxd

# Or pin to a specific channel
sudo snap refresh lxd --channel=5.0/stable
```

## Troubleshooting Initial Setup

### "Failed to connect to local LXD daemon"

The LXD daemon may not have started:

```bash
sudo systemctl status snap.lxd.daemon
sudo snap restart lxd
```

### "You do not have permission to access LXD"

Your user is not in the lxd group or the group hasn't been applied:

```bash
groups | grep lxd  # check
sudo usermod -aG lxd $USER
newgrp lxd  # apply without logout
```

### ZFS Pool Creation Fails

Missing ZFS tools:

```bash
sudo apt install -y zfsutils-linux
lxd init
```

### "Storage pool 'default' already exists" During Re-init

Delete existing configuration and start fresh:

```bash
lxd init --auto  # non-interactive with safe defaults
# or
lxc storage delete default  # then re-run lxd init
```

LXD's initialization process sets up the foundation for all subsequent container and VM work. Taking a few minutes to configure storage and networking properly at the start avoids painful migrations later.
