# How to Migrate from Docker Swarm to Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Docker Swarm, Migration, Container, Orchestration

Description: A comprehensive guide to migrating from Docker Swarm to Podman for single-server and small-cluster deployments, covering service conversion, networking, secrets management, and deployment strategies.

---

> Migrating from Docker Swarm to Podman means moving from a cluster orchestrator to a single-host container manager, which works well for small deployments but requires rethinking multi-node orchestration.

Docker Swarm provides built-in clustering, service scaling, and rolling updates across multiple nodes. Podman is a single-host container runtime without native clustering. For single-server deployments or small environments where Swarm's clustering features are unnecessary, Podman offers a simpler, more secure alternative with rootless containers and systemd integration.

This guide covers how to migrate Docker Swarm services to Podman, including service definitions, networking, secrets, and deployment strategies.

---

## Assessing Your Swarm Deployment

Before migrating, evaluate which Swarm features you actually use:

```bash
# List current Swarm services

docker service ls

# Check service details
docker service inspect --pretty my-service

# List nodes in the swarm
docker node ls

# Check service distribution across nodes
docker service ps my-service
```

Key questions to answer:
- How many nodes does your swarm have?
- Do you use Swarm's built-in load balancing?
- Do you rely on Swarm secrets or configs?
- Do services scale beyond one replica?

## Single-Node Migration

If your Swarm runs on a single node, migration is straightforward. Convert each service to a Podman container or Quadlet unit.

Docker Swarm stack file:

```yaml
# docker-stack.yml
version: "3.8"
services:
  web:
    image: nginx:stable
    ports:
      - "80:80"
    deploy:
      replicas: 1
      restart_policy:
        condition: any
    networks:
      - frontend

  api:
    image: my-api:latest
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/app
    deploy:
      replicas: 2
      restart_policy:
        condition: any
    secrets:
      - api_key
    networks:
      - frontend
      - backend

  db:
    image: postgres:16
    volumes:
      - pgdata:/var/lib/postgresql/data
    deploy:
      replicas: 1
      placement:
        constraints:
          - node.role == manager
    networks:
      - backend

networks:
  frontend:
  backend:

volumes:
  pgdata:

secrets:
  api_key:
    external: true
```

## Step 1: Convert Networks

Swarm overlay networks become Podman bridge networks:

```bash
podman network create frontend
podman network create backend
```

## Step 2: Handle Secrets

Docker Swarm secrets are mounted as files in `/run/secrets/`. Replace them with Podman secrets or environment files:

```bash
# Create a Podman secret
echo "my-api-key-value" | podman secret create api_key -

# Or use an environment file
cat > ~/.config/myapp/.env << 'EOF'
API_KEY=my-api-key-value
EOF
```

Using the secret in a container:

```bash
podman run -d --name api \
  --secret api_key \
  -e API_KEY_FILE=/run/secrets/api_key \
  my-api:latest
```

## Step 3: Convert Services to Containers

Convert each Swarm service to a Podman container:

```bash
# Database
podman run -d \
  --name db \
  --network backend \
  -e POSTGRES_DB=app \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=pass \
  -v pgdata:/var/lib/postgresql/data:Z \
  postgres:16

# API
podman run -d \
  --name api \
  --network frontend \
  --network backend \
  --secret api_key \
  -e DATABASE_URL=postgresql://user:pass@db:5432/app \
  my-api:latest

# Web
podman run -d \
  --name web \
  --network frontend \
  -p 80:80 \
  nginx:stable
```

## Step 4: Convert to Quadlet for Production

Create Quadlet files for systemd management:

```ini
# ~/.config/containers/systemd/frontend.network
[Network]
NetworkName=frontend

# ~/.config/containers/systemd/backend.network
[Network]
NetworkName=backend

# ~/.config/containers/systemd/db.container
[Unit]
Description=PostgreSQL Database

[Container]
Image=docker.io/library/postgres:16
ContainerName=db
Network=backend.network
Environment=POSTGRES_DB=app
Environment=POSTGRES_USER=user
Environment=POSTGRES_PASSWORD=pass
Volume=pgdata:/var/lib/postgresql/data:Z

[Service]
Restart=always

[Install]
WantedBy=default.target

# ~/.config/containers/systemd/api.container
[Unit]
Description=Application API
Requires=db.service
After=db.service

[Container]
Image=my-api:latest
ContainerName=api
Network=frontend.network
Network=backend.network
Secret=api_key
Environment=DATABASE_URL=postgresql://user:pass@db:5432/app

[Service]
Restart=always

[Install]
WantedBy=default.target

# ~/.config/containers/systemd/web.container
[Unit]
Description=Nginx Web Server
Requires=api.service
After=api.service

[Container]
Image=docker.io/library/nginx:stable
ContainerName=web
Network=frontend.network
PublishPort=80:80

[Service]
Restart=always

[Install]
WantedBy=default.target
```

