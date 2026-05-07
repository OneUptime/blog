# How to Use the Podman REST API to Start and Stop Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, REST API, Container, DevOps, Container Lifecycle

Description: Learn how to start, stop, restart, pause, unpause, and remove containers using the Podman REST API with practical examples.

---

> Managing the full lifecycle of containers through the Podman REST API enables you to build robust automation that starts, stops, restarts, and cleans up containers without manual intervention.

After creating containers through the API, you need to manage their lifecycle: starting, stopping, restarting, pausing, and removing them. The Podman REST API provides dedicated endpoints for each lifecycle operation, along with options for graceful shutdowns, forced kills, and health checks. This guide covers every lifecycle operation with practical examples.

---

## Starting a Container

Start a previously created container by sending a POST request to the start endpoint.

```bash
# Start a container by name

curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  http://localhost/v4.0.0/libpod/containers/my-nginx/start

# Start a container by ID
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  http://localhost/v4.0.0/libpod/containers/abc123def456/start
```

A successful start returns HTTP 204 (No Content). If the container is already running, you receive HTTP 304 (Not Modified).

```bash
# Check the HTTP status code
curl -o /dev/null -s -w "%{http_code}" \
  --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  http://localhost/v4.0.0/libpod/containers/my-nginx/start
# 204 = started successfully
# 304 = already running
# 404 = container not found
```

## Stopping a Container

Stop a running container gracefully. By default, the API sends SIGTERM and waits for the container to exit before sending SIGKILL, unless the container was configured with a different stop signal.

```bash
# Stop a container with its configured stop timeout
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  http://localhost/v4.0.0/libpod/containers/my-nginx/stop

# Stop with a custom timeout (30 seconds before SIGKILL)
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  "http://localhost/v4.0.0/libpod/containers/my-nginx/stop?timeout=30"
```

The `timeout` parameter specifies how many seconds to wait after SIGTERM before sending SIGKILL. A timeout of `0` sends SIGKILL immediately.

```bash
# Force stop immediately (no grace period)
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  "http://localhost/v4.0.0/libpod/containers/my-nginx/stop?timeout=0"
```

## Restarting a Container

Restart combines stop and start in a single API call.

```bash
# Restart a container
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  http://localhost/v4.0.0/libpod/containers/my-nginx/restart

# Restart with a custom stop timeout
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  "http://localhost/v4.0.0/libpod/containers/my-nginx/restart?timeout=15"
```

## Killing a Container

Send a specific signal to a container process.

```bash
# Send SIGKILL (default)
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  http://localhost/v4.0.0/libpod/containers/my-nginx/kill

# Send SIGKILL explicitly
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  "http://localhost/v4.0.0/libpod/containers/my-nginx/kill?signal=SIGKILL"

# Send SIGHUP (useful for reloading configuration)
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  "http://localhost/v4.0.0/libpod/containers/my-nginx/kill?signal=SIGHUP"
```

## Pausing and Unpausing Containers

Pausing freezes all processes in a container without stopping it. This uses the cgroup freezer.

```bash
# Pause a running container
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  http://localhost/v4.0.0/libpod/containers/my-nginx/pause

# Verify the container is paused
curl -s --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  http://localhost/v4.0.0/libpod/containers/my-nginx/json | \
  python3 -c "import sys,json; print(json.load(sys.stdin)['State']['Status'])"
# Output: paused

# Unpause the container
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  http://localhost/v4.0.0/libpod/containers/my-nginx/unpause
```

## Waiting for a Container to Exit

By default, the wait endpoint blocks until a container stops and returns the exit code.

```bash
# Wait for a container to finish
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  "http://localhost/v4.0.0/libpod/containers/my-task/wait"

# Wait with a specific condition
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  "http://localhost/v4.0.0/libpod/containers/my-task/wait?condition=stopped"
```

For conditions other than `stopped` and `exited`, the API returns `-1` when the condition is met. Valid conditions include `created`, `initialized`, `running`, `paused`, `stopped`, `exited`, `removing`, and `stopping`.

## Removing a Container

