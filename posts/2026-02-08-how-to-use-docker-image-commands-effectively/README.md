# How to Use docker image Commands Effectively

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Images, Container Registry, Image Management, DevOps

Description: A complete guide to Docker image commands for building, tagging, pushing, pulling, and managing container images efficiently.

---

Docker images are the foundation of containers. Every container you run starts from an image. Managing these images well keeps your builds fast, your registries organized, and your disk space under control.

The `docker image` command family replaces the older top-level commands like `docker rmi` and `docker images` with a more organized subcommand structure. This guide covers every subcommand with real examples.

## Listing Images

See all images stored locally on your Docker host:

```bash
docker image ls
```

This is equivalent to `docker images`, but the subcommand form is more consistent with Docker's CLI design.

Filter images by repository name:

```bash
docker image ls nginx
```

Show only dangling images (layers not referenced by any tagged image):

```bash
docker image ls --filter dangling=true
```

List images with custom formatting for automation:

```bash
docker image ls --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedSince}}"
```

Show image IDs only (useful for piping into other commands):

```bash
docker image ls -q
```

List all images including intermediate build layers:

```bash
docker image ls -a
```

## Pulling Images

Download an image from a registry. By default, Docker pulls from Docker Hub.

Pull the latest tag of an image:

```bash
docker image pull nginx:latest
```

Pull a specific version:

```bash
docker image pull postgres:16.1-alpine
```

Pull from a private registry:

```bash
docker image pull registry.example.com/myteam/api:v2.3.0
```

Pull all tags for a repository (use sparingly, this downloads a lot of data):

```bash
docker image pull --all-tags nginx
```

Pull an image for a specific platform when working on multi-arch systems:

```bash
docker image pull --platform linux/arm64 nginx:latest
```

## Inspecting Images

Get detailed metadata about an image:

```bash
docker image inspect nginx:latest
```

Extract specific fields. Get the image's exposed ports:

```bash
docker image inspect --format '{{.Config.ExposedPorts}}' nginx:latest
```

Get the image's environment variables:

```bash
docker image inspect --format '{{json .Config.Env}}' nginx:latest | jq .
```

Get the image size in bytes:

```bash
docker image inspect --format '{{.Size}}' nginx:latest
```

Find the base image and layer information:

```bash
docker image inspect --format '{{json .RootFS.Layers}}' nginx:latest | jq .
```

## Viewing Image History

See the layers that compose an image. This reveals every Dockerfile instruction that created each layer.

Show the build history of an image:

```bash
docker image history nginx:latest
```

Show full commands without truncation:

```bash
docker image history --no-trunc nginx:latest
```

This is incredibly useful for debugging image size. You can see exactly which layer added the most bytes and optimize your Dockerfile accordingly.

Format the history for analysis:

```bash
docker image history --format "table {{.CreatedBy}}\t{{.Size}}" nginx:latest
```

## Tagging Images

Tags let you create additional references to the same image. They do not copy data, just create pointers.

Tag an image for pushing to a private registry:

```bash
docker image tag my-app:latest registry.example.com/myteam/my-app:v1.0.0
```

Add a semantic version tag alongside the latest tag:

```bash
docker image tag my-app:latest my-app:v2.1.0
docker image tag my-app:latest my-app:v2.1
docker image tag my-app:latest my-app:v2
```

This common pattern lets users pull at different specificity levels.

## Pushing Images

Upload an image to a registry. You must be logged in first.

Log in to Docker Hub:

```bash
docker login
```

Log in to a private registry:

```bash
docker login registry.example.com
```

Push an image to the registry:

```bash
docker image push registry.example.com/myteam/my-app:v1.0.0
```

Push all tags at once:

```bash
docker image push --all-tags registry.example.com/myteam/my-app
```

## Building Images

While `docker build` works, the subcommand form is `docker image build`.

Build an image from the current directory's Dockerfile:

```bash
docker image build -t my-app:latest .
```

Build with build arguments:

