# How to Run Docker Without Root (Rootless Mode)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Containers, Security, Linux, DevOps

Description: Set up Docker rootless mode on Linux, understand the trade-offs, work around networking limitations, and know when rootless containers matter.

Running Docker as root has been the default since its inception, but it creates a significant attack surface. A container escape with root privileges means full host compromise. Rootless Docker eliminates this by running the entire Docker daemon as an unprivileged user.

---

## Why Rootless Mode Matters

In traditional Docker:
- The Docker daemon runs as root
- Container processes can map to UID 0 on the host
- A container escape = root access to the host

In rootless mode:
- The daemon runs as your regular user
- Container "root" maps to your unprivileged UID
- A container escape = access only to your user's files

This is defense in depth. Even if an attacker breaks out of the container, they're contained to your user's permissions.

---

## Prerequisites

### System Requirements

- Linux kernel 5.11+ (or 4.18+ with user namespaces enabled)
- `uidmap` package installed
- `dbus-user-session` (for systemd integration)
- `slirp4netns` or `vpnkit` (for networking)

### Check Your System

These commands verify your system meets the requirements for rootless Docker. User namespace support is essential for UID mapping.

```bash
# Check kernel version (5.11+ recommended, 4.18+ minimum)
uname -r

# Verify user namespace support is enabled
# Value must be 1 (enabled)
cat /proc/sys/kernel/unprivileged_userns_clone
# Should return 1

# Install required packages on Debian/Ubuntu
sudo apt install uidmap dbus-user-session slirp4netns

# Install required packages on RHEL/Fedora
sudo dnf install shadow-utils slirp4netns
```

### Configure Subordinate UIDs/GIDs

Your user needs subordinate ID ranges for user namespace mapping:

Subordinate UIDs and GIDs allow your unprivileged user to map container UIDs to a range of host UIDs. This is how container "root" becomes a regular user on the host.

```bash
# Check current allocation for your user
cat /etc/subuid
cat /etc/subgid

# If your user is missing, add subordinate ID ranges (run as root)
# This allocates UIDs/GIDs 100000-165535 for user namespace mapping
sudo usermod --add-subuids 100000-165535 --add-subgids 100000-165535 $USER

# Verify the configuration was applied
grep $USER /etc/subuid /etc/subgid
```

---

## Installation

### Option 1: Install Rootless Docker Alongside Regular Docker

If you already have Docker installed:

The rootless setup script configures a separate Docker daemon that runs under your user account, independent of the system Docker.

```bash
# Run the rootless setup script (included with Docker)
dockerd-rootless-setuptool.sh install

# If the script isn't available, download and run installer
curl -fsSL https://get.docker.com/rootless | sh
```

### Option 2: Fresh Rootless-Only Install

For a fresh installation of rootless Docker without the traditional root-mode Docker.

```bash
# Download and run installer script
# This installs Docker configured for rootless mode only
curl -fsSL https://get.docker.com/rootless | sh
```

### Post-Install Configuration

The installer will output environment variables to add to your shell:

Configure your shell to use the rootless Docker socket. The DOCKER_HOST variable tells Docker CLI where to connect.

```bash
# Add to ~/.bashrc or ~/.zshrc
# These configure Docker CLI to connect to rootless daemon
export PATH=/home/$USER/bin:$PATH                        # Add rootless binaries to PATH
export DOCKER_HOST=unix:///run/user/$(id -u)/docker.sock # Point to user-owned socket
```

Reload your shell:

```bash
# Apply the configuration changes
source ~/.bashrc
```

---

## Managing the Rootless Daemon

### Start/Stop with systemd (Recommended)

Using systemd user services is the recommended way to manage the rootless Docker daemon. These services run in your user session.

```bash
# Enable daemon to start automatically when you log in
systemctl --user enable docker

# Start the daemon now
systemctl --user start docker

# Check daemon status
systemctl --user status docker

# View daemon logs for troubleshooting
journalctl --user -u docker
```

### Manual Start (For Testing)

