# How to Start and Stop Containers in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Container, Start, Stop

Description: Start and stop Docker containers in Portainer using the web UI container list and detail views.

---

Portainer provides a web-based interface for all common container lifecycle operations. Understanding these operations helps you efficiently manage containers without memorizing Docker CLI commands.

## Via the Portainer UI

Navigate to **Containers** in the left sidebar to see the container list. Each container has action buttons for common operations.

### Container List Actions

From the container list:
- Select one or more containers using checkboxes
- Use the bulk action buttons at the top: **Start**, **Stop**, **Restart**, **Kill**, **Remove**

### Single Container Actions

Click the container name to open its detail page, then use the action buttons at the top.

## Via the API

```bash
TOKEN=$(curl -s -X POST \
  https://localhost:9443/api/auth \
  -H "Content-Type: application/json" \
  -d '{"Username":"admin","Password":"yourpassword"}' \
  --insecure | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Get container ID by name

CONTAINER_ID=$(curl -s "https://localhost:9443/api/endpoints/1/docker/containers/json?all=1" \
  -H "Authorization: Bearer $TOKEN" \
  --insecure | python3 -c "
import sys, json
containers = json.load(sys.stdin)
for c in containers:
    if '/my-container' in c.get('Names', []):
        print(c['Id'][:12])
")
echo "Container ID: $CONTAINER_ID"

# Start container
curl -X POST "https://localhost:9443/api/endpoints/1/docker/containers/${CONTAINER_ID}/start" \
  -H "Authorization: Bearer $TOKEN" --insecure

# Stop container
curl -X POST "https://localhost:9443/api/endpoints/1/docker/containers/${CONTAINER_ID}/stop" \
  -H "Authorization: Bearer $TOKEN" --insecure

# Restart container
curl -X POST "https://localhost:9443/api/endpoints/1/docker/containers/${CONTAINER_ID}/restart" \
  -H "Authorization: Bearer $TOKEN" --insecure

# Kill container (SIGKILL)
curl -X POST "https://localhost:9443/api/endpoints/1/docker/containers/${CONTAINER_ID}/kill" \
  -H "Authorization: Bearer $TOKEN" --insecure

# Remove container (must be stopped first)
curl -X DELETE "https://localhost:9443/api/endpoints/1/docker/containers/${CONTAINER_ID}" \
  -H "Authorization: Bearer $TOKEN" --insecure

# Remove a running container forcibly (equivalent to --force)
curl -X DELETE "https://localhost:9443/api/endpoints/1/docker/containers/${CONTAINER_ID}?force=true" \
  -H "Authorization: Bearer $TOKEN" --insecure

# Pause container
curl -X POST "https://localhost:9443/api/endpoints/1/docker/containers/${CONTAINER_ID}/pause" \
  -H "Authorization: Bearer $TOKEN" --insecure

# Unpause container
curl -X POST "https://localhost:9443/api/endpoints/1/docker/containers/${CONTAINER_ID}/unpause" \
  -H "Authorization: Bearer $TOKEN" --insecure

# Inspect container JSON
curl -s "https://localhost:9443/api/endpoints/1/docker/containers/${CONTAINER_ID}/json" \
  -H "Authorization: Bearer $TOKEN" --insecure | python3 -m json.tool
```

## Duplicate a Container

```bash
# Inspect the existing container to review its configuration
docker inspect my-container | python3 -m json.tool

# Create a duplicate with a new name, adding the same flags as the original
docker run -d \
  --name my-container-copy \
  myimage:latest
```

---

*Set up health checks and restart monitoring for your containers with [OneUptime](https://oneuptime.com).*
