# How to Use Docker API Directly with curl

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, API, curl, REST API, Docker Engine, automation, HTTP

Description: Access the Docker Engine API directly with curl to manage containers, images, and networks without the Docker CLI or any SDK.

---

Every `docker` CLI command you run translates to an HTTP request against the Docker Engine API. The CLI is convenient, but sometimes you need to hit the API directly. Maybe you are building a lightweight monitoring tool, working in an environment without the Docker CLI installed, debugging Docker behavior, or integrating Docker into a system that only speaks HTTP.

curl gives you raw access to the Docker Engine API. This guide shows you how to use it effectively for common Docker operations.

## Connecting to the Docker API

The Docker daemon listens on a Unix socket by default. curl can connect to Unix sockets with the `--unix-socket` flag.

```bash
# Test the connection by requesting the Docker version
curl --unix-socket /var/run/docker.sock http://localhost/version | jq .
```

If Docker is configured to listen on a TCP port:

```bash
# Connect to a remote Docker daemon over TCP
curl http://192.168.1.100:2375/version | jq .

# With TLS authentication
curl --cert /path/to/cert.pem \
     --key /path/to/key.pem \
     --cacert /path/to/ca.pem \
     https://192.168.1.100:2376/version | jq .
```

For convenience, create a shell alias:

```bash
# Add this to your .bashrc or .zshrc
# Shorthand for making Docker API requests via the Unix socket
alias dapi='curl -s --unix-socket /var/run/docker.sock'

# Now you can use it like this:
dapi http://localhost/version | jq .
```

## Listing Containers

```bash
# List all running containers
curl -s --unix-socket /var/run/docker.sock \
  "http://localhost/v1.44/containers/json" | jq .

# List all containers including stopped ones
curl -s --unix-socket /var/run/docker.sock \
  "http://localhost/v1.44/containers/json?all=true" | jq .

# Filter containers by label
curl -s --unix-socket /var/run/docker.sock \
  'http://localhost/v1.44/containers/json?filters={"label":["app=web"]}' | jq .

# Get a compact listing with specific fields
curl -s --unix-socket /var/run/docker.sock \
  "http://localhost/v1.44/containers/json" | \
  jq '.[] | {name: .Names[0], image: .Image, state: .State, status: .Status}'
```

## Creating and Starting Containers

Container creation requires a POST request with a JSON body describing the container configuration.

```bash
# Create a new container from the nginx image
curl -s --unix-socket /var/run/docker.sock \
  -X POST \
  -H "Content-Type: application/json" \
  "http://localhost/v1.44/containers/create?name=my_web_server" \
  -d '{
    "Image": "nginx:alpine",
    "Env": ["NGINX_HOST=localhost"],
    "ExposedPorts": {"80/tcp": {}},
    "HostConfig": {
      "PortBindings": {
        "80/tcp": [{"HostPort": "8080"}]
      },
      "Memory": 268435456,
      "NanoCpus": 500000000
    },
    "Labels": {
      "app": "web",
      "team": "platform"
    }
  }' | jq .
```

The response includes the container ID. Use it to start the container:

```bash
# Start the container (replace CONTAINER_ID with the actual ID)
curl -s --unix-socket /var/run/docker.sock \
  -X POST \
  "http://localhost/v1.44/containers/CONTAINER_ID/start"
```

## Inspecting Containers

```bash
# Get full container details
curl -s --unix-socket /var/run/docker.sock \
  "http://localhost/v1.44/containers/my_web_server/json" | jq .

# Extract specific information from the inspection output
curl -s --unix-socket /var/run/docker.sock \
  "http://localhost/v1.44/containers/my_web_server/json" | \
  jq '{
    status: .State.Status,
    ip: .NetworkSettings.IPAddress,
    started: .State.StartedAt,
    image: .Config.Image,
    ports: .NetworkSettings.Ports
  }'
```

## Getting Container Logs

