# How to Tag Docker Images in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Image, Tag, Registry

Description: Add or modify tags on Docker images in Portainer for version management and registry organization.

---

Portainer's image and registry management features provide a web-based interface for the image lifecycle: pulling, building, importing, exporting, viewing tags, and cleaning up Docker images.

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

In Portainer: **Images > Build a new image** - write Dockerfile content in the web editor or upload a Dockerfile.

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

In Portainer: **Registries > Browse > repository** - clone an existing tag to add a new tag. To retag an image, clone the existing tag to the new name, then remove the old tag. When importing an image from a tar file, **Images > Import** can also apply a local or registry tag.

## Clean Up Images

```bash
# Remove a specific image
docker rmi myapp:old

# Remove all dangling images (untagged images not referenced by containers)
docker image prune

# Remove all unused images (not referenced by any container)
docker image prune -a

# Check disk usage
docker system df
```

## Identify Outdated Images

```bash
# Refresh a tag and see whether Docker downloads a newer image
docker pull nginx:latest

# View image creation date
docker image inspect nginx:latest --format '{{.Created}}'
```

---

*Monitor image-related issues and container deployments with [OneUptime](https://oneuptime.com).*
