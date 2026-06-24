# How to Set Up Load Balancing Across Containers in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Load Balancing, Nginx, Traefik, Docker

Description: Configure load balancing across multiple container replicas in Portainer for high availability and performance.

## Introduction

Configure container networks in Portainer for reverse proxies, isolation, and secure service-to-service communication. Network configuration is a critical aspect of containerized infrastructure, and getting it right ensures your services are secure, performant, and reliable.

## Prerequisites

- Portainer CE or BE installed
- Docker environment connected
- Docker Swarm initialized if you plan to use overlay networks
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

Navigate to **Stacks** when defining networks in a stack, or **Networks** > **Add Network** when creating them individually:

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
  
  # Database network - fully isolated
  db-net:
    driver: bridge
    internal: true
    ipam:
      config:
        - subnet: 172.21.0.0/24

  # Attachable overlay network (Swarm only)
  swarm-overlay:
    driver: overlay
    attachable: true
    driver_opts:
      encrypted: "true"
```

## Step 3: Connect Services to Networks

Configure service network membership:

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
  
  # API - connected to frontend, backend, and db-net
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

Add Swarm overlay encryption and host firewall settings:

```yaml
networks:
  secure-overlay:
    driver: overlay
    attachable: true
    driver_opts:
      # Use IPsec for encryption
      encrypted: "true"
```

Firewall rules on the Docker host:

```bash
# Allow established connections first
iptables -I DOCKER-USER -m state --state RELATED,ESTABLISHED -j ACCEPT

# Only allow trusted clients to reach published ports
# Replace eth0 and 192.0.2.0/24 with your external interface and trusted subnet
iptables -I DOCKER-USER -i eth0 ! -s 192.0.2.0/24 -j DROP
```

## Step 5: Troubleshoot Network Issues

Debug container networking from the Docker host:

```bash
# Test DNS resolution between containers
docker exec api-container nslookup postgres

# Test connectivity
docker exec api-container ping postgres
docker exec api-container curl -I http://nginx

# Inspect network configuration
docker network inspect stack-name_backend

# View connected containers
docker network inspect stack-name_backend | jq '.[0].Containers'

# Check host firewall rules
iptables -L DOCKER-USER -n -v
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
    network_mode: host  # Use host networking when inspecting host interfaces
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
