# How to Use Podman Desktop with Lima

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Podman Desktop, Lima, macOS, Virtual Machine

Description: Learn how to use Podman Desktop with Lima to run Linux containers on macOS with lightweight virtual machines and native file sharing.

---

> Lima provides lightweight Linux virtual machines on macOS, giving Podman Desktop a fast and flexible backend for running Linux containers natively.

Lima (Linux Machines) is an open-source tool that creates lightweight Linux VMs on macOS, with automatic file sharing and port forwarding. When paired with Podman Desktop, Lima offers an alternative to the default Podman machine, giving you more control over the VM configuration, resource allocation, and Linux distribution. This guide covers setting up and using Lima as a Podman backend.

---

## What Is Lima?

Lima creates Linux virtual machines using QEMU or the macOS Virtualization framework. It features automatic file sharing between macOS and the VM, port forwarding, and built-in containerd or Podman support.

```bash
# Install Lima on macOS

brew install lima

# Verify the installation
limactl --version

# List available templates
limactl start --list-templates
```

## Creating a Lima Instance with Podman

Lima provides a Podman-specific template:

```bash
# Create a Lima instance with Podman support
limactl start --name=podman template:podman

# This creates a VM with:
# - Podman pre-installed
# - Socket forwarding configured
# - Read-only file sharing enabled for your home directory by default

# Verify the instance is running
limactl list

# Check Podman inside the VM
limactl shell podman podman --version
```

## Configuring Lima for Podman Desktop

Connect the host-side Podman client to the Lima instance:

```bash
# Get the host-side Podman socket path from Lima
export CONTAINER_HOST=$(limactl list podman --format 'unix://{{.Dir}}/sock/podman.sock')

# Test the connection from the host
podman --url "$CONTAINER_HOST" info
```

Podman Desktop uses its Lima extension to detect compatible instances. If the `podman` instance is not shown, go to **Settings > Preferences > Extension: Lima**, verify the instance name and type, then disable and re-enable the extension.

## Customizing the Lima VM

Create a custom Lima configuration for your needs:

```yaml
# Save as podman-custom.yaml
images:
  - location: "https://cloud-images.ubuntu.com/releases/24.04/release/ubuntu-24.04-server-cloudimg-amd64.img"
    arch: "x86_64"
  - location: "https://cloud-images.ubuntu.com/releases/24.04/release/ubuntu-24.04-server-cloudimg-arm64.img"
    arch: "aarch64"
cpus: 4
memory: "8GiB"
disk: "50GiB"

# Mount your project directories
mounts:
  - location: "~"
    writable: true
  - location: "/tmp/lima"
    writable: true

# Provision Podman inside the VM
provision:
  - mode: system
    script: |
      #!/bin/bash
      apt-get update
      apt-get install -y podman
  - mode: user
    script: |
      #!/bin/bash
      systemctl --user enable --now podman.socket

# Forward the Podman socket
portForwards:
  - guestSocket: "/run/user/{{.UID}}/podman/podman.sock"
    hostSocket: "{{.Dir}}/sock/podman.sock"
```

```bash
# Start the custom instance
limactl start --name=podman-custom podman-custom.yaml

# Verify it is running
limactl list
```

## Using the Lima Shell

Access the Lima VM directly for troubleshooting or configuration:

```bash
# Open a shell in the Lima instance
limactl shell podman

# Run Podman commands inside the VM
podman images
podman ps -a

# Check system resources
free -h
df -h

# Exit the shell
exit
```

## File Sharing Between Host and VM

Lima automatically shares your home directory with the VM in read-only mode by default:

```bash
# Files in your home directory are accessible inside the VM
limactl shell podman ls /Users/$(whoami)/Projects

# Build an image using files from your host
limactl shell podman bash -c "
  cd /Users/$(whoami)/Projects/my-app
  podman build -t my-app:latest .
"

# The built image is available through the Podman socket
podman --url "$(limactl list podman --format 'unix://{{.Dir}}/sock/podman.sock')" images
```

## Managing Lima Instances

```bash
# Stop a Lima instance
limactl stop podman

# Start it again
limactl start podman

# Restart an instance
limactl stop podman && limactl start podman

# Delete an instance and its data
limactl delete podman

# Delete with force (stops first if running)
limactl delete --force podman

# Show diagnostic information
limactl info
```

## Using Lima with Kubernetes

Lima can also run Kubernetes through k3s:

```bash
# Start a Lima instance with k3s
limactl start --name=k3s template:k3s

# Get the kubeconfig
export KUBECONFIG="$(limactl list k3s --format '{{.Dir}}')/copied-from-guest/kubeconfig.yaml"

# Verify Kubernetes is running
kubectl get nodes
kubectl get pods -A
```

After the instance starts, restart the Lima extension in Podman Desktop and set the kubeconfig path under **Settings > Preferences > Kubernetes** if it is not detected automatically. The cluster will then appear under Kubernetes contexts.

## Troubleshooting Lima with Podman Desktop

Common issues and fixes:

```bash
# Check Lima instance status
limactl list

# View Podman socket logs inside the VM
limactl shell podman journalctl --user -u podman.socket

# Verify the socket is accessible
ls -la "$(limactl list podman --format '{{.Dir}}')/sock/podman.sock"

# Reset if the socket is broken
limactl stop podman
limactl start podman

# Check resource usage of the VM
limactl shell podman top -bn1 | head -20
```

## Summary

Lima provides Podman Desktop with a flexible and configurable Linux VM backend on macOS. By using Lima, you gain control over VM resources, Linux distribution choice, and file sharing configuration. The integration with Podman Desktop is straightforward once the Lima instance is detected and the Podman socket is configured, and Lima also supports running lightweight Kubernetes clusters through k3s for a complete local development environment.
