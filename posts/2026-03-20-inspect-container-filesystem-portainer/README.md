# How to Inspect Container Filesystem Changes in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Container, Filesystem, Debugging

Description: Inspect and analyze filesystem changes made by running containers using Portainer and Docker inspection tools.

## Introduction

Inspect and analyze filesystem changes made by running containers using Portainer and Docker inspection tools. Portainer helps you identify the right container, inspect its configuration, and open a console, while Docker provides the actual filesystem change list. This guide walks you through the process step by step with practical examples.

## Prerequisites

- Portainer installed (CE or BE)
- A Docker environment connected to Portainer
- Access to the Docker CLI or Docker API for that environment
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

### Inspect Filesystem Changes

```bash
# List changes in the container's writable layer
docker container diff container-name

# Short alias
docker diff container-name

# Via Portainer: Containers > container-name > Inspect
# Via Portainer: Containers > container-name > Console
```

### Key Configuration Options

```yaml
# compose.yaml example
services:
  app:
    image: your-app:latest
    container_name: my-app
    restart: always
    environment:
      - NODE_ENV=production
    # Writes here persist in a named volume and won't appear in docker diff
    volumes:
      - app-data:/data
    # tmpfs writes also bypass the writable layer
    tmpfs:
      - /tmp
    # Makes the image filesystem read-only and forces explicit writable paths
    read_only: true
    user: "1000:1000"

volumes:
  app-data:
```

## Command Line Examples

Useful Docker commands for this task:

```bash
# Basic inspection commands
docker ps -a                               # List all containers
docker diff container-name                 # List added, changed, and deleted paths
docker inspect --size container-name       # Show container config and size data
docker exec -it container-name /bin/sh     # Access container shell

# Advanced filtering
docker ps --filter "status=running" \
           --filter "label=env=production" \
           --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Copy files for comparison
docker cp container-name:/container/path /host/path
docker cp /host/path container-name:/container/path
```

## Portainer-Specific Features

Portainer does not provide a native writable-layer diff view, but it does provide several UI conveniences for this task:

1. **Inspect View**: Tree and raw JSON views of container configuration, mounts, and networking
2. **Container Console**: Click Console for shell access inside the container
3. **Log Streaming**: Click Logs for real-time log output with search
4. **Visual Stats Dashboard**: Click Stats for CPU, memory, network, and I/O graphs
5. **Volume Browser**: Browse named volumes directly when the environment supports it

## Troubleshooting Common Issues

**Issue: Container not appearing in list**
```bash
# Check all containers including stopped ones
docker ps -a

# Make sure you're viewing the correct Portainer environment,
# then refresh the Containers view
```

**Issue: Permission denied errors**
```bash
# Check container user
docker inspect container-name | jq '.[0].Config.User'

# Run container with specific user
docker run --user 1000:1000 your-image
```

**Issue: Expected file changes not appearing**
```bash
# Inspect mounts that bypass the writable layer
docker inspect container-name | jq '.[0].Mounts'

# Files written to volumes, bind mounts, or tmpfs do not appear in docker diff
```

## Automating with the Portainer API

Automate this task via the Portainer API:

```bash
# Use a Portainer access token from My account > Access tokens
PORTAINER_API_KEY="your_access_token"

# Query Docker's filesystem changes endpoint through Portainer's Docker API proxy
curl -s \
  "https://portainer.example.com/api/endpoints/1/docker/containers/container-name/changes" \
  -H "X-API-Key: ${PORTAINER_API_KEY}" | jq '.[] | {Path, Kind}'

# Kind values: 0=modified, 1=added, 2=deleted
```

## Conclusion

Understanding how to Inspect Container Filesystem Changes in Portainer gives you greater control over your containerized infrastructure. Portainer's visual interface makes it easy to find the right container, inspect its mounts, and open a console, while Docker's `diff` command and API provide the actual filesystem change list. Regular use of these features helps maintain healthy, well-monitored container environments.
