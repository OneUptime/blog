# How to Use systemd-nspawn for Lightweight System Containers on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Systemd-nspawn, Containers, Systemd, Virtualization

Description: Run lightweight system containers on Ubuntu using systemd-nspawn for process isolation without the overhead of Docker or full VMs, with networking and service management.

---

`systemd-nspawn` spawns a container-like environment within a directory tree, providing namespace isolation for processes. It is part of systemd and available on every modern Ubuntu system without additional installation. While it lacks the ecosystem of Docker or Podman, it is exceptionally lightweight, integrates deeply with systemd for service management, and is excellent for development, testing, and running services that need stronger isolation than chroot but less overhead than a full VM.

## Understanding systemd-nspawn

`systemd-nspawn` creates Linux namespaces (PID, mount, UTS, IPC, network) around a directory containing a root filesystem. Compared to Docker:

- No daemon required
- Full systemd init inside the container (for full OS containers)
- Managed by `machinectl` and the systemd machine manager
- Tighter integration with the host's systemd journal
- No image registry concept - directories or tar archives

It is ideal for running complete Linux distributions (Debian, Fedora, Alpine) as isolated environments.

## Creating a Container Root Filesystem

You need a minimal root filesystem to start. There are several ways to create one.

### Using debootstrap for Debian/Ubuntu

```bash
# Install debootstrap
sudo apt install -y debootstrap

# Create a minimal Ubuntu 22.04 root filesystem in /var/lib/machines/mycontainer
sudo debootstrap \
    --include=systemd,dbus,iproute2,iputils-ping \
    jammy \
    /var/lib/machines/mycontainer \
    http://archive.ubuntu.com/ubuntu/

# Verify the filesystem was created
ls /var/lib/machines/mycontainer
```

### Using dnf/yum for Fedora/CentOS (on Ubuntu host)

```bash
# Install the RPM tools
sudo apt install -y dnf

# Create a Fedora container
sudo mkdir -p /var/lib/machines/fedora39
sudo dnf --installroot=/var/lib/machines/fedora39 \
    --releasever=39 \
    install -y @core
```

### From a Docker/OCI Image

```bash
# Export a Docker image as a tar archive and use it as nspawn root
docker export $(docker create debian:12) | \
    sudo tar xf - -C /var/lib/machines/debian12

# Or use Skopeo to pull without Docker
sudo skopeo copy \
    docker://debian:12 \
    oci-archive:/tmp/debian12.tar

# Extract the image layers (simplified approach)
# In practice, use a tool like umoci for proper OCI extraction
```

## Basic Container Operations

```bash
# Start an interactive shell in the container
sudo systemd-nspawn -D /var/lib/machines/mycontainer

# You are now inside the container
# The prompt changes and the PID namespace is isolated
whoami     # root (inside the container)
hostname   # mycontainer (or the host name, depending on setup)
ps aux     # Only shows processes in this container

# Exit the container
exit
```

## Running a Container as a systemd Machine

The proper way to run persistent containers is through `machinectl`:

```bash
# Start a container in the background as a systemd machine
sudo machinectl start mycontainer

# List running machines
machinectl list

# Open a shell in a running machine
sudo machinectl shell mycontainer

# View machine status
machinectl status mycontainer

# Stop a machine
machinectl poweroff mycontainer

# Kill a machine immediately
machinectl kill mycontainer
```

## Configuring the Container

Before running the container as a persistent machine, configure it:

```bash
# Set up the container's hostname and basic settings
sudo systemd-nspawn -D /var/lib/machines/mycontainer --as-pid2 bash <<'EOF'
# Set root password
echo "root:password" | chpasswd

# Set hostname
echo "mycontainer" > /etc/hostname

# Set up locale
locale-gen en_US.UTF-8

# Enable networking
systemctl enable systemd-networkd
systemctl enable systemd-resolved

# Create a symlink for resolv.conf
ln -sf /run/systemd/resolve/stub-resolv.conf /etc/resolv.conf
EOF
```

## Configuring Networking

By default, nspawn containers share the host's network namespace (all network interfaces visible). For isolation, use virtual Ethernet:

```bash
# Start with a virtual Ethernet pair (isolated networking)
sudo systemd-nspawn \
    -D /var/lib/machines/mycontainer \
    --network-veth \
    --boot

# Inside the container, configure the network
# The container sees a 'host0' interface connected to the host's 've-mycontainer'
ip addr show host0
```

### Using .nspawn Configuration Files

Create a per-container configuration file:

