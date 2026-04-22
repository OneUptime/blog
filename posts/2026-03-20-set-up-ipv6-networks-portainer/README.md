# How to Set Up IPv6 Networks in Portainer - Set

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, IPv6, Networking, Advanced

Description: Configure Docker networks with IPv6 support in Portainer for modern dual-stack network deployments.

---

Docker networking is fundamental to container communication. Portainer provides a visual interface for creating and managing supported Docker network types.

## Docker Network Types

| Type | Use Case |
|------|---------|
| Bridge | Default; isolated networks on a single host |
| Macvlan | Containers need a real MAC on the physical network |
| IPvlan | IP-level network access, shared MAC |
| Overlay | Multi-host communication in Docker Swarm |
| Host | Container shares host network stack |
| None | No networking (fully isolated) |

## Create Networks via CLI

```bash
# Bridge network (most common)

docker network create \
  --driver bridge \
  --subnet 172.20.0.0/16 \
  --subnet fd00:172:20::/64 \
  --ipv6 \
  my-bridge-network

# Macvlan network (direct L2 access, dual-stack)
docker network create \
  --driver macvlan \
  --subnet 192.168.1.0/24 \
  --gateway 192.168.1.1 \
  --subnet fd00:192:168:1::/64 \
  --gateway fd00:192:168:1::1 \
  -o parent=eth0 \
  macvlan-network

# IPvlan network (dual-stack)
docker network create \
  --driver ipvlan \
  --subnet 192.168.1.0/24 \
  --gateway 192.168.1.1 \
  --subnet fd00:192:168:2::/64 \
  --gateway fd00:192:168:2::1 \
  --ipv6 \
  -o parent=eth0 \
  -o ipvlan_mode=l2 \
  ipvlan-network

# Overlay network (Swarm)
docker network create \
  --driver overlay \
  --attachable \
  --subnet 10.0.9.0/24 \
  overlay-network
```

## Attach Container to Multiple Networks

```bash
# Connect a running container to an additional network
docker network connect my-bridge-network my-container
docker network connect backend-network my-container

# Disconnect from a network
docker network disconnect my-bridge-network my-container
```

## Static IP Assignment

```bash
# Assign a static IP when running a container
docker run -d \
  --network my-bridge-network \
  --ip 172.20.0.100 \
  --ip6 fd00:172:20::100 \
  --name my-static-container \
  nginx:latest
```

## Network Troubleshooting

```bash
# Inspect network configuration
docker network inspect my-bridge-network

# Test connectivity between containers
docker exec my-container ping other-container

# Check container's network settings
docker inspect my-container --format '{{json .NetworkSettings.Networks}}' | python3 -m json.tool

# List all networks
docker network ls

# Remove unused networks
docker network prune
```

---

*Monitor network latency and connectivity with [OneUptime](https://oneuptime.com).*
