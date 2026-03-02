# How to Install and Use Multipass on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Multipass, Virtualization, Cloud

Description: Complete guide to installing and using Multipass on Ubuntu for fast, lightweight Ubuntu virtual machine management from the command line.

---

Multipass is Canonical's lightweight VM manager built specifically for Ubuntu. It spins up Ubuntu instances in seconds using cloud images, and wraps KVM (or Hyper-V on Windows, HyperKit on macOS) under a simple CLI. If you want a quick Ubuntu VM without touching libvirt XML or virt-install flags, Multipass is the right tool.

## What Multipass Is Good For

Multipass is designed for development and testing scenarios where you need:
- A clean Ubuntu environment quickly (30-60 seconds)
- Isolated environments for testing package installations or configurations
- Multiple named instances you can start, stop, and delete by name
- Cloud-init support for automated setup

It is not designed for production VM hosting, complex networking topologies, or non-Ubuntu guest OSes.

## Installation

Multipass is distributed as a snap package:

```bash
# Install multipass via snap
sudo snap install multipass

# Verify installation
multipass version
```

On Ubuntu Desktop, Multipass also installs a system tray indicator. On servers, it runs headlessly.

### Setting the Backend Driver

By default Multipass uses KVM on Linux. Confirm which backend is active:

```bash
# Check the current backend
sudo multipass get local.driver
```

To explicitly set the backend:

```bash
# Set backend to KVM (requires kvm kernel modules)
sudo multipass set local.driver=qemu

# Or libvirt backend (requires libvirt installed)
sudo multipass set local.driver=libvirt
```

## Launching Your First VM

The simplest launch uses the latest Ubuntu LTS:

```bash
# Launch an Ubuntu VM with defaults
multipass launch --name myvm

# Or specify a release
multipass launch 22.04 --name jammy-test
multipass launch 24.04 --name noble-dev
```

Multipass downloads the cloud image on first use and caches it locally. Subsequent launches of the same Ubuntu version are much faster.

### Listing Available Images

```bash
# See available Ubuntu releases
multipass find

# Sample output:
# Image                       Aliases           Version          Description
# 20.04                       focal             20240110         Ubuntu 20.04 LTS
# 22.04                       jammy,lts         20240209         Ubuntu 22.04 LTS
# 24.04                       noble             20240209         Ubuntu 24.04 LTS
# daily:24.10                 oracular          20240210         Ubuntu 24.10
```

## Basic VM Lifecycle Commands

```bash
# List all instances with status
multipass list

# Start a stopped instance
multipass start myvm

# Stop a running instance
multipass stop myvm

# Restart an instance
multipass restart myvm

# Suspend (pause) an instance - saves state to disk
multipass suspend myvm

# Delete an instance (moves to trash)
multipass delete myvm

# Permanently purge deleted instances
multipass purge

# Delete and purge in one step
multipass delete --purge myvm
```

## Accessing Your VM

### Shell Access

```bash
# Open an interactive shell inside the VM
multipass shell myvm

# You'll land in the ubuntu user's home directory
# ubuntu@myvm:~$
```

### Running Commands Remotely

```bash
# Run a single command without entering the shell
multipass exec myvm -- uname -a
multipass exec myvm -- apt list --installed 2>/dev/null | grep nginx

# Run a script
multipass exec myvm -- bash -s < local-script.sh
```

### Copying Files

```bash
# Copy a file into the VM
multipass transfer localfile.txt myvm:/home/ubuntu/

# Copy a file from the VM
multipass transfer myvm:/home/ubuntu/output.log ./

# Transfer directories with --recursive
multipass transfer --recursive ./my-project/ myvm:/home/ubuntu/
```

## Inspecting VM Details

```bash
# Get detailed info about an instance
multipass info myvm

# Output includes:
# Name:           myvm
# State:          Running
# IPv4:           10.77.100.5
# Release:        Ubuntu 24.04.1 LTS
# Image hash:     a1b2c3d4e5f6...
# CPU(s):         1
# Load:           0.00 0.00 0.00
# Disk usage:     1.9G out of 4.8G
# Memory usage:   232.7M out of 945.8M
# Mounts:         --
```

## Accessing the VM by IP

Multipass assigns an IP address from a private network:

```bash
# Get the IP
multipass list
# NAME    STATE    IPV4             IMAGE
# myvm    Running  192.168.64.5     Ubuntu 24.04 LTS

# SSH directly using the default ubuntu user
# Multipass manages SSH keys automatically
ssh ubuntu@192.168.64.5
```

To use your own SSH key:

```bash
# Inject your public key during launch via cloud-init
multipass launch --name myvm --cloud-init - <<EOF
#cloud-config
ssh_authorized_keys:
  - $(cat ~/.ssh/id_rsa.pub)
EOF
```

## Working with the Multipass Daemon

Multipass runs a background daemon (`multipassd`). You can check its status:

```bash
# Check daemon status
sudo systemctl status snap.multipass.multipassd

# View daemon logs
sudo journalctl -u snap.multipass.multipassd -f
```

## Setting Global Defaults

Multipass supports configurable defaults for new instances:

```bash
# Set default number of CPUs
sudo multipass set local.cpus=2

# Set default memory
sudo multipass set local.memory=2G

# Set default disk size
sudo multipass set local.disk=20G

# View all current settings
sudo multipass get --keys
sudo multipass get local.cpus
```

## Practical Workflow Example

Here is a typical development workflow using Multipass:

```bash
# 1. Create a dev environment
multipass launch 24.04 --name dev --cpus 2 --memory 4G --disk 20G

# 2. Install dependencies
multipass exec dev -- sudo apt update
multipass exec dev -- sudo apt install -y python3-pip git

# 3. Transfer your project
multipass transfer --recursive ./myproject/ dev:/home/ubuntu/

# 4. Work in the environment
multipass shell dev

# 5. When done for the day, suspend (saves state)
multipass suspend dev

# 6. Resume next day
multipass start dev
multipass shell dev

# 7. Done with the project, clean up
multipass delete --purge dev
```

## Troubleshooting

### Instance Stuck in Starting State

```bash
# Check daemon logs
sudo journalctl -u snap.multipass.multipassd --since "5 minutes ago"

# Restart the daemon
sudo snap restart multipass
```

### No Network Connectivity Inside VM

Check if the Multipass bridge is up:

```bash
# The bridge is usually named mpqemubr0 or lxdbr0
ip link show | grep -E "mpqemubr|lxdbr"

# Restart networking if needed
sudo systemctl restart systemd-networkd
```

### Cannot SSH to Instance

```bash
# Verify the IP is reachable from host
multipass list
ping -c 2 <instance-ip>

# Use multipass shell as a fallback (doesn't require open SSH port)
multipass shell myvm
```

Multipass covers the gap between "run a Docker container" and "configure a full KVM VM with libvirt." For Ubuntu-specific workloads and development environments, it is one of the most productive tools in the toolkit.