```bash
# Fetch the last 50 lines of container logs
curl -s --unix-socket /var/run/docker.sock \
  "http://localhost/v1.44/containers/my_web_server/logs?stdout=true&stderr=true&tail=50"

# Follow logs in real time (streaming response)
curl -s --unix-socket /var/run/docker.sock -N \
  "http://localhost/v1.44/containers/my_web_server/logs?stdout=true&stderr=true&follow=true"

# Get logs since a specific timestamp
curl -s --unix-socket /var/run/docker.sock \
  "http://localhost/v1.44/containers/my_web_server/logs?stdout=true&since=1707350400"
```

Note that Docker log output includes a header byte for each line that indicates the stream (stdout or stderr). Use `--output -` and pipe through `sed` to clean it up if needed.

## Container Resource Stats

```bash
# Get a single snapshot of container resource usage
curl -s --unix-socket /var/run/docker.sock \
  "http://localhost/v1.44/containers/my_web_server/stats?stream=false" | \
  jq '{
    cpu_usage: .cpu_stats.cpu_usage.total_usage,
    system_cpu: .cpu_stats.system_cpu_usage,
    memory_usage_mb: (.memory_stats.usage / 1024 / 1024),
    memory_limit_mb: (.memory_stats.limit / 1024 / 1024),
    memory_percent: (.memory_stats.usage / .memory_stats.limit * 100),
    network_rx_bytes: .networks.eth0.rx_bytes,
    network_tx_bytes: .networks.eth0.tx_bytes
  }'
```

## Managing Images

```bash
# List all local images
curl -s --unix-socket /var/run/docker.sock \
  "http://localhost/v1.44/images/json" | \
  jq '.[] | {tags: .RepoTags, size_mb: (.Size / 1024 / 1024 | round), created: .Created}'

# Pull an image from Docker Hub
curl -s --unix-socket /var/run/docker.sock \
  -X POST \
  "http://localhost/v1.44/images/create?fromImage=alpine&tag=latest"

# Delete an image
curl -s --unix-socket /var/run/docker.sock \
  -X DELETE \
  "http://localhost/v1.44/images/alpine:latest" | jq .

# Search Docker Hub
curl -s --unix-socket /var/run/docker.sock \
  "http://localhost/v1.44/images/search?term=nginx&limit=5" | jq .
```

## Executing Commands in Containers

Running a command inside a container is a two-step process: create an exec instance, then start it.

```bash
# Step 1: Create an exec instance
EXEC_ID=$(curl -s --unix-socket /var/run/docker.sock \
  -X POST \
  -H "Content-Type: application/json" \
  "http://localhost/v1.44/containers/my_web_server/exec" \
  -d '{
    "AttachStdout": true,
    "AttachStderr": true,
    "Cmd": ["nginx", "-v"]
  }' | jq -r '.Id')

echo "Exec ID: $EXEC_ID"

# Step 2: Start the exec instance and capture output
curl -s --unix-socket /var/run/docker.sock \
  -X POST \
  -H "Content-Type: application/json" \
  "http://localhost/v1.44/exec/$EXEC_ID/start" \
  -d '{"Detach": false, "Tty": false}'
```

## Container Lifecycle Operations

```bash
# Stop a container with a 10-second timeout
curl -s --unix-socket /var/run/docker.sock \
  -X POST \
  "http://localhost/v1.44/containers/my_web_server/stop?t=10"

# Restart a container
curl -s --unix-socket /var/run/docker.sock \
  -X POST \
  "http://localhost/v1.44/containers/my_web_server/restart?t=10"

# Pause a container (freezes all processes)
curl -s --unix-socket /var/run/docker.sock \
  -X POST \
  "http://localhost/v1.44/containers/my_web_server/pause"

# Unpause a container
curl -s --unix-socket /var/run/docker.sock \
  -X POST \
  "http://localhost/v1.44/containers/my_web_server/unpause"

# Kill a container with a specific signal
curl -s --unix-socket /var/run/docker.sock \
  -X POST \
  "http://localhost/v1.44/containers/my_web_server/kill?signal=SIGTERM"

# Remove a stopped container
curl -s --unix-socket /var/run/docker.sock \
  -X DELETE \
  "http://localhost/v1.44/containers/my_web_server?force=true&v=true"
```

