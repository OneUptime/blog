# How to Use machinectl for Container Management on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Systemd, Containers, Machinectl, Nspawn

Description: Use machinectl to manage systemd-nspawn containers on Ubuntu, including pulling images, starting machines, managing resources, and accessing container shells.

---

`machinectl` is the command-line tool for managing systemd-nspawn containers and virtual machines. While Docker and LXD get more attention, systemd-nspawn provides lightweight container isolation that's deeply integrated with the systemd ecosystem. `machinectl` manages these containers (called "machines" in systemd terminology) with a consistent interface.

## Understanding the Stack

The systemd container stack consists of:

- **systemd-nspawn**: Creates and runs individual containers (like chroot, but with namespace isolation)
- **systemd-machined**: The daemon that tracks registered machines and their status
- **machinectl**: The command-line interface to systemd-machined

Containers run as systemd services under `machine.slice` and get full systemd integration: journal forwarding, resource management, D-Bus access, and automatic networking.

## Prerequisites

```bash
# Install systemd-container (includes machinectl and nspawn)
sudo apt update
sudo apt install systemd-container

# Verify
machinectl --version
systemd-nspawn --version
```

## Listing Machines

```bash
# List all running machines (containers and VMs)
machinectl list

# List all registered machines (including stopped ones)
machinectl list-machines

# Show brief image list
machinectl list-images
```

Initially these are empty. Let's create some containers.

## Pulling Container Images

`machinectl pull-tar` and `machinectl pull-raw` download images from the internet:

```bash
# Pull a container image from a URL
# Images land in /var/lib/machines/

# Pull a raw disk image
sudo machinectl pull-raw --verify=no \
    https://cloud-images.ubuntu.com/minimal/releases/jammy/release/ubuntu-22.04-minimal-cloudimg-amd64.img \
    ubuntu-22.04

# Pull a tar archive image (common for container distributions)
sudo machinectl pull-tar --verify=no \
    https://dl-cdn.alpinelinux.org/alpine/v3.19/releases/x86_64/alpine-minirootfs-3.19.0-x86_64.tar.gz \
    alpine-3.19
```

After downloading, the image is registered and available:

```bash
machinectl list-images
```

## Creating a Container from Scratch (debootstrap)

A common approach is to build a container using `debootstrap`:

```bash
# Install debootstrap
sudo apt install debootstrap

# Create an Ubuntu 22.04 container rootfs
sudo debootstrap --arch=amd64 jammy /var/lib/machines/mycontainer http://archive.ubuntu.com/ubuntu

# The container is now registered
machinectl list-images
```

## Starting a Container

```bash
# Start a registered container
sudo machinectl start mycontainer

# Check status
machinectl status mycontainer

# List running machines
machinectl list
```

When you start a machine, machinectl creates a transient systemd service: `systemd-nspawn@mycontainer.service`.

## Accessing a Container Shell

```bash
# Get a root shell in a container
sudo machinectl shell mycontainer

# Get a shell as a specific user
sudo machinectl shell johndoe@mycontainer

# Run a specific command in the container
sudo machinectl shell mycontainer /bin/bash -c "apt update && apt install -y nginx"

# Or use nsenter for an alternative approach
sudo nsenter -m -u -i -n -p -t $(machinectl show mycontainer --property=Leader | cut -d= -f2) /bin/bash
```

## Running a Temporary Container with nspawn

For testing or one-off commands:

```bash
# Start an interactive container session (not registered with machined)
sudo systemd-nspawn -D /var/lib/machines/mycontainer

# Start with networking
sudo systemd-nspawn -D /var/lib/machines/mycontainer --network-veth

# Run a specific command and exit
sudo systemd-nspawn -D /var/lib/machines/mycontainer /bin/echo "Hello from container"

# Start a container as a service (this is what machinectl does)
sudo systemd-nspawn \
    --directory=/var/lib/machines/mycontainer \
    --boot \
    --network-veth \
    --machine=mycontainer
```

## Container Networking

By default, machinectl containers get a private network namespace. Enable networking:

```bash
# Create a container with virtual Ethernet
sudo machinectl start mycontainer

# Or configure networking in the container's unit override
sudo systemctl edit systemd-nspawn@mycontainer.service
```

```ini
[Service]
# Enable a virtual Ethernet link between host and container
ExecStart=
ExecStart=systemd-nspawn --quiet --keep-unit --boot --link-journal=try-guest --network-veth --machine=%i
```

Inside the container, configure the `host0` interface:

```bash
# Inside the container
systemd-nspawn -D /var/lib/machines/mycontainer
# Or:
machinectl shell mycontainer

# Configure networking in the container
systemctl start systemd-networkd
```

