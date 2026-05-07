# How to Use the Podman REST API with curl

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, REST API, curl, Container, CLI

Description: A comprehensive guide to interacting with the Podman REST API using curl, covering container lifecycle management, image operations, and network management with practical examples.

---

> curl is the most universal HTTP client available on virtually every Unix system. Combined with the Podman REST API, it gives you a lightweight, scriptable way to manage containers without installing any Podman client libraries or SDKs.

When you need to interact with the Podman API from shell scripts, CI/CD pipelines, or minimal environments where you cannot install Podman CLI, curl is the go-to tool. It supports Unix sockets natively, handles streaming responses, and is available on nearly every Linux distribution by default.

This guide provides a complete reference for using curl with the Podman REST API, covering all major operations from container management to image handling.

Before running the examples, make sure the Podman API service is available. For a rootless service, start `podman.socket` with `systemctl --user start podman.socket`; for a rootful service, use `sudo systemctl start podman.socket`.

---

## Basic curl Syntax for Podman

All Podman API requests through a Unix socket follow this pattern:

```bash
curl --unix-socket /run/podman/podman.sock http://localhost/v4.0.0/libpod/{endpoint}
```

These examples use the default rootful socket path. For rootless Podman, replace `/run/podman/podman.sock` with `$XDG_RUNTIME_DIR/podman/podman.sock`.

Key curl flags you will use frequently:

- `--unix-socket` : Connect through the Unix socket.
- `-s` : Silent mode, suppresses progress output.
- `-X` : Specify the HTTP method (POST, PUT, DELETE).
- `-H` : Set request headers.
- `-d` : Send request body data.
- `-w` : Custom output format (useful for HTTP status codes).
- `-o` : Write output to a file.
- `--no-buffer` : Disable buffering for streaming responses.

## Checking API Connectivity

Start by verifying the API is accessible:

```bash
# Check Podman version

curl -s --unix-socket /run/podman/podman.sock \
  http://localhost/v4.0.0/libpod/version | jq .

# Get system info
curl -s --unix-socket /run/podman/podman.sock \
  http://localhost/v4.0.0/libpod/info | jq '{hostname: .host.hostname, os: .host.os, containers: .store.containerStore.number}'
```

## Container Operations

### List Containers

```bash
# List running containers
curl -s --unix-socket /run/podman/podman.sock \
  "http://localhost/v4.0.0/libpod/containers/json" | jq '.[] | {id: .Id[:12], name: .Names[0], state: .State, image: .Image}'

# List all containers including stopped
curl -s --unix-socket /run/podman/podman.sock \
  "http://localhost/v4.0.0/libpod/containers/json?all=true" | jq '.[] | {name: .Names[0], state: .State}'
```

### Create a Container

Pull the image first if it is not already present locally.

```bash
curl -s --unix-socket /run/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "image": "docker.io/library/nginx:latest",
    "name": "my-nginx",
    "portmappings": [
      {
        "container_port": 80,
        "host_port": 8080,
        "protocol": "tcp"
      }
    ],
    "env": {
      "NGINX_HOST": "localhost"
    }
  }' \
  "http://localhost/v4.0.0/libpod/containers/create" | jq .
```

### Start a Container

```bash
curl -s --unix-socket /run/podman/podman.sock \
  -X POST \
  "http://localhost/v4.0.0/libpod/containers/my-nginx/start"
```

### Stop a Container

```bash
# Graceful stop with a timeout
curl -s --unix-socket /run/podman/podman.sock \
  -X POST \
  "http://localhost/v4.0.0/libpod/containers/my-nginx/stop?timeout=10"
```

### Restart a Container

```bash
curl -s --unix-socket /run/podman/podman.sock \
  -X POST \
  "http://localhost/v4.0.0/libpod/containers/my-nginx/restart"
```

### Remove a Container

```bash
# Remove a stopped container
curl -s --unix-socket /run/podman/podman.sock \
  -X DELETE \
  "http://localhost/v4.0.0/libpod/containers/my-nginx"

# Force remove a running container
curl -s --unix-socket /run/podman/podman.sock \
  -X DELETE \
  "http://localhost/v4.0.0/libpod/containers/my-nginx?force=true"
```

### Inspect a Container

```bash
curl -s --unix-socket /run/podman/podman.sock \
  "http://localhost/v4.0.0/libpod/containers/my-nginx/json" | jq '{
    name: .Name,
    state: .State.Status,
    ip: .NetworkSettings.IPAddress,
    ports: .NetworkSettings.Ports,
    created: .Created
  }'
```

## Image Operations

### List Images

```bash
curl -s --unix-socket /run/podman/podman.sock \
  "http://localhost/v4.0.0/libpod/images/json" | jq '.[] | {id: .Id[:12], names: .Names, size_mb: (.Size / 1048576 | floor)}'
```

### Pull an Image

```bash
curl -s --unix-socket /run/podman/podman.sock \
  -X POST \
  "http://localhost/v4.0.0/libpod/images/pull?reference=docker.io/library/alpine:latest"
```

### Remove an Image

