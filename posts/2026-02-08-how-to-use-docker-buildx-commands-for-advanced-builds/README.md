# How to Use docker buildx Commands for Advanced Builds

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Buildx, Multi-Platform Builds, BuildKit, CI/CD, DevOps

Description: Learn how to use Docker Buildx for multi-platform builds, custom build drivers, remote builders, and advanced caching strategies.

---

Docker Buildx extends the standard `docker build` with features powered by BuildKit. It unlocks multi-platform image builds, remote build drivers, advanced caching, and build output options that the legacy builder cannot match. If you are still using plain `docker build`, switching to Buildx gives you significant improvements in speed and flexibility.

This guide walks through the core Buildx commands with practical examples.

## What is Buildx

Buildx is a CLI plugin that ships with Docker Desktop and can be installed separately on Linux. It uses BuildKit as its build engine, which brings parallel build stages, better layer caching, secret handling during builds, and the ability to build images for multiple CPU architectures from a single machine.

Check if Buildx is available:

```bash
docker buildx version
```

## Managing Builders

A "builder" in Buildx is a build instance. The default builder wraps the legacy Docker builder. You can create additional builders with different drivers.

List all available builders:

```bash
docker buildx ls
```

Create a new builder using the docker-container driver (runs BuildKit in a container):

```bash
docker buildx create --name mybuilder --driver docker-container --bootstrap
```

The `docker-container` driver offers features the default driver does not, including multi-platform builds and advanced cache exports.

Switch to your new builder:

```bash
docker buildx use mybuilder
```

Inspect a builder to see its platforms and status:

```bash
docker buildx inspect mybuilder
```

Remove a builder when you no longer need it:

```bash
docker buildx rm mybuilder
```

## Building Images

The basic build command works like `docker build` but with more options.

Build an image using Buildx:

```bash
docker buildx build -t my-app:latest .
```

Build and load the image into the local Docker image store:

```bash
docker buildx build --load -t my-app:latest .
```

Without `--load`, the docker-container driver builds the image but does not make it available locally. You must specify either `--load` (stores locally) or `--push` (pushes to registry).

Build and push directly to a registry:

```bash
docker buildx build --push -t registry.example.com/myteam/my-app:v1.0.0 .
```

## Multi-Platform Builds

This is the killer feature of Buildx. Build a single image that works on AMD64, ARM64, and other architectures.

Build an image for both AMD64 and ARM64 platforms and push to registry:

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --push \
  -t registry.example.com/myteam/my-app:v1.0.0 \
  .
```

When someone pulls this image on an ARM-based server (like AWS Graviton), Docker automatically selects the correct architecture. No special handling needed on the pull side.

Build for even more platforms:

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64,linux/arm/v7 \
  --push \
  -t my-app:latest \
  .
```

You need QEMU emulation for cross-platform builds. Set it up with:

```bash
docker run --privileged --rm tonistiigi/binfmt --install all
```

Verify supported platforms on your builder:

```bash
docker buildx inspect --bootstrap
```

## Advanced Caching

Buildx supports external cache backends that survive between CI runs.

Build with inline cache metadata (stores cache info in the image itself):

```bash
docker buildx build \
  --cache-from type=registry,ref=registry.example.com/myteam/my-app:cache \
  --cache-to type=inline \
  --push \
  -t registry.example.com/myteam/my-app:latest \
  .
```

Use a dedicated registry cache (more efficient than inline):

```bash
docker buildx build \
  --cache-from type=registry,ref=registry.example.com/myteam/my-app:buildcache \
  --cache-to type=registry,ref=registry.example.com/myteam/my-app:buildcache,mode=max \
  --push \
  -t registry.example.com/myteam/my-app:latest \
  .
```

The `mode=max` option caches all build layers, not just the final image layers. This maximizes cache hits on subsequent builds.

Use a local directory as cache storage:

```bash
docker buildx build \
  --cache-from type=local,src=/tmp/buildx-cache \
  --cache-to type=local,dest=/tmp/buildx-cache \
  -t my-app:latest \
  --load \
  .
```

