# How to Configure IPv6 Networking in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, IPv6, Configuration

Description: Learn how to enable and configure IPv6 networking for Podman containers and networks.

---

> IPv6 networking in Podman enables containers to communicate using IPv6 addresses, which is increasingly important for modern network deployments and IPv6-only environments.

As IPv6 adoption grows, containerized applications need IPv6 connectivity. Podman supports IPv6 on custom networks with configurable subnets and gateways. This guide covers IPv6 network creation and container configuration.

---

## Enabling IPv6 on a Podman Network

```bash
# Create a network with IPv6 enabled

podman network create \
  --ipv6 \
  --subnet fd00:dead:beef::/64 \
  --gateway fd00:dead:beef::1 \
  ipv6-network

# Verify IPv6 is enabled
podman network inspect ipv6-network --format '{{ .IPv6Enabled }}'
```

## Running Containers with IPv6

```bash
# Run a container on the IPv6 network
podman run -d --name web6 \
  --network ipv6-network \
  docker.io/library/nginx:latest

# Check the container's IPv6 address
podman inspect web6 --format '{{ range .NetworkSettings.Networks }}{{ .GlobalIPv6Address }}{{ end }}'

# Verify IPv6 connectivity with a utility container
podman run --rm --network ipv6-network \
  docker.io/library/alpine:latest ping -6 -c 3 fd00:dead:beef::1
```

## Assigning Static IPv6 Addresses

```bash
# Assign a specific IPv6 address
podman run -d --name static6 \
  --network ipv6-network \
  --ip6 fd00:dead:beef::100 \
  docker.io/library/nginx:latest

# Verify the static address
podman inspect static6 --format '{{ range .NetworkSettings.Networks }}{{ .GlobalIPv6Address }}{{ end }}'
```

## IPv6 DNS Resolution

```bash
# Containers on the same IPv6 network resolve each other
podman run -d --name svc-a --network ipv6-network \
  docker.io/library/alpine:latest tail -f /dev/null

podman run -d --name svc-b --network ipv6-network \
  docker.io/library/alpine:latest tail -f /dev/null

# Resolve by name over IPv6
podman exec svc-a ping -6 -c 2 svc-b
```

## IPv6 Port Publishing

```bash
# Publish ports on IPv6
podman run -d --name web6-public \
  --network ipv6-network \
  -p "[::]:8080:80" \
  docker.io/library/nginx:latest

# The container is accessible on the host's IPv6 address
# curl -6 http://[::1]:8080
```

## Host IPv6 Configuration

Ensure IPv6 is enabled on the host:

```bash
# Check if IPv6 is enabled on the host
sysctl net.ipv6.conf.all.disable_ipv6
# Should be 0

# Enable IPv6 if disabled
sudo sysctl -w net.ipv6.conf.all.disable_ipv6=0
sudo sysctl -w net.ipv6.conf.default.disable_ipv6=0

# Make persistent
echo "net.ipv6.conf.all.disable_ipv6 = 0" | sudo tee -a /etc/sysctl.d/99-ipv6.conf
```

## IPv6 with Unique Local Addresses (ULA)

```bash
# ULA addresses (fc00::/7) are for private networks.
# fd00::/8 is the locally assigned ULA range commonly used for internal networks.
podman network create \
  --ipv6 \
  --subnet fd12:3456:7890::/48 \
  --gateway fd12:3456:7890::1 \
  ula-network

# Use for internal container communication
podman run -d --name internal-svc \
  --network ula-network \
  docker.io/library/alpine:latest tail -f /dev/null
```

## Troubleshooting IPv6

```bash
# Check IPv6 routes with a utility container
podman run --rm --network ipv6-network \
  docker.io/library/alpine:latest ip -6 route show

# Test IPv6 connectivity
podman run --rm --network ipv6-network \
  docker.io/library/alpine:latest ping -6 -c 3 fd00:dead:beef::1

# Check if IPv6 is enabled in the container network namespace
podman run --rm --network ipv6-network \
  docker.io/library/alpine:latest cat /proc/sys/net/ipv6/conf/all/disable_ipv6

# Inspect network for IPv6 configuration
podman network inspect ipv6-network
```

## Summary

Enable IPv6 on Podman networks with the `--ipv6` flag along with an IPv6 subnet and gateway. Assign static IPv6 addresses with `--ip6`, and publish ports on IPv6 using bracket notation. Ensure IPv6 is enabled on the host system and use ULA addresses (fc00::/7), commonly from the locally assigned fd00::/8 range, for private container networks. IPv6 DNS resolution works automatically on custom networks with DNS enabled.
