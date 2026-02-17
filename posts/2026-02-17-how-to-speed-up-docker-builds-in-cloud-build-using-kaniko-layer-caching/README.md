# How to Speed Up Docker Builds in Cloud Build Using Kaniko Layer Caching

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Build, Kaniko, Docker, Layer Caching, Build Optimization

Description: Learn how to use Kaniko with layer caching in Google Cloud Build to dramatically speed up your Docker image builds by reusing unchanged layers.

---

Docker builds on Cloud Build can be slow, especially for large applications with many dependencies. Every time a build runs, it starts from scratch - downloading base images, installing packages, and compiling code. Kaniko changes this by caching individual Docker layers in a container registry, so subsequent builds only rebuild layers that actually changed. In this post, I will show you how to switch from standard Docker builds to Kaniko builds in Cloud Build and how to get the most out of layer caching.

## Why Docker Builds Are Slow in Cloud Build

By default, Cloud Build runs each build in a fresh environment. There is no Docker daemon running between builds, which means there is no local image cache. Every single `docker build` command starts completely cold - it pulls the base image, runs every Dockerfile instruction from scratch, and produces the final image.

For a Node.js application, this means every build does a full `npm install` even if your package.json has not changed. For a Go application, it downloads all modules every time. For anything with system-level dependencies, it runs `apt-get install` on every build.

This is where Kaniko comes in.

## What Is Kaniko?

Kaniko is a tool developed by Google that builds container images from a Dockerfile inside a container, without needing a Docker daemon. The key feature for us is its ability to cache layers in a remote container registry and reuse them in subsequent builds.

When Kaniko builds an image, it checks each layer against the cache stored in your registry. If a layer's inputs have not changed, Kaniko skips rebuilding it and uses the cached version instead. This can reduce build times from minutes to seconds for layers that rarely change (like dependency installation).

## Switching from Docker to Kaniko

Here is a typical Cloud Build configuration using the standard Docker builder:

```yaml
# Standard Docker build - no layer caching
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/my-app:latest', '.']
images:
  - 'gcr.io/$PROJECT_ID/my-app:latest'
```

Here is the equivalent using Kaniko with layer caching:

```yaml
# Kaniko build with layer caching enabled
steps:
  - name: 'gcr.io/kaniko-project/executor:latest'
    args:
      - '--destination=gcr.io/$PROJECT_ID/my-app:latest'
      - '--cache=true'
      - '--cache-ttl=72h'
```

That is the core change. Replace the Docker builder with the Kaniko executor and add the `--cache=true` flag. Notice that there is no separate `images` section - Kaniko pushes the image as part of the build step.

## Understanding the Kaniko Flags

Let's break down the important Kaniko flags:

### Essential Flags

```yaml
# Core Kaniko configuration flags
args:
  # Where to push the final image
  - '--destination=gcr.io/$PROJECT_ID/my-app:$SHORT_SHA'

  # Enable layer caching
  - '--cache=true'

  # How long cached layers are valid (default is 2 weeks)
  - '--cache-ttl=168h'

  # Where to store cached layers (defaults to same registry as destination)
  - '--cache-repo=gcr.io/$PROJECT_ID/my-app/cache'
```

### Performance Flags

```yaml
# Additional flags that can improve build performance
args:
  - '--destination=gcr.io/$PROJECT_ID/my-app:latest'
  - '--cache=true'

  # Use snapshotting mode for faster layer creation
  - '--snapshot-mode=redo'

  # Skip unnecessary file system scans
  - '--skip-unused-stages=true'

  # Compress layers in parallel
  - '--compressed-caching=false'
```

### Build Configuration Flags

```yaml
# Flags for customizing the build itself
args:
  - '--destination=gcr.io/$PROJECT_ID/my-app:latest'
  - '--cache=true'

  # Use a specific Dockerfile
  - '--dockerfile=Dockerfile.production'

  # Set the build context
  - '--context=dir:///workspace'

  # Pass build arguments
  - '--build-arg=NODE_ENV=production'
  - '--build-arg=APP_VERSION=$SHORT_SHA'
```

## Optimizing Your Dockerfile for Kaniko Caching

Kaniko caching works best when your Dockerfile is structured so that frequently changing steps come last. The classic optimization applies here:

```dockerfile
# Dockerfile optimized for layer caching
FROM node:20-alpine

WORKDIR /app

# Step 1: Copy only package files first
# This layer only rebuilds when dependencies change
COPY package.json package-lock.json ./

# Step 2: Install dependencies
# Cached as long as package files have not changed
RUN npm ci --production

# Step 3: Copy application source
# This layer changes on every commit, but previous layers are cached
COPY . .

# Step 4: Build the application
RUN npm run build

EXPOSE 8080
CMD ["node", "dist/server.js"]
```

