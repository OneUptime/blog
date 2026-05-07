# How to Use the Podman REST API to Manage Volumes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, REST API, Volumes, DevOps, Container Storage

Description: Learn how to create, list, inspect, and remove Podman volumes using the REST API to manage persistent storage for your containers.

---

> Managing volumes through the Podman REST API gives you programmatic control over persistent storage, letting you automate data management across your container infrastructure.

Containers are ephemeral by nature. When a container is removed, all data written inside it is lost. Volumes solve this by providing persistent storage that survives container lifecycle events. The Podman REST API provides complete volume management capabilities, letting you create, list, inspect, and remove volumes through HTTP requests. This guide covers all volume operations with practical examples.

---

## Understanding Podman Volumes

Podman volumes are managed storage directories on the host that are mounted into containers. Unlike bind mounts, volumes are managed by Podman, so your container definitions do not need to reference a specific host path and the underlying storage location is handled by Podman.

Key characteristics of Podman volumes:

- Stored under the Podman storage directory (typically `~/.local/share/containers/storage/volumes/` for rootless users)
- Persist across container restarts and removals
- Can be shared between multiple containers
- Support labels for organization
- Can use different storage drivers

## Creating a Volume

Create a new volume by sending a POST request to the volumes endpoint.

```bash
# Create a simple named volume

curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "Name": "my-data"
  }' \
  http://localhost/v4.0.0/libpod/volumes/create
```

The response includes the volume name, mount point, creation timestamp, and other metadata.

```json
{
  "Name": "my-data",
  "Driver": "local",
  "Mountpoint": "/home/user/.local/share/containers/storage/volumes/my-data/_data",
  "CreatedAt": "2026-03-18T10:30:00Z",
  "Labels": {},
  "Scope": "local",
  "Options": {}
}
```

## Creating Volumes with Labels

Labels help you organize and filter volumes.

```bash
# Create a volume with labels
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "Name": "postgres-data",
    "Labels": {
      "app": "database",
      "env": "production",
      "service": "postgres"
    }
  }' \
  http://localhost/v4.0.0/libpod/volumes/create
```

## Creating Volumes with Options

Pass driver-specific options when creating volumes.

```bash
# Create a volume with custom options
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "Name": "custom-volume",
    "Driver": "local",
    "Options": {
      "type": "tmpfs",
      "device": "tmpfs",
      "o": "size=100m"
    }
  }' \
  http://localhost/v4.0.0/libpod/volumes/create
```

This creates a tmpfs-backed volume with a 100MB size limit, useful for temporary data that benefits from in-memory speed.

## Listing Volumes

Retrieve all volumes or filter them by criteria.

```bash
# List all volumes
curl -s --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  http://localhost/v4.0.0/libpod/volumes/json | python3 -m json.tool

# Format the output with jq
curl -s --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  http://localhost/v4.0.0/libpod/volumes/json | \
  jq '.[] | {name: .Name, mountpoint: .Mountpoint, labels: .Labels}'
```

## Filtering Volumes

Use the `filters` parameter to narrow down volume listings.

```bash
# Filter volumes by label
curl -s --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  "http://localhost/v4.0.0/libpod/volumes/json?filters={\"label\":[\"app=database\"]}"

# Filter by name pattern
curl -s --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  "http://localhost/v4.0.0/libpod/volumes/json?filters={\"name\":[\"postgres\"]}"

# Filter by driver
curl -s --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  "http://localhost/v4.0.0/libpod/volumes/json?filters={\"driver\":[\"local\"]}"

# Find dangling volumes (not used by any container)
curl -s --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  "http://localhost/v4.0.0/libpod/volumes/json?filters={\"dangling\":[\"true\"]}"
```

## Inspecting a Volume

Get detailed information about a specific volume.

```bash
# Inspect a volume by name
curl -s --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  http://localhost/v4.0.0/libpod/volumes/my-data/json | python3 -m json.tool

# Extract specific fields
curl -s --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  http://localhost/v4.0.0/libpod/volumes/my-data/json | \
  jq '{
    name: .Name,
    mount: .Mountpoint,
    created: .CreatedAt,
    driver: .Driver,
    labels: .Labels
  }'
```

## Checking if a Volume Exists

Use the exists endpoint for a quick check.

```bash
# Check if a volume exists
curl -o /dev/null -s -w "%{http_code}" \
  --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  http://localhost/v4.0.0/libpod/volumes/my-data/exists
# 204 = exists
# 404 = not found
```

## Using Volumes with Containers

Create a container that mounts a volume.

```bash
# First, create the volume
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"Name": "app-data"}' \
  http://localhost/v4.0.0/libpod/volumes/create

# Then create a container that uses the volume
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "image": "docker.io/library/postgres:16",
    "name": "db-server",
    "env": {
      "POSTGRES_PASSWORD": "secret"
    },
    "volumes": [
      {
        "name": "app-data",
        "dest": "/var/lib/postgresql/data"
      }
    ]
  }' \
  http://localhost/v4.0.0/libpod/containers/create

# Start the container
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  http://localhost/v4.0.0/libpod/containers/db-server/start
```

