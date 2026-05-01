# How to Configure Docker Macvlan Networks with IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, IPv6, Macvlan, Network Driver, L2 Networking

Description: Create Docker Macvlan networks with IPv6 support to give containers routable IPv6 addresses on the physical network, configure parent interface and VLAN sub-interfaces for macvlan IPv6 networks.

## Introduction

Docker Macvlan networks allow containers to have their own MAC addresses and receive IPv6 addresses directly on the physical network, making them appear as separate physical devices. This eliminates NAT and is ideal when containers need routable IPv6 addresses accessible from the local network or internet. Macvlan requires Docker Engine on Linux, IPv6 enabled in the Docker daemon, a parent interface on a network with IPv6 connectivity, and network equipment that can handle multiple MAC addresses on that parent interface.

## Create a Macvlan Network with IPv6

```bash
# Prerequisites:

# 1. Docker Engine running on a Linux host
# 2. Docker daemon configured to allow IPv6
# 3. Parent interface (eth0) on a network with IPv6 connectivity
# 4. Upstream network/router configured for the IPv6 subnet you will use

# Create macvlan network with IPv6
docker network create \
    --driver macvlan \
    --opt parent=eth0 \
    --ipv6 \
    --subnet 192.168.1.0/24 \
    --subnet 2001:db8:1::/64 \
    --gateway 192.168.1.1 \
    --gateway 2001:db8:1::1 \
    macvlan-net

# Verify network creation
docker network inspect macvlan-net | grep -A15 "IPAM"
```

## Run Containers on Macvlan Network

```bash
# Container gets routable IPv6 from the physical network
docker run -d \
    --name web \
    --network macvlan-net \
    --ip6 2001:db8:1::10 \
    alpine:latest tail -f /dev/null

# Verify the container has a routable IPv6
docker exec web ip -6 addr show eth0
# Output: inet6 2001:db8:1::10/64 scope global

# Test connectivity from the physical network
ping -6 2001:db8:1::10  # From another host on the same network

# If the network provides IPv6 internet access, the container can reach it directly (no NAT)
docker exec web ping -6 -c 1 2001:4860:4860::8888
```

## Macvlan with VLAN Sub-Interface

```bash
# For VLAN-tagged macvlan, Docker can create the VLAN sub-interface automatically
# VLAN 100 on eth0
docker network create \
    --driver macvlan \
    --opt parent=eth0.100 \
    --ipv6 \
    --subnet 10.100.0.0/24 \
    --subnet 2001:db8:100::/64 \
    --gateway 10.100.0.1 \
    --gateway 2001:db8:100::1 \
    macvlan-vlan100

# Run container on VLAN network
docker run -d \
    --name vlan-container \
    --network macvlan-vlan100 \
    --ip6 2001:db8:100::50 \
    alpine:latest tail -f /dev/null

# Verify VLAN-tagged IPv6
docker exec vlan-container ip -6 addr show
```

## Macvlan with Docker Compose

```yaml
# compose.yaml

networks:
  physical:
    driver: macvlan
    driver_opts:
      parent: eth0
    enable_ipv6: true
    ipam:
      config:
        - subnet: 192.168.1.0/24
          gateway: 192.168.1.1
          ip_range: 192.168.1.200/28  # Restrict to .200-.215
        - subnet: 2001:db8:1::/64
          gateway: 2001:db8:1::1

services:
  web:
    image: nginx:latest
    networks:
      physical:
        ipv4_address: 192.168.1.200
        ipv6_address: 2001:db8:1::200
```

## Host Isolation Workaround

```bash
# Problem: Host cannot communicate with macvlan containers directly
# Macvlan isolates containers from the parent interface

# Workaround: Create a macvlan interface on the host
sudo ip link add macvlan-host link eth0 type macvlan mode bridge
sudo ip link set macvlan-host up

# Assign an unused IPv6 to the host macvlan interface
sudo ip -6 addr add 2001:db8:1::ffff/128 dev macvlan-host

# Route the container IPv6 address through the host macvlan interface
sudo ip -6 route add 2001:db8:1::10/128 dev macvlan-host

# Now host can reach the container
ping -6 2001:db8:1::10
```

## Conclusion

Docker Macvlan networks give containers routable IPv6 addresses directly on the physical network by specifying `--driver macvlan`, `--opt parent=eth0`, `--ipv6`, and appropriate subnets after enabling IPv6 in the Docker daemon. Containers appear as separate devices to the physical network and can be accessed by IPv6 address from other hosts. Use VLAN sub-interfaces (`eth0.100`) for VLAN-tagged macvlan networks; Docker creates the sub-interface automatically when needed. Note that macvlan containers cannot communicate directly with the host - use a host-side macvlan interface with an unused IPv6 address and a route to the container address or range as a workaround for host-to-container IPv6 communication.
