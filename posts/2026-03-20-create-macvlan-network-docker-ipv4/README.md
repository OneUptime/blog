# How to Create a macvlan Network for Docker Containers with IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Networking, Macvlan, IPv4, Container, LAN

Description: Create a Docker macvlan network that allows containers to appear as physical devices on your LAN with their own MAC addresses and IPv4 addresses routable from the broader network.

## Introduction

`macvlan` networks give each container its own MAC address and IP from the physical network segment, making containers appear as first-class network citizens on your LAN. This is ideal for services that need to be reachable directly from the network without port mapping.

## Prerequisites

- The host NIC must support promiscuous mode
- The physical switch port must allow multiple MACs (or be in trunk/promiscuous mode)
- You need a range of unused IPs on the LAN

## Creating a macvlan Network

```bash
# eth0 is the host's physical interface connected to the LAN

# The parent subnet is 192.168.1.0/24 with gateway 192.168.1.1
# We give containers IPs from 192.168.1.208-192.168.1.223 (a /28 block of 16 addresses)

docker network create \
  --driver macvlan \
  --subnet 192.168.1.0/24 \
  --gateway 192.168.1.1 \
  --ip-range 192.168.1.208/28 \
  --opt parent=eth0 \
  lan-macvlan
```

## Running a Container on the macvlan Network

```bash
# Container gets an IP from 192.168.1.208-192.168.1.223
docker run -d \
  --name nginx-lan \
  --network lan-macvlan \
  nginx:alpine

# Check assigned IP
docker inspect nginx-lan | grep '"IPAddress"'
```

The container is now reachable directly from any device on the 192.168.1.0/24 network at its assigned IP.

## Assigning a Static IP

```bash
docker run -d \
  --name nginx-fixed \
  --network lan-macvlan \
  --ip 192.168.1.210 \
  nginx:alpine
```

## Using Docker Compose with macvlan

```yaml
# docker-compose.yml
version: "3.8"

services:
  web:
    image: nginx:alpine
    networks:
      lan-net:
        ipv4_address: 192.168.1.210

networks:
  lan-net:
    driver: macvlan
    driver_opts:
      parent: eth0
    ipam:
      config:
        - subnet: 192.168.1.0/24
          gateway: 192.168.1.1
          ip_range: 192.168.1.208/28
```

## Using a VLAN Subinterface as Parent

For tagged VLAN environments:

```bash
# Create the network on VLAN 20
docker network create \
  --driver macvlan \
  --subnet 192.168.20.0/24 \
  --gateway 192.168.20.1 \
  --opt parent=eth0.20 \
  vlan20-macvlan
```

## Verifying Reachability from the LAN

```bash
# From any host on the 192.168.1.0/24 LAN
ping 192.168.1.210

# Verify the container has a unique MAC
docker exec nginx-fixed cat /sys/class/net/eth0/address
# Should show a MAC different from the host's
```

## Conclusion

macvlan networks integrate containers directly into your LAN by assigning unique MACs and LAN-routable IPs. Use `--ip-range` to reserve a pool of IPs from your DHCP server's exclusion list, specify the correct `parent` interface, and ensure the physical switch allows multiple MACs per port.
