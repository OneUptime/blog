# How to Set Up DNS-Based Service Discovery in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, DNS, Service Discovery, Docker, Networking

Description: Configure DNS-based service discovery for containers in Portainer using Docker's built-in DNS and Consul.

## Introduction

Configure DNS-based service discovery for containers in Portainer using Docker's built-in DNS and per-network aliases. Network configuration is a critical aspect of containerized infrastructure, and getting it right ensures your services are secure, performant, and reliable.

## Prerequisites

- Portainer CE or BE installed
- Docker or Docker Swarm environment connected to Portainer
- Basic understanding of networking concepts (subnets, DNS, TLS)

## Docker Network Types Overview

| Network Driver | Use Case | Multi-Host |
|----------------|----------|------------|
| bridge | Single-host container communication | No |
| overlay | Multi-host Swarm communication | Yes |
| host | Maximum performance, uses host network | No |
| macvlan | Direct L2 network access | No |
| none | No networking | No |

## Step 1: Plan Your Network Architecture

Design your network topology before implementation:

```text
Internet
   |
[Nginx/Traefik] (DMZ network)
   |
[Frontend] (frontend network)
   |
[API] (backend network)
   |
[Database] (db network - isolated)
```

## Step 2: Create Networks via Portainer

If you're deploying a stack in Portainer, go to **Stacks** > **Add stack** and define your networks:

```yaml
# Define networks in your stack

networks:
  # DMZ network - connected to reverse proxy
  dmz:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/24
  
  # Frontend network
  frontend:
    driver: bridge
    internal: false
  
  # Backend network - internal only
  backend:
    driver: bridge
    internal: true
  
  # Database network - isolated from external access
  db-net:
    driver: bridge
    internal: true
    ipam:
      config:
        - subnet: 172.21.0.0/24

  # Overlay network (Swarm only)
  swarm-overlay:
    driver: overlay
    attachable: true
    driver_opts:
      encrypted: "true"
```

## Step 3: Connect Services to Networks

Configure service network membership and DNS aliases:

```yaml
services:
  # Reverse proxy - connected to DMZ and frontend
  nginx:
    image: nginx:alpine
    networks:
      dmz:
        aliases:
          - proxy
      frontend:
    ports:
      - "80:80"
      - "443:443"
  
  # API - connected to frontend, backend, and database networks
  api:
    image: my-api:latest
    networks:
      - frontend
      - backend
      - db-net
    # Don't expose ports directly - only through nginx
  
  # Database - only on db-net
  postgres:
    image: postgres:15
    networks:
      db-net:
        aliases:
          - database
    # No port exposure
```

## Step 4: Configure Network Security

Add network encryption and security settings:

```yaml
networks:
  secure-overlay:
    driver: overlay
    # Encrypt all overlay network traffic
    attachable: true
    driver_opts:
      # Use IPsec for encryption
      encrypted: "true"
```

Host firewall rules must account for Docker-managed iptables chains:

```bash
# Allow established connections first
sudo iptables -I DOCKER-USER -m state --state RELATED,ESTABLISHED -j ACCEPT

# Allow only a specific source subnet to reach published container ports
sudo iptables -I DOCKER-USER -i ext_if ! -s 192.0.2.0/24 -j DROP
```

## Step 5: Troubleshoot Network Issues

Debug container networking from the Docker host:

```bash
# Test DNS resolution on the database network
docker run --rm --network stack-name_db-net busybox nslookup database

# Test HTTP reachability on the frontend network
docker run --rm --network stack-name_frontend busybox wget -S -O - http://nginx

# Inspect network configuration
docker network inspect stack-name_backend

# View connected containers
docker network inspect --format '{{json .Containers}}' stack-name_backend

# Check Docker firewall rules (on Linux hosts using iptables)
sudo iptables -L -n -v | grep DOCKER
```

## Step 6: Monitor Network Traffic

Set up network monitoring:

```yaml
services:
  # Network traffic monitoring
  ntopng:
    image: ntop/ntopng:latest
    volumes:
      - ntopng-data:/var/lib/ntopng
    cap_add:
      - NET_ADMIN
      - NET_RAW
    network_mode: host  # Required for traffic inspection

volumes:
  ntopng-data:
```

## Common Network Patterns

### Pattern 1: Microservices Isolation
```yaml
# Each microservice gets its own network
networks:
  payment-svc: {}
  user-svc: {}
  api-gateway: {}
  # API gateway connects to both service networks
```

### Pattern 2: Tiered Architecture
```yaml
networks:
  presentation: {}   # Web/UI layer
  business: {}       # API/Logic layer
  data:
    internal: true   # DB layer (internal only)
```

## Conclusion

Proper network configuration in Portainer is fundamental to building secure, maintainable container deployments. By segmenting networks by function, enabling encryption on overlay networks, and following the principle of least connectivity (services only join networks they need), you reduce attack surface and improve security posture. Portainer's visual network management makes it easy to review and maintain your network topology as your infrastructure evolves.
