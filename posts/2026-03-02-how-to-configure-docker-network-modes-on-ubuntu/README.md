# How to Configure Docker Network Modes on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Docker, Networking, Container

Description: A comprehensive guide to Docker network modes on Ubuntu including bridge, host, overlay, macvlan, and none, with practical examples of when and how to use each.

---

Docker's network modes control how containers communicate with each other and the outside world. Each mode makes a different tradeoff between isolation, performance, and network flexibility. Choosing the wrong mode causes hard-to-diagnose connectivity issues, so understanding each mode matters.

## Network Modes Overview

Docker provides five built-in network drivers:

| Driver | Use Case | Isolation | Performance |
|--------|----------|-----------|-------------|
| bridge | Default, single-host container communication | High | Good |
| host | Share host's network stack | None | Best |
| overlay | Multi-host container networking (Swarm) | High | Good |
| macvlan | Container on physical LAN directly | High | Excellent |
| none | No networking | Complete | N/A |

## Bridge Networking

Bridge is the default mode. Docker creates a virtual bridge (`docker0`) and assigns each container a virtual NIC on that bridge.

### How Bridge Works

```bash
# Check the docker0 bridge on the host
ip link show docker0
ip addr show docker0
# inet 172.17.0.1/16 - this is the gateway for containers

# Run a container and check its IP
docker run --rm -it ubuntu:24.04 bash
# Inside: ip addr show eth0
# inet 172.17.0.x/16

# Host uses NAT to route container traffic to the internet
sudo iptables -t nat -L DOCKER -n -v
```

### Default Bridge vs Custom Bridge

The default bridge (`docker0`) has limitations - containers can only communicate by IP, not by name. Custom bridges enable DNS-based container-to-container communication:

```bash
# Create a custom bridge network
docker network create myapp-network

# Run containers on the custom network - they can reach each other by name
docker run -d --name db --network myapp-network postgres:16
docker run -d --name web --network myapp-network nginx

# From web container, reach db by name
docker exec web ping db  # works because of Docker's embedded DNS
```

### Custom Bridge with Specific Subnet

```bash
# Create bridge with custom subnet to avoid IP conflicts
docker network create \
  --driver bridge \
  --subnet 10.20.0.0/24 \
  --gateway 10.20.0.1 \
  --opt "com.docker.network.bridge.name=br-myapp" \
  myapp-custom-network

# Inspect the network
docker network inspect myapp-custom-network
```

### Expose Ports on Bridge Networks

```bash
# Map container port 80 to host port 8080
docker run -d \
  --name webserver \
  --network myapp-network \
  -p 8080:80 \
  nginx

# Map to a specific host IP (useful on multi-interface hosts)
docker run -d \
  -p 127.0.0.1:8080:80 \
  nginx  # only accessible locally, not from other hosts
```

## Host Networking

In host mode, the container shares the host's network stack entirely. It has the same IP as the host and can bind to the same ports:

```bash
# Run a container with host networking
docker run -d \
  --name web-host \
  --network host \
  nginx

# Nginx is now accessible on the host's IP directly on port 80
# No port mapping needed (or possible)
curl http://localhost:80
```

### When to Use Host Networking

Host networking is appropriate when:
- You need maximum network performance (no NAT overhead)
- The container needs to bind to many ports dynamically
- You're running network monitoring/sniffing containers
- The container needs to discover other services via multicast or broadcast

```bash
# Network performance comparison
# Bridge:
docker run --rm --network bridge networkstatic/iperf3 -c host-ip

# Host (typically 10-20% better throughput, much lower latency):
docker run --rm --network host networkstatic/iperf3 -c localhost
```

### Host Networking Limitation

Port conflicts: if the host already uses port 80, a container with host networking cannot bind to port 80.

## None Networking

Completely disables networking:

```bash
# Run container with no network access
docker run -d \
  --name isolated-processor \
  --network none \
  myprocessor

# Verify: no network interfaces
docker exec isolated-processor ip addr
# Only loopback (lo) interface exists
```

Use `none` for containers that:
- Process data from mounted volumes only
- Should never have network access (security requirement)
- Run batch jobs with no network dependency

## Overlay Networking (Docker Swarm)

Overlay networks connect containers across multiple Docker hosts. They require either Docker Swarm or an external key-value store:

