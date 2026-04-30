# How to Import Docker Images from a Tar File in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Image, Import, Offline

Description: Import Docker images from a local .tar archive into Portainer for air-gapped or offline environments.

---

Portainer's image management features provide a web-based interface for pulling, building, importing, exporting, inspecting, and cleaning up Docker images.

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

In Portainer: **Images** - select the registry and image name, or use **Advanced mode** for a custom registry.

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

In Portainer: **Images > Import** - upload a `.tar`, `.tar.gz`, `.tar.bz2`, or `.tar.xz` image archive, optionally choose the target node and tag, then click **Upload**. To export an image from Portainer, open the image and click **Export this image**.

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

# Remove all dangling images (untagged layers)
docker image prune

# Remove all unused images (not referenced by any container)
docker image prune -a

# Check disk usage
docker system df
```

## Identify Outdated Images

```bash
# Pull the tag again and let Docker report whether it downloaded a newer image
docker pull nginx:latest

# View image creation date
docker inspect nginx:latest --format '{{.Created}}'
```

---

*Monitor image-related issues and container deployments with [OneUptime](https://oneuptime.com).*
