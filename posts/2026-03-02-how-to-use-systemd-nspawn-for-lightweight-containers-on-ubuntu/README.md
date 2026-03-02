# How to Use systemd-nspawn for Lightweight Containers on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, systemd, Containers, Virtualization

Description: Learn how to use systemd-nspawn to create and run lightweight containers on Ubuntu without Docker, including creating container images and managing them with machinectl.

---

systemd-nspawn is a container manager built directly into systemd. It creates isolated environments similar to Docker containers, but uses the existing systemd tooling you already have on your Ubuntu system. For situations where you need process isolation without the overhead of a full container runtime, nspawn is a solid option. It is also the technology behind tools like `machinectl` and is used internally by some build systems.

## Prerequisites and Installation

systemd-nspawn is part of the `systemd-container` package. On most Ubuntu systems it is already installed:

```bash
# Check if nspawn is available
which systemd-nspawn

# Install if missing
sudo apt update
sudo apt install systemd-container
```

You will also need a way to create a root filesystem for the container. We will use `debootstrap` for Ubuntu-based containers:

```bash
sudo apt install debootstrap
```

## Creating a Basic Ubuntu Container

The simplest approach is to bootstrap an Ubuntu system into a directory:

```bash
# Create a directory for the container
sudo mkdir -p /var/lib/machines/mycontainer

# Bootstrap Ubuntu 22.04 into that directory
sudo debootstrap --arch=amd64 jammy /var/lib/machines/mycontainer \
    http://archive.ubuntu.com/ubuntu/

# This will take a few minutes to download and install packages
```

Alternatively, use `mmdebstrap` which is often faster:

```bash
sudo apt install mmdebstrap
sudo mmdebstrap jammy /var/lib/machines/mycontainer
```

## Starting a Container

Once the root filesystem is ready, boot into the container:

```bash
# Start an interactive shell in the container
sudo systemd-nspawn -D /var/lib/machines/mycontainer

# You will get a shell prompt inside the container
# The hostname changes to show you are inside
```

For a more complete container experience with full init:

```bash
# Boot the container with systemd as PID 1
sudo systemd-nspawn -b -D /var/lib/machines/mycontainer

# -b boots the container (runs /sbin/init)
# You will see a login prompt
```

## Networking in Containers

By default, nspawn containers share the host network. For isolation, use the `--network-veth` flag:

```bash
# Start container with a dedicated virtual ethernet interface
sudo systemd-nspawn -b -D /var/lib/machines/mycontainer \
    --network-veth

# This creates a veth pair: host side (ve-mycontainer) and container side (host0)
```

Set up networking inside the container:

```bash
# Inside the container, configure the network interface
ip addr add 192.168.100.2/24 dev host0
ip link set host0 up
ip route add default via 192.168.100.1

# On the host, configure the other end
sudo ip addr add 192.168.100.1/24 dev ve-mycontainer
sudo ip link set ve-mycontainer up
```

For bridge networking (allows multiple containers to communicate):

```bash
# Create a bridge on the host
sudo ip link add br-containers type bridge
sudo ip addr add 10.0.0.1/24 dev br-containers
sudo ip link set br-containers up

# Start container connected to the bridge
sudo systemd-nspawn -b -D /var/lib/machines/mycontainer \
    --network-bridge=br-containers
```

## Using machinectl to Manage Containers

`machinectl` is the management interface for nspawn containers registered in `/var/lib/machines/`:

```bash
# List registered machines
machinectl list

# List available machine images
machinectl list-images

# Start a registered container as a background service
sudo machinectl start mycontainer

# Get a shell in a running container
sudo machinectl shell mycontainer

# Show status of a running container
machinectl status mycontainer

# Stop a running container
sudo machinectl stop mycontainer

# Remove a container image
sudo machinectl remove mycontainer
```

## Running Containers as systemd Services

nspawn containers can run as proper systemd services using the `systemd-nspawn@` template unit:

```bash
# Enable the container as a service (starts on boot)
sudo systemctl enable systemd-nspawn@mycontainer.service

# Start the container service now
sudo systemctl start systemd-nspawn@mycontainer.service

# Check its status
systemctl status systemd-nspawn@mycontainer.service
```

