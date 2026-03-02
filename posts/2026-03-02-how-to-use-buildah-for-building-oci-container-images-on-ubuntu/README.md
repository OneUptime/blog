# How to Use Buildah for Building OCI Container Images on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Buildah, Container, OCI, Podman

Description: Build OCI-compliant container images on Ubuntu using Buildah without a Docker daemon, including rootless builds, multi-stage builds, and image manipulation workflows.

---

Buildah is a tool for building OCI (Open Container Initiative) and Docker-compatible container images without requiring a daemon running as root. It is part of the containers/image ecosystem alongside Podman and Skopeo, and is the backend used by Podman to build images. Buildah offers fine-grained control over image layers and is particularly useful in CI/CD pipelines and environments where running a privileged daemon is not acceptable.

## Installing Buildah

```bash
# Install Buildah from Ubuntu's package repositories
sudo apt update
sudo apt install -y buildah

# Verify installation
buildah --version

# On Ubuntu 20.04, the available version may be older
# For a more recent version, use the kubic repository
. /etc/os-release
echo "deb https://download.opensuse.org/repositories/devel:/kubic:/libcontainers:/stable/xUbuntu_${VERSION_ID}/ /" | \
    sudo tee /etc/apt/sources.list.d/containers.list

curl -L "https://download.opensuse.org/repositories/devel:/kubic:/libcontainers:/stable/xUbuntu_${VERSION_ID}/Release.key" | \
    sudo apt-key add -

sudo apt update
sudo apt install -y buildah
```

## Rootless Configuration

Buildah supports rootless operation - building images without root privileges. This requires proper user namespace configuration:

```bash
# Verify subuid and subgid entries exist for your user
grep $USER /etc/subuid
grep $USER /etc/subgid

# If not present, add them
sudo usermod --add-subuids 100000-165535 $USER
sudo usermod --add-subgids 100000-165535 $USER

# Verify the storage configuration
cat ~/.config/containers/storage.conf 2>/dev/null || \
    cat /etc/containers/storage.conf

# Test rootless build capability
buildah info | grep rootless
```

## Building from a Dockerfile

Buildah can build images from existing Dockerfiles:

```bash
# Create a simple Dockerfile
cat > /tmp/Dockerfile <<'EOF'
FROM ubuntu:22.04

# Install nginx
RUN apt-get update && \
    apt-get install -y nginx && \
    rm -rf /var/lib/apt/lists/*

# Copy a custom nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
EOF

# Build the image from the Dockerfile
buildah bud -t my-nginx:latest -f /tmp/Dockerfile /tmp/

# List built images
buildah images

# Inspect the image
buildah inspect my-nginx:latest
```

## Building Images with Buildah's Native API

The native Buildah approach gives you full control over every layer. Instead of writing a Dockerfile, you run commands against a working container:

```bash
# Start a build from the ubuntu base image
# This creates a working container you can modify
CONTAINER=$(buildah from ubuntu:22.04)

echo "Working container ID: $CONTAINER"

# Run commands inside the container
buildah run $CONTAINER -- apt-get update
buildah run $CONTAINER -- apt-get install -y nginx
buildah run $CONTAINER -- apt-get clean
buildah run $CONTAINER -- rm -rf /var/lib/apt/lists/*

# Copy files into the container
echo "server { listen 80; }" > /tmp/nginx.conf
buildah copy $CONTAINER /tmp/nginx.conf /etc/nginx/nginx.conf

# Set container metadata (labels, environment variables, etc.)
buildah config \
    --label maintainer="admin@example.com" \
    --label version="1.0" \
    --env NGINX_VERSION="1.18" \
    --port 80 \
    --cmd '["nginx", "-g", "daemon off;"]' \
    $CONTAINER

# Commit the working container to create an image
buildah commit $CONTAINER my-nginx:native

# Clean up the working container
buildah rm $CONTAINER

# Verify the image
buildah images
```

## Multi-Stage Builds

Multi-stage builds keep the final image small by separating build dependencies from the runtime image:

```bash
# Build a Go application with multi-stage build

cat > /tmp/go-app.dockerfile <<'EOF'
# Stage 1: Build the Go binary
FROM golang:1.21 AS builder

WORKDIR /app

# Copy dependencies first for caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Stage 2: Create the minimal runtime image
FROM scratch

# Copy only the compiled binary from the builder stage
COPY --from=builder /app/main /main

# Copy CA certificates for HTTPS calls
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

EXPOSE 8080
ENTRYPOINT ["/main"]
EOF

buildah bud -t my-go-app:latest -f /tmp/go-app.dockerfile /path/to/go-project/
```

