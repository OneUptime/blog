# How to Build an Image with Squash Layers with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Build, Image Optimization

Description: Learn how to use Podman's squash options to flatten image layers, reducing image size and simplifying the layer history of your container images.

---

> Squashing layers combines multiple Containerfile instructions into fewer layers, producing smaller and simpler images for distribution.

Each Containerfile instruction that changes the filesystem, such as `RUN`, `COPY`, or `ADD`, creates a new layer in the resulting image. While layers enable caching and reuse, too many filesystem-changing layers can increase image size, especially when files are created and deleted in separate steps. Podman provides squash options to flatten these layers and produce leaner images.

---

## Why Squash Layers

Layers in container images are additive. If you create a 100MB file in one layer and delete it in the next, the image still carries that 100MB. Squashing layers eliminates this overhead by combining operations into a single layer.

## Podman Squash Options

Podman offers two squash-related flags:

```bash
# --squash: Squash all new layers into a single layer on top of the base image

podman build --squash -t myapp:squashed .

# --squash-all: Squash everything including the base image into one layer
podman build --squash-all -t myapp:flat .
```

## The Difference Between --squash and --squash-all

The `--squash` flag merges only the layers created by your Containerfile instructions, keeping the base image layers intact. The `--squash-all` flag merges everything, including the base image, into a single layer.

```bash
# Create a test Containerfile
mkdir -p ~/squash-demo && cd ~/squash-demo

cat > Containerfile <<'EOF'
FROM alpine:3.19
RUN apk add --no-cache curl
RUN apk add --no-cache wget
RUN echo "hello" > /greeting.txt
CMD ["cat", "/greeting.txt"]
EOF

# Build normally (multiple layers)
podman build -t demo:normal .

# Build with --squash (new layers squashed, base preserved)
podman build --squash -t demo:squashed .

# Build with --squash-all (everything in one layer)
podman build --squash-all -t demo:flat .
```

Compare the layer counts:

```bash
# Check layer count for each image
echo "Normal layers:"
podman image inspect --format '{{len .RootFS.Layers}}' demo:normal

echo "Squashed layers:"
podman image inspect --format '{{len .RootFS.Layers}}' demo:squashed

echo "Flat layers:"
podman image inspect --format '{{len .RootFS.Layers}}' demo:flat
```

## Practical Example: Removing Build Artifacts

The most common use case for squashing is when your build creates temporary files.

```bash
cat > Containerfile <<'EOF'
FROM ubuntu:22.04

# This creates a large layer with apt cache
RUN apt-get update && apt-get install -y \
    gcc \
    make \
    libssl-dev

# Copy source and build
COPY . /src
WORKDIR /src
RUN make && make install

# Clean up source and build deps
RUN apt-get remove -y gcc make libssl-dev && \
    apt-get autoremove -y && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/* /src

CMD ["/usr/local/bin/myapp"]
EOF

# Without squash: cleanup layer doesn't reduce size
# because deleted files still exist in earlier layers
podman build -t myapp:normal .

# With squash: all layers merge, deleted files are truly gone
podman build --squash -t myapp:squashed .

# Compare sizes
podman images --format "{{.Repository}}:{{.Tag}} {{.Size}}" | grep myapp
```

## Comparing Image Sizes

```bash
# Build both versions and compare
podman build -t size-test:normal .
podman build --squash -t size-test:squashed .

# Show the size difference
podman images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}" \
  --filter "reference=size-test"
```

## Viewing Layer History

Use `podman history` to see the difference in layers.

```bash
# Normal build shows each step
podman history demo:normal

# Squashed build shows fewer layers
podman history demo:squashed

# Flat build shows a single layer
podman history demo:flat
```

## When to Use Squash

Squashing is useful in these scenarios:

```bash
# 1. Final production images where size matters
podman build --squash -t myapp:production .

# 2. Images for distribution to registries
podman build --squash -t registry.example.com/myapp:v1.0 .

# 3. Images with build-time-only dependencies
podman build --squash -t myapp:clean .
```

## When NOT to Squash

Avoid squashing in these situations:

```bash
# During development (you want layer caching for fast rebuilds)
podman build -t myapp:dev .

# When base image sharing is important (squash-all breaks sharing)
podman build -t myapp:latest .  # Keep base layers for dedup
```

## Combining Squash with Multi-Stage Builds

Multi-stage builds are often a better alternative to squashing. You can also combine both approaches.

```bash
cat > Containerfile <<'EOF'
# Build stage (not squashed, benefits from caching)
FROM golang:1.22 AS builder
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /app

# Final stage (squash this for a minimal image)
FROM alpine:3.19
RUN apk add --no-cache ca-certificates
COPY --from=builder /app /usr/local/bin/app
CMD ["app"]
EOF

# Squash only the final stage layers
podman build --squash -t myapp:optimized .
```

## Automating Squashed Builds

Create a build script that produces both a development and production image.

```bash
#!/bin/bash
# build.sh - Build dev and production images

IMAGE_NAME="myapp"
TAG="${1:-latest}"

# Development build (with cache, no squash)
echo "Building development image..."
podman build -t "${IMAGE_NAME}:${TAG}-dev" .

# Production build (squashed for minimal size)
echo "Building production image..."
podman build --squash -t "${IMAGE_NAME}:${TAG}" .

# Show size comparison
echo ""
echo "Image sizes:"
podman images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}" \
  --filter "reference=${IMAGE_NAME}"
```

## Summary

Podman's `--squash` and `--squash-all` flags let you flatten image layers to reduce size and remove traces of deleted files. Use `--squash` to merge your Containerfile layers while keeping the base image intact. Use `--squash-all` for a completely flat image. For best results, combine squashing with multi-stage builds and use squash only for production images to preserve layer caching during development.
