# How to Migrate from Yacht to Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Yacht, Migration, Docker, Self-Hosted

Description: Migrate your Docker container management from Yacht to Portainer for better team support, stack management, and enterprise features.

## Introduction

Yacht is a lightweight Docker container management UI popular in homelab setups. Portainer offers significantly more features including team access control, Docker Swarm support, Kubernetes management, and a full REST API. Migrating is straightforward since both manage the same Docker socket.

## Exporting Yacht Configuration

```bash
# Backup Yacht data before migration

docker inspect yacht --format '{{json .Mounts}}' | python3 -m json.tool

# Backup the config
docker run --rm \
  -v yacht_data:/data \
  -v $(pwd)/yacht-backup:/backup \
  alpine tar czf /backup/yacht-config.tar.gz -C /data .
```

## Documenting Existing Applications

```bash
# List all containers Yacht is managing
docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"

# Export all container configurations
mkdir -p /tmp/container-configs
docker ps -aq | while read id; do
  name=$(docker inspect --format='{{.Name}}' $id | tr -d '/')
  docker inspect $id > "/tmp/container-configs/$name.json"
done
```

## Installing Portainer

```bash
# Both can run simultaneously during migration
docker volume create portainer_data

docker run -d \
  --name portainer \
  --restart=always \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

## Recreating Yacht Applications in Portainer

Convert Yacht apps to Portainer stacks using docker-compose:

```yaml
# Example: Convert Yacht "application" to Portainer stack
version: '3.8'
services:
  nginx-proxy-manager:
    image: jc21/nginx-proxy-manager:latest
    restart: unless-stopped
    ports:
      - "80:80"
      - "81:81"
      - "443:443"
    volumes:
      - npm-data:/data
      - npm-letsencrypt:/etc/letsencrypt
volumes:
  npm-data:
  npm-letsencrypt:
```

## Custom Templates in Portainer

```json
[
  {
    "type": 1,
    "title": "Nginx Proxy Manager",
    "description": "Reverse proxy with SSL management",
    "categories": ["Networking"],
    "image": "jc21/nginx-proxy-manager:latest",
    "ports": ["80/tcp", "81/tcp", "443/tcp"]
  }
]
```

## Portainer vs Yacht Feature Comparison

| Feature | Yacht | Portainer |
|---------|-------|-----------|
| Docker Swarm | No | Yes |
| Kubernetes | No | Yes |
| REST API | Limited | Full |
| Team/User Management | No | Yes |
| Edge Computing | No | Yes |
| GitOps Integration | No | Yes |
| Audit Logs | No | Yes |

## Removing Yacht After Migration

```bash
# Remove Yacht once Portainer is verified
docker stop yacht && docker rm yacht
docker volume rm yacht_data
docker rmi selfhostedpro/yacht:latest
```

## Conclusion

Migrating from Yacht to Portainer is a simple, non-disruptive process. All existing containers continue running during migration. Portainer provides team collaboration, advanced stack management, and a path to Kubernetes and edge deployments-making it a future-proof replacement for homelab users who need to scale.
