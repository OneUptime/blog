# How to Configure Docker IPvlan Networks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, IPvlan, Networking, L2, L3, DevOps

Description: Learn how to configure Docker IPvlan networks for efficient container networking with L2 and L3 modes.

---

IPvlan networks provide an alternative to macvlan with better performance in certain scenarios. This guide covers configuring IPvlan networks in both L2 and L3 modes.

## IPvlan vs Macvlan

```
IPvlan vs Macvlan
┌────────────────────────────────────────────────────────────┐
│  Macvlan                    │  IPvlan                       │
├─────────────────────────────┼──────────────────────────────┤
│  Different MAC per container│  Same MAC as parent interface │
│  More isolated              │  Better for VLAN-heavy envs   │
│  May hit MAC limits         │  No MAC address issues        │
│  Works with DHCP            │  Requires static IPs (L3)     │
└────────────────────────────────────────────────────────────┘
```

## L2 Mode (Layer 2)

L2 mode operates at the data link layer, similar to macvlan but sharing the parent's MAC address.

```bash
# Create L2 IPvlan network
docker network create -d ipvlan \
  --subnet=192.168.1.0/24 \
  --gateway=192.168.1.1 \
  -o parent=eth0 \
  -o ipvlan_mode=l2 \
  ipvlan-l2

# Run container
docker run -d \
  --name web \
  --network ipvlan-l2 \
  --ip 192.168.1.100 \
  nginx
```

## L3 Mode (Layer 3)

L3 mode operates at the network layer, with the parent interface acting as a router.

```bash
# Create L3 IPvlan network
docker network create -d ipvlan \
  --subnet=10.0.1.0/24 \
  -o parent=eth0 \
  -o ipvlan_mode=l3 \
  ipvlan-l3

# Create another L3 network
docker network create -d ipvlan \
  --subnet=10.0.2.0/24 \
  -o parent=eth0 \
  -o ipvlan_mode=l3 \
  ipvlan-l3-2
```

## L3S Mode (L3 with Source Validation)

```bash
# Create L3S IPvlan network
docker network create -d ipvlan \
  --subnet=10.0.3.0/24 \
  -o parent=eth0 \
  -o ipvlan_mode=l3s \
  ipvlan-l3s
```

## Docker Compose with L2

```yaml
version: '3.8'

services:
  web:
    image: nginx:alpine
    networks:
      ipvlan_l2:
        ipv4_address: 192.168.1.100

  api:
    image: myapi:latest
    networks:
      ipvlan_l2:
        ipv4_address: 192.168.1.101

networks:
  ipvlan_l2:
    driver: ipvlan
    driver_opts:
      parent: eth0
      ipvlan_mode: l2
    ipam:
      config:
        - subnet: 192.168.1.0/24
          gateway: 192.168.1.1
          ip_range: 192.168.1.100/28
```

## Docker Compose with L3

```yaml
version: '3.8'

services:
  frontend:
    image: nginx:alpine
    networks:
      frontend_net:
        ipv4_address: 10.0.1.10

  backend:
    image: myapi:latest
    networks:
      backend_net:
        ipv4_address: 10.0.2.10

networks:
  frontend_net:
    driver: ipvlan
    driver_opts:
      parent: eth0
      ipvlan_mode: l3
    ipam:
      config:
        - subnet: 10.0.1.0/24

  backend_net:
    driver: ipvlan
    driver_opts:
      parent: eth0
      ipvlan_mode: l3
    ipam:
      config:
        - subnet: 10.0.2.0/24
```

## L3 Mode with External Routing

For L3 mode, you need to configure routes on your network to reach container subnets.

```bash
# On external router, add routes pointing to Docker host
# Example: Host IP is 192.168.1.10
ip route add 10.0.1.0/24 via 192.168.1.10
ip route add 10.0.2.0/24 via 192.168.1.10
```

### Enable IP Forwarding on Host

```bash
# Enable IP forwarding
echo 1 > /proc/sys/net/ipv4/ip_forward

# Persistent configuration
echo "net.ipv4.ip_forward=1" >> /etc/sysctl.conf
sysctl -p
```

## VLAN Tagging with IPvlan

```bash
# Create IPvlan on VLAN subinterface
docker network create -d ipvlan \
  --subnet=192.168.100.0/24 \
  --gateway=192.168.100.1 \
  -o parent=eth0.100 \
  -o ipvlan_mode=l2 \
  vlan100-ipvlan
```

