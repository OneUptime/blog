# How to Fix Rootless Podman Network Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, Rootless, Troubleshooting

Description: A practical guide to diagnosing and fixing common networking problems in rootless Podman containers, including DNS failures, port conflicts, and inter-container communication.

---

> "Most rootless Podman network issues stem from missing configurations, not missing capabilities."

Running Podman without root privileges is a security win, but networking in rootless mode works differently than in rootful mode. For the default rootless network path, Podman uses slirp4netns or pasta to create userspace network stacks instead of attaching containers directly to a host bridge. This guide walks through the most common network issues and how to fix them.

---

## Understanding Rootless Networking

Rootless Podman relies on userspace networking tools for its default network path. Check the Podman network backend and the available rootless networking tools:

```bash
# Check the current Podman network backend

podman info --format '{{.Host.NetworkBackend}}'

# Check if slirp4netns is installed
which slirp4netns

# Check if pasta (passt) is installed
which pasta
```

If neither tool is found, install the one your distribution supports:

```bash
# On Fedora/RHEL
sudo dnf install slirp4netns

# On Ubuntu/Debian
sudo apt-get install slirp4netns

# For pasta support (newer distributions)
sudo dnf install passt
```

## Fixing DNS Resolution Failures

One of the most common issues is DNS not working inside rootless containers. Containers may fail to resolve hostnames even when the host machine resolves them fine.

```bash
# Test DNS inside a container
podman run --rm alpine nslookup google.com

# If DNS fails, check your resolv.conf
podman run --rm alpine cat /etc/resolv.conf

# Force a specific DNS server
podman run --rm --dns 8.8.8.8 alpine nslookup google.com
```

If your host uses systemd-resolved, the default stub resolver at 127.0.0.53 may not work inside rootless containers. Fix this by pointing to real upstream DNS servers:

```bash
# Create a custom containers.conf for your user
mkdir -p ~/.config/containers

# Add DNS configuration
cat >> ~/.config/containers/containers.conf << 'EOF'
[containers]
dns_servers = ["8.8.8.8", "8.8.4.4"]
EOF

# Verify the fix
podman run --rm alpine nslookup google.com
```

## Fixing Port Mapping Problems

Rootless containers cannot bind to ports below 1024 by default. If you see "permission denied" when mapping ports, this is the likely cause.

```bash
# This will fail in rootless mode
podman run -d -p 80:80 nginx

# Use a high port instead
podman run -d -p 8080:80 nginx

# Or check the current unprivileged port start value
cat /proc/sys/net/ipv4/ip_unprivileged_port_start

# Lower it system-wide if needed (requires root)
sudo sysctl -w net.ipv4.ip_unprivileged_port_start=80
```

## Fixing Container-to-Container Communication

In rootless mode, containers on different networks cannot communicate by default. Use a shared podman network:

```bash
# Create a custom network for rootless containers
podman network create mynet

# List available networks
podman network ls

# Run two containers on the same network
podman run -d --name web --network mynet nginx
podman run -d --name app --network mynet alpine sleep 3600

# Test connectivity and container-name DNS
podman exec app wget -qO- http://web:80
```

## Fixing slirp4netns Performance Issues

If network performance is slow, try switching to pasta or tuning slirp4netns:

```bash
# Check current slirp4netns options
podman info | grep -i slirp

# Run with pasta backend instead of slirp4netns
podman run --rm --network pasta alpine wget -qO- http://example.com

# Set pasta as the default in containers.conf
cat >> ~/.config/containers/containers.conf << 'EOF'
[network]
default_rootless_network_cmd = "pasta"
EOF
```

## Resetting the Network Stack

When all else fails, resetting the Podman network configuration can clear corrupted state:

```bash
# Stop all running containers first
podman stop --all

# Remove all networks
podman network prune -f

# Reset Podman storage and network state
# WARNING: this removes containers, pods, images, networks, volumes, and machines
podman system reset --force

# Recreate your network and test again
podman network create mynet
podman run --rm --network mynet alpine wget -qO- http://example.com
```

## Checking Firewall Interference

Host firewalls can block traffic to published container ports. Check and adjust as needed:

```bash
# Check if firewalld is blocking traffic
sudo firewall-cmd --list-all

# On systems with nftables, list rules
sudo nft list ruleset | head -40

# Allow traffic to a published host port through firewalld
sudo firewall-cmd --add-port=8080/tcp --permanent
sudo firewall-cmd --reload
```

## Summary

Rootless Podman networking relies on userspace tools like slirp4netns and pasta instead of kernel-level network manipulation. Most issues trace back to missing tools, DNS misconfiguration, or port privilege restrictions. Start by verifying your network backend is installed, configure explicit DNS servers if resolution fails, use high ports or adjust the unprivileged port start value, and use named Podman networks for container-to-container communication. When problems persist, a full `podman system reset` followed by reconfiguration is a reliable last resort.
