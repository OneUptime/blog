# How to Commit a Container to a New Image in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Image, Container, DevOps

Description: Create a new Docker image from a running or stopped container's current state using Portainer.

## Introduction

Create a new Docker image from a deployed container using Portainer. This guide walks you through the process step by step with practical examples.

## Prerequisites

- Portainer installed (CE or BE)
- At least one Docker, Swarm, or Podman environment connected
- Permissions to view the target container and manage images
- Basic familiarity with Docker concepts

## Using the Portainer UI

### Step 1: Navigate to the Relevant Section

1. Log in to your Portainer instance
2. Select your Docker, Swarm, or Podman environment from the home screen
3. Navigate to **Containers**

### Step 2: Locate Your Container

Use the search and filter options in Portainer:

1. Click the **Containers** menu item
2. Use the search box to find your container
3. Filter by status (running, stopped, unhealthy)
4. Click on the container name for details

## Step-by-Step Instructions

### Create the Image

1. Open the container details page in Portainer
2. Use the option to create an image from the deployed container
3. Save the image, then verify it from Portainer's **Images** view

```bash
# Using Docker CLI equivalent

docker container commit container-name your-image:snapshot

# Add metadata when needed
docker container commit \
  --author "Your Name <you@example.com>" \
  --message "Snapshot before upgrade" \
  container-name your-image:snapshot

# Mounted volumes are not included in the new image
# Running containers are paused during commit by default
```

### Key Configuration Options

- Use a new repository name and tag for the committed image
- Expect the image to capture the container's current filesystem state
- Mounted volumes and bind-mounted data are not included in the committed image
- If you need to apply `ENV`, `CMD`, or `LABEL` changes while committing, use the CLI `--change` option or the API `changes` parameter

## Command Line Examples

Useful Docker commands for this task:

```bash
# Find the container you want to capture
docker ps -a

# Inspect the container before committing it
docker inspect container-name

# Commit the container to a new image
docker container commit container-name your-image:snapshot

# Commit the container and apply Dockerfile-style changes
docker container commit \
  --change 'ENV APP_ENV=production' \
  --change 'LABEL snapshot=true' \
  container-name your-image:snapshot

# Verify the new image exists
docker image ls your-image
```

## Portainer-Specific Features

Portainer provides several UI conveniences for this task:

1. **Container Details**: Open a container and create an image from the deployed container
2. **Inspect View**: Review the container configuration in a tree view or raw JSON
3. **Log View**: Check the container logs before committing a snapshot
4. **Stats View**: Review CPU, memory, network, I/O, and running processes
5. **Console Access**: Open a shell in the container when you need to inspect the live filesystem

## Troubleshooting Common Issues

**Issue: Container not appearing in list**
```bash
# Check all containers including stopped ones
docker ps -a

# Make sure you selected the correct Docker, Swarm, or Podman environment
```

**Issue: Expected data missing from the committed image**
```bash
# Check whether the data lives in a mounted volume or bind mount
docker inspect container-name | jq '.[0].Mounts'

# docker container commit does not include mounted volume data
```

**Issue: Need to control pause behavior during commit**
```bash
# Docker pauses a running container during commit by default
docker container commit container-name your-image:snapshot

# Disable the pause only if you accept the consistency tradeoff
docker container commit --no-pause container-name your-image:snapshot
```

## Automating with the Portainer API

Automate this task via the Portainer API:

```bash
# Create an image from a container through Portainer's Docker API gateway
curl -s -X POST \
  "https://portainer.example.com/api/endpoints/1/docker/commit?container=container-name&repo=your-image&tag=snapshot&comment=Snapshot%20before%20upgrade&pause=true" \
  -H "X-API-Key: YOUR_PORTAINER_ACCESS_TOKEN" | jq

# Verify the image is now available
curl -s \
  "https://portainer.example.com/api/endpoints/1/docker/images/json" \
  -H "X-API-Key: YOUR_PORTAINER_ACCESS_TOKEN" | jq '.[] | .RepoTags'
```

## Conclusion

Understanding how to Commit a Container to a New Image in Portainer gives you a quick way to capture a container's current state for reuse. Portainer's visual interface makes this accessible to team members who may not be comfortable with the Docker CLI, while still giving you access to the underlying Docker API when you need automation. Remember that committed images do not include mounted volume data, and for repeatable builds a Dockerfile is still the better long-term option.
