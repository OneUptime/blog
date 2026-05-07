# How to Use the Podman REST API to Manage Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, REST API, Pod, DevOps, Container Orchestration

Description: Learn how to create, manage, and orchestrate Podman pods using the REST API to group containers that share network namespaces and resources.

---

> Pods in Podman group multiple containers that share a network namespace, making them ideal for tightly coupled services that need to communicate over localhost, much like Kubernetes pods.

Pods are a concept borrowed from Kubernetes. A Podman pod is a group of one or more containers that share a network namespace, meaning they can communicate over `localhost` and share the same IP address and port space. The Podman REST API provides endpoints for creating pods, adding containers to them, and managing the entire pod lifecycle. This guide covers pod management from creation through orchestration of multi-container application stacks.

---

## Understanding Podman Pods

By default, a pod in Podman consists of an infrastructure container (the "infra" container) and one or more application containers. The infra container holds the shared namespaces and, by default, stays running for the lifetime of the pod. All other containers in the pod share the network namespace of the infra container.

Key characteristics of pods:

- All containers in a pod share the same network namespace (same IP, same ports)
- Containers communicate with each other over `localhost`
- The pod lifecycle manages all containers together (start, stop, restart)
- Pods can be exported to Kubernetes YAML format
- By default, each pod has an infra container that maintains the shared namespaces

## Creating a Pod

Create a pod by sending a POST request to the pods endpoint.

```bash
# Create a simple pod

curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-app-pod"
  }' \
  http://localhost/v4.0.0/libpod/pods/create
```

The response includes the pod ID.

```json
{
  "Id": "abc123def456..."
}
```

## Creating a Pod with Port Mappings

Since all containers in a pod share the network, port mappings are defined at the pod level.

```bash
# Create a pod with published ports
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "name": "web-pod",
    "portmappings": [
      {
        "container_port": 80,
        "host_port": 8080,
        "protocol": "tcp"
      },
      {
        "container_port": 443,
        "host_port": 8443,
        "protocol": "tcp"
      }
    ]
  }' \
  http://localhost/v4.0.0/libpod/pods/create
```

## Creating a Pod with Labels and DNS

Configure the pod with labels, hostname, and DNS settings.

```bash
# Create a fully configured pod
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "name": "production-pod",
    "hostname": "app-server",
    "labels": {
      "app": "webapp",
      "env": "production",
      "team": "backend"
    },
    "dns_server": ["8.8.8.8", "8.8.4.4"],
    "dns_search": ["example.com"],
    "portmappings": [
      {
        "container_port": 3000,
        "host_port": 3000,
        "protocol": "tcp"
      },
      {
        "container_port": 5432,
        "host_port": 5432,
        "host_ip": "127.0.0.1",
        "protocol": "tcp"
      }
    ]
  }' \
  http://localhost/v4.0.0/libpod/pods/create
```

## Creating a Pod on a Specific Network

Attach the pod to a custom network.

```bash
# First create a network
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "name": "pod-network",
    "driver": "bridge",
    "dns_enabled": true,
    "subnets": [{"subnet": "10.90.0.0/24", "gateway": "10.90.0.1"}]
  }' \
  http://localhost/v4.0.0/libpod/networks/create

# Create a pod on that network
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "name": "networked-pod",
    "Networks": {
      "pod-network": {
        "static_ips": ["10.90.0.50"]
      }
    },
    "portmappings": [
      {"container_port": 80, "host_port": 8080, "protocol": "tcp"}
    ]
  }' \
  http://localhost/v4.0.0/libpod/pods/create
```

## Adding Containers to a Pod

Create containers inside a pod by specifying the `pod` field in the container creation request.

