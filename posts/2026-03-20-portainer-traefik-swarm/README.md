# How to Deploy Portainer and Traefik Together on Docker Swarm - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Traefik, Docker Swarm, Reverse Proxy, HTTPS

Description: Learn how to deploy Portainer and Traefik as a stack on Docker Swarm with automatic HTTPS, load balancing, and label-based routing for all Swarm services.

## Overview

Running Traefik as a reverse proxy on Docker Swarm gives you automatic certificate management and routing for all services in your cluster. Portainer manages the entire Swarm, while Traefik handles incoming HTTP/HTTPS traffic.

## Swarm Stack Architecture

```text
Internet → Traefik (port 80/443) → Portainer (port 9000)
Portainer → Agent (port 9001) → Swarm nodes
                                 → Your other Swarm services
```

## Prerequisites

- Docker Swarm initialized (`docker swarm init`)
- Access to a Swarm manager node
- Port `9001` open between Swarm nodes for the Portainer Agent
- A domain name pointing to a Swarm node that can reach the Traefik service
- This example assumes a single-manager Swarm

## Step 1: Create an Overlay Network

All services that need Traefik routing must share an overlay network:

```bash
docker network create --driver=overlay --attachable proxy
```

## Step 2: Create the Swarm Stack

Create this stack file on a Swarm manager:

```yaml
# traefik-portainer-swarm.yml

version: "3.8"

services:
  traefik:
    image: traefik:v3.0
    command:
      - "--api.dashboard=true"
      - "--providers.swarm.endpoint=unix:///var/run/docker.sock"
      - "--providers.swarm.exposedbydefault=false"
      - "--providers.swarm.network=proxy"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.web.http.redirections.entrypoint.to=websecure"
      - "--entrypoints.web.http.redirections.entrypoint.scheme=https"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.letsencrypt.acme.email=admin@example.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/data/acme.json"
    ports:
      - target: 80
        published: 80
      - target: 443
        published: 443
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik_data:/data
    networks:
      - proxy
    deploy:
      mode: replicated          # Single instance for local ACME storage
      replicas: 1
      placement:
        constraints:
          - node.role == manager
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.traefik.rule=Host(`traefik.example.com`)"
        - "traefik.http.routers.traefik.entrypoints=websecure"
        - "traefik.http.routers.traefik.tls=true"
        - "traefik.http.routers.traefik.tls.certresolver=letsencrypt"
        - "traefik.http.routers.traefik.service=api@internal"
        - "traefik.http.services.dummy-svc.loadbalancer.server.port=9999"

  agent:
    image: portainer/agent:lts
    environment:
      AGENT_CLUSTER_ADDR: tasks.agent
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /var/lib/docker/volumes:/var/lib/docker/volumes
    networks:
      - agent_network
    deploy:
      mode: global
      placement:
        constraints:
          - node.platform.os == linux

  portainer:
    image: portainer/portainer-ce:lts
    command: -H tcp://tasks.agent:9001 --tlsskipverify
    volumes:
      - portainer_data:/data
    networks:
      - proxy
      - agent_network
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

networks:
  proxy:
    external: true
  agent_network:
    driver: overlay

volumes:
  traefik_data:
  portainer_data:
```

## Step 3: Deploy the Stack

```bash
# Deploy from CLI
docker stack deploy -c traefik-portainer-swarm.yml traefik-stack
```

## Step 4: Verify Services

```bash
# Check all services are running
docker stack services traefik-stack

# Check Traefik logs for certificate issuance
docker service logs traefik-stack_traefik
```

## Step 5: Add Other Services

Any Swarm service can use Traefik routing by adding deploy labels:

```yaml
services:
  myapp:
    image: myapp:latest
    networks:
      - proxy
    deploy:
      labels:
        - "traefik.enable=true"
        - "traefik.http.routers.myapp.rule=Host(`myapp.example.com`)"
        - "traefik.http.routers.myapp.entrypoints=websecure"
        - "traefik.http.routers.myapp.tls=true"
        - "traefik.http.routers.myapp.tls.certresolver=letsencrypt"
        - "traefik.http.services.myapp.loadbalancer.server.port=8080"

networks:
  proxy:
    external: true
```

Note: In Swarm mode, Traefik labels must be under `deploy.labels`, not at the service level.

## Conclusion

Traefik on Docker Swarm with Portainer creates a production-ready platform where every new service can get HTTPS routing by adding a few labels. Portainer's Swarm management and Traefik's automatic certificate handling eliminate most of the operational complexity of running a multi-service HTTPS platform.
