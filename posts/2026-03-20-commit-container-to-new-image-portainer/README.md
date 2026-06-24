# How to Commit a Container to a New Image in Portainer - New

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Image Management, Container Commit, DevOps, Container

Description: Use docker commit via Portainer's console to snapshot a running container's state into a new Docker image for debugging, migration, or creating a reproducible base image.

---

`docker commit` creates a new image from a container's current writable layer, including filesystem changes since the container was created. It does not include data stored in mounted volumes. This is useful for capturing a working configuration, creating a debug snapshot, or migrating a configured container's writable-layer changes to a new host.

## When to Use docker commit

- **Debugging** - snapshot a broken container for offline analysis
- **Configuration capture** - save a manually configured container as an image
- **Legacy migration** - migrate a long-running container with accumulated changes
- **Development shortcut** - quickly capture work-in-progress state

**When NOT to use it:**
- For production images - always use Dockerfiles for reproducibility
- When secrets are in the container - they'll be baked into the image

## Committing a Container via Portainer

In Portainer, open the container's details page and use the option to create an image from the container. If you want the equivalent CLI, run it from a shell on the Docker host that Portainer manages, not inside the container console:

```bash
# Run this on the Docker host connected to Portainer

docker commit \
  --author "engineer@example.com" \
  --message "Added nginx custom configuration for example.com" \
  container_name_or_id \
  myregistry/nginx-custom:v1.0.0

# The new image will appear in your local Docker images
docker images myregistry/nginx-custom
```

Portainer's container console runs inside the container, so it will not normally have access to the host Docker CLI needed for `docker commit`.

## Capturing Container State with Metadata

Include useful metadata in the commit:

```bash
# Full commit with labels and metadata
docker commit \
  --author "devops@example.com" \
  --message "Emergency fix: updated SSL certs and nginx config" \
  --change "LABEL version=1.0.1" \
  --change "LABEL created-from=nginx-production-01" \
  --change "LABEL commit-date=2026-03-20" \
  nginx_container_1 \
  myregistry/nginx-emergency:20260320-fix
```

## Push the Committed Image to a Registry

After committing, push to your registry so it's available on other hosts:

```bash
# If your registry requires authentication
docker login your-registry.example.com

# Tag for your registry
docker tag myregistry/nginx-custom:v1.0.0 your-registry.example.com/nginx-custom:v1.0.0

# Push from the Docker host shell
docker push your-registry.example.com/nginx-custom:v1.0.0
```

You can then deploy this image via Portainer on any environment.

## Diff Check Before Committing

Before committing, review the writable-layer filesystem changes that will be captured:

```bash
# See writable-layer filesystem changes since the container was created
docker diff container_name

# A = Added, C = Changed, D = Deleted
# Review for any sensitive files (logs, temp credentials, etc.)
# Mounted volume data is not shown here and is not included in the commit
```

## The Right Way: Convert Committed Changes to a Dockerfile

After committing and analyzing what changed, document those changes in a proper Dockerfile:

```dockerfile
FROM nginx:1.25.4

# Changes from the committed container:
COPY ./nginx.conf /etc/nginx/nginx.conf
COPY ./ssl/ /etc/nginx/ssl/
RUN nginx -t  # Test the configuration

EXPOSE 443
```

Build and push this Dockerfile version as your canonical production image. The committed image is a temporary capture; the Dockerfile is your source of truth.

## Summary

`docker commit` is a useful tool for capturing container writable-layer changes in emergency situations or during initial exploration, but it does not include mounted volume data. For production use, always convert committed changes into a proper Dockerfile. Use Portainer's image browser to view committed images and its registry integration to push them to your private registry.