```bash
docker image build \
  --build-arg NODE_VERSION=20 \
  --build-arg APP_ENV=production \
  -t my-app:latest .
```

Build without using cache (forces fresh build of all layers):

```bash
docker image build --no-cache -t my-app:latest .
```

Build from a specific Dockerfile:

```bash
docker image build -f Dockerfile.production -t my-app:prod .
```

## Saving and Loading Images

Transfer images without a registry by exporting to tar archives.

Save an image to a tar file for offline transfer:

```bash
docker image save -o my-app-v1.tar my-app:v1.0.0
```

Save multiple images into one archive:

```bash
docker image save -o all-images.tar my-app:v1.0.0 nginx:latest postgres:16
```

Load an image from a tar file on another machine:

```bash
docker image load -i my-app-v1.tar
```

This is useful for air-gapped environments where you cannot access a registry. You can also compress the archive for smaller transfers:

```bash
docker image save my-app:v1.0.0 | gzip > my-app-v1.tar.gz
gunzip -c my-app-v1.tar.gz | docker image load
```

## Removing Images

Remove a specific image by tag:

```bash
docker image rm nginx:latest
```

Remove multiple images at once:

```bash
docker image rm nginx:latest postgres:16 redis:7
```

Force removal even if containers reference the image:

```bash
docker image rm --force my-app:old
```

Remove all dangling images (untagged layers left over from builds):

```bash
docker image prune
```

Remove all unused images (not just dangling ones):

```bash
docker image prune -a
```

Remove unused images older than 24 hours:

```bash
docker image prune -a --filter "until=24h"
```

## Practical Example: CI/CD Image Workflow

Here is a complete script showing how images flow through a CI/CD pipeline.

This script builds, tags, and pushes an image with both a version tag and a git SHA tag:

```bash
#!/bin/bash
# ci-build.sh
# Builds, tags, and pushes Docker image for CI/CD

REGISTRY="registry.example.com/myteam"
IMAGE="my-app"
VERSION=$(cat VERSION)
GIT_SHA=$(git rev-parse --short HEAD)

echo "Building $IMAGE version $VERSION (commit $GIT_SHA)"

# Build the image
docker image build \
  --build-arg VERSION="$VERSION" \
  --build-arg GIT_SHA="$GIT_SHA" \
  -t "$REGISTRY/$IMAGE:$VERSION" \
  -t "$REGISTRY/$IMAGE:$GIT_SHA" \
  -t "$REGISTRY/$IMAGE:latest" \
  .

# Push all tags
docker image push "$REGISTRY/$IMAGE:$VERSION"
docker image push "$REGISTRY/$IMAGE:$GIT_SHA"
docker image push "$REGISTRY/$IMAGE:latest"

echo "Pushed $REGISTRY/$IMAGE with tags: $VERSION, $GIT_SHA, latest"
```

## Checking Disk Usage

See how much disk space images consume:

```bash
docker image ls --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | sort -k3 -h
```

For a complete breakdown:

```bash
docker system df
```

Clean up aggressively when disk is running low:

```bash
# Remove all stopped containers, unused networks, dangling images, and build cache
docker system prune

# Also remove unused images (not just dangling)
docker system prune -a
```

## Quick Reference

| Command | Purpose |
|---------|---------|
| `docker image ls` | List local images |
| `docker image pull` | Download from registry |
| `docker image push` | Upload to registry |
| `docker image build` | Build from Dockerfile |
| `docker image inspect` | Show image metadata |
| `docker image history` | Show image layers |
| `docker image tag` | Create a new tag |
| `docker image save` | Export to tar file |
| `docker image load` | Import from tar file |
| `docker image rm` | Remove an image |
| `docker image prune` | Remove unused images |

## Conclusion

Effective image management keeps your Docker environment healthy. Pull specific tags rather than relying on `latest`. Use multi-tag strategies in CI/CD. Regularly prune dangling and unused images to reclaim disk space. Inspect image history when debugging size issues. Save and load images when you need to transfer them without a registry. These commands are the building blocks of a well-organized container workflow.
