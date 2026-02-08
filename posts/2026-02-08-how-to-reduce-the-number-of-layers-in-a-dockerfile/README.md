# How to Reduce the Number of Layers in a Dockerfile

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Dockerfile, Layers, Image Optimization, Build Performance, DevOps

Description: Practical techniques for reducing Docker image layers to improve build performance, reduce image size, and simplify debugging.

---

Every instruction in a Dockerfile that modifies the filesystem creates a new layer in the resulting image. Layers are the building blocks of Docker images, and while they enable powerful features like caching and image sharing, too many layers lead to larger images, slower pulls, and more complex debugging. Understanding what creates layers and how to minimize them is fundamental to writing efficient Dockerfiles.

This guide explains how layers work, which instructions create them, and practical techniques for keeping your layer count under control.

## Understanding Docker Layers

A Docker image is a stack of read-only layers. Each layer represents a set of filesystem changes: files added, modified, or deleted. When you run a container, Docker adds a thin writable layer on top.

Only certain Dockerfile instructions create layers:

| Instruction | Creates a Layer? | Description |
|------------|-----------------|-------------|
| FROM | Yes | Creates the base layer |
| RUN | Yes | Executes a command and saves the result |
| COPY | Yes | Copies files from the build context |
| ADD | Yes | Copies files (with extra features) |
| ENV | No* | Sets environment variable (metadata only) |
| EXPOSE | No | Documents a port (metadata only) |
| WORKDIR | No* | Sets the working directory (metadata only) |
| LABEL | No* | Adds metadata (metadata only) |
| CMD | No | Sets the default command (metadata only) |
| ENTRYPOINT | No | Sets the entry point (metadata only) |
| ARG | No | Defines a build argument |

*These instructions create very thin configuration layers in some Docker versions, but they do not contribute meaningfully to image size.

Check the layers in an existing image:

```bash
# View all layers and their sizes
docker history myapp:latest

# More detailed view
docker inspect myapp:latest | python3 -m json.tool | grep -A 5 "Layers"
```

## Technique 1: Combine RUN Instructions

This is the most impactful optimization. Each RUN instruction creates a new layer. Combining related commands into a single RUN reduces layers.

Before optimization (5 layers from RUN):

```dockerfile
FROM ubuntu:22.04
RUN apt-get update
RUN apt-get install -y curl
RUN apt-get install -y git
RUN apt-get install -y wget
RUN rm -rf /var/lib/apt/lists/*
```

After optimization (1 layer from RUN):

```dockerfile
FROM ubuntu:22.04

# Single RUN instruction combining all package operations
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      curl \
      git \
      wget \
    && rm -rf /var/lib/apt/lists/*
```

The optimized version creates one layer instead of five, and the cleanup (`rm -rf /var/lib/apt/lists/*`) actually reduces the layer size because it happens in the same instruction as the install.

## Technique 2: Clean Up in the Same Layer

Files deleted in a separate layer do not reduce the image size. Docker layers are additive. If you install 500MB of packages in one layer and delete them in the next, your image is still 500MB larger than it needs to be.

Bad - cleanup in a separate layer (space is NOT reclaimed):

```dockerfile
RUN apt-get update && apt-get install -y build-essential
RUN make install
RUN apt-get purge -y build-essential && apt-get autoremove -y
# The build-essential packages still exist in the first layer
```

Good - cleanup in the same layer:

```dockerfile
# Install, use, and remove build dependencies in one layer
RUN apt-get update && \
    apt-get install -y --no-install-recommends build-essential && \
    make install && \
    apt-get purge -y --auto-remove build-essential && \
    rm -rf /var/lib/apt/lists/*
```

## Technique 3: Use Multi-Stage Builds

Multi-stage builds are the most powerful technique for reducing both layers and image size. The final image only contains layers from the last stage.

```dockerfile
# Stage 1: Build (many layers, large image - discarded)
FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production (minimal layers, small image - this is the final image)
FROM nginx:alpine
# Only this COPY creates a layer in the final image
COPY --from=builder /app/dist /usr/share/nginx/html
```

The builder stage might have 10+ layers with Node.js, npm, source code, and build tools. The final image has just the nginx base layers plus one COPY layer. All the builder layers are discarded.

## Technique 4: Consolidate COPY Instructions

Multiple COPY instructions create multiple layers:

```dockerfile
# Bad - 4 COPY layers
COPY package.json /app/
COPY package-lock.json /app/
COPY tsconfig.json /app/
COPY src/ /app/src/
```

Consolidate where it makes sense:

```dockerfile
# Better - 2 COPY layers (preserving cache optimization for dependencies)
COPY package.json package-lock.json tsconfig.json /app/
COPY src/ /app/src/
```

However, do not over-consolidate. Keeping dependency files in a separate COPY from source code preserves build cache efficiency:

