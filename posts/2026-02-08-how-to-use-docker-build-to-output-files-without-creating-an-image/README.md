# How to Use Docker Build to Output Files Without Creating an Image

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Build, BuildKit, Docker Build, File Export, DevOps, CI/CD

Description: Learn how to use Docker BuildKit's output feature to extract build artifacts directly to your local filesystem without creating an image.

---

Docker builds typically produce container images. But sometimes you want the build process to generate files - compiled binaries, static assets, documentation - and drop them on your local filesystem without creating an image at all. BuildKit's `--output` flag makes this possible. It turns Docker into a general-purpose build tool that happens to use containers for isolation.

## Why Output Files Instead of Images?

Several common scenarios benefit from this approach. Cross-compilation is one: you might develop on macOS but need a Linux binary. Go developers do this frequently. Another scenario is generating static sites during CI/CD. You build the site inside a container with all the right dependencies, then extract the output to deploy it to a CDN. Documentation generation, protocol buffer compilation, and asset pipelines all fit this pattern too.

## The --output Flag

BuildKit's `--output` (or `-o`) flag controls where build results go. The most common type is `local`, which writes files to a directory on your host.

```bash
# Export the build output to a local directory called "dist"
docker buildx build --output type=local,dest=./dist .
```

This command runs the build and copies the final filesystem of the last stage to `./dist`. No image is created, no image is stored in your local image cache. You just get files.

## A Practical Example: Building a Go Binary

Let's walk through a concrete example. You want to compile a Go application for Linux inside a container, then extract the binary.

First, the Dockerfile:

```dockerfile
# Dockerfile for cross-compiling a Go application
FROM golang:1.22-alpine AS builder

WORKDIR /src

# Copy module files and download dependencies first (better caching)
COPY go.mod go.sum ./
RUN go mod download

# Copy source code and build the binary
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o /out/myapp ./cmd/myapp

# Final stage contains only the binary
FROM scratch
COPY --from=builder /out/myapp /myapp
```

Now build and extract just the binary:

```bash
# Build and output the binary to the local "build" directory
docker buildx build --output type=local,dest=./build .

# The binary is now at ./build/myapp
ls -la ./build/myapp
```

The `scratch` base image in the final stage means the only file in the output is the binary itself. This is a deliberate pattern - keep the final stage minimal so the exported output contains exactly what you need.

## Controlling What Gets Exported

The output includes everything in the final stage's filesystem. To export specific files, use a `scratch` stage and copy only what you want into it.

```dockerfile
# Multi-stage build that exports only specific artifacts
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm run generate-docs

# Export stage - only include the files we want
FROM scratch

# Copy just the build output and docs
COPY --from=builder /app/dist /dist
COPY --from=builder /app/docs /docs
```

```bash
# Export build artifacts to the local filesystem
docker buildx build --output type=local,dest=./output .

# Results in:
# ./output/dist/     - built application
# ./output/docs/     - generated documentation
```

## Output Types

The `--output` flag supports several types beyond `local`.

### Local Directory Output

Writes files to a directory. Creates the directory if it does not exist.

```bash
# Write output to a local directory
docker buildx build --output type=local,dest=./artifacts .
```

### Tar Archive Output

Packs the output into a tar archive. Useful for shipping build artifacts as a single file.

```bash
# Write output as a tar file
docker buildx build --output type=tar,dest=./artifacts.tar .

# You can also pipe it to stdout
docker buildx build --output type=tar . > artifacts.tar
```

### OCI Image Output

Saves the image as an OCI-compliant tar bundle without loading it into Docker's image store:

```bash
# Export as an OCI image tar bundle
docker buildx build --output type=oci,dest=./image.tar .
```

### Docker Image Output

Similar to OCI but in Docker's native format:

```bash
# Export as a Docker image tar (compatible with docker load)
docker buildx build --output type=docker,dest=./image.tar .

# Load it later with docker load
docker load < ./image.tar
```