```bash
curl -s --unix-socket /run/podman/podman.sock \
  -X DELETE \
  "http://localhost/v4.0.0/libpod/images/docker.io/library/alpine:latest"
```

### Search for Images

```bash
curl -s --unix-socket /run/podman/podman.sock \
  "http://localhost/v4.0.0/libpod/images/search?term=nginx&limit=5" | jq '.[] | {name: .Name, description: .Description, stars: .Stars}'
```

## Network Operations

### List Networks

```bash
curl -s --unix-socket /run/podman/podman.sock \
  "http://localhost/v4.0.0/libpod/networks/json" | jq '.[] | {name: .name, driver: .driver}'
```

### Create a Network

```bash
curl -s --unix-socket /run/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-network",
    "driver": "bridge",
    "subnets": [
      {
        "subnet": "172.20.0.0/16",
        "gateway": "172.20.0.1"
      }
    ]
  }' \
  "http://localhost/v4.0.0/libpod/networks/create" | jq .
```

### Remove a Network

```bash
curl -s --unix-socket /run/podman/podman.sock \
  -X DELETE \
  "http://localhost/v4.0.0/libpod/networks/my-network"
```

## Volume Operations

### List Volumes

```bash
curl -s --unix-socket /run/podman/podman.sock \
  "http://localhost/v4.0.0/libpod/volumes/json" | jq '.[] | {name: .Name, mountpoint: .Mountpoint}'
```

### Create a Volume

```bash
curl -s --unix-socket /run/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"Name": "my-data"}' \
  "http://localhost/v4.0.0/libpod/volumes/create" | jq .
```

## Working with HTTP Status Codes

Always check the HTTP status code to handle errors properly:

```bash
response=$(curl -s -w "\n%{http_code}" --unix-socket /run/podman/podman.sock \
  "http://localhost/v4.0.0/libpod/containers/my-container/json")

http_code=$(echo "$response" | tail -1)
body=$(echo "$response" | sed '$d')

case $http_code in
  200) echo "$body" | jq . ;;
  404) echo "Container not found" ;;
  500) echo "Server error: $(echo "$body" | jq -r '.message // .cause')" ;;
  *)   echo "Unexpected response: $http_code" ;;
esac
```

## Complete Lifecycle Script

Here is a script that demonstrates the complete container lifecycle using curl:

```bash
#!/bin/bash

SOCKET="${XDG_RUNTIME_DIR}/podman/podman.sock"
[ -S "$SOCKET" ] || SOCKET="/run/podman/podman.sock"
API="http://localhost/v4.0.0/libpod"
CONTAINER_NAME="curl-demo"
IMAGE="docker.io/library/nginx:alpine"

api_call() {
  local method="$1" endpoint="$2" data="$3"
  if [ -n "$data" ]; then
    curl -s --unix-socket "$SOCKET" -X "$method" \
      -H "Content-Type: application/json" -d "$data" "$API$endpoint"
  else
    curl -s --unix-socket "$SOCKET" -X "$method" "$API$endpoint"
  fi
}

echo "1. Pulling image..."
api_call POST "/images/pull?reference=$IMAGE" | tail -1 | jq .

echo "2. Creating container..."
api_call POST "/containers/create" "{
  \"image\": \"$IMAGE\",
  \"name\": \"$CONTAINER_NAME\",
  \"portmappings\": [{\"container_port\": 80, \"host_port\": 9090}]
}" | jq .

echo "3. Starting container..."
api_call POST "/containers/$CONTAINER_NAME/start"
echo "Started"

echo "4. Checking container status..."
api_call GET "/containers/$CONTAINER_NAME/json" | jq '{state: .State.Status, pid: .State.Pid}'

sleep 2

echo "5. Fetching logs..."
api_call GET "/containers/$CONTAINER_NAME/logs?stdout=true&tail=5"

echo "6. Getting stats..."
api_call GET "/containers/stats?containers=$CONTAINER_NAME&stream=false" | jq '{cpu: .CPU, mem_mb: (.MemUsage / 1048576)}'

echo "7. Stopping container..."
api_call POST "/containers/$CONTAINER_NAME/stop?timeout=5"
echo "Stopped"

echo "8. Removing container..."
api_call DELETE "/containers/$CONTAINER_NAME" | jq .

echo "Done."
```

## Tips for Effective curl Usage

1. **Always use `-s` flag** in scripts to suppress progress bars.
2. **Pipe through `jq`** for readable JSON output and for extracting specific fields.
3. **Use `--no-buffer`** when streaming logs or stats to get real-time output.
4. **Set timeouts** with `--connect-timeout` and `--max-time` to prevent hanging scripts.
5. **Use `-w "%{http_code}"`** to capture HTTP status codes for error handling.
6. **Quote URLs** that contain query parameters to prevent shell interpretation of `&` characters.

## Conclusion

curl provides a direct, dependency-free way to interact with the Podman REST API. Many container management operations available through Podman can be performed through curl and the API, making it ideal for automation scripts, CI/CD pipelines, and environments where installing the full Podman toolchain is not practical. The examples in this guide cover the most common operations, and you can explore the full API specification for additional endpoints and parameters.
