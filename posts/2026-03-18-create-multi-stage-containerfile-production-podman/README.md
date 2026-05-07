# How to Create a Multi-Stage Containerfile for Production with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Multi-Stage Build, Containerfile, Production, DevOps

Description: Learn how to create multi-stage Containerfiles with Podman to build lean, secure production images by separating build tooling from runtime artifacts.

---

> Multi-stage builds let you use all the tooling you need to build your application, then ship only the result. Build with everything, ship with nothing extra.

A common mistake in container image building is shipping the entire build environment along with the application. Build tools, compilers, development dependencies, and source code all end up in the production image, bloating its size and expanding the attack surface. Multi-stage builds solve this by letting you define multiple build phases in a single Containerfile, copying only the final artifacts into a minimal runtime image. This guide covers multi-stage build patterns for production with Podman.

---

## What Is a Multi-Stage Build?

A multi-stage build uses multiple FROM instructions in a single Containerfile. Each FROM starts a new build stage with a fresh filesystem. You can selectively copy files from one stage to another using `COPY --from=`, discarding everything else.

The basic structure looks like this:

```dockerfile
# Stage 1: Build

FROM build-image AS builder
# ... build your application ...

# Stage 2: Runtime
FROM runtime-image
COPY --from=builder /app/output /app
```

Only the final stage produces the output image. All intermediate stages are discarded after the build completes.

## A Simple Multi-Stage Example

Compare a single-stage build with a multi-stage build for a Go application.

Single stage (large image):

```dockerfile
FROM golang:1.22

WORKDIR /app
COPY . .
RUN go build -o /server .

CMD ["/server"]
```

Multi-stage (small image):

```dockerfile
FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /server .

FROM alpine:3.19

RUN apk add --no-cache ca-certificates
COPY --from=builder /server /server

ENTRYPOINT ["/server"]
```

The single-stage image includes the entire Go toolchain (over 800 MB). The multi-stage image contains only the compiled binary and minimal Alpine (under 20 MB).

## Multi-Stage Node.js Production Build

Node.js applications benefit significantly from multi-stage builds because they separate build-time devDependencies from production dependencies:

```dockerfile
# Stage 1: Install all dependencies and build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build
RUN npm run test

# Stage 2: Production dependencies only
FROM node:20-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Stage 3: Runtime
FROM node:20-alpine

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]
```

This three-stage build separates concerns cleanly: stage 1 builds and tests, stage 2 installs only production dependencies, and stage 3 assembles the minimal runtime image.

## Multi-Stage Python Production Build

Python applications can use multi-stage builds to separate pip installations from the runtime:

```dockerfile
# Stage 1: Build dependencies
FROM python:3.12-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 2: Runtime
FROM python:3.12-slim

RUN groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

COPY . .

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:8000", "--workers", "4"]
```

The builder stage includes build-essential for compiling native extensions, but the runtime stage only contains the compiled packages.

## Multi-Stage Java Production Build

Java applications often have complex build processes with Maven or Gradle:

```dockerfile
# Stage 1: Build with Maven
FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /app

# Cache dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Build the application
COPY src ./src
RUN mvn package -DskipTests -B

# Extract layered JAR (Spring Boot)
RUN java -Djarmode=layertools -jar target/*.jar extract --destination /extracted

# Stage 2: Runtime
FROM eclipse-temurin:21-jre-alpine

RUN addgroup -g 1001 -S javauser && \
    adduser -u 1001 -S javauser -G javauser

WORKDIR /app

# Copy layers in order of least to most frequently changing
COPY --from=builder /extracted/dependencies/ ./
COPY --from=builder /extracted/spring-boot-loader/ ./
COPY --from=builder /extracted/snapshot-dependencies/ ./
COPY --from=builder /extracted/application/ ./

USER javauser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD wget -qO- http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
```

This build extracts Spring Boot's layered JAR format, which optimizes Docker layer caching by separating dependencies from application code.

## Multi-Stage with Frontend and Backend

Full-stack applications can build both frontend and backend in separate stages:

