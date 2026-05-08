# How to Create a Macvlan Network with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, Macvlan, LAN

Description: Learn how to create macvlan networks in Podman to give containers direct access to the physical network with their own MAC addresses.

---

> Macvlan networks assign unique MAC addresses to containers, making them appear as physical devices on your LAN. This is ideal for legacy applications that require direct network access.

Macvlan networks allow containers to have their own MAC and IP addresses on the physical network, bypassing the host's network stack for direct Layer 2 access. This is useful when containers need to be reachable as if they were physical machines on the network.

---

## Creating a Basic Macvlan Network

```bash
# Create a macvlan network attached to the host's physical interface

sudo podman network create \
  --driver macvlan \
  --opt parent=eth0 \
  --subnet 192.168.1.0/24 \
  --gateway 192.168.1.1 \
  --ip-range 192.168.1.200/29 \
  my-macvlan

# Verify the network configuration
sudo podman network inspect my-macvlan
```

## Running Containers on Macvlan

```bash
# Run a container with a macvlan network address
sudo podman run -d --name web-direct \
  --network my-macvlan \
  --ip 192.168.1.201 \
  docker.io/library/nginx:latest

# The container is accessible directly from the LAN
# From another machine on the network:
# curl http://192.168.1.201
```

## Macvlan Modes

```bash
# Bridge mode (default) - containers can communicate with each other
sudo podman network create \
  --driver macvlan \
  --opt parent=eth0 \
  --opt mode=bridge \
  --subnet 192.168.1.0/24 \
  --gateway 192.168.1.1 \
  macvlan-bridge

# VEPA mode - traffic between containers goes through the external switch
sudo podman network create \
  --driver macvlan \
  --opt parent=eth0 \
  --opt mode=vepa \
  --subnet 192.168.1.0/24 \
  --gateway 192.168.1.1 \
  macvlan-vepa
```

## Using a VLAN Sub-Interface

```bash
# Create a macvlan on a specific VLAN (VLAN 100)
# Create the VLAN sub-interface first if it does not already exist
sudo ip link add link eth0 name eth0.100 type vlan id 100
sudo ip link set eth0.100 up

sudo podman network create \
  --driver macvlan \
  --opt parent=eth0.100 \
  --subnet 10.100.0.0/24 \
  --gateway 10.100.0.1 \
  vlan100-net

sudo podman run -d --name vlan-app \
  --network vlan100-net \
  docker.io/library/alpine:latest tail -f /dev/null
```

## Macvlan with Multiple Containers

```bash
# Run multiple containers with individual LAN addresses
sudo podman run -d --name server1 \
  --network my-macvlan --ip 192.168.1.201 \
  docker.io/library/alpine:latest tail -f /dev/null

sudo podman run -d --name server2 \
  --network my-macvlan --ip 192.168.1.202 \
  docker.io/library/alpine:latest tail -f /dev/null

# Both are directly reachable from the LAN
# Containers can also reach each other
sudo podman exec server1 ping -c 2 192.168.1.202
```

## Host-to-Container Communication

By default, the host cannot communicate with macvlan containers. Create a macvlan interface on the host to fix this:

```bash
# Create a macvlan interface on the host
sudo ip link add macvlan-host link eth0 type macvlan mode bridge
sudo ip addr add 192.168.1.250/32 dev macvlan-host
sudo ip link set macvlan-host up
sudo ip route add 192.168.1.200/29 dev macvlan-host

# Now the host can reach macvlan containers
ping -c 2 192.168.1.201
```

## Macvlan Limitations

- The host cannot directly communicate with macvlan containers without a host macvlan interface
- May require promiscuous mode support on the physical interface or switch port
- Does not work in most cloud/virtualized environments
- Wireless interfaces typically do not support macvlan

```bash
# Check the current interface flags
ip link show eth0
# PROMISC means promiscuous mode is currently enabled
sudo ip link set eth0 promisc on
```

## Summary

Macvlan networks in Podman give containers their own MAC addresses and direct Layer 2 network access, making them appear as physical devices on the LAN. Create macvlan networks with `--driver macvlan` and specify the parent interface, subnet, and gateway. Use existing VLAN sub-interfaces for network segmentation. Note that host-to-container communication requires an additional macvlan interface and route on the host, and macvlan may not work in virtualized or cloud environments.
