# How to Containerize a V Language Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, V Language, Containerization, DevOps, Compiled Languages, Web Development

Description: A practical guide to containerizing V language applications with Docker, covering Vweb servers, static compilation, and lightweight production images.

---

V is a compiled systems programming language that emphasizes simplicity and fast compilation. It compiles directly to C and then to native machine code, producing small binaries with minimal dependencies. Docker pairs well with V because the language's design goals, small binaries, fast builds, and minimal runtime, align perfectly with container best practices. This guide walks through containerizing V applications for production.

## Prerequisites

Docker must be installed on your machine. V is a newer language, so we will cover installation within Docker itself. Basic programming knowledge is sufficient to follow along.

## Creating a Sample V Web Application

V includes a built-in web framework called Vweb. Let's build an API server with it.

Create the project directory:

```bash
mkdir v-docker-demo
cd v-docker-demo
```

Create the main application file:

```v
// main.v - Vweb HTTP server
module main

import vweb
import json
import os
import time

struct App {
    vweb.Context
}

// Root handler
['/']
pub fn (mut app App) index() vweb.Result {
    return app.text('Hello from V in Docker!')
}

// Health check endpoint
['/health']
pub fn (mut app App) health() vweb.Result {
    response := {
        'status': 'ok'
        'language': 'V'
        'timestamp': time.now().format_rfc3339()
    }
    return app.json(response)
}

// Computation endpoint
['/compute']
pub fn (mut app App) compute() vweb.Result {
    // Calculate sum of squares
    mut sum := i64(0)
    for i in 1 .. 1_000_001 {
        sum += i64(i) * i64(i)
    }
    result := {
        'computation': 'sum_of_squares'
        'n': '1000000'
        'result': '${sum}'
    }
    return app.json(result)
}

fn main() {
    port := (os.getenv_opt('PORT') or { '8080' }).int()
    println('Starting V server on port ${port}')
    vweb.run(&App{}, port)
}
```

## Basic Dockerfile

Since V is not available in standard package repositories, we build it from source inside Docker:

```dockerfile
# Basic V Dockerfile - builds V compiler and application
FROM ubuntu:22.04

# Install build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    git gcc make curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt

# Clone and build V compiler
RUN git clone --depth 1 https://github.com/vlang/v.git && \
    cd v && \
    make && \
    ln -s /opt/v/v /usr/local/bin/v

WORKDIR /app

# Copy and compile the application
COPY . .
RUN v -prod -o server main.v

EXPOSE 8080

CMD ["./server"]
```

This creates a large image because it contains the V compiler and all build tools. Let's fix that.

## Multi-Stage Build for Production

```dockerfile
# Stage 1: Build V compiler and compile the application
FROM ubuntu:22.04 AS builder

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    git gcc make curl ca-certificates musl-tools \
    && rm -rf /var/lib/apt/lists/*

# Build V compiler
WORKDIR /opt
RUN git clone --depth 1 https://github.com/vlang/v.git && \
    cd v && \
    make && \
    ln -s /opt/v/v /usr/local/bin/v

WORKDIR /app
COPY . .

# Compile with production optimizations using musl for static linking
RUN v -prod -cc musl-gcc -cflags "-static" -o server main.v

# Verify static linking
RUN file server

# Stage 2: Minimal runtime
FROM alpine:3.19

WORKDIR /app

RUN apk add --no-cache ca-certificates

COPY --from=builder /app/server /app/server

# Create non-root user
RUN adduser -D -H vuser
USER vuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["/app/server"]
```

## Scratch-Based Image

With static linking, you can go even smaller:

```dockerfile
# Stage 1: Build
FROM ubuntu:22.04 AS builder

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    git gcc make curl ca-certificates musl-tools \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt
RUN git clone --depth 1 https://github.com/vlang/v.git && \
    cd v && make && ln -s /opt/v/v /usr/local/bin/v

WORKDIR /app
COPY . .
RUN v -prod -cc musl-gcc -cflags "-static" -o server main.v

# Stage 2: Just the binary
FROM scratch

COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /app/server /server

EXPOSE 8080
CMD ["/server"]
```

The final image is typically under 5 MB.

