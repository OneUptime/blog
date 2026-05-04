# How to Configure Container Ulimits in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Ulimit, Security, Performance

Description: Configure system resource limits (ulimits) for Docker containers in Portainer for security and performance tuning.

## Introduction

Configure system resource limits (ulimits) for Docker containers in Portainer for security and performance tuning. This guide walks you through the process step by step with practical examples.

## Prerequisites

- Portainer installed (CE or BE)
- At least one Docker or Kubernetes environment connected
- Basic familiarity with Docker concepts

## Using the Portainer UI

### Step 1: Navigate to the Relevant Section

1. Log in to your Portainer instance
2. Select your environment from the home screen
3. Navigate to **Containers** (or **Stacks** for compose-based tasks)

### Step 2: Locate Your Container

Use the search and filter options in Portainer:

1. Click the **Containers** menu item
2. Use the search box to find your container
3. Filter by status (running, stopped, unhealthy)
4. Click on the container name for details

## Step-by-Step Instructions

### View Container Details

```bash
# Using Docker CLI equivalent

docker inspect container-name

# View formatted output
docker inspect container-name | jq '.[0].Config'

# Via Portainer: Containers > container-name > Inspect
```

### Key Configuration Options

```yaml
# docker-compose.yml example
version: "3.8"

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
    # Volumes
    volumes:
      - app-data:/data
    # Network
    networks:
      - app-net

volumes:
  app-data:

networks:
  app-net:
    driver: bridge
```

## Command Line Examples

Useful Docker commands for this task:

```bash
# Basic inspection commands
docker ps -a                              # List all containers
docker stats container-name               # View resource usage
docker logs container-name --tail 100     # View recent logs
docker inspect container-name             # Full container config
docker exec -it container-name /bin/sh   # Access container shell

# Advanced filtering
docker ps --filter "status=running" \
           --filter "label=env=production" \
           --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# File operations
docker cp /host/path container-name:/container/path
docker cp container-name:/container/path /host/path
```

## Portainer-Specific Features

Portainer provides several UI conveniences for this task:

1. **Visual Stats Dashboard**: Click any container > Stats for real-time graphs
2. **Log Streaming**: Click Logs for real-time log output with search
3. **Container Console**: Click Console for direct shell access
4. **Quick Actions**: Stop, restart, kill from the container list
5. **Inspect View**: Formatted JSON view of container configuration

## Troubleshooting Common Issues

**Issue: Container not appearing in list**
```bash
# Check all containers including stopped ones
docker ps -a

# Refresh Portainer's environment
# Environments > select environment > Refresh
```

**Issue: Permission denied errors**
```bash
# Check container user
docker inspect container-name | jq '.[0].Config.User'

# Run container with specific user
docker run --user 1000:1000 your-image
```

**Issue: Resource limits not applying**
```bash
# Verify limits are applied
docker inspect container-name | jq '.[0].HostConfig | {Memory, CpuShares, CpuQuota}'
```

## Automating with the Portainer API

Automate this task via the Portainer API:

```bash
# Authenticate and get JWT token
TOKEN=$(curl -s -X POST \
  "https://portainer.example.com/api/auth" \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"password"}' | jq -r .jwt)

# List containers
curl -s -X GET \
  "https://portainer.example.com/api/endpoints/1/docker/containers/json" \
  -H "Authorization: Bearer $TOKEN" | jq '.[] | {Names, Status, Image}'
```

## Conclusion

Understanding how to Configure Container Ulimits in Portainer gives you greater control over your containerized infrastructure. Portainer's visual interface makes these operations accessible to team members who may not be comfortable with the Docker CLI, while also providing quick access to underlying Docker capabilities. Regular use of these features helps maintain healthy, well-monitored container environments.