```bash
# Add a web server container to the pod
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "image": "docker.io/library/nginx:latest",
    "name": "web",
    "pod": "web-pod"
  }' \
  http://localhost/v4.0.0/libpod/containers/create

# Add an application container
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "image": "docker.io/library/node:20-alpine",
    "name": "app",
    "pod": "web-pod",
    "command": ["node", "server.js"],
    "mounts": [
      {
        "Target": "/app",
        "Source": "/home/user/myapp",
        "Type": "bind"
      }
    ]
  }' \
  http://localhost/v4.0.0/libpod/containers/create
```

Since containers in a pod share the network namespace, the nginx container can proxy to the Node.js app on `localhost:3000`.

## Building a Multi-Container Application Pod

Here is a complete example creating a pod with a web application, a database, and a cache.

```bash
# Step 1: Create the pod with all required ports
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "name": "fullstack-pod",
    "portmappings": [
      {"container_port": 3000, "host_port": 3000, "protocol": "tcp"}
    ]
  }' \
  http://localhost/v4.0.0/libpod/pods/create

# Step 2: Add PostgreSQL
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "image": "docker.io/library/postgres:16",
    "name": "fullstack-db",
    "pod": "fullstack-pod",
    "env": {
      "POSTGRES_USER": "app",
      "POSTGRES_PASSWORD": "secret",
      "POSTGRES_DB": "myapp"
    },
    "mounts": [
      {"Target": "/var/lib/postgresql/data", "Source": "pg-data", "Type": "volume"}
    ]
  }' \
  http://localhost/v4.0.0/libpod/containers/create

# Step 3: Add Redis
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "image": "docker.io/library/redis:7-alpine",
    "name": "fullstack-cache",
    "pod": "fullstack-pod"
  }' \
  http://localhost/v4.0.0/libpod/containers/create

# Step 4: Add the application
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "image": "docker.io/library/node:20-alpine",
    "name": "fullstack-app",
    "pod": "fullstack-pod",
    "env": {
      "DATABASE_URL": "postgresql://app:secret@localhost:5432/myapp",
      "REDIS_URL": "redis://localhost:6379",
      "PORT": "3000"
    },
    "command": ["node", "server.js"],
    "mounts": [
      {"Target": "/app", "Source": "/home/user/myapp", "Type": "bind"}
    ]
  }' \
  http://localhost/v4.0.0/libpod/containers/create

# Step 5: Start the entire pod
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  http://localhost/v4.0.0/libpod/pods/fullstack-pod/start
```

Notice how the application connects to PostgreSQL and Redis using `localhost` because all containers share the same network namespace.

## Listing Pods

Retrieve information about all pods.

```bash
# List all pods
curl -s --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  http://localhost/v4.0.0/libpod/pods/json | python3 -m json.tool

# Format with jq
curl -s --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  http://localhost/v4.0.0/libpod/pods/json | \
  jq '.[] | {
    name: .Name,
    id: .Id[:12],
    status: .Status,
    containers: (.Containers | length),
    created: .Created
  }'

# Filter by label
curl -s --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  --get \
  --data-urlencode 'filters={"label":["env=production"]}' \
  http://localhost/v4.0.0/libpod/pods/json
```

## Inspecting a Pod

Get detailed information about a specific pod.

```bash
# Inspect a pod
curl -s --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  http://localhost/v4.0.0/libpod/pods/web-pod/json | python3 -m json.tool

# List containers in the pod
curl -s --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  http://localhost/v4.0.0/libpod/pods/web-pod/json | \
  jq '.Containers[] | {name: .Name, id: .Id[:12], state: .State}'
```

## Pod Lifecycle Management

Manage the lifecycle of all containers in a pod with a single API call.

```bash
# Start all containers in a pod
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  http://localhost/v4.0.0/libpod/pods/web-pod/start

# Stop all containers in a pod
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  http://localhost/v4.0.0/libpod/pods/web-pod/stop

# Restart all containers
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  http://localhost/v4.0.0/libpod/pods/web-pod/restart

# Pause all containers
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  http://localhost/v4.0.0/libpod/pods/web-pod/pause

# Unpause all containers
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  http://localhost/v4.0.0/libpod/pods/web-pod/unpause

# Kill all containers in a pod
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  "http://localhost/v4.0.0/libpod/pods/web-pod/kill?signal=SIGTERM"
```

