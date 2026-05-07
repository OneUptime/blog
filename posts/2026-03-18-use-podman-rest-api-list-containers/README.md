# How to Use the Podman REST API to List Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, REST API, Container, DevOps, Container Management

Description: Learn how to use the Podman REST API to list, filter, and inspect containers with practical curl examples and code snippets.

---

> Listing containers through the Podman REST API lets you build monitoring dashboards, automation scripts, and management tools that interact with your container infrastructure programmatically.

Once you have the Podman REST API enabled, one of the most fundamental operations is listing containers. The API provides flexible filtering and detailed inspection capabilities for programmatic workflows. This guide covers all the ways to query container information through the API, from simple listings to advanced filtered queries.

---

## Basic Container Listing

The simplest API call lists all running containers.

```bash
# List all running containers using the Podman-native endpoint

curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  http://localhost/v4.0.0/libpod/containers/json

# List all running containers using the Docker-compatible endpoint
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  http://localhost/v1.40/containers/json
```

The response is a JSON array where each element represents a container with fields like `Id`, `Names`, `Image`, `State`, `Status`, and `Created`.

## Listing All Containers Including Stopped

By default, the API only returns running containers. Use the `all` parameter to include stopped containers.

```bash
# List all containers (running and stopped)
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  "http://localhost/v4.0.0/libpod/containers/json?all=true"

# Docker-compatible endpoint
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  "http://localhost/v1.40/containers/json?all=true"
```

## Limiting Results

Use the `limit` parameter to restrict the number of containers returned.

```bash
# List only the 5 most recently created containers
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  "http://localhost/v4.0.0/libpod/containers/json?all=true&limit=5"
```

## Filtering Containers

The `filters` parameter accepts a JSON object to narrow down results. Filters support multiple criteria.

```bash
# Filter by container status (running, exited, paused, etc.)
curl -G --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  --data-urlencode 'filters={"status":["running"]}' \
  http://localhost/v4.0.0/libpod/containers/json

# Filter by container name
curl -G --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  --data 'all=true' \
  --data-urlencode 'filters={"name":["web"]}' \
  http://localhost/v4.0.0/libpod/containers/json

# Filter by image name
curl -G --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  --data 'all=true' \
  --data-urlencode 'filters={"ancestor":["nginx"]}' \
  http://localhost/v4.0.0/libpod/containers/json

# Filter by label
curl -G --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  --data 'all=true' \
  --data-urlencode 'filters={"label":["app=web"]}' \
  http://localhost/v4.0.0/libpod/containers/json
```

You can combine multiple filters.

```bash
# Filter by status AND label
curl -G --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  --data-urlencode 'filters={"status":["running"],"label":["env=production"]}' \
  http://localhost/v4.0.0/libpod/containers/json
```

## Filtering by Network and Volume

Additional filter options let you find containers attached to specific networks or volumes.

```bash
# Filter by network name
curl -G --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  --data 'all=true' \
  --data-urlencode 'filters={"network":["my-network"]}' \
  http://localhost/v4.0.0/libpod/containers/json

# Filter by volume
curl -G --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  --data 'all=true' \
  --data-urlencode 'filters={"volume":["my-volume"]}' \
  http://localhost/v4.0.0/libpod/containers/json
```

## Inspecting a Single Container

To get detailed information about a specific container, use the inspect endpoint.

```bash
# Inspect a container by name
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  http://localhost/v4.0.0/libpod/containers/my-container/json

# Inspect a container by ID
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  http://localhost/v4.0.0/libpod/containers/abc123def456/json
```

The inspect response includes comprehensive details: configuration, state, network settings, mounts, resource limits, and more.

## Getting Container Logs

Retrieve logs from a specific container through the API.

```bash
# Get all logs from a container
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  "http://localhost/v4.0.0/libpod/containers/my-container/logs?stdout=true&stderr=true"

# Get only the last 50 lines
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  "http://localhost/v4.0.0/libpod/containers/my-container/logs?stdout=true&tail=50"

# Get logs since a Unix timestamp
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  "http://localhost/v4.0.0/libpod/containers/my-container/logs?stdout=true&since=1773792000"
```

## Getting Container Stats

The stats endpoint provides real-time resource usage information.

