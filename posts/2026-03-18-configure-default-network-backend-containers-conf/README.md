# How to Configure Default Network Backend in containers.conf

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Configuration, Networking

Description: Learn how to configure the default network backend in containers.conf to choose between netavark and CNI for Podman container networking.

---

> The network backend determines how Podman creates and manages container networks, with netavark offering modern features and CNI providing broad ecosystem compatibility.

Podman supports two network backends: netavark (the modern default) and CNI (Container Network Interface). The choice affects DNS resolution, IPv6 support, and network performance. This guide explains how to configure the default network backend and its associated settings in `containers.conf`.

---

## Understanding Network Backends

Podman provides two backend options for container networking.

```bash
# Check the current network backend

podman info --format '{{.Host.NetworkBackend}}'

# Check available network-related information
podman info --format json | python3 -c "
import sys, json
info = json.load(sys.stdin)
host = info.get('host', {})
print('Network Backend:', host.get('networkBackend'))
print('DNS:', host.get('dns', {}))
"

# netavark: Modern Rust-based backend (Podman 4.0+ default)
# - Built-in DNS server (aardvark-dns)
# - Better IPv6 support
# - Improved performance

# CNI: Traditional plugin-based backend
# - Broad plugin ecosystem
# - Compatible with older configurations
# - Uses plugin-based DNS when configured
```

## Configuring Netavark Backend

Set netavark as the default network backend.

```bash
# Verify netavark and aardvark-dns are installed
command -v netavark >/dev/null || test -x /usr/libexec/podman/netavark && echo "netavark found"
command -v aardvark-dns >/dev/null || test -x /usr/libexec/podman/aardvark-dns && echo "aardvark-dns found"

# Configure netavark in containers.conf
mkdir -p ~/.config/containers

cat > ~/.config/containers/containers.conf << 'EOF'
[network]
# Use netavark as the network backend
# Provides built-in DNS resolution via aardvark-dns
network_backend = "netavark"

# Default subnet for new networks
default_subnet = "10.88.0.0/16"

# Default network driver
default_network = "podman"
EOF
```

```bash
# Verify the backend is set
podman info --format '{{.Host.NetworkBackend}}'

# Test DNS resolution between containers
podman network create test-net

podman run -d --name web --network test-net alpine sleep 300
podman run --rm --network test-net alpine ping -c 2 web

# Clean up
podman rm -f web
podman network rm test-net
```

## Configuring CNI Backend

Switch to the CNI backend for compatibility with existing plugins.

```bash
# Configure CNI in containers.conf
cat > ~/.config/containers/containers.conf << 'EOF'
[network]
# Use CNI as the network backend
network_backend = "cni"

# CNI plugin directories
cni_plugin_dirs = [
    "/usr/libexec/cni",
    "/usr/lib/cni",
    "/opt/cni/bin"
]
EOF
```

```bash
# Check for available CNI plugins
ls /usr/libexec/cni/ 2>/dev/null || ls /opt/cni/bin/ 2>/dev/null || echo "Check CNI plugin location"

# Verify the CNI backend is active
podman info --format '{{.Host.NetworkBackend}}'
```

## Configuring DNS Settings

Control default upstream DNS servers for containers.

```bash
# Configure DNS with netavark backend
cat > ~/.config/containers/containers.conf << 'EOF'
[network]
network_backend = "netavark"

[containers]
# Default DNS servers for containers
dns_servers = [
    "8.8.8.8",
    "8.8.4.4"
]

# Enable DNS for container-to-container resolution
# This is enabled by default with netavark
EOF

# Test DNS resolution
podman run --rm alpine nslookup google.com

# Test container-to-container DNS
podman network create dns-test
podman run -d --name server --network dns-test alpine sleep 120
podman run --rm --network dns-test alpine ping -c 1 server
podman rm -f server
podman network rm dns-test
```

## Configuring Network Subnets

Define custom default subnets for container networks.

```bash
# Configure default subnet ranges
cat > ~/.config/containers/containers.conf << 'EOF'
[network]
network_backend = "netavark"

# Default subnet for the first network
default_subnet = "10.88.0.0/16"

# Subnet pool for additional networks
# Each new network gets a subnet from this pool
default_subnet_pools = [
    { "base" = "10.89.0.0/16", "size" = 24 },
    { "base" = "10.90.0.0/16", "size" = 24 }
]
EOF

# Create networks and verify subnet assignment
podman network create net1
podman network create net2

# Inspect the assigned subnets
podman network inspect net1 --format '{{range .Subnets}}{{.Subnet}}{{end}}'
podman network inspect net2 --format '{{range .Subnets}}{{.Subnet}}{{end}}'

# Clean up
podman network rm net1 net2
```

## Switching Between Backends

Migrate from one backend to another safely.

```bash
# Before switching, remove all networks and containers
podman stop -a
podman rm -a
podman network prune -f

# Reset Podman storage to clear network state
podman system reset --force 2>/dev/null

# Now switch the backend in containers.conf
cat > ~/.config/containers/containers.conf << 'EOF'
[network]
# Switch to the desired backend
network_backend = "netavark"

default_subnet = "10.88.0.0/16"
EOF

# Verify the switch
podman info --format '{{.Host.NetworkBackend}}'

# Test basic networking
podman run --rm alpine ping -c 2 8.8.8.8
```

## Summary

The network backend setting in `containers.conf` controls how Podman handles container networking. Netavark is the modern default with built-in DNS via aardvark-dns and better IPv6 support, while CNI provides compatibility with existing plugin ecosystems. Configure default subnets and subnet pools in the `[network]` section, and default container DNS servers in the `[containers]` section. When switching backends with existing containers or pods, reset container and network state with `podman system reset`.