## Getting Pod Stats

Monitor resource usage across all containers in a pod.

```bash
# Get stats for all running pods
curl -s --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  "http://localhost/v4.0.0/libpod/pods/stats?all=true" | python3 -m json.tool
```

## Removing a Pod

Delete a pod and optionally its containers.

```bash
# Remove a stopped pod
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X DELETE \
  http://localhost/v4.0.0/libpod/pods/web-pod

# Force remove a running pod (stops and removes all containers)
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X DELETE \
  "http://localhost/v4.0.0/libpod/pods/web-pod?force=true"

# Prune stopped pods
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  http://localhost/v4.0.0/libpod/pods/prune
```

## Generating Kubernetes YAML from a Pod

Export a pod definition as Kubernetes-compatible YAML.

```bash
# Generate Kubernetes YAML from a pod
curl -s --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  "http://localhost/v4.0.0/libpod/generate/kube?names=fullstack-pod"

# Save the YAML to a file
curl -s --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  "http://localhost/v4.0.0/libpod/generate/kube?names=fullstack-pod" > pod.yaml
```

This makes it straightforward to prototype locally with Podman pods and then deploy to Kubernetes.

## Managing Pods with Python

A Python client for pod orchestration.

```python
import json
import os
import socket
import http.client

class PodmanPodClient:
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

    def create_pod(self, name, ports=None, labels=None):
        body = {"name": name}
        if ports:
            body["portmappings"] = ports
        if labels:
            body["labels"] = labels
        return self._request('POST', f'{self.base}/pods/create', body)

    def add_container(self, pod_name, image, name, env=None, command=None):
        body = {"image": image, "name": name, "pod": pod_name}
        if env:
            body["env"] = env
        if command:
            body["command"] = command
        return self._request('POST', f'{self.base}/containers/create', body)

    def start_pod(self, name):
        return self._request('POST', f'{self.base}/pods/{name}/start')

    def stop_pod(self, name):
        return self._request('POST', f'{self.base}/pods/{name}/stop')

    def list_pods(self):
        return self._request('GET', f'{self.base}/pods/json')

    def inspect_pod(self, name):
        return self._request('GET', f'{self.base}/pods/{name}/json')

    def remove_pod(self, name, force=False):
        return self._request('DELETE',
            f'{self.base}/pods/{name}?force={str(force).lower()}')


client = PodmanPodClient()

# Create a pod
status, result = client.create_pod(
    name="api-pod",
    ports=[{"container_port": 8080, "host_port": 8080, "protocol": "tcp"}],
    labels={"app": "api-service"}
)
print(f"Pod created: {result.get('Id', '')[:12]}")

# Add containers
client.add_container("api-pod", "docker.io/library/redis:7-alpine", "cache")
client.add_container(
    "api-pod",
    "docker.io/library/node:20-alpine",
    "api",
    env={"REDIS_URL": "redis://localhost:6379", "PORT": "8080"},
    command=["node", "index.js"]
)

# Start the pod
client.start_pod("api-pod")

# Check status
status, pods = client.list_pods()
for pod in pods:
    print(f"  {pod['Name']:20s} {pod['Status']:15s} containers: {len(pod['Containers'])}")
```

## Conclusion

Podman pods bring Kubernetes-style multi-container grouping to local development and single-host deployments. Through the REST API, you can create pods with shared networking, add containers that communicate over localhost, and manage the entire group with a single lifecycle command. The ability to generate Kubernetes YAML from running pods bridges the gap between local development and production deployment. Whether you are building microservice architectures, sidecar patterns, or multi-container application stacks, the pod API provides the orchestration primitives you need through clean HTTP endpoints.