## Step 5: Handle Scaling

Docker Swarm's `replicas: 2` creates multiple instances with built-in load balancing. With Podman, you have several options:

Option 1: Run multiple containers behind a reverse proxy:

```bash
podman run -d --name api-1 --network frontend -p 3001:3000 my-api
podman run -d --name api-2 --network frontend -p 3002:3000 my-api
```

```nginx
# nginx.conf - load balance across API instances
upstream api {
    server api-1:3000;
    server api-2:3000;
}
server {
    listen 80;
    location /api/ {
        proxy_pass http://api;
    }
}
```

Option 2: Use HAProxy for load balancing:

```bash
podman run -d --name haproxy \
  --network frontend \
  -p 80:80 \
  -v ./haproxy.cfg:/usr/local/etc/haproxy/haproxy.cfg:ro,Z \
  docker.io/library/haproxy:latest
```

## Step 6: Replace Rolling Updates

Docker Swarm provides rolling updates with `docker service update`. With Podman, use auto-update or a deployment script:

```bash
#!/bin/bash
# rolling-update.sh

SERVICE=$1
IMAGE=$2

echo "Pulling new image..."
podman pull "${IMAGE}"

echo "Stopping old container..."
podman stop "${SERVICE}"
podman rm "${SERVICE}"

echo "Starting new container..."
podman run -d --name "${SERVICE}" \
  --network frontend \
  "${IMAGE}"

echo "Verifying..."
sleep 5
podman healthcheck run "${SERVICE}"
```

Or use Podman's built-in auto-update with a systemd-managed container and a fully qualified image:

```bash
# Enable auto-update timer
systemctl --user enable --now podman-auto-update.timer
```

```ini
# ~/.config/containers/systemd/api.container
[Container]
Image=registry.example.com/my-api:latest
AutoUpdate=registry
```

## Step 7: Replace Swarm Configs

Docker Swarm configs can be replaced with bind mounts or Podman secrets:

```bash
# Swarm config
docker config create nginx_conf nginx.conf
# Used as: configs: [nginx_conf]

# Podman equivalent: bind mount
podman run -d -v ./nginx.conf:/etc/nginx/conf.d/default.conf:ro,Z nginx

# Or use Podman secret for sensitive configs
podman secret create db_init_script init.sql
podman run -d --secret db_init_script postgres:16
```

## Multi-Node Considerations

If your Swarm spans multiple nodes, Podman alone does not provide clustering. Consider these alternatives:

```bash
# Option 1: Run Podman independently on each node
# Use an external load balancer (HAProxy, Nginx, cloud LB)
# Each node runs its own set of containers

# Option 2: Migrate to Kubernetes for multi-node orchestration
# Use Podman locally for development
# Use Kubernetes (k3s, k0s) for production clustering

# Option 3: Use Ansible/Terraform to manage Podman across nodes
# ansible-playbook deploy.yml --limit node1,node2,node3
```

## Monitoring After Migration

Replace Swarm's built-in monitoring with Podman-compatible tools:

```bash
# Container health checks
podman healthcheck run api

# Resource monitoring
podman stats --no-stream

# Service status through systemd
systemctl --user status db api web

# Logs through journald
journalctl --user -u api -f
```

## Conclusion

Migrating from Docker Swarm to Podman works best for single-node or small deployments where Swarm's clustering overhead is not justified. The migration involves converting services to Podman containers or Quadlet units, replacing overlay networks with bridge networks, converting secrets, and implementing scaling through reverse proxies. For multi-node deployments, consider Kubernetes instead of Podman as the migration target. Plan your migration by assessing which Swarm features you actually use and mapping each to its Podman equivalent.
