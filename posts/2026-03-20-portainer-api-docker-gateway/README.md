# How to Use the Portainer API as a Docker API Gateway - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, API, Docker, Gateway, Security

Description: Learn how to use Portainer as a secure gateway to the Docker Engine API, enabling controlled Docker API access with authentication and RBAC without exposing the Docker socket directly.

## Introduction

Exposing the Docker socket directly is a significant security risk, as anyone with socket access has root-equivalent control over the host. Portainer acts as a secure API gateway in front of Docker, proxying Docker API requests through its own authentication and authorization layer. This guide covers how to use this gateway pattern effectively.

## Prerequisites

- Portainer CE or BE installed
- A Docker environment connected to Portainer
- Valid authentication credentials for Portainer
- Understanding of Docker Engine API

## Architecture

```bash
Client → Portainer API Gateway → Docker Socket → Container Runtime
         (authentication,        (full Docker
          RBAC, audit)           API access)
```

Portainer proxies requests from:
```text
/api/endpoints/{id}/docker/{path}
```
to the underlying Docker Engine at `docker.sock` (or TCP endpoint).

## Step 1: Understanding the Proxy URL Pattern

All Docker API calls through Portainer follow this pattern:

```text
https://portainer.example.com/api/endpoints/{endpointId}/docker/{docker-api-path}
```

For example:
```bash
Docker direct:   GET /containers/json
Via Portainer:   GET /api/endpoints/1/docker/containers/json
```

## Step 2: Common Docker API Operations via Portainer Gateway

```bash
PORTAINER_URL="https://portainer.example.com"
JWT="your-portainer-jwt"
ENDPOINT_ID=1

# Docker info (equivalent to: docker info)

curl -s -H "Authorization: Bearer $JWT" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/info" | jq .

# Docker version (equivalent to: docker version)
curl -s -H "Authorization: Bearer $JWT" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/version" | jq .

# List containers (equivalent to: docker ps -a)
curl -s -H "Authorization: Bearer $JWT" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/json?all=true" | jq .

# List images (equivalent to: docker images)
curl -s -H "Authorization: Bearer $JWT" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/images/json" | jq .

# List volumes (equivalent to: docker volume ls)
curl -s -H "Authorization: Bearer $JWT" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/volumes" | jq .

# List networks (equivalent to: docker network ls)
curl -s -H "Authorization: Bearer $JWT" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/networks" | jq .

# System disk usage (equivalent to: docker system df)
curl -s -H "Authorization: Bearer $JWT" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/system/df" | jq .
```

## Step 3: Use Portainer from a Custom HTTP Client or SDK

Portainer's Docker gateway is path-based, so it is not a drop-in `DOCKER_HOST` or `docker context` endpoint. Use an HTTP client or SDK where you can set the full Portainer gateway URL and authentication headers:

```python
import requests

class PortainerDockerClient:
    """HTTP client that routes Docker Engine API calls through Portainer."""

    def __init__(self, portainer_url, api_key, endpoint_id):
        self.base_url = f"{portainer_url}/api/endpoints/{endpoint_id}/docker"
        self.session = requests.Session()
        self.session.headers.update({"X-API-Key": api_key})

    def list_containers(self, all=False):
        resp = self.session.get(
            f"{self.base_url}/containers/json",
            params={"all": str(all).lower()},
        )
        resp.raise_for_status()
        return resp.json()

    def start_container(self, container_id):
        resp = self.session.post(f"{self.base_url}/containers/{container_id}/start")
        resp.raise_for_status()
        return resp.status_code == 204

    def pull_image(self, image_name, tag="latest"):
        resp = self.session.post(
            f"{self.base_url}/images/create",
            params={"fromImage": image_name, "tag": tag},
            stream=True,
        )
        resp.raise_for_status()
        for line in resp.iter_lines():
            if line:
                print(line.decode())
```

## Step 4: Pull Images via Portainer Gateway

```bash
# Pull an image on a remote Docker host via Portainer
curl -s -X POST \
  -H "Authorization: Bearer $JWT" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/images/create?fromImage=nginx&tag=1.25"

# Pull with authentication (for private registries)
curl -s -X POST \
  -H "Authorization: Bearer $JWT" \
  -H "X-Registry-Auth: $(printf '%s' '{"username":"user","password":"pass","serveraddress":"registry.example.com"}' | base64 | tr '+/' '-_' | tr -d '\n')" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/images/create?fromImage=registry.example.com/myapp&tag=latest"
```

## Step 5: Create Networks via Gateway

```bash
# Create a custom bridge network
curl -s -X POST \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/networks/create" \
  -d '{
    "Name": "app-network",
    "Driver": "bridge",
    "IPAM": {
      "Config": [{"Subnet": "172.30.0.0/16"}]
    },
    "Labels": {
      "project": "myapp"
    }
  }' | jq .
```

## Step 6: Prune Resources via Gateway

```bash
# Remove stopped containers
curl -s -X POST \
  -H "Authorization: Bearer $JWT" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/containers/prune" | jq .

# Remove unused images
curl -s -X POST \
  -H "Authorization: Bearer $JWT" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/images/prune" | jq .

# Remove unused volumes
curl -s -X POST \
  -H "Authorization: Bearer $JWT" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/volumes/prune" | jq .

# Remove unused networks
curl -s -X POST \
  -H "Authorization: Bearer $JWT" \
  "${PORTAINER_URL}/api/endpoints/${ENDPOINT_ID}/docker/networks/prune" | jq .
```

## Security Benefits of the Gateway Pattern

1. **No direct Docker Engine exposure**: The socket or daemon endpoint stays on the server; clients never get direct access
2. **Centralized authentication**: Requests authenticate through Portainer using a JWT or access token
3. **Activity logging**: Portainer BE provides authentication and activity logs
4. **RBAC enforcement**: API access inherits the user's Portainer permissions for the environment
5. **TLS termination**: When accessed over HTTPS, client-to-Portainer traffic is encrypted

## Conclusion

Using Portainer as a Docker API gateway provides a secure, authenticated alternative to direct Docker socket access. Teams can perform the same Docker operations they're used to while Portainer enforces access controls, can provide activity logging in BE, and eliminates the need to distribute Docker socket access credentials. This pattern is particularly valuable for multi-team environments where different teams should have different levels of Docker access.