## Caching the V Compiler Build

Building V from source adds time to every Docker build. Cache it effectively:

```dockerfile
# Stage 1: Build V compiler (changes rarely)
FROM ubuntu:22.04 AS v-compiler

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    git gcc make musl-tools \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt
RUN git clone --depth 1 https://github.com/vlang/v.git && \
    cd v && make

# Stage 2: Compile application (changes frequently)
FROM v-compiler AS builder

WORKDIR /app
COPY . .
RUN /opt/v/v -prod -cc musl-gcc -cflags "-static" -o server main.v

# Stage 3: Runtime
FROM scratch
COPY --from=builder /app/server /server
EXPOSE 8080
CMD ["/server"]
```

Docker caches the V compiler build stage. When only your application source changes, rebuilds are fast.

## The .dockerignore File

```text
# .dockerignore
.git/
*.o
server
README.md
Dockerfile
docker-compose.yml
.gitignore
```

## V Module Dependencies

V uses `v.mod` for project metadata and dependencies:

```
// v.mod - V module file
Module {
    name: 'v_docker_demo'
    description: 'V Docker demo application'
    version: '0.1.0'
    license: 'MIT'
    dependencies: []
}
```

For projects with dependencies, install them in the builder stage:

```dockerfile
# Install V modules in the builder stage
FROM v-compiler AS builder

WORKDIR /app
COPY v.mod ./
RUN /opt/v/v install

COPY . .
RUN /opt/v/v -prod -o server main.v
```

## V Compiler Flags for Docker

V offers several compilation flags relevant to Docker builds:

```bash
# Production build with all optimizations
v -prod main.v

# Production build with C compiler optimizations
v -prod -cflags "-O3 -flto" main.v

# Strip debug symbols for smaller binary
v -prod -cflags "-s" main.v

# Static linking with musl
v -prod -cc musl-gcc -cflags "-static" main.v
```

Use `-prod` for all Docker builds. It enables C compiler optimizations and disables V's runtime safety checks that are useful during development.

## Docker Compose for Development

```yaml
# docker-compose.yml - development setup
version: "3.8"
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "8080:8080"
    volumes:
      - .:/app
    environment:
      - PORT=8080

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: vapp
      POSTGRES_PASSWORD: devpass
      POSTGRES_DB: vapp_dev
    ports:
      - "5432:5432"
```

Development Dockerfile that allows quick rebuilds:

```dockerfile
# Dockerfile.dev - development image with V compiler
FROM ubuntu:22.04

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    git gcc make curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /opt
RUN git clone --depth 1 https://github.com/vlang/v.git && \
    cd v && make && ln -s /opt/v/v /usr/local/bin/v

WORKDIR /app
COPY . .

EXPOSE 8080

# Build and run in debug mode
CMD ["sh", "-c", "v -o server main.v && ./server"]
```

## Resource Usage

V applications are lightweight:

```bash
# V apps need minimal resources
docker run -d \
  --name v-server \
  -p 8080:8080 \
  -m 32m \
  --cpus="0.25" \
  v-app:latest
```

A Vweb server typically uses under 3 MB of RAM, making it one of the most memory-efficient web frameworks available.

## Build Time Comparison

V's compilation speed is one of its defining features:

| Step | Approximate Time |
|------|-----------------|
| V compiler build (cached) | 0s (cached) |
| Application compile | 1-3 seconds |
| Docker image build (cached deps) | 5-10 seconds |

V compiles fast enough that the Docker layer caching overhead is more significant than the actual compilation.

## Monitoring

Once your V application is running in production, use [OneUptime](https://oneuptime.com) to monitor its health endpoint and track uptime. V's compiled nature means consistent, predictable response times. Any performance degradation likely points to infrastructure issues rather than application-level problems.

## Summary

V's fast compilation and small binary output make it well-suited for Docker deployments. The multi-stage build pattern, compiling with V in the builder and copying the static binary to scratch, produces images under 5 MB. Building the V compiler from source adds some initial build time, but Docker layer caching makes subsequent builds fast. V's compilation speed means the application build step itself takes only seconds. For teams looking for a simple, fast, compiled language that containers love, V is worth serious consideration.
