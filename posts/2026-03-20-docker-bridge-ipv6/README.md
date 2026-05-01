# How to Configure Docker Bridge Networks with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, IPv6, Bridge Network, Docker0, Custom Bridge

Description: Configure Docker bridge networks for IPv6, understand the difference between the default bridge and user-defined bridges, set IPv6 options on bridges, and verify container IPv6 connectivity.

## Introduction

The Docker bridge driver is the default network driver and the most common for container networking. Docker creates a virtual bridge interface (like `docker0` for the default bridge) and connects containers through veth pairs. The default bridge supports IPv6 when `ipv6` is enabled in `daemon.json`, while user-defined bridges enable IPv6 with `docker network create --ipv6`. User-defined bridges offer better DNS resolution between containers and configurable IPv4/IPv6 subnets.

## Default Bridge with IPv6

```bash
# Enable IPv6 on default bridge via daemon.json

# /etc/docker/daemon.json:
# {
#   "ipv6": true,
#   "fixed-cidr-v6": "fd00:dead:beef:1::/64",
#   "ip6tables": true
# }

sudo systemctl restart docker

# Verify docker0 bridge has IPv6
ip -6 addr show docker0
# inet6 fd00:dead:beef:1::1/64 scope global

# Run container on default bridge
docker run -d --name test busybox sleep 3600

# Check container IPv6
docker inspect -f '{{range .NetworkSettings.Networks}}{{.GlobalIPv6Address}}{{end}}' test
# fd00:dead:beef:1::2

# Note: default bridge containers cannot resolve each other by name by default
# Use user-defined bridges for DNS between containers
```

## User-Defined Bridge with IPv6

```bash
# Create user-defined bridge with explicit IPv6 subnet
docker network create \
    --driver bridge \
    --ipv6 \
    --subnet 172.18.0.0/24 \
    --subnet fd00:dead:beef:2::/64 \
    --gateway 172.18.0.1 \
    --gateway fd00:dead:beef:2::1 \
    mybridge

# Run containers on user-defined bridge
docker run -d --name web --network mybridge nginx
docker run -d --name api --network mybridge busybox sleep 3600

# DNS resolution works in user-defined bridges
docker exec api ping6 -c 1 web  # Resolves 'web' over IPv6 via Docker's embedded DNS

# Verify bridge interface
ip -6 addr show br-$(docker network inspect mybridge --format "{{.Id}}" | head -c 12)
```

## Bridge Options for IPv6

```bash
# Create bridge with custom options
docker network create \
    --driver bridge \
    --ipv6 \
    --subnet 172.19.0.0/24 \
    --subnet fd00:dead:beef:3::/64 \
    --opt com.docker.network.bridge.name=br-custom \
    --opt com.docker.network.bridge.enable_ip_masquerade=true \
    --opt com.docker.network.bridge.enable_icc=true \
    --opt com.docker.network.bridge.host_binding_ipv4=0.0.0.0 \
    custom-bridge

# com.docker.network.bridge.name: custom Linux bridge name
# enable_ip_masquerade: enable IP masquerade for outbound traffic
# enable_icc: allow inter-container communication
# host_binding_ipv4: default host address for published ports

# View the bridge kernel interface
ip link show br-custom
ip -6 addr show br-custom
```

## Bridge Network Inspection and Debug

```bash
# Detailed bridge inspection
docker network inspect mybridge

# List all bridge interfaces
ip link show type bridge

# Show bridge forwarding table
bridge fdb show br br-$(docker network inspect mybridge \
    --format "{{.Id}}" | head -c 12)

# Show interfaces attached to the bridge
ip link show master br-$(docker network inspect mybridge \
    --format "{{.Id}}" | head -c 12)

# List containers attached to the bridge and their addresses
docker network inspect mybridge --format \
    '{{range .Containers}}{{println .Name .IPv4Address .IPv6Address}}{{end}}'
```

## Conclusion

Docker bridge networks support IPv6 through both the default bridge (configured via `ipv6` in `daemon.json`, optionally with `fixed-cidr-v6` for an explicit prefix) and user-defined bridges (created with `--ipv6`, optionally with an explicit IPv6 `--subnet`). User-defined bridges are preferred for IPv6 because they support DNS resolution between containers by container name, whereas the default bridge requires containers to communicate by IP address unless you use the legacy `--link` option. `enable_ip_masquerade` is enabled by default on bridge networks and provides masqueraded outbound connectivity. User-defined bridges also allow containers to be connected and disconnected at runtime without restart.
