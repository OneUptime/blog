# How to Configure tmpfs Mounts for Containers in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, tmpfs, Storage, Security

Description: Use tmpfs mounts in Portainer containers for temporary in-memory storage that doesn't persist to disk.

## Introduction

Use tmpfs mounts in Portainer containers for temporary in-memory storage that doesn't persist to disk. This guide walks you through the process step by step with practical examples.

## Prerequisites

- Portainer installed (CE or BE)
- At least one Docker or Swarm environment connected
- A Linux-based Docker host for Docker tmpfs mounts
- Basic familiarity with Docker concepts

## Using the Portainer UI

### Step 1: Navigate to the Relevant Section

1. Log in to your Portainer instance
2. Select your Docker environment from the home screen
3. Navigate to **Volumes** (or **Stacks** for compose-based tasks)

### Step 2: Create the tmpfs Volume

Use the volume creation options in Portainer:

1. Click the **Volumes** menu item
2. Click **Add volume**
3. Set a descriptive name, such as `app-tmpfs`
4. Set **Driver** to `local`
5. Add driver options with `type=tmpfs`, `device=tmpfs`, and `o=size=100m,uid=1000`
6. Click **Create the volume**, then attach it to a container like any other Docker volume

## Step-by-Step Instructions

### Verify the tmpfs Mount

```bash
# Using Docker CLI equivalent

docker inspect container-name

# View mount details
docker inspect --format '{{ json .Mounts }}' container-name | jq

# Check the mounted filesystem inside the container
docker exec container-name df -h /run/app

# Via Portainer: Containers > container-name > Inspect
```

### Key Configuration Options

```yaml
# docker-compose.yml example
services:
  app:
    image: your-app:latest
    container_name: my-app
    restart: always
    # Resource constraints
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
    # Health check
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    # Environment
    environment:
      - NODE_ENV=production
    # tmpfs-backed volume
    volumes:
      - app-tmpfs:/run/app
    # Network
    networks:
      - app-net

volumes:
  app-tmpfs:
    driver: local
    driver_opts:
      type: tmpfs
      device: tmpfs
      o: size=100m,uid=1000,gid=1000,mode=1770

networks:
  app-net:
    driver: bridge
```

## Command Line Examples

Useful Docker commands for this task:

```bash
# Create a tmpfs-backed Docker volume
docker volume create --driver local \
  --opt type=tmpfs \
  --opt device=tmpfs \
  --opt o=size=100m,uid=1000,gid=1000,mode=1770 \
  app-tmpfs

# Run a container with the tmpfs-backed volume
docker run -d --name my-app \
  --mount type=volume,source=app-tmpfs,target=/run/app \
  your-app:latest

# Run a container with a direct tmpfs mount instead of a named volume
docker run -d --name my-app-direct \
  --mount type=tmpfs,destination=/run/app,tmpfs-size=104857600,tmpfs-mode=1770 \
  your-app:latest

# Verify the mount
docker inspect --format '{{ json .Mounts }}' my-app | jq
docker exec my-app df -h /run/app
```

## Portainer-Specific Features

Portainer provides several UI conveniences for this task:

1. **Volume Management**: Create a local volume with tmpfs driver options from the Volumes page
2. **Inspect View**: Confirm the attached mount in the formatted JSON view
3. **Container Console**: Run `df -h /run/app` or similar checks from a shell
4. **Log Streaming**: Click Logs for real-time log output with search
5. **Quick Actions**: Stop, restart, kill from the container list

## Troubleshooting Common Issues

**Issue: tmpfs mount not appearing**
```bash
# Check the container mount list
docker inspect --format '{{ json .Mounts }}' container-name | jq

# Check the mount from inside the container
docker exec container-name df -h /run/app
```

**Issue: Permission denied errors**
```bash
# Check container user
docker inspect container-name | jq '.[0].Config.User'

# Check volume options
docker volume inspect app-tmpfs | jq '.[0].Options'

# Stop containers using it, remove the old volume, then recreate it
docker volume rm app-tmpfs

docker volume create --driver local \
  --opt type=tmpfs \
  --opt device=tmpfs \
  --opt o=size=100m,uid=1000,gid=1000,mode=1770 \
  app-tmpfs
```

**Issue: tmpfs size not applying**
```bash
# Verify configured options
docker volume inspect app-tmpfs | jq '.[0].Options'

# Verify the mounted size inside the container
docker exec container-name df -h /run/app
```

## Automating with the Portainer API

Automate this task via the Portainer API:

```bash
# Use a Portainer access token from My account > Access tokens
PORTAINER_URL="https://portainer.example.com"
API_KEY="ptr_your_access_token"
ENDPOINT_ID=1

# Create a tmpfs-backed volume through Portainer's Docker API gateway
curl -s -X POST \
  "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/volumes/create" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "Name": "app-tmpfs",
    "Driver": "local",
    "DriverOpts": {
      "type": "tmpfs",
      "device": "tmpfs",
      "o": "size=100m,uid=1000"
    }
  }' | jq .

# Inspect the created volume
curl -s -X GET \
  "$PORTAINER_URL/api/endpoints/$ENDPOINT_ID/docker/volumes/app-tmpfs" \
  -H "X-API-Key: $API_KEY" | jq '{Name, Driver, Options}'
```

## Conclusion

Understanding how to Configure tmpfs Mounts for Containers in Portainer gives you greater control over your containerized infrastructure. Portainer's visual interface makes these operations accessible to team members who may not be comfortable with the Docker CLI, while also providing quick access to underlying Docker capabilities. Regular use of these features helps maintain healthy, well-monitored container environments.
