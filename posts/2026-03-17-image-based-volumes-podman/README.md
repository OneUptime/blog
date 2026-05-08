# How to Use Image-Based Volumes with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Volumes, Image, Storage

Description: Learn how to use container images as volume sources in Podman to provide pre-populated data to containers.

---

> Image-based volumes let you mount data from a container image directly into another container, providing a portable way to ship pre-populated volume data.

Podman supports mounting volumes that are backed by container images. This allows you to package data, configuration files, or static assets into an image and mount them as volumes in running containers.

---

## Creating an Image for Volume Data

First, build an image that contains the data you want to serve as a volume:

```dockerfile
# Containerfile.data

FROM docker.io/library/alpine:latest
COPY ./config-files /data
COPY ./static-assets /assets
VOLUME /data
VOLUME /assets
```

```bash
# Build the data image
podman build -t myapp-data:v1 -f Containerfile.data .
```

## Mounting an Image as a Volume

Use the `--mount type=image` option to mount an image directly:

```bash
# Mount the image's /data directory into the container
podman run -d --name webapp \
  --mount type=image,source=myapp-data:v1,target=/app/data,subpath=/data \
  docker.io/library/nginx:latest

# Verify the data is accessible
podman exec webapp ls /app/data
```

## Using Image Volumes with Subpaths

You can mount a specific subdirectory from the image:

```bash
# Mount only the /assets directory from the data image
podman run -d --name frontend \
  --mount type=image,source=myapp-data:v1,target=/usr/share/nginx/html,subpath=/assets \
  -p 8080:80 \
  docker.io/library/nginx:latest
```

## Read-Only Image Volumes

By default, image volumes are mounted read-only. You can make them writable with `rw=true`, but changes are discarded when the container is removed:

```bash
# Mount as explicitly read-only (the default)
podman run -d --name app \
  --mount type=image,source=myapp-data:v1,target=/config,subpath=/data,rw=false \
  docker.io/library/node:20 tail -f /dev/null

# Attempting to write will fail
podman exec app touch /config/newfile
# Output: touch: cannot touch '/config/newfile': Read-only file system

# Mount as read-write (changes are ephemeral)
podman run -d --name app-rw \
  --mount type=image,source=myapp-data:v1,target=/config,subpath=/data,rw=true \
  docker.io/library/node:20 tail -f /dev/null
```

## Versioning Data with Image Tags

One advantage of image-based volumes is versioning through image tags:

```bash
# Create versioned data images
podman build -t myapp-data:v1 -f Containerfile.data.v1 .
podman build -t myapp-data:v2 -f Containerfile.data.v2 .

# Deploy with a specific data version
podman run -d --name app-v1 \
  --mount type=image,source=myapp-data:v1,target=/data,subpath=/data \
  docker.io/library/nginx:latest

# Upgrade data by switching the image tag
podman run -d --name app-v2 \
  --mount type=image,source=myapp-data:v2,target=/data,subpath=/data \
  docker.io/library/nginx:latest
```

## Using Image Volumes in Pods

```bash
# Create a pod with shared image volumes
podman pod create --name myapp-pod -p 8080:80

podman run -d --pod myapp-pod --name data-provider \
  --mount type=image,source=myapp-data:v1,target=/shared-data,subpath=/data \
  docker.io/library/alpine:latest tail -f /dev/null

podman run -d --pod myapp-pod --name webserver \
  --mount type=image,source=myapp-data:v1,target=/usr/share/nginx/html,subpath=/assets \
  docker.io/library/nginx:latest
```

## Comparison with Named Volumes

| Feature | Image Volume | Named Volume |
|---------|-------------|-------------|
| Pre-populated | Yes (from image) | Manual initialization |
| Versioning | Image tags | Manual backup |
| Portability | Push/pull via registry | Export/import |
| Mutability | Read-only by default (rw=true optional) | Read-write |

## Summary

Image-based volumes in Podman let you package and distribute pre-populated data as container images. They are ideal for shipping configuration, static assets, or reference data alongside your application. Use image tags for versioning and registries for distribution, combining the portability of container images with the data management capabilities of volumes.