```yaml
version: '3.8'

services:
  app:
    image: myapp:latest
    networks:
      vlan100:
        ipv4_address: 192.168.100.50

networks:
  vlan100:
    driver: ipvlan
    driver_opts:
      parent: eth0.100
      ipvlan_mode: l2
    ipam:
      config:
        - subnet: 192.168.100.0/24
          gateway: 192.168.100.1
```

## Multi-Network Setup

```yaml
version: '3.8'

services:
  loadbalancer:
    image: haproxy:2.8
    networks:
      public:
        ipv4_address: 192.168.1.100
      private:
        ipv4_address: 10.0.0.10

  web1:
    image: nginx:alpine
    networks:
      private:
        ipv4_address: 10.0.0.11

  web2:
    image: nginx:alpine
    networks:
      private:
        ipv4_address: 10.0.0.12

networks:
  public:
    driver: ipvlan
    driver_opts:
      parent: eth0
      ipvlan_mode: l2
    ipam:
      config:
        - subnet: 192.168.1.0/24
          gateway: 192.168.1.1
          ip_range: 192.168.1.100/30

  private:
    driver: ipvlan
    driver_opts:
      parent: eth0
      ipvlan_mode: l3
    ipam:
      config:
        - subnet: 10.0.0.0/24
```

## Host-to-Container Communication

Like macvlan, IPvlan requires additional configuration for host-to-container communication.

```bash
# L2 mode: Create IPvlan interface on host
ip link add ipvlan0 link eth0 type ipvlan mode l2
ip addr add 192.168.1.200/32 dev ipvlan0
ip link set ipvlan0 up
ip route add 192.168.1.100/28 dev ipvlan0

# L3 mode: Add route through parent interface
ip route add 10.0.1.0/24 dev eth0
```

## Complete Production Setup

```yaml
version: '3.8'

services:
  # Frontend on L2 for direct LAN access
  nginx:
    image: nginx:alpine
    hostname: nginx
    networks:
      frontend:
        ipv4_address: 192.168.1.100
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    restart: unless-stopped

  # Backend services on L3 for isolation
  api:
    image: myapi:latest
    networks:
      backend:
        ipv4_address: 10.0.1.10
    environment:
      DATABASE_URL: postgres://postgres:password@10.0.2.10/mydb
    restart: unless-stopped

  worker:
    image: myworker:latest
    networks:
      backend:
        ipv4_address: 10.0.1.11
    restart: unless-stopped

  # Database on separate L3 network
  postgres:
    image: postgres:15
    networks:
      database:
        ipv4_address: 10.0.2.10
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
    restart: unless-stopped

networks:
  frontend:
    driver: ipvlan
    driver_opts:
      parent: eth0
      ipvlan_mode: l2
    ipam:
      config:
        - subnet: 192.168.1.0/24
          gateway: 192.168.1.1
          ip_range: 192.168.1.100/30

  backend:
    driver: ipvlan
    driver_opts:
      parent: eth0
      ipvlan_mode: l3
    ipam:
      config:
        - subnet: 10.0.1.0/24

  database:
    driver: ipvlan
    driver_opts:
      parent: eth0
      ipvlan_mode: l3
    ipam:
      config:
        - subnet: 10.0.2.0/24

volumes:
  pgdata:
```

## Troubleshooting

```bash
# Check IPvlan network
docker network inspect ipvlan-l2

# Verify container networking
docker exec web ip addr
docker exec web ip route

# Check connectivity
docker exec web ping 192.168.1.1

# Verify MAC address (should match parent)
docker exec web cat /sys/class/net/eth0/address
ip link show eth0 | grep ether

# Check kernel IPvlan support
modinfo ipvlan
```

## Summary

| Mode | Use Case | Routing |
|------|----------|---------|
| L2 | Same subnet as LAN | Switch/Router |
| L3 | Isolated subnets | Host as router |
| L3S | L3 with security | Host as router + validation |

IPvlan networks are ideal when you have MAC address limitations or need better performance with VLANs. Use L2 mode for direct LAN access and L3 mode for isolated routing. For service discovery, see our post on [Docker Network Aliases](https://oneuptime.com/blog/post/2026-01-16-docker-network-aliases/view).

