# How to Remove Unused Docker Images in Portainer - Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Image, Cleanup, Storage

Description: Clean up unused and dangling Docker images in Portainer to reclaim disk space.

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

In Portainer: **Images** - select the registry, enter the image name and tag, then click **Pull the image**.

## Build Images

```bash
# Build from current directory
docker build -t myapp:latest .

# Build with specific Dockerfile
docker build -f Dockerfile.prod -t myapp:prod .

# Build with build args
docker build --build-arg NODE_ENV=production -t myapp:prod .
```

In Portainer: **Images > Build a new image** - use the web editor, upload a Dockerfile, or provide a URL.

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

# Remove all dangling images (untagged images)
docker image prune

# Remove all unused images (not referenced by any container)
docker image prune -a

# Check disk usage
docker system df
```

## Identify Outdated Images

```bash
# Pull the tag again and check Docker's status message
docker pull nginx:latest 2>&1 | grep -E "Downloaded newer image|Image is up to date"

# View image creation date
docker image inspect nginx:latest --format '{{.Created}}'
```

---

*Monitor image-related issues and container deployments with [OneUptime](https://oneuptime.com).*
