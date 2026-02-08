# How to Implement the Builder Pattern in Docker Multi-Stage Builds

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Builder Pattern, Multi-Stage Builds, Dockerfile, Image Optimization, DevOps

Description: Implement the Builder pattern with Docker multi-stage builds to create small, secure production images by separating build and runtime stages.

---

The Builder pattern in Docker separates the build environment from the runtime environment. Your build stage includes compilers, package managers, test frameworks, and everything needed to produce your application binary or bundle. Your runtime stage includes only the final artifact and its dependencies. The result is a production image that can be ten times smaller and far more secure than a single-stage build.

Multi-stage builds are Docker's native implementation of the Builder pattern. They were introduced in Docker 17.05 and have become the standard approach for production images.

## The Problem with Single-Stage Builds

A typical single-stage Dockerfile for a Go application looks like this:

```dockerfile
# Single-stage build - the final image contains everything
FROM golang:1.22
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o server .
CMD ["./server"]
```

This image will be over 800MB because it includes the entire Go toolchain, source code, module cache, and build artifacts. In production, you only need the compiled binary. That binary might be 15MB.

## The Builder Pattern Solution

Multi-stage builds solve this by using multiple `FROM` statements. Each `FROM` starts a new stage. You copy only the artifacts you need from earlier stages into the final image.

A multi-stage Dockerfile that builds a Go binary and packages it in a minimal image:

```dockerfile
# Stage 1: Build
# Uses the full Go toolchain to compile the application
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o server .

# Stage 2: Runtime
# Only contains the compiled binary and CA certificates
FROM alpine:3.19
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /app/server .
EXPOSE 8080
CMD ["./server"]
```

The final image is around 20MB instead of 800MB. It contains no compiler, no source code, no build tools.

## Builder Pattern for Node.js

Node.js applications benefit greatly from multi-stage builds because they separate build dependencies (TypeScript compiler, webpack, etc.) from production dependencies.

Multi-stage build for a TypeScript Node.js application:

```dockerfile
# Stage 1: Install all dependencies and compile TypeScript
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Stage 2: Install only production dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --production && npm cache clean --force

# Stage 3: Final runtime image
FROM node:20-alpine
WORKDIR /app
# Copy only the compiled JavaScript and production node_modules
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./
EXPOSE 3000
USER node
CMD ["node", "dist/server.js"]
```

This uses three stages. The first compiles TypeScript with devDependencies. The second installs only production dependencies. The third stage assembles the final image with just the compiled code and minimal modules.

## Builder Pattern for Java

Java applications are notorious for large images. Multi-stage builds with jlink can create dramatically smaller images.

Multi-stage build for a Spring Boot application with custom JRE:

```dockerfile
# Stage 1: Build the application with Maven
FROM maven:3.9-eclipse-temurin-21 AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn package -DskipTests -B

# Stage 2: Create a minimal custom JRE
FROM eclipse-temurin:21-jdk AS jre-builder
RUN jlink \
    --add-modules java.base,java.logging,java.sql,java.naming,java.net.http,java.security.jgss,java.instrument \
    --strip-debug \
    --no-man-pages \
    --no-header-files \
    --compress=2 \
    --output /custom-jre

# Stage 3: Final runtime image
FROM debian:bookworm-slim
COPY --from=jre-builder /custom-jre /opt/java
COPY --from=builder /app/target/*.jar /app/app.jar
ENV PATH="/opt/java/bin:${PATH}"
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
```

The first stage builds the JAR with Maven. The second stage uses jlink to create a custom JRE containing only the modules your application needs. The final image uses Debian slim with just the custom JRE and your JAR. The result is typically 100-150MB instead of 500MB+.

## Builder Pattern for Rust

Rust produces statically linked binaries, making it perfect for the builder pattern with scratch or distroless base images.

Multi-stage build for a Rust application targeting a scratch image:

```dockerfile
# Stage 1: Build the Rust application
FROM rust:1.75 AS builder
WORKDIR /app
COPY Cargo.toml Cargo.lock ./
# Create a dummy main to cache dependency compilation
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release
# Remove the dummy build artifacts
RUN rm -rf src target/release/deps/myapp*
# Copy real source and build
COPY src ./src
RUN cargo build --release

# Stage 2: Minimal runtime image
FROM gcr.io/distroless/cc-debian12
COPY --from=builder /app/target/release/myapp /
EXPOSE 8080
CMD ["/myapp"]
```

The trick with the dummy `main.rs` caches the dependency compilation step. When you change your source code but not your dependencies, Docker reuses the cached layer with all compiled dependencies. This dramatically speeds up builds.

## Builder Pattern for Python

Python is trickier because it is interpreted, but multi-stage builds still help by separating package installation from runtime.

Multi-stage build for a Python application using virtual environment:

```dockerfile
# Stage 1: Build dependencies in a virtual environment
FROM python:3.12-slim AS builder
WORKDIR /app
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: Copy the virtual environment into a clean image
FROM python:3.12-slim
WORKDIR /app
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY . .
EXPOSE 8000
USER nobody
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "app:create_app()"]
```

The build stage installs all packages (which may require build tools like gcc for packages with C extensions). The runtime stage only carries the pre-built virtual environment.

## Builder Pattern for Frontend Applications

React, Vue, and Angular apps compile to static files. The builder pattern lets you build with Node.js and serve with Nginx.

Multi-stage build that compiles a React app and serves it with Nginx:

```dockerfile
# Stage 1: Build the React application
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve static files with Nginx
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

The final image is around 25MB. It contains only Nginx and the compiled static files. No Node.js, no source code, no node_modules.

## Advanced: Named Stages and Selective Copies

You can name stages and reference them in multiple COPY instructions.

Use named stages to share artifacts between build phases:

```dockerfile
FROM golang:1.22-alpine AS builder
WORKDIR /app
COPY . .
RUN go build -o api ./cmd/api
RUN go build -o worker ./cmd/worker
RUN go build -o migrate ./cmd/migrate

# API image
FROM alpine:3.19 AS api
RUN apk --no-cache add ca-certificates
COPY --from=builder /app/api /usr/local/bin/api
CMD ["api"]

# Worker image
FROM alpine:3.19 AS worker
RUN apk --no-cache add ca-certificates
COPY --from=builder /app/worker /usr/local/bin/worker
CMD ["worker"]

# Migration image
FROM alpine:3.19 AS migrate
RUN apk --no-cache add ca-certificates
COPY --from=builder /app/migrate /usr/local/bin/migrate
CMD ["migrate"]
```

Build a specific target stage:

```bash
docker build --target api -t my-app-api:latest .
docker build --target worker -t my-app-worker:latest .
docker build --target migrate -t my-app-migrate:latest .
```

This single Dockerfile produces three optimized images from one build stage.

## Size Comparison

Here is what you can expect from applying the builder pattern:

| Application | Single-Stage | Multi-Stage | Reduction |
|------------|-------------|-------------|-----------|
| Go API | 850MB | 20MB | 97% |
| Node.js + TypeScript | 1.2GB | 180MB | 85% |
| Java Spring Boot | 650MB | 140MB | 78% |
| React Frontend | 1.4GB | 25MB | 98% |
| Rust CLI | 1.8GB | 12MB | 99% |

## Conclusion

The Builder pattern through multi-stage builds is the single most impactful optimization you can make to your Docker images. Smaller images pull faster, start faster, and have fewer security vulnerabilities because they contain fewer packages. Every production Dockerfile should use at least two stages. Start by separating your build tools from your runtime, copy only the artifacts you need, and choose the smallest possible base image for your final stage.
