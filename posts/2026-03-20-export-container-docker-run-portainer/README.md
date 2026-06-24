# How to Export Container Configuration as Docker Run Command - Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Container, Configuration, DevOps

Description: Export running container configurations as docker run commands from Portainer for documentation or migration.

## Introduction

Portainer helps you inspect running container configurations, but it does not provide a one-click export to a `docker run` command. This guide walks you through collecting the relevant settings in Portainer and recreating an equivalent `docker run` command for documentation or migration.

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
3. Filter by status (running, stopped, unhealthy)
4. Click on the container name, then open **Inspect** for full details

## Step-by-Step Instructions

Portainer does not generate a `docker run` command directly, so use the container's inspect data to rebuild the flags you need.

### View Container Details

```bash
# Using Docker CLI for equivalent details

docker inspect container-name

# View the container configuration
docker inspect --format='{{json .Config}}' container-name | jq .

# View host-level runtime settings such as restart policy and resource limits
docker inspect --format='{{json .HostConfig}}' container-name | jq .

# Via Portainer: Containers > container-name > Inspect > Text
```

### Key Configuration Options

Translate what you find in Portainer's inspect view into `docker run` flags such as:

```bash
docker run -d \
  --name my-app \
  --restart always \
  --cpus="1.0" \
  --memory="512m" \
  --health-cmd="curl -f http://localhost:8080/health || exit 1" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  -e NODE_ENV=production \
  -v app-data:/data \
  --network app-net \
  your-app:latest
```

## Command Line Examples

Useful Docker commands for this task:

```bash
# Basic inspection commands
docker ps -a                              # List all containers
docker stats container-name               # View resource usage
docker logs --tail 100 container-name     # View recent logs
docker inspect container-name             # Full container config
docker exec -it container-name /bin/sh    # Access container shell if available

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
4. **Container Actions**: Start, stop, and remove from the container view
5. **Inspect View**: Formatted JSON view of container configuration

## Troubleshooting Common Issues

**Issue: Container not appearing in list**
```bash
# Check all containers including stopped ones
docker ps -a

# Confirm you're viewing the correct Portainer environment, then reload the Containers view
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
docker inspect container-name | jq '.[0].HostConfig'
```

## Automating with the Portainer API

Automate this task via the Portainer API:

```bash
# Authenticate and get JWT token
TOKEN=$(curl -s -X POST \
  "https://portainer.example.com:9443/api/auth" \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"password"}' | jq -r .jwt)

# List all containers in the environment
curl -s -X GET \
  "https://portainer.example.com:9443/api/endpoints/1/docker/containers/json?all=true" \
  -H "Authorization: Bearer $TOKEN" | jq '.[] | {Names, Status, Image}'
```

## Conclusion

Understanding how to inspect a container's configuration in Portainer and recreate it as a `docker run` command gives you greater control over your containerized infrastructure. Portainer's visual interface makes these operations accessible to team members who may not be comfortable with the Docker CLI, while also providing quick access to underlying Docker capabilities. Regular use of these features helps maintain healthy, well-monitored container environments.