```bash
# Initialize Docker Swarm (required for overlay)
docker swarm init

# Create an overlay network
docker network create \
  --driver overlay \
  --subnet 10.30.0.0/24 \
  myswarm-network

# Deploy services on the overlay network
docker service create \
  --name web \
  --network myswarm-network \
  --replicas 3 \
  nginx

docker service create \
  --name db \
  --network myswarm-network \
  --replicas 1 \
  postgres:16
```

Services on the same overlay network can communicate by service name regardless of which physical host the container is on.

## Macvlan Networking

Macvlan gives each container a unique MAC address and an IP on the physical LAN. Containers appear as physical devices on the network:

```bash
# Check your host's network interface
ip link show

# Create a macvlan network on the physical interface enp3s0
docker network create \
  --driver macvlan \
  --subnet 192.168.1.0/24 \
  --gateway 192.168.1.1 \
  --opt parent=enp3s0 \
  macvlan-network

# Run a container with an IP on the physical LAN
docker run -d \
  --name web-exposed \
  --network macvlan-network \
  --ip 192.168.1.200 \
  nginx

# The container is now reachable from other machines on 192.168.1.0/24
# as if it were a physical machine at 192.168.1.200
```

### Macvlan 802.1q VLAN Trunking

For VLAN-tagged traffic:

```bash
# Create macvlan on a specific VLAN (VLAN 20)
docker network create \
  --driver macvlan \
  --subnet 10.20.0.0/24 \
  --gateway 10.20.0.1 \
  --opt parent=enp3s0.20 \
  macvlan-vlan20
```

### Macvlan Limitation

The host cannot communicate with macvlan containers using the same physical interface. This is a kernel limitation. Workaround:

```bash
# Create a macvlan interface on the host to allow host-container communication
sudo ip link add macvlan-host link enp3s0 type macvlan mode bridge
sudo ip addr add 192.168.1.250/24 dev macvlan-host
sudo ip link set macvlan-host up
```

## Connecting Containers to Multiple Networks

A container can be attached to multiple networks:

```bash
# Create two networks
docker network create frontend-net
docker network create backend-net

# Run a container on the frontend network
docker run -d --name app --network frontend-net myapp

# Connect the same container to the backend network
docker network connect backend-net app

# The app container now has IPs on both networks
docker inspect app | grep -A10 "Networks"
```

## Inspecting Networks

```bash
# List all networks
docker network ls

# Detailed info on a network
docker network inspect myapp-network

# See which containers are on a network
docker network inspect myapp-network --format '{{json .Containers}}' | jq

# Remove unused networks
docker network prune
```

## Network Aliases

Assign multiple hostnames to a container on a network:

```bash
# Run with a network alias
docker run -d \
  --name primary-db \
  --network myapp-network \
  --network-alias database \
  --network-alias db \
  postgres:16

# Other containers can reach this container as "database" or "db"
docker run --rm --network myapp-network ubuntu ping database
docker run --rm --network myapp-network ubuntu ping db
```

This is useful for zero-downtime database switching - update which container the `database` alias points to.

## DNS Configuration Per Container

Override DNS settings for specific containers:

```bash
# Set custom DNS for a container
docker run -d \
  --name app \
  --dns 8.8.8.8 \
  --dns 8.8.4.4 \
  --dns-search example.com \
  myapp

# Verify inside container
docker exec app cat /etc/resolv.conf
```

## Practical Example: Multi-Tier Application

A typical web application with frontend, backend, and database:

```bash
# Create separate networks for each tier
docker network create frontend-tier --subnet 10.10.1.0/24
docker network create backend-tier --subnet 10.10.2.0/24

# Database - only on backend network
docker run -d \
  --name postgres \
  --network backend-tier \
  -e POSTGRES_PASSWORD=secret \
  postgres:16

# App server - on both networks (bridges frontend and backend)
docker run -d \
  --name api-server \
  --network backend-tier \
  -e DB_HOST=postgres \
  myapp-api

docker network connect frontend-tier api-server

# Web server - only on frontend network, exposes port to host
docker run -d \
  --name nginx \
  --network frontend-tier \
  -p 80:80 \
  nginx

# Verify: nginx cannot reach postgres directly (different network)
# nginx -> api-server (frontend-tier) -> postgres (backend-tier)
```

This architecture ensures the database is not accessible from the frontend network - the API server is the only bridge.