```dockerfile
# Stage 1: Build frontend
FROM node:20-alpine AS frontend

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ .
RUN npm run build

# Stage 2: Build backend
FROM golang:1.22-alpine AS backend

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download && go mod verify

COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /server ./cmd/server

# Stage 3: Runtime
FROM alpine:3.19

RUN apk add --no-cache ca-certificates && \
    addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

WORKDIR /app

COPY --from=backend /server ./server
COPY --from=frontend /app/dist ./static

USER appuser

EXPOSE 8080

ENTRYPOINT ["./server"]
```

The frontend and backend stages are independent and can be built in parallel by Podman's build engine when you use `podman build --jobs`.

## Named Stages and Build Targets

Named stages let you build specific stages in isolation, which is useful for development and CI:

```dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

FROM base AS deps
RUN npm ci

FROM base AS dev-deps
RUN npm ci

FROM dev-deps AS test
COPY . .
RUN npm run lint
RUN npm run test

FROM dev-deps AS build
COPY . .
RUN npm run build

FROM base AS production
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist

USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

Build specific targets:

```bash
# Run tests only
podman build --target test -t my-app:test .

# Build production image
podman build --target production -t my-app:latest .

# Build up to the build stage (useful for debugging)
podman build --target build -t my-app:build .
```

## Optimizing Layer Caching

Layer ordering is critical for build performance. Copy files that change least frequently first:

```dockerfile
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Layer 1: Go modules (changes infrequently)
COPY go.mod go.sum ./
RUN go mod download

# Layer 2: Source code (changes frequently)
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /server .

FROM alpine:3.19

# Layer 3: System dependencies (changes rarely)
RUN apk add --no-cache ca-certificates

# Layer 4: Application binary (changes with every build)
COPY --from=builder /server /server

ENTRYPOINT ["/server"]
```

If you change only your source code, layers 1 and 3 are cached. If you add a new dependency, layer 1 is rebuilt but layer 3 is still cached.

## Security Hardening in Multi-Stage Builds

Production images should follow security best practices:

```dockerfile
FROM golang:1.22-alpine AS builder

RUN apk add --no-cache ca-certificates tzdata

RUN addgroup -g 10001 -S appgroup && \
    adduser -u 10001 -S appuser -G appgroup

WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /server .

FROM scratch

# Security: CA certs and timezone
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

# Security: Non-root user
COPY --from=builder /etc/passwd /etc/passwd
COPY --from=builder /etc/group /etc/group

COPY --from=builder /server /server

USER appuser:appgroup

EXPOSE 8080

ENTRYPOINT ["/server"]
```

This image runs as non-root, has no shell for attackers to exploit, and includes only the files the application needs.

## Copying from External Images

You can copy files from any image, not just stages in the current build:

```dockerfile
FROM alpine:3.19

# Copy a binary from another published image
COPY --from=docker.io/bitnami/kubectl:latest /opt/bitnami/kubectl/bin/kubectl /usr/local/bin/

# Copy from a specific version
COPY --from=docker.io/library/nginx:1.25-alpine /etc/nginx/nginx.conf /etc/nginx/

CMD ["/bin/sh"]
```

This is useful for assembling tools from multiple sources without building them yourself.

## Best Practices

Order your stages logically: dependencies first, then build, then test, then production assembly. Name every stage for clarity and so you can target them individually. Copy dependency manifests before source code to maximize layer caching. Use the smallest possible base for your runtime stage (scratch, distroless, or Alpine). Never include build tools, source code, or test files in the production stage. Run your test suite as a build stage so broken tests prevent the production image from being built. Create a non-root user and use it in the final stage. Include health checks in the final stage for production readiness. Pin base image versions for reproducible builds.

## Conclusion

Multi-stage builds are the standard practice for creating production container images. They give you the freedom to use any tooling during the build phase while shipping only what your application needs to run. The patterns in this guide, from simple two-stage builds to complex multi-stage architectures with parallel stages, cover the most common production scenarios. Start with a simple two-stage build and evolve your Containerfile as your application's needs grow.