For testing or debugging, you can start the daemon manually without systemd.

```bash
# Start daemon in foreground (useful for debugging)
dockerd-rootless.sh

# Or start in background
dockerd-rootless.sh &
```

### Keep Running After Logout

By default, user services stop when you log out:

Enable lingering to keep your user services running even when not logged in. This is essential for running containers as services.

```bash
# Enable lingering for your user (persists services after logout)
# Required if you want containers to keep running
sudo loginctl enable-linger $USER
```

---

## Verifying Rootless Operation

These commands confirm Docker is running in rootless mode and that UID mapping is working correctly.

```bash
# Check Docker info for rootless indicator
docker info | grep -i rootless
# Should show: rootless

# Verify the daemon socket path is user-owned
echo $DOCKER_HOST
# Should be: unix:///run/user/<uid>/docker.sock

# Run container and check UID inside
docker run --rm alpine id
# Shows: uid=0(root) - this is root INSIDE the container

# View the UID mapping to confirm container root maps to your UID
docker run --rm alpine cat /proc/1/uid_map
# Shows mapping: 0 <your-uid> 1
# This means container UID 0 maps to your host UID
```

---

## Networking Limitations and Workarounds

Rootless Docker can't bind to ports below 1024 by default and uses `slirp4netns` for networking, which has some limitations.

### Port Binding

Unprivileged users cannot bind to ports below 1024 by default on Linux. Use high ports for development.

```bash
# This fails - unprivileged users can't bind port 80
docker run -p 80:80 nginx

# This works - use high port (1024+)
docker run -p 8080:80 nginx
```

### Enable Low Ports (Optional)

If you need to bind to ports below 1024, you have two options. Use with caution as this changes system security settings.

```bash
# Option 1: Add capability to rootlesskit binary
# This allows binding to low ports while remaining rootless
sudo setcap cap_net_bind_service=ep $(which rootlesskit)

# Option 2: Change system-wide setting for unprivileged port binding
# Allows all unprivileged users to bind to ports >= 80
sudo sysctl net.ipv4.ip_unprivileged_port_start=80
```

### Networking Performance

`slirp4netns` adds overhead compared to root mode networking. For high-performance needs:

The pasta network backend provides better performance than slirp4netns for rootless networking.

```bash
# Install pasta (faster than slirp4netns)
sudo apt install passt

# Then configure Docker to use it
# In ~/.config/docker/daemon.json
{
  "features": {
    "containerd-snapshotter": true  # Enable modern features
  }
}
```

### Container-to-Container Networking

Bridge networking works but with some caveats:

User-defined networks work in rootless mode. Containers on the same network can communicate using container names as hostnames.

```bash
# Create a user-defined network
docker network create mynet

# Containers on the same network can communicate by name
docker run --network mynet --name db postgres      # Database container
docker run --network mynet --name app myapp        # App can reach "db" by name
# app container can connect to db using hostname "db"
```

---

## Storage Considerations

### Data Location

Rootless Docker stores data in your home directory:

Unlike root Docker which uses /var/lib/docker, rootless Docker stores everything under your home directory. Plan for disk space accordingly.

```
~/.local/share/docker/
├── containers/    # Container filesystems and metadata
├── image/         # Downloaded and built images
├── network/       # Network configuration
├── overlay2/      # Image and container layers
└── volumes/       # Named volumes
```

### Overlay2 Requirements

The default storage driver may need configuration:

The overlay2 storage driver may require fuse-overlayfs on some systems. Check your current driver and install if needed.

```bash
# Check current storage driver
docker info | grep "Storage Driver"

# If you get errors with overlay2, install fuse-overlayfs
# This provides an unprivileged overlay filesystem
sudo apt install fuse-overlayfs
```

### Configure Storage Location

If your home directory is small, move Docker data:

You can relocate Docker's data directory to a larger partition. This is useful when home directories are quota-limited.

