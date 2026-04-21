# How to Troubleshoot Cross-Network Container Communication in Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Networking, Troubleshooting, Docker, Debugging

Description: Diagnose and fix cross-network communication issues between containers in Portainer Docker environments.

## Introduction

Diagnose and fix cross-network communication issues between containers in Portainer Docker environments. Network configuration is a critical aspect of containerized infrastructure, and getting it right ensures your services are secure, performant, and reliable.

## Prerequisites

- Portainer CE or BE installed
- Docker standalone or Docker Swarm environment connected
- Basic understanding of networking concepts (subnets, DNS, IPsec)

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

Navigate to **Stacks** > **Add stack** when defining networks in a Compose stack (or **Networks** > **Add network** for individual networks):

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

  # Overlay network (for Swarm)
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

Add network encryption and security settings:

```yaml
networks:
  secure-overlay:
    driver: overlay
    # Encrypt all overlay network traffic
    driver_opts:
      # Use IPsec for encryption
      encrypted: "true"
```

Firewall rules via Portainer host access (for Docker's iptables backend):

```bash
# Add Docker-aware host firewall rules before Docker's own chains
iptables -I DOCKER-USER 1 -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
iptables -I DOCKER-USER 2 -s 172.21.0.0/24 ! -d 172.21.0.0/24 -j DROP  # Keep DB network internal
iptables -I DOCKER-USER 3 -s 172.20.0.0/24 -p tcp -m multiport --dports 80,443 -j ACCEPT
```

## Step 5: Troubleshoot Network Issues

Debug container networking from Portainer's console:

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

# Check iptables rules (on host)
iptables -L -n -v | grep DOCKER
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
    network_mode: host  # Required for traffic inspection; do not also use ports

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
