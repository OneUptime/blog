# How to Use the Podman REST API to Pull Images

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, REST API, Container Image, DevOps, Container Registry

Description: Learn how to pull container images from registries using the Podman REST API, including authentication, tag management, and registry configuration.

---

> Pulling container images through the Podman REST API lets you automate image management, integrate with CI/CD pipelines, and build custom deployment tools that fetch the exact images you need.

Before you can create containers, you need images. The Podman REST API provides endpoints to pull images from container registries, list available images, inspect image details, and manage tags. This guide covers the full image pull workflow, from basic pulls to authenticated registry access and progress monitoring.

---

## Pulling an Image

Pull an image by sending a POST request to the images pull endpoint.

```bash
# Pull the latest nginx image from Docker Hub

curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  "http://localhost/v4.0.0/libpod/images/pull?reference=docker.io/library/nginx:latest"
```

The response is a stream of JSON objects showing the pull progress. The final object contains the image ID.

```bash
# Pull a specific version
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  "http://localhost/v4.0.0/libpod/images/pull?reference=docker.io/library/nginx:1.25"

# Pull from a different registry
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  "http://localhost/v4.0.0/libpod/images/pull?reference=quay.io/prometheus/prometheus:latest"

# Pull from GitHub Container Registry
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  "http://localhost/v4.0.0/libpod/images/pull?reference=ghcr.io/owner/image:tag"
```

## Pulling with the Docker-Compatible Endpoint

The Docker-compatible endpoint uses a different parameter format.

```bash
# Pull using the Docker-compatible endpoint
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  "http://localhost/v1.40/images/create?fromImage=nginx&tag=latest"

# Pull a specific image and tag
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  "http://localhost/v1.40/images/create?fromImage=docker.io/library/postgres&tag=16"
```

## Authenticated Pulls

For private registries, you need to provide authentication credentials. The credentials are sent as a URL-safe Base64-encoded JSON header.

```bash
# Create the auth string
AUTH=$(printf '%s' '{"username":"myuser","password":"mypassword"}' | base64 | tr -d '\n' | tr '+/' '-_')

# Pull from a private registry with authentication
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "X-Registry-Auth: $AUTH" \
  "http://localhost/v4.0.0/libpod/images/pull?reference=registry.example.com/private/myapp:latest"
```

For registries using a token-based auth system, include the token directly.

```bash
# Auth with a registry token
AUTH=$(printf '%s' '{"identitytoken":"your-registry-token"}' | base64 | tr -d '\n' | tr '+/' '-_')

curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  -H "X-Registry-Auth: $AUTH" \
  "http://localhost/v4.0.0/libpod/images/pull?reference=registry.example.com/app:v2.0"
```

## Listing Local Images

After pulling images, list what is available locally.

```bash
# List all local images
curl -s --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  http://localhost/v4.0.0/libpod/images/json | python3 -m json.tool

# List with filters
curl -s -G --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  --data-urlencode 'filters={"reference":["nginx"]}' \
  http://localhost/v4.0.0/libpod/images/json

# List dangling images (untagged)
curl -s -G --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  --data-urlencode 'filters={"dangling":["true"]}' \
  http://localhost/v4.0.0/libpod/images/json
```

## Formatting Image Listings

Use `jq` to extract useful information from the image list.

```bash
# Display image repository, tag, size, and ID
curl -s --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  http://localhost/v4.0.0/libpod/images/json | \
  jq '.[] | {
    repo: (.RepoTags[0] // "none"),
    id: (.Id | sub("^sha256:"; "")[:12]),
    size_mb: (.Size / 1024 / 1024 | floor),
    created: .Created
  }'

# List just image names
curl -s --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  http://localhost/v4.0.0/libpod/images/json | \
  jq -r '.[] | .RepoTags[]?'
```

## Inspecting an Image

Get detailed metadata about a specific image.

```bash
# Inspect an image by name
curl -s --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  http://localhost/v4.0.0/libpod/images/nginx:latest/json | python3 -m json.tool

# Get specific fields
curl -s --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  http://localhost/v4.0.0/libpod/images/nginx:latest/json | \
  jq '{
    id: (.Id | sub("^sha256:"; "")[:12]),
    architecture: .Architecture,
    os: .Os,
    size: (.Size / 1024 / 1024 | floor | tostring) + "MB",
    layers: (.RootFS.Layers | length),
    cmd: .Config.Cmd,
    exposed_ports: .Config.ExposedPorts
  }'
```

