# How to Configure Docker Buildx OpenTelemetry Support for Build Stage Performance Tracing and Profiling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Docker Buildx, Build Tracing, Performance

Description: Configure Docker Buildx to export OpenTelemetry traces for each build stage, enabling performance profiling of your container image builds.

Docker Buildx (and BuildKit under the hood) has native OpenTelemetry support. When enabled, it generates traces for each build stage, layer, and operation. This helps you understand where your builds spend time and identify optimization opportunities like slow package installations, unnecessary layer copies, or cache misses.

## Enabling OpenTelemetry in Buildx

Set the `OTEL_EXPORTER_OTLP_ENDPOINT` environment variable before running your build:

```bash
# Point Buildx at your Collector
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317

# Run the build with tracing enabled
docker buildx build --progress=plain -t myapp:latest .
```

BuildKit detects the `OTEL_EXPORTER_OTLP_ENDPOINT` variable and automatically exports trace data. No additional flags are needed.

## Setting Up a Collector for Build Traces

Configure a Collector to receive and forward build traces:

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 10s
    send_batch_size: 256

  resource:
    attributes:
      - key: ci.pipeline
        value: "docker-build"
        action: upsert

exporters:
  otlp:
    endpoint: "your-tracing-backend:4317"
    tls:
      insecure: false

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [otlp]
```

Start the Collector before running your build:

```bash
docker run -d --name otel-collector \
  -p 4317:4317 -p 4318:4318 \
  -v ./otel-collector-config.yaml:/etc/otelcol-contrib/config.yaml \
  otel/opentelemetry-collector-contrib:latest
```

## Understanding Build Traces

A Docker build trace looks like this:

```
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

## Configuring Additional OTEL Variables

Fine-tune the trace output with standard OpenTelemetry environment variables:

```bash
# Service name for the build traces
export OTEL_SERVICE_NAME=docker-build

# Add custom resource attributes
export OTEL_RESOURCE_ATTRIBUTES="ci.job=build-image,git.branch=main"

# Use HTTP instead of gRPC
export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

## Using BuildKit Directly

If you use BuildKit directly (without Docker), tracing works the same way:

```bash
# Start BuildKit with OTLP export
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
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
      otel-collector:
        image: otel/opentelemetry-collector-contrib:latest
        ports:
          - 4317:4317
        volumes:
          - ./otel-collector-config.yaml:/etc/otelcol-contrib/config.yaml

    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build with tracing
        env:
          OTEL_EXPORTER_OTLP_ENDPOINT: http://localhost:4317
          OTEL_SERVICE_NAME: ci-build
          OTEL_RESOURCE_ATTRIBUTES: >-
            ci.pipeline.id=${{ github.run_id }},
            git.commit.sha=${{ github.sha }},
            git.branch=${{ github.ref_name }}
        run: |
          docker buildx build --progress=plain -t myapp:latest .
```

## Profiling Multi-Stage Builds

Multi-stage builds benefit the most from tracing because you can see which stages are slow and whether they execute in parallel:

```dockerfile
# Dockerfile with multiple stages
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --production

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

Build traces show whether each layer was a cache hit or miss. A cache miss on `COPY package*.json ./` means the package files changed, triggering a full `npm install`. By tracking cache hit rates over time, you can identify Dockerfile patterns that frequently break the cache.

## Summary

Docker Buildx and BuildKit natively support OpenTelemetry tracing. Set `OTEL_EXPORTER_OTLP_ENDPOINT` and your builds generate detailed traces showing time spent in each stage and layer. This is especially valuable in CI/CD pipelines where build performance directly impacts deployment speed. Look for slow package installations, cache misses, and stages that could run in parallel.