## Working with Image Layers

Buildah gives you visibility into and control over image layers:

```bash
# View image history (layers)
buildah history my-nginx:latest

# Mount a container's filesystem for inspection or modification
CONTAINER=$(buildah from my-nginx:latest)
MOUNTPOINT=$(buildah mount $CONTAINER)

echo "Filesystem mounted at: $MOUNTPOINT"

# Browse or modify files directly
ls $MOUNTPOINT/etc/nginx/

# Modify a file without running a container command
echo "# custom setting" >> $MOUNTPOINT/etc/nginx/nginx.conf

# Unmount when done
buildah umount $CONTAINER

# Commit the modified container
buildah commit $CONTAINER my-nginx:modified

buildah rm $CONTAINER
```

## Pushing Images to a Registry

```bash
# Log in to Docker Hub
buildah login docker.io

# Tag the image
buildah tag my-nginx:latest docker.io/yourusername/my-nginx:latest

# Push to Docker Hub
buildah push docker.io/yourusername/my-nginx:latest

# Push to a private registry
buildah push --tls-verify=false my-nginx:latest \
    docker://registry.internal:5000/my-nginx:latest

# Save to a local tar file (for air-gapped environments)
buildah push my-nginx:latest \
    oci-archive:/tmp/my-nginx.tar:my-nginx:latest

# Or in Docker format
buildah push my-nginx:latest \
    docker-archive:/tmp/my-nginx-docker.tar:my-nginx:latest
```

## Building in CI/CD Pipelines

Buildah is well-suited for CI/CD because it doesn't require a Docker daemon:

```yaml
# Example GitLab CI configuration
# .gitlab-ci.yml

build-image:
  image: quay.io/buildah/stable
  script:
    # Log in to the registry
    - buildah login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY

    # Build the image
    - buildah bud -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .

    # Push the image
    - buildah push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA

    # Also tag as latest
    - buildah tag $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA $CI_REGISTRY_IMAGE:latest
    - buildah push $CI_REGISTRY_IMAGE:latest
```

```bash
# Jenkins pipeline script equivalent
# Running buildah in an unprivileged container requires:
# --security-opt seccomp=unconfined
# or running inside a container with user namespaces enabled

# Check if rootless works in your CI environment
buildah info
```

## Creating OCI Images from Scratch

For minimal images, you can build from scratch without any base:

```bash
# Create an image from nothing
CONTAINER=$(buildah from scratch)

# Add a statically compiled binary
buildah copy $CONTAINER /path/to/static-binary /app

# Add necessary files
buildah copy $CONTAINER /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Set metadata
buildah config \
    --cmd '["/app"]' \
    --port 8080 \
    $CONTAINER

# Commit
buildah commit $CONTAINER minimal-app:latest

# Check the image size - should be very small
buildah images | grep minimal-app
```

## Useful Buildah Commands Reference

```bash
# List working containers
buildah containers

# List images
buildah images

# Remove an image
buildah rmi my-nginx:latest

# Remove all unused images
buildah rmi --prune

# Remove a working container
buildah rm $CONTAINER

# Remove all working containers
buildah rm --all

# Show detailed image or container information
buildah inspect image-or-container-name

# Show image configuration
buildah config --help

# Diff two images or containers
buildah diff $CONTAINER

# Pull an image
buildah pull ubuntu:22.04

# Rename a tag
buildah tag old-name:latest new-name:latest
```

## Comparing Buildah to Docker

The main advantages of Buildah over Docker for builds:

- **No daemon**: No long-running privileged process required
- **Rootless by default**: Builds can run entirely as a non-root user
- **Fine-grained layer control**: Each `buildah run` is a separate layer; you decide exactly when to commit
- **OCI compliance**: Images are spec-compliant and work with any OCI-compatible runtime
- **Compatible with Dockerfiles**: Existing Dockerfiles work without modification

The output of Buildah builds is compatible with Docker, Podman, containerd, and any OCI-compliant runtime, so you can use it as a drop-in replacement for `docker build` in most workflows.
