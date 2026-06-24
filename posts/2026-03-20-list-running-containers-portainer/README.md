# How to List All Running Containers Across Environments in Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Container, Management, DevOps

Description: View and filter all running containers across multiple environments and Docker hosts from Portainer's central interface.

## Introduction

Portainer lets you manage multiple environments from one central interface. To list running containers, select the environment you want to inspect and use the **Containers** view to search and filter the results. This guide walks you through the process step by step with practical examples.

## Prerequisites

- Portainer installed (CE or BE)
- At least one Docker Standalone, Docker Swarm, or Podman environment connected
- Basic familiarity with Docker concepts

## Using the Portainer UI

### Step 1: Navigate to the Relevant Section

1. Log in to your Portainer instance
2. Select the environment you want to inspect from the home screen
3. Navigate to **Containers**

### Step 2: Locate Your Container

Use the search and filter options in Portainer:

1. Click the **Containers** menu item
2. Use the search box to find your container
3. Confirm you found the correct container in the list
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

1. **Visual Stats Dashboard**: Click any container > Stats to view CPU, memory, network, and I/O usage
2. **Log View**: Click Logs for searchable logs with auto refresh
3. **Container Console**: Click Console for shell access when the image includes a shell
4. **Quick Actions**: Start, stop, restart, and remove actions are available from the container view
5. **Inspect View**: Tree and raw JSON views of container configuration

## Troubleshooting Common Issues

**Issue: Container not appearing in list**
```bash
# Check all containers including stopped ones
docker ps -a

# In Portainer, confirm you selected the correct environment from the Home page
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
# Use a Portainer access token from My account > Access tokens
PORTAINER_API_KEY="your_access_token"

# List running containers in environment 1
curl -s -X GET \
  "https://portainer.example.com/api/endpoints/1/docker/containers/json" \
  -H "X-API-Key: $PORTAINER_API_KEY" | jq '.[] | {Names, State, Status, Image}'
```

## Conclusion

Understanding how to list running containers in your Portainer-managed environments gives you greater control over your containerized infrastructure. Portainer's visual interface makes these operations accessible to team members who may not be comfortable with the Docker CLI, while also providing quick access to underlying Docker capabilities. Regular use of these features helps maintain healthy, well-monitored container environments.