This runs the container as a systemd-managed unit, which means you get automatic restart, logging through journald, and resource management.

## Configuring Container Settings

You can configure per-container settings in `/etc/systemd/nspawn/`:

```bash
# Create a configuration file for the container
sudo mkdir -p /etc/systemd/nspawn/
sudo tee /etc/systemd/nspawn/mycontainer.nspawn << 'EOF'
[Exec]
# Set hostname inside the container
Hostname=mycontainer

# Boot with systemd
Boot=yes

[Files]
# Bind mount a directory from the host into the container
Bind=/srv/data:/data

[Network]
# Use a virtual ethernet pair
VirtualEthernet=yes

# Connect to a bridge
Bridge=br-containers
EOF
```

## Bind Mounting Host Directories

Sharing directories between host and container is straightforward:

```bash
# Mount a host directory read-write
sudo systemd-nspawn -D /var/lib/machines/mycontainer \
    --bind=/srv/data:/data

# Mount a host directory read-only
sudo systemd-nspawn -D /var/lib/machines/mycontainer \
    --bind-ro=/etc/resolv.conf:/etc/resolv.conf

# Mount a tmpfs for temporary files
sudo systemd-nspawn -D /var/lib/machines/mycontainer \
    --tmpfs=/tmp
```

## Running Commands Without Booting

For running a single command in the container without full boot:

```bash
# Run a command as root inside the container
sudo systemd-nspawn -D /var/lib/machines/mycontainer \
    /bin/echo "Hello from inside the container"

# Run as a specific user
sudo systemd-nspawn -D /var/lib/machines/mycontainer \
    --user=www-data \
    /usr/local/bin/myapp

# Run with specific environment variables
sudo systemd-nspawn -D /var/lib/machines/mycontainer \
    --setenv=DATABASE_URL=postgresql://localhost/mydb \
    /usr/local/bin/myapp
```

## Resource Control

nspawn containers integrate with systemd's cgroup-based resource control:

```bash
# Limit CPU usage (50% of one core)
sudo systemd-nspawn -D /var/lib/machines/mycontainer \
    --system-call-filter=@basic-io \
    -b

# Set limits via machinectl
sudo machinectl set-limit mycontainer 10G  # disk space limit

# Set CPU and memory limits in the nspawn config file
sudo tee -a /etc/systemd/nspawn/mycontainer.nspawn << 'EOF'

[Exec]
CPUAffinity=0-1
EOF
```

For more fine-grained resource limits, use `systemctl set-property` on the running container's slice:

```bash
# After the container is running
sudo systemctl set-property systemd-nspawn@mycontainer.service \
    MemoryMax=512M CPUQuota=50%
```

## Pulling Container Images with machinectl

machinectl can pull container images directly:

```bash
# Pull a raw image from a URL
sudo machinectl pull-raw \
    https://cloud-images.ubuntu.com/minimal/releases/jammy/release/ubuntu-22.04-minimal-cloudimg-amd64.root.tar.xz \
    ubuntu-jammy

# Pull a tar image
sudo machinectl pull-tar \
    https://example.com/mycontainer.tar.xz \
    mycontainer-image

# List downloaded images
machinectl list-images
```

## Comparing nspawn with Docker

nspawn is not a replacement for Docker in all situations, but it has distinct advantages:

- No separate daemon required
- Deep systemd integration (logging, resource management, service management)
- Lower overhead for simple isolation needs
- Works well for building and testing in clean environments
- Native support for systemd-based OS images

Docker remains better for:
- Container image distribution and registries
- Complex networking scenarios
- Applications that need docker-compose style orchestration
- Teams already invested in the Docker ecosystem

## Summary

systemd-nspawn provides container-like isolation without requiring a separate container runtime. For Ubuntu systems already running systemd, it is a natural fit for running isolated workloads. The `machinectl` tool makes management straightforward, and integration with the systemd service manager means containers can be treated like any other service. Whether you need a clean build environment, an isolated test instance, or a lightweight service container, nspawn is worth knowing alongside Docker and other container technologies.