## Checking if an Image Exists

Use the exists endpoint for a lightweight check.

```bash
# Check if an image exists locally
curl -o /dev/null -s -w "%{http_code}" \
  --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  http://localhost/v4.0.0/libpod/images/nginx:latest/exists
# 204 = exists
# 404 = not found
```

## Tagging Images

Add new tags to existing images.

```bash
# Tag an image
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  "http://localhost/v4.0.0/libpod/images/nginx:latest/tag?repo=my-registry.com/nginx&tag=v1.0"

# Verify the tag was applied
curl -s --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  http://localhost/v4.0.0/libpod/images/json | \
  jq -r '.[] | .RepoTags[]?' | grep my-registry
```

## Removing Images

Delete images you no longer need.

```bash
# Remove an image
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X DELETE \
  http://localhost/v4.0.0/libpod/images/nginx:1.25

# Force remove (even if used by containers)
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X DELETE \
  "http://localhost/v4.0.0/libpod/images/nginx:latest?force=true"

# Prune unused images
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  http://localhost/v4.0.0/libpod/images/prune

# Prune all unused images (not just dangling)
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  -X POST \
  "http://localhost/v4.0.0/libpod/images/prune?all=true"
```

## Searching Registries

Search for images on remote registries through the API.

```bash
# Search configured registries for nginx images
curl -s --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  "http://localhost/v4.0.0/libpod/images/search?term=nginx&limit=5" | \
  jq '.[] | {name: .Name, description: .Description, stars: .Stars, official: .Official}'
```

## Pulling Images with Python

A complete Python example for image management.

```python
import json
import os
import socket
import http.client
import base64

class PodmanImageClient:
    def __init__(self):
        self.socket_path = f"{os.environ['XDG_RUNTIME_DIR']}/podman/podman.sock"
        self.base = '/v4.0.0/libpod'

    def _request(self, method, path, headers=None):
        conn = http.client.HTTPConnection('localhost')
        conn.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        conn.sock.connect(self.socket_path)
        conn.request(method, path, headers=headers or {})
        resp = conn.getresponse()
        data = resp.read().decode()
        conn.close()
        return resp.status, data

    def pull(self, reference, username=None, password=None):
        headers = {}
        if username and password:
            auth = base64.urlsafe_b64encode(
                json.dumps({"username": username, "password": password}).encode()
            ).decode()
            headers['X-Registry-Auth'] = auth

        status, body = self._request(
            'POST',
            f'{self.base}/images/pull?reference={reference}',
            headers=headers
        )
        # Parse the streamed response
        for line in body.strip().split('\n'):
            if line:
                data = json.loads(line)
                if 'id' in data:
                    return data['id']
        return None

    def list_images(self):
        status, body = self._request('GET', f'{self.base}/images/json')
        return json.loads(body)

    def inspect(self, name):
        status, body = self._request('GET', f'{self.base}/images/{name}/json')
        return json.loads(body) if status == 200 else None

    def exists(self, name):
        status, _ = self._request('GET', f'{self.base}/images/{name}/exists')
        return status == 204

    def remove(self, name, force=False):
        status, _ = self._request('DELETE',
            f'{self.base}/images/{name}?force={str(force).lower()}')
        return status == 200


client = PodmanImageClient()

# Pull an image
image_id = client.pull("docker.io/library/alpine:latest")
print(f"Pulled image: {image_id.split(':', 1)[-1][:12] if image_id else 'failed'}")

# Check if image exists
print(f"Alpine exists: {client.exists('alpine:latest')}")

# List all images
for img in client.list_images():
    tags = img.get('RepoTags') or ['<none>']
    size_mb = img.get('Size', 0) / 1024 / 1024
    print(f"  {tags[0]:40s} {size_mb:.1f} MB")

# Pull from a private registry
image_id = client.pull(
    "registry.example.com/myapp:v1.0",
    username="deploy",
    password="token123"
)
```

## Conclusion

The Podman REST API provides comprehensive image management capabilities through straightforward HTTP endpoints. You can pull images from any OCI-compatible registry, authenticate with private registries using Base64-encoded credentials, inspect image metadata, manage tags, and clean up unused images. The search endpoint lets you discover images without leaving your API workflow. Combined with the container creation endpoints, you have everything needed to build end-to-end container deployment automation that pulls the right images and launches containers in a single workflow.