```bash
sudo tee /etc/systemd/nspawn/mycontainer.nspawn > /dev/null <<'EOF'
[Exec]
# Boot with full init system
Boot=yes

# Networking: create an isolated veth pair
[Network]
VirtualEthernet=yes

# Bind-mount directories from host
[Files]
Bind=/data/myapp:/app
Bind=/var/log/myapp:/var/log/app
EOF
```

### Networking with systemd-networkd on the Host

```bash
# On the host: configure the virtual Ethernet host side
sudo tee /etc/systemd/network/80-ve-mycontainer.network > /dev/null <<'EOF'
[Match]
Name=ve-mycontainer

[Network]
# Assign host side of the veth pair
Address=192.168.100.1/24
IPForward=yes
EOF

# Inside the container, configure the container side (host0)
sudo systemd-nspawn -D /var/lib/machines/mycontainer bash <<'EOF'
cat > /etc/systemd/network/80-host0.network <<INNER
[Match]
Name=host0

[Network]
Address=192.168.100.2/24
Gateway=192.168.100.1
DNS=192.168.100.1
INNER

systemctl enable systemd-networkd
EOF

sudo systemctl restart systemd-networkd
```

## Running with systemd Service

For permanent containers that start at boot, enable them as systemd-machined services:

```bash
# Enable a container to start at boot
sudo machinectl enable mycontainer

# This creates a symlink enabling the machine
ls /etc/systemd/system/machines.target.wants/

# Start all enabled machines
sudo systemctl start machines.target

# Check machine status
sudo systemctl status systemd-nspawn@mycontainer.service
sudo journalctl -u systemd-nspawn@mycontainer.service -f
```

## Bind Mounts

Share directories between host and container:

```bash
# Mount a host directory inside the container (read-write)
sudo systemd-nspawn \
    -D /var/lib/machines/mycontainer \
    --bind /srv/data:/data \
    --boot

# Mount read-only
sudo systemd-nspawn \
    -D /var/lib/machines/mycontainer \
    --bind-ro /etc/ssl:/etc/ssl-host \
    --boot

# In the .nspawn file:
# [Files]
# Bind=/srv/data:/data
# BindReadOnly=/etc/ssl:/etc/ssl-host
```

## Resource Limits

Use systemd slice configuration to limit container resources:

```bash
# Set memory and CPU limits via machinectl
sudo machinectl set-property mycontainer MemoryMax=512M
sudo machinectl set-property mycontainer CPUQuota=50%

# Or create a resource configuration file
sudo tee /etc/systemd/system.control/systemd-nspawn@mycontainer.service.d/limits.conf > /dev/null <<'EOF'
[Service]
MemoryMax=512M
CPUQuota=50%
TasksMax=200
EOF

sudo systemctl daemon-reload
sudo machinectl restart mycontainer
```

## Installing and Running Services in the Container

```bash
# Open a shell inside the container
sudo machinectl shell mycontainer

# Inside the container, install and configure services normally
apt update && apt install -y nginx
systemctl enable nginx
systemctl start nginx

# Exit the container
exit

# The nginx service is now running inside the container
# Check from the host
machinectl status mycontainer
```

## Port Forwarding

nspawn containers with private networking need port forwarding to be accessible from outside:

```bash
# On the host, forward port 8080 to the container's port 80
sudo iptables -t nat -A PREROUTING -p tcp --dport 8080 \
    -j DNAT --to-destination 192.168.100.2:80

sudo iptables -A FORWARD -d 192.168.100.2 -p tcp --dport 80 -j ACCEPT

# Make persistent
sudo apt install -y iptables-persistent
sudo netfilter-persistent save
```

## Useful Commands Reference

```bash
# Inspect a running container's namespaces
machinectl status mycontainer

# Copy files into a running container
machinectl copy-to mycontainer /local/file /container/path

# Copy files out of a running container
machinectl copy-from mycontainer /container/path /local/destination

# Execute a command in a running container
machinectl shell mycontainer -- /usr/bin/apt update

# View container logs (merged with host journal)
journalctl -M mycontainer

# List available (stopped) containers
machinectl list-images

# Remove a container image
machinectl remove mycontainer
```

## When to Use systemd-nspawn

`systemd-nspawn` is the right tool when:

- You need a full systemd init environment (running systemd services, journald, etc.)
- You want to test configurations in an isolated OS without a full VM
- You need kernel-level isolation without Docker's daemon overhead
- You are developing or testing packages for a different Ubuntu/Debian release
- Your CI system doesn't support Docker but can use systemd

For application containers (single processes, microservices), Docker or Podman are more practical. For full-system containers where you want the experience of a VM with the overhead of a container, `systemd-nspawn` is the best tool on Linux.