```bash
# Get current stats for a container (one-shot)
curl -G --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  --data-urlencode 'containers=my-container' \
  --data 'stream=false' \
  http://localhost/v4.0.0/libpod/containers/stats

# The response includes CPU, memory, network I/O, and block I/O stats
```

## Container Top (Process Listing)

List running processes inside a container.

```bash
# List processes in a container
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  "http://localhost/v4.0.0/libpod/containers/my-container/top"

# With custom ps arguments
curl -G --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  --data-urlencode 'ps_args=-eo pid,user,comm' \
  http://localhost/v4.0.0/libpod/containers/my-container/top
```

## Using Python to List Containers

Here is a complete Python script that lists and formats container information.

```python
import json
import socket
import http.client
import urllib.parse

class PodmanClient:
    def __init__(self, socket_path):
        self.socket_path = socket_path

    def _request(self, method, path):
        conn = http.client.HTTPConnection('localhost')
        conn.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        conn.sock.connect(self.socket_path)
        conn.request(method, path)
        response = conn.getresponse()
        data = json.loads(response.read().decode())
        conn.close()
        return data

    def list_containers(self, all_containers=False, filters=None):
        path = '/v4.0.0/libpod/containers/json'
        query = {}
        if all_containers:
            query['all'] = 'true'
        if filters:
            query['filters'] = json.dumps(filters, separators=(',', ':'))
        if query:
            path += '?' + urllib.parse.urlencode(query)
        return self._request('GET', path)

    def inspect_container(self, name_or_id):
        return self._request('GET',
            f'/v4.0.0/libpod/containers/{name_or_id}/json')


import os
socket_path = f"{os.environ['XDG_RUNTIME_DIR']}/podman/podman.sock"
client = PodmanClient(socket_path)

# List all containers
containers = client.list_containers(all_containers=True)
for c in containers:
    name = c.get('Names', ['unknown'])[0] if isinstance(c.get('Names'), list) else c.get('Names', 'unknown')
    state = c.get('State', 'unknown')
    image = c.get('Image', 'unknown')
    print(f"{name:30s} {state:10s} {image}")

# List only running containers with a specific label
filtered = client.list_containers(
    filters={"status": ["running"], "label": ["app=web"]}
)
print(f"\nRunning web containers: {len(filtered)}")
```

## Using the Docker SDK with Podman

The Python Docker SDK can work with Podman's Docker-compatible API for common container operations.

```python
import os
import docker

client = docker.DockerClient(
    base_url=f"unix://{os.environ['XDG_RUNTIME_DIR']}/podman/podman.sock"
)

# List all containers
for container in client.containers.list(all=True):
    print(f"{container.name:30s} {container.status:15s} {container.image.tags}")

# Filter containers
running = client.containers.list(filters={"status": "running"})
print(f"\nRunning containers: {len(running)}")

# Get detailed info
for container in running:
    stats = container.stats(stream=False)
    cpu = stats['cpu_stats']['cpu_usage']['total_usage']
    mem = stats['memory_stats'].get('usage', 0) / 1024 / 1024
    print(f"{container.name}: CPU={cpu}, Memory={mem:.1f}MB")
```

## Formatting Output with jq

Use `jq` to extract specific fields from the API response.

```bash
# List container names and states
curl -s --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  "http://localhost/v4.0.0/libpod/containers/json?all=true" | \
  jq '.[] | {name: .Names[0], state: .State, image: .Image}'

# Get just the container IDs
curl -s --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  "http://localhost/v4.0.0/libpod/containers/json?all=true" | \
  jq -r '.[].Id'

# Create a summary table
curl -s --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  "http://localhost/v4.0.0/libpod/containers/json?all=true" | \
  jq -r '.[] | [.Names[0], .State, .Image] | @tsv'
```

## Conclusion

The Podman REST API provides comprehensive endpoints for listing and inspecting containers. You can filter by status, name, image, labels, networks, and volumes to find exactly the containers you need. Combined with the inspect, logs, stats, and top endpoints, you have all the information necessary to build monitoring tools, dashboards, and automation scripts. The Docker-compatible endpoints also let many existing tools and SDKs work with minimal changes, giving you flexibility in how you integrate container management into your workflows.
