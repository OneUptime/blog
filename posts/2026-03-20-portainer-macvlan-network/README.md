# How to Create a Macvlan Network in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Networking, Macvlan, DevOps

Description: Learn how to create a Macvlan network in Portainer to give containers their own MAC addresses and direct access to the physical network.

## Introduction

Macvlan networks give each container a unique MAC address and an IP address on the physical network, making them appear as standalone physical machines to the network. This is useful for containers that need to be directly reachable on the network (legacy applications, network monitoring tools, IoT gateways) without port forwarding.

## Prerequisites

- Portainer installed with a connected Docker environment
- A Linux Docker host (macvlan is not supported on Docker Desktop for Mac/Windows or rootless Docker)
- Network subnet and gateway information

## When to Use Macvlan

| Use Case | Why Macvlan |
|----------|------------|
| Container needs a dedicated IP on the LAN | Assigned from physical network pool |
| Legacy app that hardcodes its IP | Give it a specific IP |
| Network monitoring (packet capture) | Direct network access |
| IoT gateway (OPC-UA, Modbus TCP) | PLC can reach container directly |
| DNS server needing port 53 | No port mapping conflict |

## Step 1: Verify the Parent Interface and Upstream Network

Macvlan requires a Linux host and a parent interface whose upstream network can accept multiple MAC addresses. On physical Linux hosts, you usually do not need to force `promisc` on with `ip link set`; on virtualized hosts, you may need to enable promiscuous mode or MAC spoofing in the hypervisor or virtual switch.

```bash
# Verify the parent interface exists:
ip -brief link show eth0
```

## Step 2: Create Macvlan Network via Portainer

1. Navigate to **Networks** in Portainer.
2. Click **Add network**.
3. Configure:

```text
Name:       macvlan-lan
Driver:     macvlan
```

4. Under **IPv4 Network configuration**:

```text
Subnet:       192.168.1.0/24   (your physical network subnet)
Gateway:      192.168.1.1      (your router/gateway)
IP Range:     192.168.1.128/26 (range for Docker containers: .128-.191)
Excluded IP:  192.168.1.200    (reserve for a host macvlan interface, if needed)
```

5. Under **Driver options**:

```text
parent: eth0   (the physical network interface)
```

6. Click **Create the network**.

## Step 3: Create Macvlan Network via CLI

```bash
# Create a macvlan network:
docker network create \
  --driver macvlan \
  --subnet 192.168.1.0/24 \
  --gateway 192.168.1.1 \
  --ip-range 192.168.1.128/26 \
  --aux-address="host=192.168.1.200" \
  --opt parent=eth0 \
  macvlan-lan

# Verify:
docker network ls | grep macvlan
docker network inspect macvlan-lan
```

## Step 4: Assign IPs to Containers

```yaml
# compose.yaml with macvlan and fixed IPs

services:
  # Container gets IP 192.168.1.130 from macvlan network
  dns-server:
    image: coredns/coredns:latest
    restart: unless-stopped
    networks:
      macvlan-lan:
        ipv4_address: 192.168.1.130   # Fixed IP on physical network
    volumes:
      - ./Corefile:/Corefile:ro

  # OPC-UA server accessible directly by PLCs
  opcua-server:
    image: myorg/opcua-server:latest
    restart: unless-stopped
    networks:
      macvlan-lan:
        ipv4_address: 192.168.1.131   # PLCs connect to this IP directly

  # Network monitoring tool
  ntopng:
    image: ntop/ntopng:stable
    restart: unless-stopped
    networks:
      macvlan-lan:
        ipv4_address: 192.168.1.132
    cap_add:
      - NET_ADMIN
      - NET_RAW

networks:
  macvlan-lan:
    driver: macvlan
    driver_opts:
      parent: eth0
    ipam:
      config:
        - subnet: 192.168.1.0/24
          ip_range: 192.168.1.128/26
          gateway: 192.168.1.1
          aux_addresses:
            host: 192.168.1.200
```

## Step 5: Host-to-Container Communication with Macvlan

A limitation of macvlan: the host cannot directly communicate with containers on the macvlan network (the host interface doesn't route to child macvlan interfaces).

Workaround: create a macvlan sub-interface on the host and use the excluded IP from Step 2/3:

```bash
# Create macvlan interface on host for host-to-container communication:
sudo ip link add macvlan-host link eth0 type macvlan mode bridge
sudo ip addr add 192.168.1.200/32 dev macvlan-host
sudo ip link set macvlan-host up

# Add route for the container IP range:
sudo ip route add 192.168.1.128/26 dev macvlan-host

# Now the host can reach containers:
ping 192.168.1.130   # DNS server container
```

## Step 6: 802.1q VLAN-Based Macvlan

For VLAN-tagged macvlan (one physical interface, multiple VLANs):

```bash
# Docker can create the VLAN sub-interface automatically when `parent`
# contains a dot, but creating it explicitly also works:
sudo ip link add link eth0 name eth0.100 type vlan id 100
sudo ip link set eth0.100 up

# Create macvlan on VLAN interface:
docker network create \
  --driver macvlan \
  --subnet 10.100.0.0/24 \
  --gateway 10.100.0.1 \
  --opt parent=eth0.100 \
  macvlan-vlan100
```

## Step 7: Assign Static IPs for Critical Services

```bash
# Container with fixed IP:
docker run -d \
  --name critical-service \
  --network macvlan-lan \
  --ip 192.168.1.130 \
  myorg/critical-service:latest

# Verify the IP assignment:
docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' critical-service
# 192.168.1.130

# Test from another machine on the network:
ping 192.168.1.130
curl http://192.168.1.130:8080/health
```

## Step 8: Macvlan vs. Bridge: When to Choose

```text
Use Bridge when:
  - Containers mainly need to talk to each other on the same host
  - External access via port mapping is sufficient
  - Services do not need their own IP on the physical network
  - Standard web applications

Use Macvlan when:
  - Container needs its own IP on the physical network
  - Other devices (PLCs, IoT, legacy apps) need to connect directly
  - Running services that conflict with host ports (port 53, 443)
  - Network monitoring requiring raw packet access
```

## Troubleshooting

```bash
# Container not getting network connectivity:
# Verify the parent interface exists:
ip -brief link show eth0

# Container IP not reachable from network:
# Check Docker assigned the expected IP and subnet:
docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' critical-service
docker network inspect macvlan-lan

# Container can't reach gateway:
# On VMs (VMware/VirtualBox), enable promiscuous mode in VM settings
# Check hypervisor networking settings allow multiple MAC addresses / MAC spoofing
```

## Conclusion

Macvlan networks in Portainer give containers a first-class presence on your physical network with their own MAC and IP addresses. This is the right choice for containers that need to be reachable directly from the network without port mapping - particularly useful for DNS servers, industrial OPC-UA servers, and network monitoring tools. Remember that the upstream network or hypervisor must allow multiple MAC addresses on the parent interface, and host-to-container communication requires a macvlan sub-interface workaround.
