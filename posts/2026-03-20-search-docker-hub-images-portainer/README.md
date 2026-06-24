# How to Search Docker Hub for Images in Portainer - Images

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker Hub, Image, Search, Registry

Description: Search Docker Hub for available images directly from the Portainer web interface.

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

In Portainer: **Images > Pull image** - select the registry, then enter the image name and optional tag.

## Build Images

```bash
# Build from current directory
docker build -t myapp:latest .

# Build with specific Dockerfile
docker build -f Dockerfile.prod -t myapp:prod .

# Build with build args
docker build --build-arg NODE_ENV=production -t myapp:prod .
```

In Portainer: **Images > Build a new image** - paste Dockerfile content or upload a Dockerfile.

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

# Remove all dangling images
docker image prune

# Remove all unused images (not referenced by any container)
docker image prune -a

# Check disk usage
docker system df
```

## Identify Outdated Images

```bash
# Refresh the tag and check whether Docker downloads a newer image or reports it is up to date
docker pull nginx:latest 2>&1 | grep -E "Pull complete|Downloaded newer image|up to date"

# View image creation date
docker inspect nginx:latest --format '{{.Created}}'
```

---

*Monitor image-related issues and container deployments with [OneUptime](https://oneuptime.com).*