## Network Operations

```bash
# List all Docker networks
curl -s --unix-socket /var/run/docker.sock \
  "http://localhost/v1.44/networks" | jq '.[] | {name: .Name, driver: .Driver, id: .Id[:12]}'

# Create a new network
curl -s --unix-socket /var/run/docker.sock \
  -X POST \
  -H "Content-Type: application/json" \
  "http://localhost/v1.44/networks/create" \
  -d '{
    "Name": "my_app_network",
    "Driver": "bridge",
    "Labels": {"app": "myapp"}
  }' | jq .

# Connect a container to a network
curl -s --unix-socket /var/run/docker.sock \
  -X POST \
  -H "Content-Type: application/json" \
  "http://localhost/v1.44/networks/my_app_network/connect" \
  -d '{"Container": "my_web_server"}'
```

## System Operations

```bash
# Get Docker system information
curl -s --unix-socket /var/run/docker.sock \
  "http://localhost/v1.44/info" | jq '{
    server_version: .ServerVersion,
    containers: .Containers,
    running: .ContainersRunning,
    images: .Images,
    driver: .Driver,
    memory: (.MemTotal / 1024 / 1024 / 1024 | round | tostring + " GB")
  }'

# Get disk usage
curl -s --unix-socket /var/run/docker.sock \
  "http://localhost/v1.44/system/df" | jq .

# Prune unused resources
curl -s --unix-socket /var/run/docker.sock \
  -X POST \
  "http://localhost/v1.44/containers/prune" | jq .

curl -s --unix-socket /var/run/docker.sock \
  -X POST \
  "http://localhost/v1.44/images/prune?filters={\"dangling\":[\"true\"]}" | jq .
```

## Listening to Docker Events

```bash
# Stream Docker events in real time
curl -s --unix-socket /var/run/docker.sock -N \
  "http://localhost/v1.44/events" | while read event; do
    echo "$event" | jq -r '"\(.time) \(.Action) \(.Actor.Attributes.name // .Actor.ID[:12])"'
done

# Filter events by type
curl -s --unix-socket /var/run/docker.sock -N \
  'http://localhost/v1.44/events?filters={"type":["container"],"event":["start","stop","die"]}' | \
  while read event; do
    echo "$event" | jq .
  done
```

## Building a Simple Monitoring Script with curl

```bash
#!/bin/bash
# api-monitor.sh
# Lightweight container monitoring using only curl and the Docker API

SOCKET="/var/run/docker.sock"
API="http://localhost/v1.44"

while true; do
    clear
    echo "=== Docker Monitor ($(date)) ==="

    # Get container list and stats using the API directly
    CONTAINERS=$(curl -s --unix-socket "$SOCKET" "$API/containers/json")

    echo "$CONTAINERS" | jq -r '.[] | .Names[0][1:]' | while read NAME; do
        STATS=$(curl -s --unix-socket "$SOCKET" "$API/containers/$NAME/stats?stream=false")

        MEM_USAGE=$(echo "$STATS" | jq '.memory_stats.usage // 0')
        MEM_MB=$((MEM_USAGE / 1024 / 1024))

        printf "%-30s %6d MB\n" "$NAME" "$MEM_MB"
    done

    sleep 5
done
```

## Summary

The Docker Engine API gives you full control over Docker through standard HTTP requests. curl provides the simplest way to interact with this API, making it useful for quick debugging, lightweight scripts, and environments where installing SDKs is not practical. Every Docker CLI command maps to an API endpoint, so anything you can do with `docker` commands, you can do with curl. The API documentation at the Docker docs site lists every endpoint, parameter, and response format you might need.
