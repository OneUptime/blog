# How to Understand Docker Bridge Networking in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Networking, Bridge Network, DNS, Container Communication

Description: Master Docker bridge networking concepts including custom networks, DNS resolution, and container isolation, managed through Portainer.

## Introduction

Docker bridge networks are the default networking mechanism for containers on a single host. Understanding how they work is fundamental to connecting containers, isolating services, and troubleshooting connectivity issues. Portainer provides a visual interface to create, inspect, and manage networks. This guide covers bridge networking comprehensively.

## How Bridge Networks Work

Docker creates a virtual bridge (`docker0` by default) on the host. Containers connect to this bridge and get private IP addresses. The bridge acts as a virtual switch for inter-container communication.

```text
Host Network (192.168.1.0/24)
    │
    │ (docker0 bridge: 172.17.0.1)
    ├─── container1 (172.17.0.2)
    ├─── container2 (172.17.0.3)
    └─── container3 (172.17.0.4)
```

**Key differences:**
- **Default bridge** (`docker0`): Containers communicate by IP only unless you use legacy `--link`; no automatic DNS
- **Custom bridge**: Containers communicate by service name via Docker DNS

## Step 1: Create Networks in Portainer

In Portainer: **Networks** > **Add network**

```yaml
# docker-compose.yml - Network examples

networks:
  # Custom bridge network (recommended)
  frontend:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/24   # Custom subnet

  backend:
    driver: bridge
    ipam:
      config:
        - subnet: 172.21.0.0/24

  # External network (pre-existing)
  proxy_network:
    external: true   # Must be created before deploying

services:
  nginx:
    image: nginx:alpine
    networks:
      - frontend    # Public-facing

  api:
    image: myapi:latest
    networks:
      - frontend    # Accessible from nginx
      - backend     # Can reach databases

  postgres:
    image: postgres:15
    networks:
      - backend     # Only accessible from api (isolated from nginx)
```

## Step 2: DNS Resolution in Custom Bridge Networks

```bash
# Test DNS resolution between containers (if the image includes `nslookup`)
docker exec api_container nslookup postgres
# Returns the `postgres` container IP on the shared network

docker exec api_container ping postgres
# If `ping` is installed, it uses DNS to resolve `postgres` first

# A network alias resolves the same way
docker exec api_container nslookup database  # If `database` is configured as a network alias
```

## Step 3: Network Inspection in Portainer

View network details in Portainer: **Networks** > click a network

```bash
# CLI equivalents
# List all networks
docker network ls

# Inspect a network (shows connected containers and IPs)
docker network inspect my_backend_network

# See which networks a container is connected to
docker inspect my_container | jq '.[].NetworkSettings.Networks'
```

## Step 4: Assign Static IPs

```yaml
# docker-compose.yml - Static IP assignment
services:
  database:
    image: postgres:15
    networks:
      backend:
        ipv4_address: 172.21.0.10  # Static IP

  api:
    image: myapi:latest
    networks:
      backend:
        ipv4_address: 172.21.0.20  # Static IP

networks:
  backend:
    driver: bridge
    ipam:
      config:
        - subnet: 172.21.0.0/24
```

## Step 5: Network Isolation Patterns

```yaml
# Multi-tier isolation pattern
services:
  # Public tier (internet-facing)
  traefik:
    networks:
      - public

  # Application tier (connected to both public and internal tiers)
  api:
    networks:
      - public     # Traefik can reach it
      - internal   # Databases can reach it

  # Data tier (externally isolated)
  postgres:
    networks:
      - internal   # Only accessible from api tier
    # Only on the internal network = no default route to outside networks

networks:
  public:
    driver: bridge
  internal:
    driver: bridge
    internal: true  # Externally isolated; host access is still possible
```

## Step 6: Network Troubleshooting

```bash
# Container can't reach another container?

# 1. Are they on the same network?
docker inspect container_a | jq '.[].NetworkSettings.Networks | keys'
docker inspect container_b | jq '.[].NetworkSettings.Networks | keys'

# 2. Test connectivity (if `ping` is installed in the container)
docker exec container_a ping container_b

# 3. Check DNS (if `nslookup` is installed in the container)
docker exec container_a nslookup container_b

# 4. Test port accessibility (if `nc` is installed in the container)
docker exec container_a nc -zv container_b 5432

# 5. Check host firewall rules for Docker bridge networking
sudo iptables -L -n

# 6. View bridge devices on the host
ip link show type bridge

# 7. Inspect specific network
docker network inspect backend_network
```

## Step 7: Bridge Network Performance Options

```yaml
# docker-compose.yml - Network performance settings
networks:
  high_performance:
    driver: bridge
    driver_opts:
      # Set MTU only if the underlying network supports jumbo frames
      com.docker.network.driver.mtu: "9000"
      # Enable ICC (inter-container communication)
      com.docker.network.bridge.enable_icc: "true"
      # Enable IP masquerade for outbound traffic from containers
      com.docker.network.bridge.enable_ip_masquerade: "true"
```

## Portainer Network Management

Key Portainer network features:
- **Networks view**: See all networks, their type, and connected containers
- **Container details**: Shows which networks a container belongs to
- **Create network**: GUI for creating networks with IPAM config
- **Disconnect/Connect**: Dynamically add/remove containers from networks

```bash
# Dynamically connect a running container to a network
docker network connect backend_network existing_container

# Disconnect from a network
docker network disconnect frontend_network existing_container
```

## Conclusion

Docker bridge networks provide flexible, isolated communication between containers. Custom bridge networks are always preferred over the default bridge because they support DNS resolution by service name. Portainer's Networks view makes it easy to visualize your network topology, inspect connected containers, and troubleshoot connectivity issues. Use network segmentation to isolate tiers of your application for better security - your databases should only be reachable by application containers, not exposed to public networks.
