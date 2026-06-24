# How to Configure Docker Buildx OpenTelemetry Support for Build Stage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Docker Buildx, Build Tracing, Performance

Description: Configure Docker Buildx to export OpenTelemetry traces for each build stage, enabling performance profiling of your container image builds.

Docker Buildx (and BuildKit under the hood) has native OpenTelemetry support. When enabled, it generates traces for BuildKit API calls and build operations. This helps you understand where your builds spend time and identify optimization opportunities like slow package installations, unnecessary layer copies, or cache misses.

## Enabling OpenTelemetry in Buildx

Start Jaeger, then create a `docker-container` builder with the `JAEGER_TRACE` environment variable passed to BuildKit:

```bash
# Start Jaeger for collecting and viewing traces
docker run -d --name jaeger \
  -p "6831:6831/udp" -p "16686:16686" \
  --restart unless-stopped \
  jaegertracing/all-in-one

# Create a Buildx builder that sends traces to Jaeger
docker buildx create --use \
  --name traced-builder \
  --driver docker-container \
  --driver-opt "network=host" \
  --driver-opt "env.JAEGER_TRACE=localhost:6831"

# Boot the builder
docker buildx inspect --bootstrap

# Run the build with tracing enabled
docker buildx build --progress=plain -t myapp:latest .
```

BuildKit reads the `JAEGER_TRACE` value from the builder environment and exports trace data to Jaeger. Build traces should be visible at `http://127.0.0.1:16686/`.

## Setting Up Jaeger for Build Traces

Run Jaeger before running your build:

```bash
docker run -d --name jaeger \
  -p "6831:6831/udp" -p "16686:16686" \
  --restart unless-stopped \
  jaegertracing/all-in-one
```

## Understanding Build Traces

A Docker build trace looks like this:

```text
docker.build                                    [total: 45s]
  moby.buildkit.v1.frontend.Solve              [2s]
    dockerfile.parse                            [100ms]
    dockerfile.resolve                          [200ms]
  moby.buildkit.v1.solver.Build                [43s]
    stage: base                                 [8s]
      FROM node:20-alpine                       [5s]  (cache miss, pull)
      WORKDIR /app                              [10ms]
    stage: deps                                 [15s]
      COPY package*.json ./                     [50ms]
      RUN npm install                           [14.5s]  <-- slow
    stage: build                                [12s]
      COPY . .                                  [500ms]
      RUN npm run build                         [11s]
    stage: runtime                              [8s]
      FROM node:20-alpine                       [10ms]  (cache hit)
      COPY --from=build /app/dist ./dist        [200ms]
```

From this trace, you can immediately see that `npm install` takes 14.5 seconds and `npm run build` takes 11 seconds. These are the optimization targets.

## Configuring the Tracing Environment

BuildKit's documented tracing configuration uses `JAEGER_TRACE`. If you change the trace destination, recreate or rebootstrap the builder so `buildkitd` starts with the new value:

```bash
docker buildx create --use \
  --name traced-builder \
  --driver docker-container \
  --driver-opt "network=host" \
  --driver-opt "env.JAEGER_TRACE=localhost:6831"

docker buildx inspect --bootstrap
```

## Using BuildKit Directly

If you use BuildKit directly (without Docker), set `JAEGER_TRACE` before starting `buildkitd` and `buildctl`:

```bash
# Start BuildKit with Jaeger tracing
export JAEGER_TRACE=localhost:6831

buildctl build \
  --frontend dockerfile.v0 \
  --local context=. \
  --local dockerfile=. \
  --output type=image,name=myapp:latest
```

## CI/CD Integration

Add build tracing to your CI pipeline. Here is a GitHub Actions example:

```yaml
# .github/workflows/build.yaml
name: Build with Tracing
on: push

jobs:
  build:
    runs-on: ubuntu-latest
    services:
      jaeger:
        image: jaegertracing/all-in-one
        ports:
          - 6831:6831/udp
          - 16686:16686

    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build with tracing
        run: |
          docker buildx create --use \
            --name traced-builder \
            --driver docker-container \
            --driver-opt "network=host" \
            --driver-opt "env.JAEGER_TRACE=localhost:6831"
          docker buildx inspect --bootstrap
          docker buildx build --progress=plain -t myapp:latest .
```

## Profiling Multi-Stage Builds

Multi-stage builds benefit the most from tracing because you can see which stages are slow and whether they execute in parallel:

```dockerfile
# Dockerfile with multiple stages
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
CMD ["node", "dist/index.js"]
```

The trace shows that `deps` and `build` stages can run in parallel (since they do not depend on each other), and the `runtime` stage waits for both to complete.

## Identifying Cache Misses

Build traces show which build operations ran and how long they took, while BuildKit's plain progress output marks cached steps as `CACHED`. A cache miss on `COPY package*.json ./` means the package files changed, triggering a full `npm install`. By tracking slow operations alongside cache hits and misses over time, you can identify Dockerfile patterns that frequently break the cache.

## Summary

Docker Buildx and BuildKit natively support OpenTelemetry tracing. Start Jaeger and pass `JAEGER_TRACE` to your Buildx builder, and your builds generate traces showing time spent in BuildKit operations. This is especially valuable in CI/CD pipelines where build performance directly impacts deployment speed. Look for slow package installations, cache misses, and stages that could run in parallel.
