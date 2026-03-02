# How to Use LXC (Standalone) Without LXD on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, LXC, Containers, Virtualization, Linux

Description: Learn how to use LXC directly without LXD on Ubuntu, including creating containers, configuring networking, managing storage, and writing LXC configuration files manually.

---

LXD sits on top of LXC and adds a management layer. But LXC itself is a perfectly functional container runtime that you can use directly without LXD. This is relevant when you want lower-level control, are working on minimal systems, or need to understand what LXD is doing underneath. Using LXC standalone means writing configuration files directly and managing containers via the `lxc-*` command suite (note: these are different from LXD's `lxc` command).

## LXC vs LXD Command Disambiguation

This guide uses the traditional `lxc-*` tools, NOT the LXD `lxc` command:

| Tool | Purpose |
|------|---------|
| `lxc-create` | Create an LXC container (standalone) |
| `lxc-start` | Start an LXC container |
| `lxc-stop` | Stop an LXC container |
| `lxc-ls` | List LXC containers |
| `lxc-attach` | Attach to a running container |
| `lxc-info` | Show container info |
| `lxc` | The LXD CLI (completely separate tool) |

## Installation

```bash
# Install LXC tools
sudo apt update
sudo apt install -y lxc lxc-templates

# Verify installation
lxc-checkconfig   # check kernel support
lxc-ls            # list containers (empty initially)
```

`lxc-checkconfig` checks kernel configuration and reports any missing capabilities. Address any "missing" items if present.

## Creating a Container with Templates

LXC templates are shell scripts that download and configure base container rootfs:

```bash
# List available templates
ls /usr/share/lxc/templates/

# Create an Ubuntu 22.04 container
sudo lxc-create -n mycontainer -t ubuntu -- --release jammy

# Create an Ubuntu 24.04 container
sudo lxc-create -n focal-container -t ubuntu -- --release noble

# Create a Debian container
sudo lxc-create -n debian-box -t debian -- --release bookworm

# Create an Alpine container
sudo lxc-create -n alpine-box -t alpine
```

Container files are created at `/var/lib/lxc/<name>/`:

```bash
# View what was created
ls /var/lib/lxc/mycontainer/
# config  rootfs

ls /var/lib/lxc/mycontainer/rootfs/
# bin  boot  dev  etc  home  lib  ...
```

## Container Configuration Files

Each container has a configuration file at `/var/lib/lxc/<name>/config`. This is the core of standalone LXC - everything is configured here:

```bash
# View the default config
cat /var/lib/lxc/mycontainer/config
```

A basic config looks like:

```ini
# /var/lib/lxc/mycontainer/config

# Template used to create the container
lxc.include = /usr/share/lxc/config/ubuntu.common.conf

# Architecture
lxc.arch = amd64

# Hostname
lxc.uts.name = mycontainer

# Rootfs location
lxc.rootfs.path = dir:/var/lib/lxc/mycontainer/rootfs

# Network configuration
lxc.net.0.type = veth
lxc.net.0.flags = up
lxc.net.0.link = lxcbr0
lxc.net.0.name = eth0
lxc.net.0.hwaddr = 00:16:3e:xx:xx:xx

# Log
lxc.log.level = WARN
```

## Starting and Managing Containers

```bash
# Start a container in the background (daemon mode)
sudo lxc-start -n mycontainer

# Start with verbose output
sudo lxc-start -n mycontainer --logpriority=DEBUG --logfile=/tmp/lxc-debug.log

# Check container status
sudo lxc-info -n mycontainer

# List all containers
sudo lxc-ls --fancy

# Output:
# NAME         STATE   AUTOSTART GROUPS IPV4        IPV6 UNPRIVILEGED
# mycontainer  RUNNING 0         -      10.0.3.100  -    false

# Attach to a running container (get a shell)
sudo lxc-attach -n mycontainer

# Stop gracefully
sudo lxc-stop -n mycontainer

# Force stop
sudo lxc-stop -n mycontainer --kill

# Destroy (delete) a container
sudo lxc-destroy -n mycontainer
```

## Networking Configuration

### Default Bridge (lxcbr0)

LXC installs with a default bridge `lxcbr0`. Check if it's up:

```bash
ip link show lxcbr0

# If it doesn't exist, check the lxc-net service
sudo systemctl status lxc-net
sudo systemctl start lxc-net
sudo systemctl enable lxc-net
```

The bridge configuration is in `/etc/default/lxc-net`:

```bash
cat /etc/default/lxc-net
# USE_LXC_BRIDGE="true"
# LXC_BRIDGE="lxcbr0"
# LXC_ADDR="10.0.3.1"
# LXC_NETMASK="255.255.255.0"
# LXC_NETWORK="10.0.3.0/24"
# LXC_DHCP_RANGE="10.0.3.2,10.0.3.254"
# LXC_DHCP_MAX="253"
```

### Custom Networking in Config

```ini
# In /var/lib/lxc/mycontainer/config

# Veth (virtual ethernet pair) connected to host bridge
lxc.net.0.type = veth
lxc.net.0.link = lxcbr0
lxc.net.0.flags = up
lxc.net.0.name = eth0

# Optional: static MAC address
lxc.net.0.hwaddr = 00:16:3e:ab:cd:ef

# Add a second NIC
lxc.net.1.type = veth
lxc.net.1.link = br0
lxc.net.1.flags = up
lxc.net.1.name = eth1
```

## Resource Limits in LXC Config

LXC uses cgroup settings directly in the config file:

```ini
# CPU limits - number of cores
lxc.cgroup.cpuset.cpus = 0,1

# CPU shares (relative priority)
lxc.cgroup.cpu.shares = 512

# Memory limit
lxc.cgroup.memory.limit_in_bytes = 2G

# Memory + swap limit (set equal to memory to disable swap)
lxc.cgroup.memory.memsw.limit_in_bytes = 2G

# Disk I/O limits (requires blkio cgroup)
# lxc.cgroup.blkio.weight = 500
```

For cgroup v2 (modern Ubuntu uses this):

```ini
# cgroup v2 CPU limit: 50% of one core
lxc.cgroup2.cpu.max = 50000 100000

# cgroup v2 memory limit
lxc.cgroup2.memory.max = 2G
```

## Mounting Host Directories

```ini
# Mount host /data read-only inside the container
# Format: lxc.mount.entry = <host-path> <container-path> <fstype> <options>
lxc.mount.entry = /home/user/data home/ubuntu/data none bind,ro,create=dir 0 0

# Mount read-write
lxc.mount.entry = /home/user/projects home/ubuntu/projects none bind,create=dir 0 0
```

Note: paths inside the container are relative to the rootfs.

## Unprivileged Containers

Unprivileged containers run as a non-root user on the host, significantly improving security:

```bash
# Set up subuids/subgids for your user
echo "$USER:100000:65536" | sudo tee -a /etc/subuid
echo "$USER:100000:65536" | sudo tee -a /etc/subgid

# Create container config directory for your user
mkdir -p ~/.config/lxc

# Create an unprivileged container
lxc-create -n mycontainer -t download -- \
  -d ubuntu -r noble -a amd64

# Config file for unprivileged container (~/.config/lxc/mycontainer/config)
cat > ~/.config/lxc/mycontainer/config <<'EOF'
lxc.include = /etc/lxc/default.conf
lxc.idmap = u 0 100000 65536
lxc.idmap = g 0 100000 65536
lxc.net.0.type = veth
lxc.net.0.link = lxcbr0
lxc.net.0.flags = up
EOF

# Start the unprivileged container (no sudo!)
lxc-start -n mycontainer
```

## Console Access

```bash
# Access the container's console (tty1)
sudo lxc-console -n mycontainer

# Press Ctrl+a q to detach from the console

# Run a command without entering interactive shell
sudo lxc-attach -n mycontainer -- systemctl status nginx
sudo lxc-attach -n mycontainer -- apt update
```

## Snapshots and Cloning

LXC supports simple container cloning:

```bash
# Clone a container (simple copy)
sudo lxc-copy -n mycontainer -N myclone

# Clone and start the new container
sudo lxc-copy -n mycontainer -N myclone --startcontainer

# Snapshot (requires overlay or ZFS storage backend)
sudo lxc-snapshot -n mycontainer
# Creates a snapshot named snap0

# List snapshots
sudo lxc-snapshot -n mycontainer -L

# Restore a snapshot
sudo lxc-snapshot -n mycontainer -r snap0

# Delete a snapshot
sudo lxc-snapshot -n mycontainer -d snap0
```

## Autostart Configuration

To start containers on host boot:

```ini
# In the container's config file
lxc.start.auto = 1
lxc.start.delay = 5    # seconds to wait before starting next autostart container
lxc.start.order = 10   # lower numbers start first
```

Enable the LXC service to handle autostart:

```bash
sudo systemctl enable lxc
sudo systemctl start lxc
```

## When to Choose Standalone LXC Over LXD

Use standalone LXC when:
- You need absolute minimal overhead and no daemon
- You want full control over configuration without abstraction
- You are integrating LXC into custom tooling or scripts
- You are building on systems where LXD's snap dependency is undesirable
- You need to understand what LXD does at a lower level

LXD is more convenient for day-to-day use, but standalone LXC is a solid foundation that requires no additional services beyond the kernel and basic userspace tools.