### Host Networking (Less Isolated)

```bash
# Pass the host network to the container
sudo systemd-nspawn -D /var/lib/machines/mycontainer --network-bridge=br0
```

## Per-Container Configuration

Place configuration files in `/etc/systemd/nspawn/MACHINENAME.nspawn`:

```bash
sudo nano /etc/systemd/nspawn/mycontainer.nspawn
```

```ini
[Exec]
# Boot with systemd (full init system)
Boot=yes

# Set hostname inside the container
Hostname=mycontainer

# Environment variables
Environment=CONTAINER_NAME=mycontainer

# Allow running specific capabilities
Capability=CAP_NET_ADMIN

[Files]
# Bind mount directories from the host
Bind=/etc/timezone:/etc/timezone
Bind=/etc/localtime:/etc/localtime
BindReadOnly=/var/data:/data

[Network]
# Private networking with virtual Ethernet
VirtualEthernet=yes

# Or use host networking
# VirtualEthernet=no
# Private=no
```

## Resource Limits for Containers

Apply resource limits through systemd's cgroup integration:

```bash
# Set memory limit for a container
sudo systemctl set-property systemd-nspawn@mycontainer.service MemoryMax=1G

# Set CPU quota
sudo systemctl set-property systemd-nspawn@mycontainer.service CPUQuota=50%

# Set I/O weight
sudo systemctl set-property systemd-nspawn@mycontainer.service IOWeight=100

# Verify
systemctl show systemd-nspawn@mycontainer.service | grep -E "Memory|CPU|IO"
```

## Stopping and Managing Containers

```bash
# Gracefully stop a container (sends SIGTERM to PID 1)
sudo machinectl stop mycontainer

# Terminate a container (immediate kill)
sudo machinectl terminate mycontainer

# Reboot a container
sudo machinectl reboot mycontainer

# Power off a container
sudo machinectl poweroff mycontainer
```

## Transferring Files

```bash
# Copy a file into the container
sudo machinectl copy-to mycontainer /path/on/host /path/in/container

# Copy a file from the container to the host
sudo machinectl copy-from mycontainer /path/in/container /path/on/host
```

## Enabling Auto-Start

Make a container start at boot:

```bash
# Enable the nspawn service for the container
sudo systemctl enable systemd-nspawn@mycontainer.service

# Verify
systemctl is-enabled systemd-nspawn@mycontainer.service
```

## Journal Integration

Container logs are forwarded to the host's journal and tagged with the machine name:

```bash
# View logs from a specific container
journalctl -M mycontainer

# Follow container logs
journalctl -M mycontainer -f

# Filter by service inside the container
journalctl -M mycontainer -u nginx.service

# View all container logs mixed with host logs (tagged by machine)
journalctl -a | grep "mycontainer"
```

## Cloning Container Images

```bash
# Clone a container image (creates a copy)
sudo machinectl clone mycontainer mycontainer-v2

# Remove an image
sudo machinectl remove mycontainer-old

# Rename an image
sudo machinectl rename mycontainer-v2 production-container
```

## Comparing machinectl and Docker

| Feature | machinectl/nspawn | Docker |
|---------|-------------------|--------|
| Image ecosystem | Limited (raw rootfs) | Vast (Docker Hub) |
| Integration | Deep systemd integration | Separate daemon |
| Networking | VirtualEthernet/bridges | Built-in overlay networks |
| Rootfs format | Directory or raw image | Layered filesystem |
| Journal | Forwarded automatically | Separate log driver |
| Use case | System containers, VMs | App containers |

machinectl/nspawn excels at "system containers" - containers that run a full Linux userspace with their own init system. Docker excels at "app containers" - packaging individual applications.

## Practical Example: Running a Service in a Container

```bash
# Create a container for a web service
sudo debootstrap jammy /var/lib/machines/webserver

# Configure the container
sudo nano /etc/systemd/nspawn/webserver.nspawn
```

```ini
[Exec]
Boot=yes
Hostname=webserver

[Files]
# Mount a shared directory
Bind=/var/www/html:/var/www/html

[Network]
VirtualEthernet=yes
```

```bash
# Start the container
sudo machinectl start webserver

# Get a shell
sudo machinectl shell webserver

# Inside the container - install nginx
apt update && apt install -y nginx
systemctl enable --now nginx
exit

# Enable auto-start on host boot
sudo systemctl enable systemd-nspawn@webserver.service

# View nginx logs from the host
journalctl -M webserver -u nginx.service -f
```

`machinectl` provides a clean interface to systemd's container capabilities. For teams already invested in the systemd ecosystem, nspawn containers offer lightweight isolation with better integration than adding a separate container daemon.
