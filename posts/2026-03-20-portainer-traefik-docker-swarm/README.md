# How to Deploy Portainer and Traefik Together on Docker Swarm

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Traefik, Docker Swarm, Reverse Proxy, Clustering

Description: Learn how to deploy Portainer and Traefik on Docker Swarm mode for a highly available container management and routing setup with automatic service discovery.

## Introduction

Docker Swarm with Traefik and Portainer creates a robust, scalable management and routing setup. Traefik handles service discovery and load balancing across the Swarm, while Portainer provides the management interface. This guide covers deploying both as Swarm stacks with Traefik reading service labels for automatic routing.

## Prerequisites

- Docker Swarm initialized with at least one manager node
- Persistent storage for Traefik's `acme.json` and Portainer data
- A domain name pointing to the manager node running Traefik, or to an external load balancer that forwards traffic to that node
- If you have multiple manager nodes, pin Traefik and Portainer to the managers that hold their data or use cluster-accessible storage

## Step 1: Initialize Swarm (if not done)

```bash
# Initialize Swarm on manager node

docker swarm init --advertise-addr 192.168.1.100

# Note the join token for worker nodes
docker swarm join-token worker
```

## Step 2: Create Required Networks and Volumes

```bash
# Create overlay network for Traefik
docker network create --driver=overlay --attachable traefik-public

# Create a BasicAuth users file for the Traefik dashboard
printf 'admin:your-password-hash\n' | docker secret create traefik_dashboard_users -

# Create volumes for persistent data
docker volume create traefik_certs
docker volume create portainer_data
```

## Step 3: Deploy Traefik as a Swarm Stack

```yaml
# traefik-swarm.yml
version: "3.8"

services:
  traefik:
    image: traefik:v3.0
    command:
      - "--api.dashboard=true"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.web.http.redirections.entryPoint.to=websecure"
      - "--entrypoints.web.http.redirections.entryPoint.scheme=https"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@example.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--providers.swarm=true"
      - "--providers.swarm.network=traefik-public"
      - "--providers.swarm.exposedByDefault=false"
      - "--log.level=INFO"

    ports:
      - target: 80
        published: 80
        mode: host
      - target: 443
        published: 443
        mode: host

    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik_certs:/letsencrypt

    secrets:
      - traefik_dashboard_users

    networks:
      - traefik-public

    deploy:
      mode: replicated
      replicas: 1
      placement:
        constraints:
          - node.role == manager     # Must run on manager to access Docker socket
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.traefik-dashboard.rule=Host(`traefik.example.com`)"
        - "traefik.http.routers.traefik-dashboard.service=api@internal"
        - "traefik.http.routers.traefik-dashboard.entrypoints=websecure"
        - "traefik.http.routers.traefik-dashboard.tls=true"
        - "traefik.http.routers.traefik-dashboard.tls.certresolver=letsencrypt"
        - "traefik.http.routers.traefik-dashboard.middlewares=traefik-dashboard-auth@swarm"
        - "traefik.http.middlewares.traefik-dashboard-auth.basicauth.usersfile=/run/secrets/traefik_dashboard_users"
        - "traefik.http.services.traefik-dashboard.loadbalancer.server.port=8080"

networks:
  traefik-public:
    external: true

volumes:
  traefik_certs:
    external: true

secrets:
  traefik_dashboard_users:
    external: true
```

```bash
# Deploy Traefik stack
docker stack deploy -c traefik-swarm.yml traefik

# Verify deployment
docker service ls | grep traefik
docker service logs traefik_traefik
```

## Step 4: Deploy Portainer as a Swarm Stack

```yaml
# portainer-swarm.yml
version: "3.8"

services:
  portainer:
    image: portainer/portainer-ce:lts
    command:
      - -H
      - tcp://tasks.portainer-agent:9001  # Connect to agents
      - --tlsskipverify

    volumes:
      - portainer_data:/data

    networks:
      - traefik-public
      - portainer-internal

    deploy:
      mode: replicated
      replicas: 1
      placement:
        constraints:
          - node.role == manager
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.portainer.rule=Host(`portainer.example.com`)"
        - "traefik.http.routers.portainer.entrypoints=websecure"
        - "traefik.http.routers.portainer.tls=true"
        - "traefik.http.routers.portainer.tls.certresolver=letsencrypt"
        - "traefik.http.services.portainer.loadbalancer.server.port=9000"
        - "traefik.http.routers.portainer.service=portainer"

  portainer-agent:
    image: portainer/agent:lts
    environment:
      AGENT_CLUSTER_ADDR: tasks.portainer-agent  # Service discovery DNS
      AGENT_PORT: 9001

    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /var/lib/docker/volumes:/var/lib/docker/volumes

    networks:
      - portainer-internal

    deploy:
      mode: global  # Run on every node

networks:
  traefik-public:
    external: true
  portainer-internal:
    driver: overlay
    internal: true

volumes:
  portainer_data:
    external: true
```

```bash
# Deploy Portainer stack
docker stack deploy -c portainer-swarm.yml portainer

# Check services
docker service ls
docker service ps portainer_portainer
docker service ps portainer_portainer-agent
```

## Step 5: Deploy Applications with Traefik Labels

Deploy a sample application as a Swarm service:

```yaml
# myapp-swarm.yml
version: "3.8"

services:
  web:
    image: nginx:alpine
    networks:
      - traefik-public

    deploy:
      replicas: 3    # 3 replicas across Swarm nodes
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.myapp.rule=Host(`myapp.example.com`)"
        - "traefik.http.routers.myapp.entrypoints=websecure"
        - "traefik.http.routers.myapp.tls=true"
        - "traefik.http.routers.myapp.tls.certresolver=letsencrypt"
        - "traefik.http.services.myapp.loadbalancer.server.port=80"

networks:
  traefik-public:
    external: true
```

```bash
docker stack deploy -c myapp-swarm.yml myapp
```

## Step 6: Verify the Swarm Setup

```bash
# Check all Swarm services
docker service ls

# Check Traefik is routing correctly
curl -I https://portainer.example.com

# Check agent connectivity in Portainer
# Open https://portainer.example.com → should show the Swarm environment

# Check service logs
docker service logs portainer_portainer --tail=50
docker service logs traefik_traefik --tail=50 | grep -i "cert\|acme"
```

## Conclusion

Deploying Portainer and Traefik on Docker Swarm creates a cluster-aware container platform with automatic service discovery, HTTPS certificate management, and load balancing across Swarm services. Traefik reads Swarm service labels to route traffic, while Portainer uses the Swarm agent pattern to manage all nodes from a central interface. Services deployed through Portainer automatically participate in the Traefik routing by including the appropriate labels.