### Registry Push

Push directly to a registry without storing locally:

```bash
# Build and push directly to a registry
docker buildx build --output type=registry -t ghcr.io/your-org/app:latest .
```

## Real-World CI/CD Example: Static Site Generation

Here is a complete example for building a static site and deploying the output.

```dockerfile
# Dockerfile for building a static site
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS builder
COPY . .
# Build the static site
RUN npm run build

# Export stage with only the static files
FROM scratch
COPY --from=builder /app/out /site
```

In a CI pipeline, you build and extract the files, then deploy them:

```yaml
# GitHub Actions workflow for static site deployment
name: Deploy Static Site
on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      # Build the site and extract output - no image created
      - name: Build Static Site
        run: |
          docker buildx build --output type=local,dest=./public .

      # Deploy the extracted files to your hosting provider
      - name: Deploy to S3
        run: |
          aws s3 sync ./public/site s3://my-bucket/ --delete
```

## Protocol Buffer Compilation

Another great use case is compiling protocol buffers. The build container has protoc and all the plugins installed, but you just want the generated code:

```dockerfile
# Dockerfile for protobuf compilation
FROM namely/protoc-all:1.51 AS generator

WORKDIR /defs
COPY proto/ ./proto/

# Generate Go and Python code from proto definitions
RUN mkdir -p /out/go /out/python && \
    protoc \
      --go_out=/out/go \
      --go-grpc_out=/out/go \
      --python_out=/out/python \
      proto/*.proto

# Export only the generated code
FROM scratch
COPY --from=generator /out /generated
```

```bash
# Generate protobuf code and extract it locally
docker buildx build --output type=local,dest=./generated .

# Generated files are now in:
# ./generated/generated/go/
# ./generated/generated/python/
```

## Combining with Build Arguments

You can parameterize the build to control what gets exported:

```bash
# Build with arguments that affect the output
docker buildx build \
  --build-arg TARGET_OS=linux \
  --build-arg TARGET_ARCH=arm64 \
  --output type=local,dest=./build/linux-arm64 .
```

```dockerfile
# Parameterized cross-compilation
FROM golang:1.22-alpine AS builder

ARG TARGET_OS=linux
ARG TARGET_ARCH=amd64

WORKDIR /src
COPY . .

# Build for the specified platform
RUN CGO_ENABLED=0 GOOS=${TARGET_OS} GOARCH=${TARGET_ARCH} \
    go build -o /out/app ./cmd/app

FROM scratch
COPY --from=builder /out/app /app
```

Build for multiple platforms by running the command multiple times with different arguments:

```bash
# Build binaries for multiple platforms
for platform in "linux amd64" "linux arm64" "darwin amd64" "darwin arm64"; do
  os=$(echo $platform | cut -d' ' -f1)
  arch=$(echo $platform | cut -d' ' -f2)
  docker buildx build \
    --build-arg TARGET_OS=$os \
    --build-arg TARGET_ARCH=$arch \
    --output type=local,dest=./build/${os}-${arch} .
done
```

## Performance Tips

File output builds benefit from the same caching strategies as regular builds. Layer caching, multi-stage builds, and BuildKit's cache mounts all apply.

For large outputs, the `tar` type is faster than `local` because it avoids creating many individual files on the host filesystem:

```bash
# Faster for large outputs - single tar file instead of many files
docker buildx build --output type=tar,dest=./output.tar .

# Extract where needed
tar xf output.tar -C ./extracted/
```

If you run the build repeatedly, BuildKit caches intermediate layers. Only the final copy to the host filesystem happens each time, assuming nothing changed.

## Wrapping Up

The `--output` flag transforms Docker from an image-building tool into a general-purpose build system. Any process that benefits from containerized, reproducible builds but does not need a container image as the final artifact can use this feature. Cross-compilation, static site generation, code generation, and artifact packaging all become simpler when you can run them in containers and extract just the results.
