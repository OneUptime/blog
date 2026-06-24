# How to Filter Containers by Status and Label in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Container, Filtering, Management

Description: Use Portainer's filtering capabilities to quickly find containers by status, name, image, or custom labels.

## Introduction

Use Portainer's container list and API access to quickly find containers by state, name, image, or custom labels. This guide walks you through the process step by step with practical examples.

## Prerequisites

- Portainer installed (CE or BE)
- At least one Docker Standalone or Docker Swarm environment connected
- Basic familiarity with Docker concepts

## Using the Portainer UI

### Step 1: Navigate to the Relevant Section

1. Log in to your Portainer instance
2. Select your environment from the home screen
3. Navigate to **Containers**

### Step 2: Locate Your Container

Use the search and filter options in Portainer:

1. Click the **Containers** menu item
2. Use the search box to narrow the list
3. Use the **State** filter to show running, stopped, or unhealthy containers
4. Click on the container name for details

For label-specific matching, use the Docker CLI or Portainer API examples below, then open the matching container in Portainer.

## Step-by-Step Instructions

### View Container Details

```bash
# Using Docker CLI equivalent

docker inspect container-name

# View only the container config section
docker inspect --format='{{json .Config}}' container-name | jq

# View only the container labels
docker inspect --format='{{json .Config.Labels}}' container-name | jq

# Via Portainer: Containers > container-name > Inspect
```

### Key Configuration Options

```yaml
# compose.yaml example

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
    # Health check (requires curl in the image)
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    # Environment
    environment:
      - NODE_ENV=production
    # Custom labels
    labels:
      com.example.env: production
      com.example.service: web
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
docker logs --tail 100 container-name     # View recent logs
docker inspect container-name             # Full container config
docker exec -it container-name /bin/sh   # Access container shell

# Advanced filtering
docker ps -a --filter "status=running" \
             --filter "label=com.example.env=production" \
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

# Refresh the Containers view in Portainer
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
docker inspect container-name | jq '.[0].HostConfig | {Memory, NanoCpus, CpuQuota, CpuPeriod}'
```

## Automating with the Portainer API

Automate this task via the Portainer API:

```bash
# Authenticate and get JWT token
TOKEN=$(curl -s -X POST \
  "https://portainer.example.com/api/auth" \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"password"}' | jq -r .jwt)

# List running containers that match a Docker label
curl -G -s \
  "https://portainer.example.com/api/endpoints/1/docker/containers/json" \
  -H "Authorization: Bearer $TOKEN" \
  --data-urlencode "all=1" \
  --data-urlencode 'filters={"status":["running"],"label":["com.example.env=production"]}' \
  | jq '.[] | {Names, State, Status, Image}'
```

## Conclusion

Understanding how to filter containers by status in Portainer and by label with Docker gives you greater control over your containerized infrastructure. Portainer's visual interface makes state-based browsing accessible to team members who may not be comfortable with the Docker CLI, while the Docker CLI and Portainer API provide precise label-based filtering when you need it. Regular use of these features helps maintain healthy, well-monitored container environments.