```dockerfile
# Optimal balance: 2 COPY layers for cache optimization
WORKDIR /app

# Dependencies change less often - cached separately
COPY package.json package-lock.json ./
RUN npm ci

# Source code changes frequently
COPY . .
```

## Technique 5: Use .dockerignore

While `.dockerignore` does not directly reduce layers, it reduces the build context size and prevents unnecessary files from being included in COPY layers.

```
# .dockerignore
node_modules
.git
.gitignore
*.md
.env
.env.*
docker-compose*.yml
Dockerfile*
.dockerignore
coverage/
.nyc_output/
test/
__pycache__
*.pyc
.pytest_cache
```

Without `.dockerignore`, `COPY . .` includes everything, making the COPY layer larger than necessary.

## Technique 6: Use Heredocs for File Creation

Instead of multiple COPY instructions for small configuration files, use heredocs:

Before (2 extra COPY layers):

```dockerfile
COPY nginx.conf /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
```

After (files created within a single RUN or COPY):

```dockerfile
# syntax=docker/dockerfile:1

# Create configuration files inline with a single COPY
COPY <<EOF /etc/nginx/nginx.conf
worker_processes auto;
events { worker_connections 1024; }
http {
    server {
        listen 80;
        location / { root /usr/share/nginx/html; }
    }
}
EOF
```

## Technique 7: Use the --squash Flag (Experimental)

Docker's experimental `--squash` flag compresses all layers created during a build into a single layer:

```bash
# Build with layer squashing (requires experimental features)
docker build --squash -t myapp:squashed .
```

This produces the smallest possible image in terms of layers, but it has a significant downside: it eliminates all layer sharing between images. If you have multiple images that share a common base, squashing means each image stores its own complete copy of that base.

For most use cases, multi-stage builds provide better results than squashing.

## Technique 8: Minimize Package Manager Artifacts

Package managers leave behind caches, indexes, and temporary files. Remove them in the same RUN instruction:

```dockerfile
# For apt (Debian/Ubuntu)
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

# For apk (Alpine)
RUN apk add --no-cache curl

# For pip (Python)
RUN pip install --no-cache-dir -r requirements.txt

# For npm (Node.js)
RUN npm ci --only=production && npm cache clean --force

# For yum/dnf (Red Hat/CentOS/Fedora)
RUN dnf install -y curl && \
    dnf clean all && \
    rm -rf /var/cache/dnf
```

The `--no-cache` and `--no-cache-dir` flags prevent caches from being created in the first place, which is better than creating and then deleting them.

## Counting Layers

Monitor your layer count and sizes:

```bash
# Count layers in an image
docker inspect myapp:latest --format='{{len .RootFS.Layers}}'

# Show each layer's size
docker history myapp:latest --format "table {{.CreatedBy}}\t{{.Size}}"

# Compare two images
docker history myapp:v1 --no-trunc --format "{{.Size}}" | paste -sd+ | bc
docker history myapp:v2 --no-trunc --format "{{.Size}}" | paste -sd+ | bc
```

## A Before and After Example

Let's see the full impact of these techniques on a real Dockerfile.

Before optimization:

```dockerfile
FROM python:3.11
RUN apt-get update
RUN apt-get install -y gcc
RUN apt-get install -y libpq-dev
RUN pip install flask
RUN pip install gunicorn
RUN pip install psycopg2
COPY requirements.txt /app/requirements.txt
COPY app.py /app/app.py
COPY config.py /app/config.py
COPY templates/ /app/templates/
WORKDIR /app
RUN apt-get remove -y gcc
RUN rm -rf /var/lib/apt/lists/*
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "app:app"]
```

After optimization:

```dockerfile
FROM python:3.11-slim AS builder

WORKDIR /app
COPY requirements.txt .
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq-dev && \
    pip install --no-cache-dir -r requirements.txt && \
    apt-get purge -y --auto-remove gcc && \
    rm -rf /var/lib/apt/lists/*

FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /usr/local/lib/python3.11/site-packages/ /usr/local/lib/python3.11/site-packages/
COPY --from=builder /usr/local/bin/gunicorn /usr/local/bin/gunicorn
COPY . .
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "app:app"]
```

The optimized version uses a multi-stage build, combines RUN instructions, uses the slim base image, and consolidates COPY operations. The result is a dramatically smaller image with fewer layers.

## Summary

Reducing layers in a Dockerfile comes down to combining RUN instructions, cleaning up in the same layer where you create files, using multi-stage builds, and consolidating COPY operations. Each technique addresses a different aspect of layer bloat. Multi-stage builds give you the biggest win by discarding entire build stages. Combining RUN instructions with cleanup prevents wasted space from deleted files lingering in earlier layers. Monitor your layer count with `docker history` and iterate until your images are lean and efficient.
