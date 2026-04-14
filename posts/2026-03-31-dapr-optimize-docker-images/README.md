# How to Optimize Docker Images for Dapr Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Docker, Optimization, Container, Performance

Description: Learn how to reduce Docker image size and build time for Dapr applications using layer caching, slim base images, and multi-stage builds.

---

## Why Image Size Matters for Dapr Services

Smaller Docker images pull faster, reduce attack surface, and consume less disk space on nodes. Dapr deployments often involve many microservices, so optimizing each image multiplies the savings. The goal is a lean image that contains only runtime dependencies.

## Choosing the Right Base Image

Avoid full OS images when possible. Compare these common choices for a Go Dapr service:

| Base Image | Approximate Size |
|---|---|
| ubuntu:22.04 | 77 MB |
| golang:1.22 | 814 MB |
| golang:1.22-alpine | 247 MB |
| scratch (static binary) | 0 MB + binary |

Use `scratch` or `distroless` for compiled languages:

```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o server ./cmd/server

FROM gcr.io/distroless/static:nonroot
COPY --from=builder /app/server /server
EXPOSE 8080
ENTRYPOINT ["/server"]
```

## Layer Caching Strategy

Docker caches each layer. Put instructions that change rarely at the top and frequently-changing instructions at the bottom. For a Node.js service:

```dockerfile
FROM node:20-alpine

# Dependencies change rarely - cache this layer
COPY package*.json ./
RUN npm ci --omit=dev

# Source changes often - this layer rebuilds frequently
COPY src/ ./src/

CMD ["node", "src/index.js"]
```

If you put `COPY src/` before `npm ci`, every source change invalidates the cache for the `npm ci` layer, forcing a full reinstall.

## Removing Build Artifacts

For interpreted languages, remove caches and temp files in the same `RUN` layer to avoid adding them to the image:

```dockerfile
FROM python:3.12-slim

COPY requirements.txt ./
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc && \
    pip install --no-cache-dir -r requirements.txt && \
    apt-get purge -y gcc && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

COPY app/ ./app/
```

Combining commands with `&&` in a single `RUN` prevents intermediate layers from including the cache files.

## Scanning Images for Vulnerabilities

After optimizing, scan your image before pushing:

```bash
docker scout cves order-service:1.0.0
# or with trivy
trivy image order-service:1.0.0
```

Fix critical CVEs by updating the base image or pinning to a patched version:

```bash
docker pull node:20-alpine
docker build --no-cache -t order-service:1.0.1 .
```

## Measuring the Results

Compare image sizes before and after optimization:

```bash
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}" | grep order-service
```

Use `dive` to inspect layer content and spot large files:

```bash
dive order-service:1.0.0
```

## Summary

Optimizing Docker images for Dapr services means choosing minimal base images, structuring Dockerfile layers to maximize cache hits, and removing build artifacts in a single layer. Because Dapr sidecars are injected at runtime, your images only need to carry application code and its runtime dependencies, making lean images straightforward to achieve.