```bash
# Create directory elsewhere (e.g., on larger partition)
mkdir -p /data/docker-rootless

# Configure in ~/.config/docker/daemon.json
{
  "data-root": "/data/docker-rootless"  # Custom data directory
}

# Restart daemon to apply changes
systemctl --user restart docker
```

---

## What Works and What Doesn't

### Works Fine

- Building images
- Running containers
- Volumes and bind mounts
- Container networking
- Docker Compose
- Docker BuildKit

### Limitations

| Feature | Status | Workaround |
|---------|--------|------------|
| Privileged containers | Not supported | Use `--security-opt` instead |
| Bind to ports <1024 | Blocked by default | sysctl or setcap |
| cgroup v2 resource limits | Requires configuration | Enable delegation |
| Host network mode | Limited | Use bridge with port mapping |
| iptables/NAT | Not available | Use slirp4netns/pasta |

### cgroup Resource Limits

For CPU/memory limits to work:

Resource limits require cgroup delegation to be enabled for your user. This allows the unprivileged daemon to set CPU and memory constraints.

```bash
# Check cgroup version (v2 is required for full features)
mount | grep cgroup

# For cgroup v2, enable delegation to user services
sudo mkdir -p /etc/systemd/system/user@.service.d

# Create delegation configuration
sudo cat > /etc/systemd/system/user@.service.d/delegate.conf << EOF
[Service]
# Delegate these cgroup controllers to user services
Delegate=cpu cpuset io memory pids
EOF

# Reload systemd to apply changes
sudo systemctl daemon-reload
```

---

## When to Use Rootless Mode

### Use Rootless When:

- Running on shared development machines
- You don't trust the container images
- Security compliance requires unprivileged containers
- CI/CD runners where you want isolation
- Personal development machines

### Stick with Root Mode When:

- You need privileged containers (rare, but some tools require it)
- Network performance is critical
- You're using advanced networking (macvlan, host network)
- Running on a dedicated Docker host with other protections

---

## Quick Reference

Common commands for installing, managing, and switching between rootless and root Docker modes.

```bash
# Install rootless Docker
curl -fsSL https://get.docker.com/rootless | sh

# Start daemon with systemd user service
systemctl --user start docker

# Enable daemon to start on login
systemctl --user enable docker

# Keep running after logout (required for background containers)
sudo loginctl enable-linger $USER

# Verify rootless mode is active
docker info | grep rootless

# View daemon logs for troubleshooting
journalctl --user -u docker -f

# Switch between rootless and root mode by changing DOCKER_HOST
export DOCKER_HOST=unix:///run/user/$(id -u)/docker.sock  # Use rootless daemon
export DOCKER_HOST=unix:///var/run/docker.sock            # Use root daemon
```

---

## Troubleshooting

### "permission denied" on docker.sock

If you get permission denied errors, the daemon may not be running or the socket path is wrong.

```bash
# Check if socket exists at expected location
ls -la /run/user/$(id -u)/docker.sock

# If missing, start the daemon
systemctl --user start docker
```

### Daemon Won't Start

Check logs for common configuration issues like missing subuid/subgid entries or networking components.

```bash
# Check daemon logs for errors
journalctl --user -u docker --no-pager

# Common issues:
# - Missing subuid/subgid entries → run usermod command above
# - Missing slirp4netns → install networking package
# - Wrong kernel parameters → check user namespace support
```

### Slow Networking

Network performance in rootless mode is slower due to userspace networking. Install pasta for improved performance.

```bash
# Install pasta for better network performance
sudo apt install passt

# Or accept the tradeoff - rootless prioritizes security over speed
# For most workloads, the overhead is acceptable
```

---

## Summary

- Rootless Docker significantly reduces the impact of container escapes
- Setup requires subordinate UID/GID ranges and user namespace support
- Some features are limited: no privileged containers, no low-port binding by default
- Network performance is slightly lower but acceptable for most use cases
- Use it on development machines and shared infrastructure
- Production Docker hosts might use root mode with other security layers

The minor inconveniences are worth the security improvement for most use cases.
