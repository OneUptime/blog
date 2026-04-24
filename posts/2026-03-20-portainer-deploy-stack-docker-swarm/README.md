# How to Deploy a Stack on Docker Swarm via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Swarm, Stack, Deployment, DevOps

Description: Learn how to deploy multi-service Docker Compose stacks on a Docker Swarm cluster using Portainer.

## Introduction

Deploying stacks on Docker Swarm via Portainer is one of the most powerful ways to manage distributed applications. A Swarm stack uses Docker Compose syntax but adds Swarm-specific deployment options like replicas, placement constraints, update policies, and resource limits. This guide covers deploying production-ready stacks on Docker Swarm through Portainer.

## Prerequisites

- Portainer installed on Docker Swarm
- A running Swarm cluster (manager + workers)
- Understanding of the legacy Docker Compose v3 syntax used by `docker stack deploy`

## Swarm Stack vs Standalone Stack

| Feature | Swarm Stack | Standalone Stack |
|---------|------------|-----------------|
| Multi-node | Yes | No |
| Replicas | Yes | Single-host only |
| Rolling updates | Yes | Recreate/restart |
| Services | Swarm services | Compose services / containers |
| Secrets/Configs | Yes | Limited / runtime-dependent |
| Load balancing | Built-in (ingress) | Manual |

## Step 1: Navigate to Stacks

1. Select your Swarm environment in Portainer
2. Click **Stacks** in the sidebar
3. Click **Add stack**

## Step 2: Write the Swarm Compose File

Use `deploy` keys for Swarm-specific configuration:

```yaml
version: "3.8"

services:
  # Load balancer / reverse proxy
  traefik:
    image: traefik:v2.10
    command:
      - "--providers.docker.swarmMode=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - public-net
    deploy:
      mode: global           # One Traefik on each manager node
      placement:
        constraints:
          - node.role == manager

  # Frontend application
  frontend:
    image: myapp/frontend:${FRONTEND_VERSION:-latest}
    deploy:
      mode: replicated
      replicas: 3
      update_config:
        parallelism: 1
        delay: 10s
        failure_action: rollback
        order: start-first
      rollback_config:
        parallelism: 0
        order: stop-first
      resources:
        limits:
          cpus: "0.5"
          memory: 256M
        reservations:
          cpus: "0.25"
          memory: 128M
      placement:
        constraints:
          - node.role == worker
      labels:
        - "traefik.enable=true"
        - "traefik.docker.network=my-production-app_public-net" # Stack deployments prefix network names with the stack name
        - "traefik.http.routers.frontend.rule=Host(`app.example.com`)"
        - "traefik.http.services.frontend.loadbalancer.server.port=3000"
    networks:
      - public-net
      - internal-net

  # Backend API
  api:
    image: myapp/api:${API_VERSION:-latest}
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - REDIS_HOST=redis
    secrets:
      - db-password
      - api-secret-key
    deploy:
      replicas: 4
      update_config:
        parallelism: 2
        delay: 15s
        failure_action: rollback
        monitor: 60s
        order: start-first
      resources:
        limits:
          cpus: "1.0"
          memory: 512M
      placement:
        constraints:
          - node.role == worker
    networks:
      - internal-net
      - db-net

  # PostgreSQL database
  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=myapp
      - POSTGRES_USER=myapp
      - POSTGRES_PASSWORD_FILE=/run/secrets/db-password
    secrets:
      - db-password
    volumes:
      - postgres-data:/var/lib/postgresql/data
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.labels.disk == ssd    # Only on SSD nodes
    networks:
      - db-net

  # Redis cache
  redis:
    image: redis:7-alpine
    command: sh -c "redis-server --appendonly yes --requirepass $$(cat /run/secrets/redis-password)"
    secrets:
      - redis-password
    volumes:
      - redis-data:/data
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.role == worker
    networks:
      - internal-net

networks:
  public-net:
    driver: overlay
    attachable: true
  internal-net:
    driver: overlay
    internal: false
  db-net:
    driver: overlay
    internal: true    # No external connectivity

volumes:
  postgres-data:
    driver: local
  redis-data:
    driver: local

secrets:
  db-password:
    external: true
  api-secret-key:
    external: true
  redis-password:
    external: true
```

## Step 3: Create Required Secrets Before Deploying

```bash
# Create secrets before deploying the stack

printf %s "MySecureDbPassword123!" | docker secret create db-password -
printf %s "MyApiSecretKey456!" | docker secret create api-secret-key -
printf %s "MyRedisPassword789!" | docker secret create redis-password -
```

## Step 4: Configure Stack Settings in Portainer

1. Enter the **Stack name**: `my-production-app`
2. Paste the Compose file in the web editor
3. Add environment variables:
   ```text
   FRONTEND_VERSION=v2.1.0
   API_VERSION=v3.0.1
   ```
4. Click **Deploy the stack**

## Step 5: Monitor the Deployment

After clicking deploy:

1. Watch the deployment output for errors
2. Navigate to **Services** to see all services starting
3. Check that services reach desired replica counts

```bash
# Monitor from CLI
watch docker service ls

# Check specific service tasks
docker service ps my-production-app_api
```

## Step 6: Verify Stack Health

In Portainer, navigate to the stack and check:

- All services show `N/N` replicas (desired/running match)
- No tasks in `failed` or `pending` state
- Services are distributed across nodes (check via Cluster visualizer)

## Step 7: Update the Stack

To deploy a new version:

1. Click on the stack in Portainer
2. Click **Editor**
3. Update image versions in the Compose file or environment variables
4. Click **Update the stack**

Services with `update_config` set will roll out gradually.

## Conclusion

Deploying stacks on Docker Swarm via Portainer combines the readability of Docker Compose with the power of Swarm's orchestration. By using `deploy` keys for replicas, update policies, and resource limits, you create production-ready deployments that handle rolling updates, automatic rollbacks, and resource management. Portainer makes the deployment process visual and accessible without sacrificing any Swarm capabilities.
