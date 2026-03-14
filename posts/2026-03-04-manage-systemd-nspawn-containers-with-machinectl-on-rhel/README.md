# How to Manage systemd-nspawn Containers with machinectl on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Systemd-nspawn, Machinectl, Containers, Linux

Description: Use machinectl to manage systemd-nspawn containers on RHEL, including starting, stopping, inspecting, and cloning container images.

---

machinectl is the management interface for systemd-nspawn containers. It provides commands to list, start, stop, clone, and inspect containers stored under `/var/lib/machines/`.

## List Running and Available Machines

```bash
# Show running containers and VMs
machinectl list

# Show all registered machine images (running or stopped)
machinectl list-images
```

## Start and Stop Containers

Containers must be stored in `/var/lib/machines/` for machinectl to manage them:

```bash
# Start a container (boots with systemd as init)
sudo machinectl start mycontainer

# Check its status
machinectl status mycontainer

# Stop a container gracefully
sudo machinectl poweroff mycontainer

# Force kill a container
sudo machinectl terminate mycontainer
```

## Log In and Execute Commands

```bash
# Open an interactive login session
sudo machinectl login mycontainer
# Press Ctrl+] three times to disconnect

# Run a single command inside the container
sudo machinectl shell mycontainer /bin/bash -c "dnf update -y"

# Open a root shell directly
sudo machinectl shell root@mycontainer
```

## Clone and Rename Containers

```bash
# Clone an existing container image
sudo machinectl clone mycontainer mycontainer-copy

# Rename a container image
sudo machinectl rename mycontainer-copy testbox
```

## Import and Export Container Images

```bash
# Export a container as a tar archive
sudo machinectl export-tar mycontainer /tmp/mycontainer.tar.gz

# Import a container from a tar archive
sudo machinectl import-tar /tmp/mycontainer.tar.gz imported-container
```

## Enable Auto-Start on Boot

```bash
# Enable a container to start when the host boots
sudo machinectl enable mycontainer

# Disable auto-start
sudo machinectl disable mycontainer
```

## View Container Resource Usage

```bash
# Show resource usage for all running machines
machinectl list

# Detailed status including control group info
machinectl status mycontainer
```

## Remove a Container Image

```bash
# Permanently delete a container and its filesystem
sudo machinectl remove mycontainer
```

## Check Logs from a Container

```bash
# View journal logs from a specific container
journalctl -M mycontainer

# Follow logs in real time
journalctl -M mycontainer -f
```

machinectl provides a consistent interface for managing systemd-nspawn containers on RHEL. It integrates with systemd services, making container management feel native to the RHEL administration workflow.