Delete a container after stopping it.

```bash
# Remove a stopped container
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X DELETE \
  http://localhost/v4.0.0/libpod/containers/my-nginx

# Force remove a running container (stops it first)
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X DELETE \
  "http://localhost/v4.0.0/libpod/containers/my-nginx?force=true"

# Remove a container and its associated volumes
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X DELETE \
  "http://localhost/v4.0.0/libpod/containers/my-nginx?force=true&volumes=true"
```

## Pruning Stopped Containers

Remove all stopped containers in one call.

```bash
# Prune all stopped containers
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  http://localhost/v4.0.0/libpod/containers/prune

# Prune with a label filter (only remove containers with specific labels)
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  "http://localhost/v4.0.0/libpod/containers/prune?filters=%7B%22label%22%3A%5B%22env%3Ddev%22%5D%7D"
```

## Checking Container Health

If a container has a health check defined, query its status through the API.

```bash
# Get the health check status
curl -s --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  http://localhost/v4.0.0/libpod/containers/my-nginx/json | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
health = data.get('State', {}).get('Health', {})
print(f\"Status: {health.get('Status', 'none')}\")
print(f\"Failing Streak: {health.get('FailingStreak', 0)}\")
"

# Run a health check manually
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X GET \
  http://localhost/v4.0.0/libpod/containers/my-nginx/healthcheck
```

## Docker-Compatible Lifecycle Endpoints

All lifecycle operations are also available through Docker-compatible endpoints.

```bash
# Start using Docker-compatible endpoint
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  http://localhost/v1.40/containers/my-nginx/start

# Stop
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  "http://localhost/v1.40/containers/my-nginx/stop?t=10"

# Restart
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  http://localhost/v1.40/containers/my-nginx/restart

# Remove
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X DELETE \
  "http://localhost/v1.40/containers/my-nginx?force=true"
```

## Managing Container Lifecycle with Python

A complete Python example for lifecycle management.

```python
import json
import os
import socket
import http.client
import time

class PodmanLifecycle:
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
        body_text = resp.read().decode()
        conn.close()
        return status, body_text

    def create(self, config):
        status, body = self._request('POST',
            f'{self.base}/containers/create', config)
        return json.loads(body) if body else {}

    def start(self, name):
        status, _ = self._request('POST',
            f'{self.base}/containers/{name}/start')
        return status == 204

    def stop(self, name, timeout=10):
        status, _ = self._request('POST',
            f'{self.base}/containers/{name}/stop?timeout={timeout}')
        return status == 204

    def restart(self, name):
        status, _ = self._request('POST',
            f'{self.base}/containers/{name}/restart')
        return status == 204

    def remove(self, name, force=False):
        status, _ = self._request('DELETE',
            f'{self.base}/containers/{name}?force={str(force).lower()}')
        return status == 200

    def status(self, name):
        status, body = self._request('GET',
            f'{self.base}/containers/{name}/json')
        if status == 200:
            data = json.loads(body)
            return data['State']['Status']
        return 'not found'


pm = PodmanLifecycle()

# Create a container
result = pm.create({
    "image": "docker.io/library/nginx:latest",
    "name": "lifecycle-demo"
})
print(f"Created: {result.get('Id', '')[:12]}")

# Start it
pm.start("lifecycle-demo")
print(f"Status: {pm.status('lifecycle-demo')}")

# Stop it
pm.stop("lifecycle-demo", timeout=5)
print(f"Status: {pm.status('lifecycle-demo')}")

# Clean up
pm.remove("lifecycle-demo")
print("Removed successfully")
```

## Conclusion

The Podman REST API provides endpoints for every container lifecycle operation. Starting and stopping containers is straightforward with configurable timeouts for graceful shutdowns. Pausing lets you temporarily freeze workloads without termination, while the wait endpoint is useful for orchestrating sequential tasks. The kill endpoint gives you control over which signal to send, and the prune endpoint simplifies cleanup. Whether you use the Podman-native or Docker-compatible endpoints, you have full control over the container lifecycle through simple HTTP requests.
