# How to Configure Static IP Addresses for Containers in Portainer - Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Networking, Static IP, DevOps

Description: Learn how to assign fixed static IP addresses to Docker containers in Portainer using custom networks with defined subnets.

## Introduction

By default, Docker assigns container IP addresses dynamically from a network's subnet pool. While this works for most applications, some use cases require predictable, fixed IPs: legacy applications that hardcode connection strings, firewall rules that target specific container IPs, or monitoring configurations that reference fixed endpoints. Static IPs in Docker require a custom network with a defined subnet - the default bridge network does not support static IP assignment.

## Prerequisites

- Portainer installed with a connected Docker environment
- Permission to create a custom Docker network (not the default `bridge`)

## Why Static IPs Require Custom Networks

The default `bridge` network (`docker0`) manages its address pool automatically and does not accept `--ip` assignments. You must create a custom network with an explicit subnet, then assign IPs within that subnet.

## Step 1: Create a Network with a Defined Subnet

```bash
# Create a custom bridge network with a specific subnet:

docker network create \
  --driver bridge \
  --subnet 172.25.0.0/24 \
  --gateway 172.25.0.1 \
  static-ip-network

# Verify the IPAM config:
docker network inspect static-ip-network --format '{{json .IPAM.Config}}'
```

Via Portainer:
1. Navigate to **Networks** → **Add network**.
2. Set Name to `static-ip-network` and Driver to `bridge`.
3. In **IPv4 Network configuration**, set Subnet: `172.25.0.0/24`, Gateway: `172.25.0.1`.
4. Click **Create the network**.

## Step 2: Assign Static IP at Container Creation (CLI)

```bash
# Run a container with a fixed IP:
docker run -d \
  --name dns-server \
  --network static-ip-network \
  --ip 172.25.0.10 \
  coredns/coredns:latest

# Run another container with a different fixed IP:
docker run -d \
  --name monitoring \
  --network static-ip-network \
  --ip 172.25.0.11 \
  prom/prometheus:latest

# Verify IP assignments:
docker inspect dns-server --format '{{.NetworkSettings.Networks.static-ip-network.IPAddress}}'
# 172.25.0.10
```

## Step 3: Assign Static IP via Portainer UI

1. Navigate to **Containers** → **Add container**.
2. Set the container name and image name.
3. Expand **Advanced container settings** and open the **Network** section.
4. Select your custom network (`static-ip-network`).
5. Enter the IP address in the **IPv4 Address** field: `172.25.0.10`.
6. Click **Deploy the container**.

## Step 4: Static IPs in Docker Compose

```yaml
# compose.yaml with static IP assignments

services:
  # DNS server - always at .10
  coredns:
    image: coredns/coredns:latest
    restart: unless-stopped
    networks:
      infra-net:
        ipv4_address: 172.25.0.10   # Fixed: other containers use this as DNS

  # Prometheus - always at .20
  prometheus:
    image: prom/prometheus:latest
    restart: unless-stopped
    networks:
      infra-net:
        ipv4_address: 172.25.0.20   # Fixed: Grafana points here

  # Grafana - always at .21
  grafana:
    image: grafana/grafana:latest
    restart: unless-stopped
    ports:
      - "3000:3000"
    networks:
      infra-net:
        ipv4_address: 172.25.0.21   # Fixed: known address
    environment:
      - GF_SERVER_HTTP_PORT=3000

networks:
  infra-net:
    driver: bridge
    ipam:
      config:
        - subnet: 172.25.0.0/24
          gateway: 172.25.0.1
```

## Step 5: Reserve IPs to Avoid Conflicts

Divide the subnet to avoid dynamic/static allocation conflicts:

```text
172.25.0.0/24 layout:
  172.25.0.1        → Gateway
  172.25.0.2-9      → Reserved
  172.25.0.10-63    → Static assignments (reserved for named containers)
  172.25.0.64/26    → Dynamic pool (Docker auto-assigns from this CIDR block)
  172.25.0.128-254  → Reserved for future static assignments or host tools
```

When creating the network, use a CIDR-aligned `--ip-range` for the dynamic pool:

```bash
docker network create \
  --driver bridge \
  --subnet 172.25.0.0/24 \
  --gateway 172.25.0.1 \
  --ip-range 172.25.0.64/26 \
  static-ip-network
```

## Step 6: Verify Static IP After Restart

Static IPs are reapplied when a stopped container starts again, as long as the address is still available. They are not preserved if the container is removed and recreated unless you specify the IP again:

```bash
# Restart and verify IP is retained:
docker restart dns-server
docker inspect dns-server --format '{{.NetworkSettings.Networks.static-ip-network.IPAddress}}'
# Still: 172.25.0.10

# If the container is removed and recreated without --ip, it gets a dynamic IP:
docker rm -f dns-server
docker run -d --name dns-server --network static-ip-network coredns/coredns:latest
docker inspect dns-server --format '{{.NetworkSettings.Networks.static-ip-network.IPAddress}}'
# Dynamic IP now - must specify --ip again
```

Always define static IPs in your Compose file or deployment scripts so they are reproduced consistently.

## Conclusion

Static IP addresses for Docker containers require a custom network with an explicit subnet definition. Assign IPs using the `--ip` flag in CLI, the IPv4 Address field in Portainer's container creation form, or the `ipv4_address` key in Docker Compose network configuration. Reserve a portion of the subnet for static assignments and configure the `--ip-range` option to prevent Docker's automatic assignment from conflicting with your reserved addresses.
