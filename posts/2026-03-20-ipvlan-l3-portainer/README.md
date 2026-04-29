# How to Configure IPvlan L3 Mode for Container Routing in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, IPvlan, L3 Routing, Advanced Networking, Network Segmentation

Description: Configure IPvlan L3 mode for Layer 3 routing between container networks using Docker and Portainer for advanced network segmentation.

## Introduction

IPvlan L3 mode operates at Layer 3 (network layer), meaning the host acts as a router between container networks. Unlike L2, containers in L3 mode are in completely separate broadcast domains - they communicate via routing, not bridging. This is ideal for creating isolated network segments with routing control. This guide covers IPvlan L3 configuration with Docker networks that Portainer can deploy and monitor.

## L2 vs L3 Key Differences

| Aspect | IPvlan L2 | IPvlan L3 |
|--------|-----------|-----------|
| Layer | Layer 2 (bridging) | Layer 3 (routing) |
| Broadcast domain | Same as parent | Separate |
| Container gateway | Router | Default route on container interface |
| ARP requests | Broadcast to LAN | No ARP on LAN |
| External routing | Via LAN gateway | Must be configured |
| Isolation | LAN-level | Full network isolation |

## Step 1: Create IPvlan L3 Network

```bash
# IPvlan L3 uses subnets completely separate from your LAN

# The host acts as the router for these subnets

# Create first IPvlan L3 network
docker network create \
  --driver ipvlan \
  --subnet=10.100.0.0/24 \
  --opt ipvlan_mode=l3 \
  --opt parent=eth0 \
  frontend_l3

# Create second IPvlan L3 network (isolated from net1)
docker network create \
  --driver ipvlan \
  --subnet=10.101.0.0/24 \
  --opt ipvlan_mode=l3 \
  --opt parent=eth0 \
  backend_l3

# Note: No gateway specified - Docker ignores `--gateway` in L3 mode and
# containers use a default route on `eth0`
```

## Step 2: Enable IP Forwarding on Host

```bash
# Enable IPv4 forwarding (required for routing)
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Verify
cat /proc/sys/net/ipv4/ip_forward
# Should return: 1
```

## Step 3: Deploy Containers on L3 Networks

```yaml
# docker-compose.yml - IPvlan L3 deployment
networks:
  # L3 networks - host routes between them
  frontend_l3:
    external: true   # Pre-created: 10.100.0.0/24
  backend_l3:
    external: true   # Pre-created: 10.101.0.0/24

services:
  # Nginx on frontend network
  nginx:
    image: nginx:alpine
    container_name: nginx_l3
    restart: unless-stopped
    networks:
      frontend_l3:
        ipv4_address: 10.100.0.10
    # Cannot directly reach 10.101.0.0/24 without routing rules

  # API attached to both networks
  api:
    image: myapp/api:latest
    container_name: api_l3
    restart: unless-stopped
    networks:
      frontend_l3:
        ipv4_address: 10.100.0.20
      backend_l3:
        ipv4_address: 10.101.0.10

  # Database on backend network only (isolated)
  database:
    image: postgres:15-alpine
    container_name: db_l3
    restart: unless-stopped
    networks:
      backend_l3:
        ipv4_address: 10.101.0.20
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_USER=app
      - POSTGRES_PASSWORD=secure_pass
```

## Step 4: Configure Host Routing

For containers to reach the internet or other networks, configure routing. For direct routed access from outside the host, upstream routers also need routes for these subnets via the Docker host IP.

```bash
# Ensure host routes exist for the container networks
# (In L3 mode, containers use a default route on their interface, not a gateway IP)

# Route for frontend L3 network
ip route replace 10.100.0.0/24 dev eth0

# Route for backend L3 network
ip route replace 10.101.0.0/24 dev eth0

# Allow containers to reach the internet via NAT
iptables -t nat -A POSTROUTING -s 10.100.0.0/24 -j MASQUERADE
iptables -t nat -A POSTROUTING -s 10.101.0.0/24 -j MASQUERADE

# Allow forwarding between networks (if desired)
iptables -A FORWARD -s 10.100.0.0/24 -d 10.101.0.0/24 -j ACCEPT
iptables -A FORWARD -s 10.101.0.0/24 -d 10.100.0.0/24 -j ACCEPT
```

## Step 5: Routing Policies with IPvlan L3

```bash
# Use policy-based routing for fine-grained control

# Create separate routing tables
echo "100 frontend_rt" >> /etc/iproute2/rt_tables
echo "101 backend_rt" >> /etc/iproute2/rt_tables

# Frontend network routing table
ip route add 10.100.0.0/24 dev eth0 table frontend_rt
ip route add default via 192.168.1.1 dev eth0 table frontend_rt

# Backend network routing table (no internet access)
ip route add 10.101.0.0/24 dev eth0 table backend_rt
# Note: No default route = no internet access for backend

# Apply policies
ip rule add from 10.100.0.0/24 table frontend_rt
ip rule add from 10.101.0.0/24 table backend_rt
```

## Step 6: Verify L3 Routing

```bash
# Check container IPs
docker exec nginx_l3 ip addr
# Should show 10.100.0.10/24

# Test routing (nginx to api via host routing)
docker exec nginx_l3 ping 10.100.0.20   # Same L3 network (direct)
docker exec nginx_l3 ping 10.101.0.10   # Cross-network (via host routing)

# Verify api can reach database
docker exec api_l3 ping 10.101.0.20

# Check routing table in container
docker exec api_l3 ip route
# Should show a default route on the container interface (for example, `default dev eth0`)

# Verify host is routing
ip route show
```

## Advanced: Segment Isolation

```bash
# Block routing between networks for complete isolation
# Insert DROP rules before any existing ACCEPT rules
iptables -I FORWARD 1 -s 10.100.0.0/24 -d 10.101.0.0/24 -j DROP
iptables -I FORWARD 1 -s 10.101.0.0/24 -d 10.100.0.0/24 -j DROP

# Now frontend cannot reach backend directly (and vice versa)
# The api container can still communicate on both networks because it has an interface on each one
```

## Monitoring in Portainer

Use Portainer to monitor containers across both L3 networks:
- View container IPs in the container details
- Use Exec to run routing tests
- Monitor network traffic via container stats

## Conclusion

IPvlan L3 mode provides the most granular network control by operating at the routing layer. Each L3 network is a completely separate broadcast domain, and inter-network communication requires explicit routing rules on the host. This is ideal for building micro-segmented environments where security policies must be enforced at the network layer. Portainer manages the containers while you control the routing on the host, giving you the best of both worlds.
