# How to Clean Up Dangling Images in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Image, Cleanup, Dangling

Description: Remove dangling Docker images (untagged, unreferenced layers) in Portainer to free up disk space.

---

Portainer's image management features provide a web-based interface for the full image lifecycle: pulling, building, tagging, inspecting, and cleaning up Docker images.

## Navigating Image Management

In Portainer, navigate to **Images** in the left sidebar to see all available images on the connected environment.

## Pull Images from a Registry

```bash
# Pull from Docker Hub

docker pull nginx:latest
docker pull postgres:16

# Pull from a private registry
docker pull registry.example.com/myapp:v2.0.0

# Pull with authentication
docker login registry.example.com
docker pull registry.example.com/private/image:tag
```

In Portainer: **Images** - select the registry, enter the image name and tag, and click **Pull the image**.

## Build Images

```bash
# Build from current directory
docker build -t myapp:latest .

# Build with specific Dockerfile
docker build -f Dockerfile.prod -t myapp:prod .

# Build with build args
docker build --build-arg NODE_ENV=production -t myapp:prod .
```

In Portainer: **Images > Build a new image** - use the web editor for the Dockerfile or upload a Dockerfile.

## Import/Export Images

```bash
# Export image to tar
docker save myapp:latest > myapp-latest.tar
docker save myapp:latest | gzip > myapp-latest.tar.gz

# Import image from tar
docker load < myapp-latest.tar
docker load -i myapp-latest.tar.gz
```

## Tag Images

```bash
# Add a new tag to an existing image
docker tag myapp:latest myapp:v2.0.0
docker tag myapp:latest registry.example.com/myapp:v2.0.0

# Push with new tag
docker push registry.example.com/myapp:v2.0.0
```

## Clean Up Images

```bash
# Remove a specific image
docker rmi myapp:old

# Remove all dangling images (untagged images not referenced by any container)
docker image prune

# Remove all unused images (not referenced by any container)
docker image prune -a

# Check disk usage
docker system df
```

## Identify Outdated Images

```bash
# Pull the tag and let Docker report whether it downloaded a newer image
docker pull nginx:latest

# View the pulled image digest
docker inspect nginx:latest --format '{{index .RepoDigests 0}}'

# View image creation date
docker inspect nginx:latest --format '{{.Created}}'
```

---

*Monitor image-related issues and container deployments with [OneUptime](https://oneuptime.com).*