With this structure, if you only change application code (not dependencies), Kaniko reuses the cached layers for steps 1 and 2 and only rebuilds from step 3 onward. For a typical Node.js app with hundreds of megabytes of node_modules, this can save several minutes per build.

## A Complete Cloud Build Configuration with Kaniko

Here is a production-ready cloudbuild.yaml that uses Kaniko:

```yaml
# Production build with Kaniko caching and multiple tags
steps:
  # Step 1: Run tests before building the image
  - name: 'node:20'
    id: 'install-deps'
    args: ['npm', 'ci']

  - name: 'node:20'
    id: 'run-tests'
    args: ['npm', 'test']

  # Step 2: Build and push the image using Kaniko
  - name: 'gcr.io/kaniko-project/executor:latest'
    id: 'build-push'
    args:
      - '--destination=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:$SHORT_SHA'
      - '--destination=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:latest'
      - '--cache=true'
      - '--cache-ttl=168h'
      - '--cache-repo=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app/cache'

timeout: 1200s
options:
  machineType: 'E2_HIGHCPU_8'
```

Notice that you can specify multiple `--destination` flags to push the image with different tags in a single build step.

## Cache Location and Management

By default, Kaniko stores cached layers in the same registry and repository as the destination image. Each cached layer is stored as a separate image tagged with a hash of its contents.

You can specify a different cache location with `--cache-repo`:

```yaml
# Store cache in a dedicated repository
args:
  - '--destination=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/my-app:latest'
  - '--cache=true'
  - '--cache-repo=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/build-cache'
```

This keeps your production image repository clean and separates cache artifacts from actual release images.

### Cache TTL

The `--cache-ttl` flag controls how long cached layers remain valid. After the TTL expires, Kaniko rebuilds the layer even if the inputs have not changed. The default is two weeks.

For production builds, a TTL of one to two weeks is reasonable. For development builds where you want the freshest dependencies, you might use a shorter TTL or periodically force a full rebuild.

### Clearing the Cache

To force a full rebuild without cache:

```yaml
# Force a clean build by disabling cache
steps:
  - name: 'gcr.io/kaniko-project/executor:latest'
    args:
      - '--destination=gcr.io/$PROJECT_ID/my-app:latest'
      - '--cache=false'
```

To clean up old cached layers from the registry, use the gcloud CLI:

```bash
# List cached layer images in the repository
gcloud artifacts docker images list \
  us-central1-docker.pkg.dev/my-project/my-repo/build-cache \
  --include-tags

# Delete old cached images
gcloud artifacts docker images delete \
  us-central1-docker.pkg.dev/my-project/my-repo/build-cache@sha256:abc123 \
  --quiet
```

## Measuring the Performance Improvement

To understand how much time Kaniko caching saves, compare build times with and without caching enabled. In Cloud Build, click on a specific build run to see the duration of each step.

Typical improvements I have seen:

- **First build (cold cache)** - About the same as a regular Docker build, sometimes slightly slower because Kaniko pushes cache layers
- **Second build (unchanged dependencies)** - 2x to 5x faster, depending on how much of the Dockerfile is cached
- **Subsequent builds (only code changes)** - Can be 10x faster if dependency installation is the bottleneck

For a Node.js application that takes 5 minutes with a cold build, Kaniko caching typically brings it down to 1-2 minutes for builds where only application code changes.

## Kaniko vs Docker cache-from

Cloud Build also supports the `--cache-from` flag with the standard Docker builder. Both approaches solve the same problem, but there are differences:

- **Kaniko** - Caches individual layers, more granular, works without a Docker daemon
- **Docker cache-from** - Pulls a complete image and uses it as a cache source, less granular but simpler

Kaniko generally provides better cache hit rates because it caches at the layer level. Docker's `--cache-from` is an all-or-nothing approach for each layer and requires pulling the full previous image first.

## Troubleshooting

**Cache misses when you expect hits** - Make sure the cache repo is consistent across builds. If different triggers point to different cache repos, they will not share cache.

**Build fails with registry permission errors** - The Cloud Build service account needs push access to both the destination and cache repositories.

**Build is slower with caching enabled** - This can happen on the first build or when most layers change. The overhead of pushing cache layers adds time. Give it a few builds to see the benefit.

## Wrapping Up

Kaniko layer caching is one of the highest-impact optimizations you can make to your Cloud Build pipelines. The switch from the Docker builder to Kaniko is a small configuration change, but the build time savings compound over every build your team runs. Structure your Dockerfile to maximize cache hits, set an appropriate TTL, and enjoy faster builds.
