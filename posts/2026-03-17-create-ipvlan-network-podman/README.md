# How to Create an IPvlan Network with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, IPvlan, LAN

Description: Learn how to create IPvlan networks in Podman where containers share the host's MAC address but have unique IP addresses.

---

> IPvlan networks give containers unique IP addresses while sharing the host's MAC address. This works in environments where macvlan is restricted, such as wireless networks and some cloud platforms.

IPvlan is similar to macvlan but does not assign unique MAC addresses to containers. Instead, all containers share the parent interface's MAC address. This makes IPvlan compatible with environments that restrict MAC address changes.

---

## Creating an IPvlan L2 Network

IPvlan L2 mode operates at Layer 2, similar to macvlan but with a shared MAC address:

```bash
# Create an IPvlan L2 network

sudo podman network create \
  --driver ipvlan \
  --opt parent=eth0 \
  --subnet 192.168.1.0/24 \
  --gateway 192.168.1.1 \
  --ip-range 192.168.1.208/29 \
  my-ipvlan-l2

# Verify the configuration
sudo podman network inspect my-ipvlan-l2
```

## Creating an IPvlan L3 Network

IPvlan L3 mode operates at Layer 3 and uses routing for container subnets:

```bash
# Create an IPvlan L3 network
sudo podman network create \
  --driver ipvlan \
  --opt parent=eth0 \
  --opt mode=l3 \
  --subnet 10.0.1.0/24 \
  my-ipvlan-l3

# L3 mode routes traffic between different subnets
# Upstream networks need routes back to the container subnet
```

## Running Containers on IPvlan

```bash
# Run a container with an IPvlan address
sudo podman run -d --name web-ipvlan \
  --network my-ipvlan-l2 \
  --ip 192.168.1.211 \
  docker.io/library/nginx:latest

# The container is reachable from the LAN
# curl http://192.168.1.211

# Verify the container shares the host's MAC address
sudo podman exec web-ipvlan ip link show eth0
```

## IPvlan vs Macvlan

| Feature | IPvlan | Macvlan |
|---------|--------|---------|
| MAC address | Shared with host | Unique per container |
| Wireless support | Often works | Usually limited |
| Cloud compatibility | Better | Limited |
| L3 routing mode | Yes | No |
| Container-to-host | Requires workaround | Requires workaround |

## Multiple Containers on IPvlan

```bash
# Run multiple containers sharing the host's MAC
sudo podman run -d --name svc1 \
  --network my-ipvlan-l2 --ip 192.168.1.212 \
  docker.io/library/nginx:latest

sudo podman run -d --name svc2 \
  --network my-ipvlan-l2 --ip 192.168.1.213 \
  docker.io/library/nginx:latest

# Containers can communicate with each other
sudo podman exec svc1 ping -c 2 192.168.1.213
```

## IPvlan on Wireless Interfaces

```bash
# IPvlan can work on wireless where macvlan is often restricted
sudo podman network create \
  --driver ipvlan \
  --opt parent=wlan0 \
  --subnet 192.168.1.0/24 \
  --gateway 192.168.1.1 \
  wifi-ipvlan

sudo podman run -d --name wifi-app \
  --network wifi-ipvlan \
  docker.io/library/alpine:latest tail -f /dev/null
```

## IPvlan with VLAN Tagging

```bash
# Create IPvlan on a VLAN sub-interface
sudo podman network create \
  --driver ipvlan \
  --opt parent=eth0.200 \
  --subnet 10.200.0.0/24 \
  --gateway 10.200.0.1 \
  vlan200-ipvlan

sudo podman run -d --name vlan-svc \
  --network vlan200-ipvlan \
  docker.io/library/alpine:latest tail -f /dev/null
```

## Troubleshooting IPvlan

```bash
# Verify the parent interface is up
ip link show eth0

# Check if IPvlan module is loaded
lsmod | grep ipvlan

# Load the module if needed
sudo modprobe ipvlan

# Test container connectivity
sudo podman exec web-ipvlan ping -c 3 192.168.1.1
sudo podman exec web-ipvlan ip route show
```

## Summary

IPvlan networks in Podman assign unique IP addresses to containers while sharing the host's MAC address. This makes IPvlan suitable for environments such as wireless networks and cloud platforms that restrict MAC address changes. Choose L2 mode for same-subnet communication or L3 mode for routed container subnets with appropriate routes. Use IPvlan when macvlan is not available due to platform restrictions.