Use GitHub Actions cache (in CI pipelines):

```bash
docker buildx build \
  --cache-from type=gha \
  --cache-to type=gha,mode=max \
  --push \
  -t registry.example.com/myteam/my-app:latest \
  .
```

## Build Secrets

Pass secrets during build without baking them into image layers.

Build with a secret file:

```bash
docker buildx build \
  --secret id=npmrc,src=$HOME/.npmrc \
  -t my-app:latest \
  --load \
  .
```

In your Dockerfile, mount the secret where needed:

```dockerfile
# syntax=docker/dockerfile:1
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./

# Mount the npm config as a secret - it won't persist in the final image
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    npm ci --production

COPY . .
CMD ["node", "server.js"]
```

Pass SSH agent for private Git repos:

```bash
docker buildx build \
  --ssh default=$SSH_AUTH_SOCK \
  -t my-app:latest \
  --load \
  .
```

## Build Output Options

Buildx gives you control over where the build output goes.

Export the build result as a tar archive:

```bash
docker buildx build \
  --output type=tar,dest=my-app.tar \
  .
```

Export just the filesystem (no image metadata):

```bash
docker buildx build \
  --output type=local,dest=./output \
  .
```

This extracts the final filesystem to a local directory. Useful for creating deployment artifacts without Docker.

## Baking with Buildx

The `bake` command lets you define builds in HCL or JSON files, similar to how Docker Compose defines services.

Create a `docker-bake.hcl` file that defines multiple build targets:

```hcl
# docker-bake.hcl
group "default" {
  targets = ["api", "worker", "frontend"]
}

target "api" {
  dockerfile = "Dockerfile"
  context    = "./api"
  tags       = ["myregistry/api:latest"]
  platforms  = ["linux/amd64", "linux/arm64"]
}

target "worker" {
  dockerfile = "Dockerfile"
  context    = "./worker"
  tags       = ["myregistry/worker:latest"]
  platforms  = ["linux/amd64", "linux/arm64"]
}

target "frontend" {
  dockerfile = "Dockerfile"
  context    = "./frontend"
  tags       = ["myregistry/frontend:latest"]
  platforms  = ["linux/amd64"]
}
```

Build all targets defined in the bake file:

```bash
docker buildx bake
```

Build a specific target:

```bash
docker buildx bake api
```

Build and push all targets:

```bash
docker buildx bake --push
```

Override variables from the command line:

```bash
docker buildx bake --set "*.platform=linux/amd64"
```

## Practical CI/CD Example

Here is a GitHub Actions workflow that uses Buildx for multi-platform builds with caching:

```yaml
# .github/workflows/build.yml
name: Build and Push
on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: true
          tags: ghcr.io/${{ github.repository }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

## Cleaning Up Build Cache

Buildx maintains a build cache that can grow large over time.

View build cache disk usage:

```bash
docker buildx du
```

Clear the build cache:

```bash
docker buildx prune
```

Clear all build cache without confirmation:

```bash
docker buildx prune -a --force
```

## Quick Reference

| Command | Purpose |
|---------|---------|
| `docker buildx build` | Build images with BuildKit |
| `docker buildx create` | Create a new builder |
| `docker buildx use` | Switch active builder |
| `docker buildx ls` | List builders |
| `docker buildx inspect` | Show builder details |
| `docker buildx rm` | Remove a builder |
| `docker buildx bake` | Build from HCL/JSON definition |
| `docker buildx prune` | Clear build cache |
| `docker buildx du` | Show cache disk usage |

## Conclusion

Buildx is the modern way to build Docker images. Multi-platform builds let you target ARM and AMD64 from a single machine. External caching dramatically speeds up CI/CD pipelines. Secrets handling keeps credentials out of your image layers. The bake command gives you declarative multi-target builds. If you are not using Buildx yet, start by creating a builder with the docker-container driver and adding `--load` to your existing build commands. You will immediately benefit from BuildKit's parallel execution and better caching.
