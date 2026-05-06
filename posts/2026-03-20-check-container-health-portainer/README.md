# How to Check Container Health Status in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Health Check, Container, Monitoring

Description: Monitor container health status, view health check logs, and troubleshoot unhealthy containers in Portainer.

## Introduction

Monitor container health status, view health check logs, and troubleshoot unhealthy containers in Portainer. This guide walks you through the process step by step with practical examples.

## Prerequisites

- Portainer installed (CE or BE)
- At least one Docker environment connected
- Basic familiarity with Docker concepts

## Using the Portainer UI

### Step 1: Navigate to the Relevant Section

1. Log in to your Portainer instance
2. Select your environment from the home screen
3. Navigate to **Containers**

### Step 2: Locate Your Container

Use the search and filter options in Portainer:

1. Click the **Containers** menu item
2. Use the search box to find your container
3. Use the available status filters if needed
4. Click on the container name for details

## Step-by-Step Instructions

### View Container Details

```bash
# Using Docker CLI equivalent

docker inspect --format '{{.State.Health.Status}}' container-name

# View detailed health check output and logs
docker inspect --format '{{json .State.Health}}' container-name | jq

# Via Portainer: Containers > container-name > Inspect > Text
# Look under State > Health for Status, FailingStreak, and Log
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
docker inspect --format '{{.State.Health.Status}}' container-name  # Health status
docker inspect --format '{{json .State.Health.Log}}' container-name | jq  # Health check logs
docker stats container-name               # View resource usage
docker logs container-name --tail 100     # View recent logs
docker exec -it container-name /bin/sh   # Access container shell

# Advanced filtering
docker ps --filter "status=running" \
           --filter "health=healthy" \
           --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# File operations
docker cp /host/path container-name:/container/path
docker cp container-name:/container/path /host/path
```

## Portainer-Specific Features

Portainer provides several UI conveniences for this task:

1. **Visual Stats Dashboard**: Click any container > Stats for real-time graphs
2. **Log Viewer**: Click Logs for log output with search and auto-refresh
3. **Container Console**: Click Console for shell access when the image includes a shell
4. **Container Actions**: Start, stop, and remove from the container details page
5. **Inspect View**: Tree view and raw JSON view of container configuration and state

## Troubleshooting Common Issues

**Issue: Container not appearing in list**
```bash
# Check all containers including stopped ones
docker ps -a

# In Portainer, confirm you selected the correct Docker environment
# then refresh the Containers view
```

**Issue: Permission denied errors**
```bash
# Check container user
docker inspect container-name | jq '.[0].Config.User'

# Run container with specific user
docker run --user 1000:1000 your-image
```

**Issue: Health status is missing or always "starting"**
```bash
# Check whether the image or container defines a health check
docker inspect container-name | jq '.[0].Config.Healthcheck'

# Review the current health state and probe output
docker inspect --format '{{json .State.Health}}' container-name | jq
```

## Automating with the Portainer API

Automate this task via the Portainer API:

```bash
# Create an access token in Portainer first: My account > Access tokens
# List containers through the Portainer API gateway
curl -s -X GET \
  "https://portainer.example.com/api/endpoints/1/docker/containers/json?all=true" \
  -H "X-API-Key: YOUR_ACCESS_TOKEN" | jq '.[] | {Names, Status, Image}'
```

## Conclusion

Understanding how to Check Container Health Status in Portainer gives you greater control over your containerized infrastructure. Portainer's visual interface makes these operations accessible to team members who may not be comfortable with the Docker CLI, while also providing quick access to underlying Docker capabilities. Regular use of these features helps maintain healthy, well-monitored container environments.
