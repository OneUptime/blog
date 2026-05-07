# How to Use the Podman REST API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, REST API, Automation, Docker Compatibility

Description: Learn how to use the Podman REST API to manage containers, images, and system resources programmatically with curl and scripting.

---

> The Podman REST API opens the door to custom automation, monitoring dashboards, and integration with any programming language that can make HTTP requests.

Podman exposes a REST API that is both Docker-compatible and extended with Podman-native endpoints. This API lets you manage containers, images, volumes, networks, and pods programmatically. Whether you are building custom tooling, integrating with CI/CD pipelines, or creating monitoring dashboards, the REST API gives you full control.

---

## Starting the API Service

Enable the Podman API before making requests.

```bash
# Start the Podman socket (recommended for local access)

systemctl --user start podman.socket

# Verify the socket is active
systemctl --user status podman.socket

# Define the socket path for convenience
export PODMAN_SOCK="/run/user/$(id -u)/podman/podman.sock"

# Ping the API to confirm it is responding
curl --unix-socket "$PODMAN_SOCK" http://localhost/libpod/_ping
# Expected output: OK
```

## API Versioning

Most API endpoints use versioned paths for both Podman-native and Docker-compatible calls.

```bash
PODMAN_SOCK="/run/user/$(id -u)/podman/podman.sock"

# Podman-native API (libpod endpoints)
curl -s --unix-socket "$PODMAN_SOCK" \
    http://localhost/v5.0.0/libpod/info | jq '.version'

# Docker-compatible API
curl -s --unix-socket "$PODMAN_SOCK" \
    http://localhost/v1.40/info | jq '.ServerVersion'
```

## Listing Containers

Query running and stopped containers through the API.

```bash
PODMAN_SOCK="/run/user/$(id -u)/podman/podman.sock"

# List all running containers (Podman API)
curl -s --unix-socket "$PODMAN_SOCK" \
    http://localhost/v5.0.0/libpod/containers/json | jq '.[].Names'

# List all containers including stopped (Podman API)
curl -s --unix-socket "$PODMAN_SOCK" \
    "http://localhost/v5.0.0/libpod/containers/json?all=true" | \
    jq '.[] | {name: .Names[0], state: .State, image: .Image}'

# List containers using Docker-compatible API
curl -s --unix-socket "$PODMAN_SOCK" \
    "http://localhost/v1.40/containers/json?all=true" | jq '.[].Names'
```

## Creating and Starting Containers

Use the API to create and manage container lifecycles.

```bash
PODMAN_SOCK="/run/user/$(id -u)/podman/podman.sock"

# Create a container
curl -s --unix-socket "$PODMAN_SOCK" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{
        "image": "docker.io/library/alpine:latest",
        "name": "api-test",
        "command": ["sleep", "3600"]
    }' \
    http://localhost/v5.0.0/libpod/containers/create | jq '.'

# Start the container
curl -s --unix-socket "$PODMAN_SOCK" \
    -X POST \
    http://localhost/v5.0.0/libpod/containers/api-test/start

# Check the container status
curl -s --unix-socket "$PODMAN_SOCK" \
    http://localhost/v5.0.0/libpod/containers/api-test/json | jq '.State.Status'
```

## Managing Images

Pull, list, and remove images through the API.

```bash
PODMAN_SOCK="/run/user/$(id -u)/podman/podman.sock"

# Pull an image
curl -s --unix-socket "$PODMAN_SOCK" \
    -X POST \
    "http://localhost/v5.0.0/libpod/images/pull?reference=docker.io/library/nginx:alpine" | \
    jq '.'

# List all images
curl -s --unix-socket "$PODMAN_SOCK" \
    http://localhost/v5.0.0/libpod/images/json | \
    jq '.[] | {names: .Names, size: .Size, id: .Id[:12]}'

# Inspect a specific image
curl -s --unix-socket "$PODMAN_SOCK" \
    http://localhost/v5.0.0/libpod/images/alpine:latest/json | jq '.Size'

# Remove an image
curl -s --unix-socket "$PODMAN_SOCK" \
    -X DELETE \
    http://localhost/v5.0.0/libpod/images/alpine:latest | jq '.'
```

