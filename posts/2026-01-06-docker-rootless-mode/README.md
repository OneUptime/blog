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

```bash
# Kernel version
uname -r

# User namespace support
cat /proc/sys/kernel/unprivileged_userns_clone
# Should return 1

# Required packages (Debian/Ubuntu)
sudo apt install uidmap dbus-user-session slirp4netns

# Required packages (RHEL/Fedora)
sudo dnf install shadow-utils slirp4netns
```

### Configure Subordinate UIDs/GIDs

Your user needs subordinate ID ranges for user namespace mapping:

```bash
# Check current allocation
cat /etc/subuid
cat /etc/subgid

# If your user is missing, add it (as root)
sudo usermod --add-subuids 100000-165535 --add-subgids 100000-165535 $USER

# Verify
grep $USER /etc/subuid /etc/subgid
```

---

## Installation

### Option 1: Install Rootless Docker Alongside Regular Docker

If you already have Docker installed:

```bash
# Run the rootless setup script
dockerd-rootless-setuptool.sh install

# If the script isn't available, download it
curl -fsSL https://get.docker.com/rootless | sh
```

### Option 2: Fresh Rootless-Only Install

```bash
# Download and run installer
curl -fsSL https://get.docker.com/rootless | sh
```

### Post-Install Configuration

The installer will output environment variables to add to your shell:

```bash
# Add to ~/.bashrc or ~/.zshrc
export PATH=/home/$USER/bin:$PATH
export DOCKER_HOST=unix:///run/user/$(id -u)/docker.sock
```

Reload your shell:

```bash
source ~/.bashrc
```

---

## Managing the Rootless Daemon

### Start/Stop with systemd (Recommended)

```bash
# Enable and start at login
systemctl --user enable docker
systemctl --user start docker

# Check status
systemctl --user status docker

# View logs
journalctl --user -u docker
```

### Manual Start (For Testing)

```bash
# Start daemon in foreground
dockerd-rootless.sh

# Or in background
dockerd-rootless.sh &
```

### Keep Running After Logout

By default, user services stop when you log out:

```bash
# Enable lingering for your user
sudo loginctl enable-linger $USER
```

---

## Verifying Rootless Operation

```bash
# Check Docker info
docker info | grep -i rootless
# Should show: rootless

# Check the daemon socket
echo $DOCKER_HOST
# Should be: unix:///run/user/<uid>/docker.sock

# Verify container root maps to your UID
docker run --rm alpine id
# Shows: uid=0(root) - inside container

docker run --rm alpine cat /proc/1/uid_map
# Shows mapping: 0 <your-uid> 1
```

---

## Networking Limitations and Workarounds

Rootless Docker can't bind to ports below 1024 by default and uses `slirp4netns` for networking, which has some limitations.

### Port Binding

```bash
# This fails - can't bind port 80 without root
docker run -p 80:80 nginx

# This works - use high port
docker run -p 8080:80 nginx
```

### Enable Low Ports (Optional)

```bash
# Allow binding to low ports
sudo setcap cap_net_bind_service=ep $(which rootlesskit)

# Or use sysctl
sudo sysctl net.ipv4.ip_unprivileged_port_start=80
```

### Networking Performance

`slirp4netns` adds overhead compared to root mode networking. For high-performance needs:

```bash
# Use pasta (faster than slirp4netns)
# First install pasta
sudo apt install passt

# Then configure Docker to use it
# In ~/.config/docker/daemon.json
{
  "features": {
    "containerd-snapshotter": true
  }
}
```

### Container-to-Container Networking

Bridge networking works but with some caveats:

```bash
# Create a network
docker network create mynet

# Containers on same network can communicate
docker run --network mynet --name db postgres
docker run --network mynet --name app myapp
# app can reach db by name
```

---

## Storage Considerations

### Data Location

Rootless Docker stores data in your home directory:

```
~/.local/share/docker/
├── containers/
├── image/
├── network/
├── overlay2/
└── volumes/
```

### Overlay2 Requirements

The default storage driver may need configuration:

```bash
# Check current driver
docker info | grep "Storage Driver"

# If you get errors, you might need fuse-overlayfs
sudo apt install fuse-overlayfs
```

### Configure Storage Location

If your home directory is small, move Docker data:

```bash
# Create directory elsewhere
mkdir -p /data/docker-rootless

# Configure in ~/.config/docker/daemon.json
{
  "data-root": "/data/docker-rootless"
}

# Restart daemon
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

```bash
# Check cgroup version
mount | grep cgroup

# For cgroup v2, enable delegation
sudo mkdir -p /etc/systemd/system/user@.service.d
sudo cat > /etc/systemd/system/user@.service.d/delegate.conf << EOF
[Service]
Delegate=cpu cpuset io memory pids
EOF

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

```bash
# Install rootless Docker
curl -fsSL https://get.docker.com/rootless | sh

# Start daemon
systemctl --user start docker

# Enable at login
systemctl --user enable docker

# Keep running after logout
sudo loginctl enable-linger $USER

# Verify rootless mode
docker info | grep rootless

# Check daemon logs
journalctl --user -u docker -f

# Switch between rootless and root mode
export DOCKER_HOST=unix:///run/user/$(id -u)/docker.sock  # rootless
export DOCKER_HOST=unix:///var/run/docker.sock            # root
```

---

## Troubleshooting

### "permission denied" on docker.sock

```bash
# Check socket exists
ls -la /run/user/$(id -u)/docker.sock

# If missing, start the daemon
systemctl --user start docker
```

### Daemon Won't Start

```bash
# Check logs
journalctl --user -u docker --no-pager

# Common issues:
# - Missing subuid/subgid entries
# - Missing slirp4netns
# - Wrong kernel parameters
```

### Slow Networking

```bash
# Install pasta for better performance
sudo apt install passt

# Or accept the tradeoff - rootless prioritizes security over speed
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
