# How to Identify Image Update Indicators in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Image, Update, Monitoring

Description: Detect when newer versions of Docker images are available in Portainer to keep containers up to date.

---

Portainer's image management features provide a web-based interface for common image tasks such as pulling, building, importing, and exporting Docker images. For deployed workloads, Portainer shows image update indicators next to containers, stacks, and services by comparing the first local image digest with the remote digest for the same image tag.

## Navigating Image Management

In Portainer, navigate to **Images** in the left sidebar to see all available images on the connected environment. To identify update indicators for deployed workloads, check the **Containers**, **Stacks**, or **Services** views.

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

In Portainer: **Images** - select the registry, enter the image name, then click **Pull the image**. Use **Advanced mode** for a custom registry URL and port.

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

# Remove all dangling images (untagged layers)
docker image prune

# Remove all unused images (not referenced by any container)
docker image prune -a

# Check disk usage
docker system df
```

## Identify Outdated Images

In Portainer, image update indicators appear next to containers, stacks, and services. Portainer compares the first local digest for the image tag with the remote digest when the page refreshes.

```bash
# Show the first local digest that Portainer compares
docker inspect --type=image nginx:latest --format '{{index .RepoDigests 0}}'

# View the local image creation date
docker inspect --type=image nginx:latest --format '{{.Created}}'

# Pull the tag again and check whether Docker reports a newer image
docker pull nginx:latest
```

---

*Monitor image-related issues and container deployments with [OneUptime](https://oneuptime.com).*
