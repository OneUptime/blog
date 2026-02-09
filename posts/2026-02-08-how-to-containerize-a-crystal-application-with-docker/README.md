# How to Containerize a Crystal Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Crystal, Containerization, DevOps, Web Development, Compiled Languages

Description: Step-by-step guide to containerizing Crystal applications with Docker, featuring static linking, multi-stage builds, and Kemal web framework examples.

---

Crystal combines Ruby-like syntax with C-like performance. It compiles to native binaries, which makes it a natural fit for Docker multi-stage builds. The resulting images can be incredibly small, especially with static linking. This guide covers containerizing Crystal applications from simple scripts to full Kemal web applications.

## Prerequisites

Docker needs to be installed on your machine. Crystal knowledge is helpful but not required. We will build a complete web application from scratch.

## Creating a Sample Crystal Application

Let's build a web application using Kemal, Crystal's most popular web framework.

Create the project structure:

```bash
# Create a new Crystal project
mkdir crystal-docker-demo
cd crystal-docker-demo
```

Create `shard.yml` (Crystal's dependency file):

```yaml
# shard.yml - Crystal project dependencies
name: crystal-docker-demo
version: 0.1.0

targets:
  server:
    main: src/server.cr

dependencies:
  kemal:
    github: kemalcr/kemal
    version: ~> 1.4.0

crystal: ">= 1.10.0"
```

Create the main application:

```crystal
# src/server.cr - Kemal web server with API endpoints
require "kemal"
require "json"

# Root endpoint
get "/" do
  "Hello from Crystal in Docker!"
end

# Health check endpoint for container orchestration
get "/health" do |env|
  env.response.content_type = "application/json"
  {
    status: "ok",
    crystal_version: Crystal::VERSION,
    pid: Process.pid
  }.to_json
end

# Computation endpoint demonstrating Crystal's performance
get "/compute" do |env|
  env.response.content_type = "application/json"

  # Compute prime numbers up to a limit
  limit = env.params.query.fetch("limit", "10000").to_i
  primes = [] of Int32

  (2..limit).each do |n|
    is_prime = true
    (2..Math.sqrt(n).to_i).each do |d|
      if n % d == 0
        is_prime = false
        break
      end
    end
    primes << n if is_prime
  end

  {
    limit: limit,
    count: primes.size,
    largest: primes.last
  }.to_json
end

# Read port from environment
port = ENV.fetch("PORT", "3000").to_i
Kemal.config.port = port
Kemal.config.host_binding = "0.0.0.0"
Kemal.run
```

## Basic Dockerfile

```dockerfile
# Basic Crystal Dockerfile
FROM crystallang/crystal:1.10.1

WORKDIR /app

# Copy dependency file and install shards
COPY shard.yml shard.lock* ./
RUN shards install --production

# Copy source code and build
COPY src/ src/
RUN crystal build src/server.cr --release -o bin/server

EXPOSE 3000

CMD ["./bin/server"]
```

This produces a working image but includes the entire Crystal compiler toolchain.

## Multi-Stage Build with Static Linking

Crystal supports static linking via musl, which produces a fully self-contained binary. This enables extremely small Docker images.

```dockerfile
# Stage 1: Build the Crystal binary with static linking
FROM crystallang/crystal:1.10.1-alpine AS builder

WORKDIR /app

# Install shards (dependencies)
COPY shard.yml shard.lock* ./
RUN shards install --production

# Copy source code
COPY src/ src/

# Build a statically linked release binary
RUN crystal build src/server.cr \
    --release \
    --static \
    --no-debug \
    -o bin/server

# Stage 2: Minimal runtime image
FROM alpine:3.19

WORKDIR /app

# Install CA certificates for HTTPS requests
RUN apk add --no-cache ca-certificates

# Copy the statically linked binary
COPY --from=builder /app/bin/server /app/server

# Create non-root user
RUN adduser -D -H appuser
USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["/app/server"]
```

## Scratch-Based Image for Minimum Size

Since the binary is statically linked, you can use `FROM scratch`:

```dockerfile
# Stage 1: Build
FROM crystallang/crystal:1.10.1-alpine AS builder

WORKDIR /app
COPY shard.yml shard.lock* ./
RUN shards install --production

COPY src/ src/
RUN crystal build src/server.cr --release --static --no-debug -o bin/server

# Stage 2: Scratch - contains only the binary
FROM scratch

# Copy SSL certificates for HTTPS support
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

COPY --from=builder /app/bin/server /server

EXPOSE 3000
CMD ["/server"]
```

This produces an image that is typically under 10 MB. That is smaller than most language runtimes alone.

## Image Size Comparison

| Approach | Image Size |
|----------|-----------|
| Full Crystal SDK | ~1.2 GB |
| Alpine multi-stage | ~15 MB |
| Scratch with static binary | ~8 MB |

The scratch approach reduces image size by over 99% compared to the full SDK.

## The .dockerignore File

```text
# .dockerignore - exclude unnecessary files
.git/
lib/
bin/
.shards/
shard.lock
*.dwarf
README.md
spec/
```

## Dependency Caching

Speed up Docker builds by caching shard downloads:

```dockerfile
# Optimized dependency caching with BuildKit
FROM crystallang/crystal:1.10.1-alpine AS builder

WORKDIR /app

COPY shard.yml shard.lock* ./

# Cache the shards directory across builds
RUN --mount=type=cache,target=/app/lib \
    --mount=type=cache,target=/root/.cache/shards \
    shards install --production

COPY src/ src/

RUN --mount=type=cache,target=/app/lib \
    crystal build src/server.cr --release --static --no-debug -o bin/server

FROM scratch
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /app/bin/server /server
EXPOSE 3000
CMD ["/server"]
```

## Docker Compose for Development

```yaml
# docker-compose.yml - development environment
version: "3.8"
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - ./src:/app/src
    environment:
      - PORT=3000
      - KEMAL_ENV=development

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: crystalapp
      POSTGRES_USER: crystal
      POSTGRES_PASSWORD: devpass
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

Development Dockerfile with sentinel for auto-rebuilding:

```dockerfile
# Dockerfile.dev - development image with sentry for auto-rebuild
FROM crystallang/crystal:1.10.1

WORKDIR /app

# Install sentry for watching file changes
RUN apt-get update && apt-get install -y inotify-tools && rm -rf /var/lib/apt/lists/*

COPY shard.yml shard.lock* ./
RUN shards install

COPY . .

EXPOSE 3000

# Build and run, rebuild on source changes
CMD ["crystal", "run", "src/server.cr"]
```

## Running Crystal Specs in Docker

Include a test stage in your multi-stage build:

```dockerfile
# Test stage
FROM crystallang/crystal:1.10.1-alpine AS test

WORKDIR /app
COPY shard.yml shard.lock* ./
RUN shards install

COPY . .
RUN crystal spec

# Build stage
FROM crystallang/crystal:1.10.1-alpine AS builder
# ... rest of build
```

Run tests without building the production image:

```bash
# Run only the test stage
docker build --target test -t crystal-test .
```

## Performance Characteristics

Crystal's compiled binaries start almost instantly and use minimal memory:

```bash
# Check startup time
time docker run --rm crystal-app:latest /server --help

# Check memory usage of a running container
docker stats crystal-app --no-stream
```

A basic Kemal application typically uses 5-10 MB of RAM, making Crystal one of the most memory-efficient options for web services.

## Handling C Library Dependencies

Some Crystal shards depend on C libraries. Handle these in the build stage:

```dockerfile
# Install C library dependencies needed by Crystal shards
FROM crystallang/crystal:1.10.1-alpine AS builder

RUN apk add --no-cache \
    sqlite-dev \
    sqlite-static \
    yaml-dev \
    yaml-static

WORKDIR /app
COPY shard.yml shard.lock* ./
RUN shards install --production

COPY src/ src/

# Static linking pulls in the C libraries
RUN crystal build src/server.cr --release --static --no-debug -o bin/server
```

## Monitoring

Crystal applications are fast and predictable, but you still need to monitor them in production. [OneUptime](https://oneuptime.com) can track your `/health` endpoint and alert you to availability issues. Crystal's low resource usage means you can run more containers per host, but that also means you need good monitoring to keep track of them all.

## Summary

Crystal is one of the best languages for Docker containerization. Its static linking support produces fully self-contained binaries that run in scratch-based images under 10 MB. The multi-stage build pattern is straightforward: compile in the Crystal Alpine image, copy the binary to scratch or Alpine. Combined with sub-millisecond startup times and minimal memory usage, Crystal containers are efficient and easy to scale. The main consideration is ensuring C library dependencies are available as static libraries during the build phase.
