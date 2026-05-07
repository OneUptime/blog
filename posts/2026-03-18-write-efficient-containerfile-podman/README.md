# How to Write an Efficient Containerfile for Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Containerfile, Container, DevOps, Optimization

Description: Learn how to write efficient Containerfiles for Podman that produce smaller, faster, and more secure container images through layering strategies, caching, and best practices.

---

> Writing an efficient Containerfile is the foundation of building production-ready container images with Podman. By understanding how layers, caching, and instruction ordering work, you can dramatically reduce build times and image sizes.

If you are building container images with Podman, the Containerfile is the blueprint that defines everything about your image. A poorly written Containerfile can lead to bloated images, slow builds, and security vulnerabilities. An efficient one produces lean, fast, and secure containers that are a joy to deploy.

Podman uses Containerfiles (also compatible with Dockerfiles) to build images. While the syntax is familiar, there are specific strategies you should follow to get the most out of your builds. This guide walks you through the key principles and practical techniques for writing Containerfiles that perform well in production.

---

## Understanding Image Layers

Filesystem-changing instructions in a Containerfile, such as `COPY`, `ADD`, and `RUN`, create layers in the resulting image. Podman caches intermediate build layers by default, so they can be reused in subsequent builds. Understanding this layering mechanism is the first step toward writing efficient Containerfiles.

```dockerfile
# COPY and RUN instructions here create separate filesystem layers

FROM node:24-alpine
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
RUN npm run build
```

When you rebuild this image, Podman processes the instructions from top to bottom. If an instruction and the files it depends on have not changed, the cached result can be reused. This means the order of your instructions matters significantly for build performance.

## Ordering Instructions for Cache Efficiency

Place instructions that change less frequently near the top of your Containerfile, and instructions that change often near the bottom. This maximizes cache hits during rebuilds.

```dockerfile
# Good: Dependencies are installed before copying source code
FROM python:3.12-slim

WORKDIR /app

# These rarely change - cached most of the time
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Source code changes frequently - only this layer and below rebuild
COPY . .

CMD ["python", "app.py"]
```

Compare this with a less efficient approach:

```dockerfile
# Bad: Copying everything first invalidates the cache on every code change
FROM python:3.12-slim

WORKDIR /app

COPY . .
RUN pip install --no-cache-dir -r requirements.txt

CMD ["python", "app.py"]
```

In the bad example, any change to your source code forces a complete reinstallation of all dependencies, wasting time on every build.

## Minimizing the Number of Layers

Combine related commands into single RUN instructions to reduce the total number of layers. Each layer adds metadata overhead and increases image size.

```dockerfile
# Good: Single RUN instruction with cleanup
RUN dnf install -y \
    gcc \
    make \
    openssl-devel \
    && dnf clean all \
    && rm -rf /var/cache/dnf

# Bad: Multiple RUN instructions without cleanup
RUN dnf install -y gcc
RUN dnf install -y make
RUN dnf install -y openssl-devel
```

The combined approach creates one layer instead of three and includes cleanup in the same layer, so the package cache never makes it into the final image.

## Using Multi-Stage Builds

Multi-stage builds are one of the most powerful techniques for creating efficient images. They let you use one stage for building your application and another for running it, keeping build tools out of the final image.

```dockerfile
# Stage 1: Build
FROM golang:1.26-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o server .

# Stage 2: Runtime
FROM alpine:3.23

RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /app/server .

USER 1001
EXPOSE 8080
CMD ["./server"]
```

The final image contains only the compiled binary and a minimal Alpine base, not the Go compiler or any build dependencies. This can reduce image size from hundreds of megabytes to just a few.

## Choosing the Right Base Image

Your base image has an outsized impact on the final image size and security posture. Prefer minimal base images whenever possible.

```dockerfile
# Full image
FROM node:24

# Slim variant
FROM node:24-slim

# Alpine variant
FROM node:24-alpine

# Distroless runtime image
FROM gcr.io/distroless/nodejs24-debian13
```

Slim, Alpine, and distroless variants are often smaller than the full image, although exact sizes vary by architecture and over time. Alpine-based images use musl libc instead of glibc, which can cause compatibility issues with some native modules. Test your application thoroughly when switching base images.

## Using .containerignore Files

A `.containerignore` file prevents unnecessary files from being included in the build context, which speeds up builds and prevents sensitive data from leaking into images.

```plaintext
# .containerignore
node_modules
.git
.env
*.md
.github
dist
coverage
.vscode
```

Without a `.containerignore` file, Podman uses the full build context directory when evaluating `COPY` and `ADD`, including potentially large directories like `node_modules` or `.git`.

## Leveraging Build Arguments and Environment Variables

Use ARG for build-time configuration and ENV for runtime configuration. Keep them separate and purposeful.

```dockerfile
FROM python:3.12-slim

ARG APP_VERSION=1.0.0
ENV APP_ENV=production
ENV APP_VERSION=${APP_VERSION}

WORKDIR /app
COPY . .
RUN pip install --no-cache-dir -r requirements.txt

CMD ["python", "app.py"]
```

Build with a custom version:

```bash
podman build --build-arg APP_VERSION=2.1.0 -t myapp:2.1.0 .
```

## Running as a Non-Root User

Always run your containers as a non-root user. This is a fundamental security practice that limits the damage an attacker can do if they compromise your application.

```dockerfile
FROM node:24-alpine

WORKDIR /app
COPY --chown=node:node . .
RUN npm ci --omit=dev

USER node
EXPOSE 3000
CMD ["node", "server.js"]
```

## Adding Health Checks

Health checks let Podman and other tooling that reads container health status know whether your application is actually working, not just running.

```dockerfile
FROM nginx:alpine

COPY nginx.conf /etc/nginx/nginx.conf
COPY dist/ /usr/share/nginx/html/

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q --spider http://localhost:80/ || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Putting It All Together

Here is a complete, production-ready Containerfile that applies all the principles discussed:

```dockerfile
# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build && npm prune --omit=dev

# Production stage
FROM node:24-alpine

RUN apk --no-cache add tini

WORKDIR /app

COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -q --spider http://localhost:3000/health || exit 1

ENTRYPOINT ["tini", "--"]
CMD ["node", "dist/server.js"]
```

## Conclusion

Writing efficient Containerfiles for Podman is about understanding how layers and caching work, then applying that understanding systematically. Order your instructions for maximum cache reuse, use multi-stage builds to keep final images lean, choose minimal base images, and always run as a non-root user. These practices reduce build times, shrink image sizes, and improve the security of your containerized applications. Start applying these techniques to your next Containerfile and measure the difference in both image size and build speed.
