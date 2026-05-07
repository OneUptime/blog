# How to Use the Podman REST API to Create Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, REST API, Container, DevOps, Container Creation

Description: Learn how to create and configure containers using the Podman REST API with detailed examples covering port mapping, volumes, environment variables, and resource limits.

---

> Creating containers through the Podman REST API gives you fine-grained control over every configuration option, from resource limits to network settings, all through simple HTTP requests.

The Podman REST API lets you create containers programmatically with the same flexibility as the `podman run` command. You define the container configuration as a JSON payload and send it to the API endpoint. The image must already exist in local Podman storage; if it does not, pull it first with `podman pull` or the image pull API. This guide walks through container creation from basic setups to advanced configurations with port mappings, volumes, environment variables, and resource constraints.

---

## Basic Container Creation

To create a container, send a POST request to the container create endpoint with a JSON body specifying the image and any configuration options.

```bash
# Create a simple container from the nginx image

curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "image": "docker.io/library/nginx:latest",
    "name": "my-nginx"
  }' \
  http://localhost/v4.0.0/libpod/containers/create
```

The response returns the container ID and any warnings.

```json
{
  "Id": "abc123def456...",
  "Warnings": []
}
```

Note that creating a container does not start it. You need to make a separate API call to start the container.

```bash
# Start the container after creation
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  http://localhost/v4.0.0/libpod/containers/my-nginx/start
```

## Setting Environment Variables

Pass environment variables in the `env` field as a map of key-value pairs.

```bash
# Create a container with environment variables
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "image": "docker.io/library/postgres:16",
    "name": "my-postgres",
    "env": {
      "POSTGRES_USER": "admin",
      "POSTGRES_PASSWORD": "secretpassword",
      "POSTGRES_DB": "myapp"
    }
  }' \
  http://localhost/v4.0.0/libpod/containers/create
```

## Configuring Port Mappings

Map container ports to host ports using the `portmappings` field.

```bash
# Create a container with port mappings
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "image": "docker.io/library/nginx:latest",
    "name": "web-server",
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
  http://localhost/v4.0.0/libpod/containers/create
```

You can bind to a specific host IP address.

```bash
# Bind to localhost only
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "image": "docker.io/library/nginx:latest",
    "name": "local-web",
    "portmappings": [
      {
        "container_port": 80,
        "host_port": 8080,
        "host_ip": "127.0.0.1",
        "protocol": "tcp"
      }
    ]
  }' \
  http://localhost/v4.0.0/libpod/containers/create
```

## Mounting Volumes

Attach volumes and bind mounts using the `mounts` field.

```bash
# Create a container with a named volume
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "image": "docker.io/library/postgres:16",
    "name": "db-with-volume",
    "env": {
      "POSTGRES_PASSWORD": "secret"
    },
    "mounts": [
      {
        "target": "/var/lib/postgresql/data",
        "source": "pg-data",
        "type": "volume"
      }
    ]
  }' \
  http://localhost/v4.0.0/libpod/containers/create
```

For bind mounts from the host filesystem, use `type: "bind"`.

```bash
# Create a container with a bind mount
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "image": "docker.io/library/nginx:latest",
    "name": "web-with-content",
    "mounts": [
      {
        "target": "/usr/share/nginx/html",
        "source": "/home/user/website",
        "type": "bind",
        "readonly": true
      }
    ]
  }' \
  http://localhost/v4.0.0/libpod/containers/create
```

## Setting Resource Limits

Control CPU and memory allocation using the `resource_limits` field.

```bash
# Create a container with resource constraints
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "image": "docker.io/library/nginx:latest",
    "name": "limited-nginx",
    "resource_limits": {
      "memory": {
        "limit": 536870912,
        "reservation": 268435456
      },
      "cpu": {
        "shares": 512,
        "quota": 50000,
        "period": 100000
      }
    }
  }' \
  http://localhost/v4.0.0/libpod/containers/create
```

Memory values are in bytes. The example above sets a 512MB limit with a 256MB reservation. CPU quota of 50000 with a period of 100000 limits the container to 50% of one CPU core.