## Container Operations

Stop, restart, and remove containers via the API.

```bash
PODMAN_SOCK="/run/user/$(id -u)/podman/podman.sock"

# Stop a container
curl -s --unix-socket "$PODMAN_SOCK" \
    -X POST \
    http://localhost/v5.0.0/libpod/containers/api-test/stop

# Restart a container
curl -s --unix-socket "$PODMAN_SOCK" \
    -X POST \
    http://localhost/v5.0.0/libpod/containers/api-test/restart

# Get container logs
curl -s --unix-socket "$PODMAN_SOCK" \
    "http://localhost/v5.0.0/libpod/containers/api-test/logs?stdout=true&tail=50"

# Remove a container (force removal)
curl -s -o /dev/null -w "%{http_code}\n" --unix-socket "$PODMAN_SOCK" \
    -X DELETE \
    "http://localhost/v5.0.0/libpod/containers/api-test?force=true"
```

## System Information

Retrieve system-level information through the API.

```bash
PODMAN_SOCK="/run/user/$(id -u)/podman/podman.sock"

# Get system info
curl -s --unix-socket "$PODMAN_SOCK" \
    http://localhost/v5.0.0/libpod/info | \
    jq '{hostname: .host.hostname, os: .host.os, cpus: .host.cpus}'

# Get version information
curl -s --unix-socket "$PODMAN_SOCK" \
    http://localhost/v5.0.0/libpod/version | jq '.'

# Get disk usage
curl -s --unix-socket "$PODMAN_SOCK" \
    http://localhost/v5.0.0/libpod/system/df | jq '.'

# Prune unused resources via API
curl -s --unix-socket "$PODMAN_SOCK" \
    -X POST \
    http://localhost/v5.0.0/libpod/system/prune | jq '.'
```

## Volume Management

Create and manage volumes through the API.

```bash
PODMAN_SOCK="/run/user/$(id -u)/podman/podman.sock"

# Create a volume
curl -s --unix-socket "$PODMAN_SOCK" \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"Name": "api-volume"}' \
    http://localhost/v5.0.0/libpod/volumes/create | jq '.'

# List all volumes
curl -s --unix-socket "$PODMAN_SOCK" \
    http://localhost/v5.0.0/libpod/volumes/json | jq '.[].Name'

# Inspect a volume
curl -s --unix-socket "$PODMAN_SOCK" \
    http://localhost/v5.0.0/libpod/volumes/api-volume/json | jq '.'

# Remove a volume
curl -s -o /dev/null -w "%{http_code}\n" --unix-socket "$PODMAN_SOCK" \
    -X DELETE \
    http://localhost/v5.0.0/libpod/volumes/api-volume
```

## Building a Simple API Client Script

Wrap common API calls in a reusable script.

```bash
#!/bin/bash
# podman-api.sh - Simple Podman REST API client

PODMAN_SOCK="/run/user/$(id -u)/podman/podman.sock"
API_HOST="http://localhost"
API_BASE="${API_HOST}/v5.0.0/libpod"

api_get() {
    curl -s --unix-socket "$PODMAN_SOCK" "${API_BASE}${1}" | jq '.'
}

api_post() {
    curl -s --unix-socket "$PODMAN_SOCK" -X POST "${API_BASE}${1}"
}

case "${1}" in
    ping)    curl -s --unix-socket "$PODMAN_SOCK" "${API_HOST}/libpod/_ping" ;;
    info)    api_get "/info" ;;
    ps)      api_get "/containers/json?all=true" ;;
    images)  api_get "/images/json" ;;
    df)      api_get "/system/df" ;;
    *)       echo "Usage: $0 {ping|info|ps|images|df}" ;;
esac
```

## Summary

The Podman REST API provides complete programmatic control over your container environment through standard HTTP requests. With both Docker-compatible and Podman-native endpoints available, you can integrate with virtually any tool or language. Start the socket service, use curl for quick API interactions, and build custom client scripts for automated container management workflows.