## Sharing Volumes Between Containers

Multiple containers can mount the same volume.

```bash
# Create a shared volume
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"Name": "shared-logs"}' \
  http://localhost/v4.0.0/libpod/volumes/create

# Container 1: writes logs
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "image": "docker.io/library/alpine:latest",
    "name": "log-writer",
    "command": ["sh", "-c", "while true; do date >> /logs/app.log; sleep 5; done"],
    "volumes": [{"name": "shared-logs", "dest": "/logs"}]
  }' \
  http://localhost/v4.0.0/libpod/containers/create

# Container 2: reads logs
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "image": "docker.io/library/alpine:latest",
    "name": "log-reader",
    "command": ["tail", "-f", "/logs/app.log"],
    "volumes": [{"name": "shared-logs", "dest": "/logs", "options": ["ro"]}]
  }' \
  http://localhost/v4.0.0/libpod/containers/create
```

## Removing a Volume

Delete a volume when it is no longer needed.

```bash
# Remove a volume (fails if in use by a container)
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X DELETE \
  http://localhost/v4.0.0/libpod/volumes/my-data

# Force remove a volume and any containers using it
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X DELETE \
  "http://localhost/v4.0.0/libpod/volumes/my-data?force=true"
```

## Pruning Unused Volumes

Remove unused volumes. By default, the libpod prune endpoint removes unused anonymous volumes. Use the `all` filter to include named volumes.

```bash
# Prune unused anonymous volumes (libpod default)
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  http://localhost/v4.0.0/libpod/volumes/prune

# Prune all unused volumes, including named volumes
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  "http://localhost/v4.0.0/libpod/volumes/prune?filters={\"all\":[\"true\"]}"

# Prune unused volumes with a label filter
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  "http://localhost/v4.0.0/libpod/volumes/prune?filters={\"label\":[\"env=dev\"]}"
```

## Managing Volumes with Python

A complete Python example for volume management.

```python
import json
import os
import socket
import http.client
from urllib.parse import quote

class PodmanVolumeClient:
    def __init__(self):
        self.socket_path = f"{os.environ['XDG_RUNTIME_DIR']}/podman/podman.sock"
        self.base = '/v4.0.0/libpod'

    def _request(self, method, path, body=None):
        conn = http.client.HTTPConnection('localhost')
        conn.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        conn.sock.connect(self.socket_path)
        headers = {'Content-Type': 'application/json'} if body else {}
        data = json.dumps(body).encode() if body else None
        conn.request(method, path, body=data, headers=headers)
        resp = conn.getresponse()
        status = resp.status
        result = resp.read().decode()
        conn.close()
        return status, json.loads(result) if result else {}

    def create(self, name, labels=None):
        body = {"Name": name}
        if labels:
            body["Labels"] = labels
        return self._request('POST', f'{self.base}/volumes/create', body)

    def list_volumes(self, filters=None):
        path = f'{self.base}/volumes/json'
        if filters:
            path += f'?filters={quote(json.dumps(filters), safe="")}'
        return self._request('GET', path)

    def inspect(self, name):
        return self._request('GET', f'{self.base}/volumes/{name}/json')

    def remove(self, name, force=False):
        return self._request('DELETE',
            f'{self.base}/volumes/{name}?force={str(force).lower()}')

    def prune(self, filters=None):
        path = f'{self.base}/volumes/prune'
        if filters:
            path += f'?filters={quote(json.dumps(filters), safe="")}'
        return self._request('POST', path)

    def exists(self, name):
        status, _ = self._request('GET', f'{self.base}/volumes/{name}/exists')
        return status == 204


client = PodmanVolumeClient()

# Create volumes for an application stack
for vol_name, labels in [
    ("app-db", {"service": "postgres", "env": "dev"}),
    ("app-cache", {"service": "redis", "env": "dev"}),
    ("app-uploads", {"service": "web", "env": "dev"}),
]:
    status, result = client.create(vol_name, labels)
    print(f"Created {vol_name}: {result.get('Name', 'error')}")

# List all volumes
status, volumes = client.list_volumes()
for vol in volumes:
    print(f"  {vol['Name']:20s} {vol.get('Mountpoint', 'N/A')}")

# Clean up unused dev volumes by label
status, pruned = client.prune({"label": ["env=dev"]})
print(f"Pruned volumes: {pruned}")
```

## Conclusion

The Podman REST API provides a complete set of endpoints for managing volumes throughout their lifecycle. You can create volumes with labels and custom driver options, list and filter them by various criteria, inspect their details, share them between containers, and clean up unused volumes with the prune endpoint. Volume management through the API integrates naturally with container creation, letting you build automated workflows that provision storage alongside the containers that use it. Whether you are managing a single development environment or orchestrating a multi-container application stack, the volume API gives you the programmatic control you need.