## Running a Custom Command

Override the default container command using the `command` field.

```bash
# Create a container with a custom command
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "image": "docker.io/library/alpine:latest",
    "name": "custom-command",
    "command": ["sh", "-c", "while true; do echo hello; sleep 5; done"]
  }' \
  http://localhost/v4.0.0/libpod/containers/create
```

## Setting the Working Directory and User

Specify the working directory and the user the container runs as.

```bash
# Create a container with custom working directory and user
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "image": "docker.io/library/node:20",
    "name": "node-app",
    "work_dir": "/app",
    "user": "node",
    "command": ["node", "server.js"],
    "mounts": [
      {
        "target": "/app",
        "source": "/home/user/my-node-app",
        "type": "bind"
      }
    ]
  }' \
  http://localhost/v4.0.0/libpod/containers/create
```

## Adding Labels

Labels help organize and filter containers.

```bash
# Create a container with labels
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "image": "docker.io/library/nginx:latest",
    "name": "labeled-web",
    "labels": {
      "app": "frontend",
      "env": "production",
      "team": "platform",
      "version": "2.1.0"
    }
  }' \
  http://localhost/v4.0.0/libpod/containers/create
```

## Configuring Restart Policies

Set automatic restart behavior for containers.

```bash
# Create a container with an on-failure restart policy
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "image": "docker.io/library/nginx:latest",
    "name": "restart-on-failure",
    "restart_policy": "on-failure",
    "restart_tries": 5
  }' \
  http://localhost/v4.0.0/libpod/containers/create
```

Valid restart policies are `no`, `always`, `on-failure`, and `unless-stopped`.

## Using the Docker-Compatible Endpoint

The Docker-compatible create endpoint uses a different JSON structure.

```bash
# Create a container using the Docker-compatible API
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "Image": "nginx:latest",
    "Env": ["NGINX_HOST=example.com"],
    "ExposedPorts": {
      "80/tcp": {}
    },
    "HostConfig": {
      "PortBindings": {
        "80/tcp": [{"HostPort": "8080"}]
      },
      "Memory": 536870912,
      "CpuShares": 512,
      "RestartPolicy": {
        "Name": "unless-stopped"
      }
    }
  }' \
  "http://localhost/v1.41/containers/create?name=docker-compat-web"
```

## Creating Containers with Python

A Python script that creates and starts a container.

```python
import json
import os
import socket
import http.client

def podman_request(method, path, body=None):
    conn = http.client.HTTPConnection('localhost')
    conn.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    sock_path = f"{os.environ['XDG_RUNTIME_DIR']}/podman/podman.sock"
    conn.sock.connect(sock_path)

    headers = {'Content-Type': 'application/json'} if body else {}
    data = json.dumps(body).encode() if body else None
    conn.request(method, path, body=data, headers=headers)

    response = conn.getresponse()
    raw = response.read()
    result = json.loads(raw.decode()) if raw else None
    conn.close()
    return response.status, result

# Define the container configuration
config = {
    "image": "docker.io/library/nginx:latest",
    "name": "api-created-web",
    "portmappings": [
        {"container_port": 80, "host_port": 9090, "protocol": "tcp"}
    ],
    "env": {
        "NGINX_HOST": "localhost"
    },
    "labels": {
        "created-by": "python-script",
        "purpose": "demo"
    }
}

# Create the container
status, result = podman_request(
    'POST', '/v4.0.0/libpod/containers/create', config
)
print(f"Create status: {status}")
print(f"Container ID: {result.get('Id', 'unknown')}")

# Start the container
status, result = podman_request(
    'POST', f'/v4.0.0/libpod/containers/api-created-web/start'
)
print(f"Start status: {status}")
```

## Conclusion

The Podman REST API provides complete control over container creation through a well-structured JSON interface. You can configure every aspect of a container including ports, volumes, environment variables, resource limits, restart policies, labels, and custom commands. The Podman-native endpoint offers a clean configuration format, while the Docker-compatible endpoint ensures compatibility with existing tools. By combining container creation with the start endpoint, you can build fully automated container deployment workflows driven entirely by API calls.
