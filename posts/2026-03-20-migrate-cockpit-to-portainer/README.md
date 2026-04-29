# How to Migrate from Cockpit to Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Cockpit, Migration, Docker, Linux

Description: Transition from Cockpit's basic container management to Portainer for more comprehensive Docker and Kubernetes container orchestration capabilities.

## Introduction

Cockpit is a Linux server management tool that includes basic container management via the `cockpit-podman` plugin. While useful for basic system administration, Cockpit's container management lacks stacks, advanced networking, team access control, and API access. Portainer fills many of these gaps, with some features such as advanced RBAC and activity logs available in Business Edition.

## What Cockpit Container Management Lacks

- No Docker Compose/stack management
- No team access control for containers
- No container templates library
- No Kubernetes management
- No REST API for automation
- No audit logging for container actions
- No GitOps integration

## Backing Up Current Container Configurations

```bash
# List all containers managed via Cockpit

docker ps -a --format "{{.Names}}\t{{.Image}}\t{{.Status}}"
# or for Podman
podman ps -a --format "{{.Names}}\t{{.Image}}\t{{.Status}}"

# Export container inspect data
docker ps -aq | xargs -r docker inspect > container-configs.json
# or for Podman
podman ps -aq | xargs -r podman inspect > podman-container-configs.json

# Export Docker volumes
mkdir -p vol-backups
docker volume ls -q | while read -r vol; do
  docker run --rm \
    -v "$vol":/source \
    -v "$(pwd)/vol-backups:/backup" \
    alpine tar czf /backup/${vol}.tar.gz -C /source .
  echo "Backed up: $vol"
done

# Export Podman volumes
podman volume ls -q | while read -r vol; do
  podman volume export "$vol" --output "vol-backups/${vol}.tar"
  echo "Backed up: $vol"
done
```

## Installing Portainer

```bash
# Option 1: Docker
docker volume create portainer_data
docker run -d \
  --name portainer \
  --restart=always \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:sts

# Option 2: Podman (official support currently requires rootful Podman)
sudo systemctl enable --now podman.socket
podman volume create portainer_data
podman run -d \
  --name portainer \
  --restart=always \
  --privileged \
  -p 9443:9443 \
  -v /run/podman/podman.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

## Converting Cockpit Containers to Portainer Stacks

Cockpit typically manages individual containers. Portainer encourages using stacks:

```yaml
# Convert individual containers to a compose stack
# Example: Web app that was run separately via Cockpit

services:
  web:
    image: nginx:1.25
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - web-config:/etc/nginx/conf.d
      - web-certs:/etc/ssl/certs
    
  app:
    image: myapp:latest
    restart: unless-stopped
    environment:
      - DATABASE_URL=postgresql://postgres:mysecretpassword@db:5432/appdb
    
  db:
    image: postgres:15
    restart: unless-stopped
    volumes:
      - db-data:/var/lib/postgresql/data
    environment:
      - POSTGRES_PASSWORD=mysecretpassword

volumes:
  web-config:
  web-certs:
  db-data:
```

## Cockpit vs Portainer Feature Matrix

| Feature | Cockpit | Portainer |
|---------|---------|-----------|
| Basic container start/stop | Yes | Yes |
| Docker Compose/Stacks | No | Yes |
| Team access control | No built-in container RBAC | Yes |
| Kubernetes management | No | Yes |
| Container templates | No | Yes |
| REST API | No supported REST API | Yes |
| Audit logging | No | Business Edition |
| System management (non-containers) | Yes | No |

Note: Cockpit and Portainer can coexist since they serve different purposes. Cockpit for OS-level management, Portainer for container management.

## Running Both Cockpit and Portainer

```bash
# Keep Cockpit for system management
sudo systemctl status cockpit.socket

# Cockpit typically uses port 9090, so Portainer can use 9443
# Run Portainer on a different port
docker run -d \
  --name portainer \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:sts

# Cockpit: https://your-server:9090
# Portainer: https://your-server:9443
```

## Conclusion

Migrating container management from Cockpit to Portainer gives you professional-grade container orchestration capabilities. Cockpit remains valuable for OS-level management (system logs, firewall, storage), while Portainer handles all container lifecycle management. Running both side-by-side provides a comprehensive server management solution.
