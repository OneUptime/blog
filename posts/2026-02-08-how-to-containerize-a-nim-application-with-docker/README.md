# How to Containerize a Nim Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Nim, Containerization, DevOps, Compiled Languages, Systems Programming

Description: Learn how to containerize Nim applications with Docker, covering static compilation, Nimble package management, and production-optimized multi-stage builds.

---

Nim compiles to C, C++, or JavaScript and produces fast, dependency-light native binaries. This compilation model makes Nim exceptionally well-suited for Docker containers. With static linking, you can create images that are just a few megabytes. This guide walks through the full process of containerizing Nim applications for production.

## Prerequisites

Docker must be installed on your machine. Basic Nim knowledge helps, but we will build everything from scratch. Understanding of HTTP servers is a plus.

## Creating a Sample Nim Application

Let's build a web server using Nim's Jester framework (similar to Sinatra or Flask).

Create the project:

```bash
# Create project structure
mkdir -p nim-docker-demo/src
cd nim-docker-demo
```

Create the Nimble package file:

```nim
# nim_docker_demo.nimble - package definition
version       = "0.1.0"
author        = "Developer"
description   = "Nim Docker demo application"
license       = "MIT"
srcDir        = "src"
bin           = @["server"]

requires "nim >= 2.0.0"
requires "jester >= 0.6.0"
```

Create the main application:

```nim
# src/server.nim - HTTP server with Jester framework
import jester
import json
import os
import strutils
import times

# Define routes
router myRouter:
  get "/":
    resp "Hello from Nim in Docker!"

  get "/health":
    let response = %*{
      "status": "ok",
      "nim_version": NimVersion,
      "compile_date": CompileDate,
      "compile_time": CompileTime
    }
    resp Http200, @[("Content-Type", "application/json")], $response

  get "/compute":
    # Compute fibonacci to demonstrate performance
    let n = try:
      parseInt(request.params.getOrDefault("n", "40"))
    except:
      40

    proc fib(n: int): int =
      if n <= 1: return n
      return fib(n - 1) + fib(n - 2)

    let start = cpuTime()
    let result = fib(n)
    let elapsed = cpuTime() - start

    let response = %*{
      "fibonacci_n": n,
      "result": result,
      "elapsed_seconds": elapsed
    }
    resp Http200, @[("Content-Type", "application/json")], $response

# Read port from environment
let port = parseInt(getEnv("PORT", "5000"))
let settings = newSettings(Port(port), bindAddr = "0.0.0.0")
var jesterInstance = initJester(myRouter, settings)
jesterInstance.serve()
```

## Basic Dockerfile

```dockerfile
# Basic Nim Dockerfile
FROM nimlang/nim:2.0.2

WORKDIR /app

# Copy nimble file and install dependencies
COPY nim_docker_demo.nimble ./
RUN nimble install -y --depsOnly

# Copy source code and build
COPY src/ src/
RUN nimble build -d:release

EXPOSE 5000

CMD ["./server"]
```

## Multi-Stage Build with Static Linking

Nim can produce statically linked binaries through its C backend. This enables scratch-based Docker images.

```dockerfile
# Stage 1: Build the Nim binary
FROM nimlang/nim:2.0.2-alpine AS builder

WORKDIR /app

# Install musl-dev for static linking
RUN apk add --no-cache musl-dev pcre-dev openssl-dev openssl-libs-static

# Copy nimble file and install dependencies
COPY nim_docker_demo.nimble ./
RUN nimble install -y --depsOnly

# Copy source code
COPY src/ src/

# Build with release optimizations and static linking
RUN nim compile \
    -d:release \
    --opt:speed \
    --passL:"-static" \
    --passC:"-flto" \
    -o:server \
    src/server.nim

# Verify the binary is statically linked
RUN file server && ldd server || true

# Stage 2: Minimal runtime
FROM alpine:3.19

WORKDIR /app

# Install CA certificates for HTTPS support
RUN apk add --no-cache ca-certificates

COPY --from=builder /app/server /app/server

# Run as non-root
RUN adduser -D -H nimuser
USER nimuser

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

CMD ["/app/server"]
```

## Scratch-Based Image

For the absolute smallest image:

```dockerfile
# Stage 1: Build
FROM nimlang/nim:2.0.2-alpine AS builder

WORKDIR /app

RUN apk add --no-cache musl-dev pcre-dev openssl-dev openssl-libs-static

COPY nim_docker_demo.nimble ./
RUN nimble install -y --depsOnly

COPY src/ src/
RUN nim compile -d:release --opt:speed --passL:"-static" -o:server src/server.nim

# Stage 2: Scratch
FROM scratch

COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /app/server /server

EXPOSE 5000
CMD ["/server"]
```

This typically produces an image under 5 MB.

## Image Size Comparison

| Approach | Approximate Size |
|----------|-----------------|
| Full Nim SDK | ~800 MB |
| Alpine multi-stage | ~12 MB |
| Scratch with static binary | ~4 MB |

## The .dockerignore File

```text
# .dockerignore
.git/
nimcache/
nimble/
*.exe
server
README.md
tests/
.nimble/
```

## Nimble Dependency Management

Lock your dependencies by committing the `nimble.lock` file:

```bash
# Generate the lock file
nimble lock
git add nimble.lock
```

In the Dockerfile, the lock file ensures reproducible builds:

```dockerfile
# Copy both nimble file and lock file for reproducible builds
COPY nim_docker_demo.nimble nimble.lock ./
RUN nimble install -y --depsOnly
```

## Compiler Flags Explained

Nim's compiler has several flags that matter for Docker builds:

```bash
# Explanation of key compiler flags
nim compile \
    -d:release \          # Enable release mode (optimizations on, assertions off)
    --opt:speed \         # Optimize for speed over size
    --passL:"-static" \   # Pass -static flag to the C linker
    --passC:"-flto" \     # Enable Link Time Optimization in C compiler
    --gc:arc \            # Use ARC garbage collector (lower latency)
    -o:server \           # Output binary name
    src/server.nim        # Source file
```

The `--gc:arc` flag is worth highlighting. Nim's ARC (Automatic Reference Counting) garbage collector provides more predictable latency than the default GC, which matters for web services.

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
      - "5000:5000"
    volumes:
      - ./src:/app/src
    environment:
      - PORT=5000

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

Development Dockerfile:

```dockerfile
# Dockerfile.dev - development image with full toolchain
FROM nimlang/nim:2.0.2

WORKDIR /app

COPY nim_docker_demo.nimble ./
RUN nimble install -y --depsOnly

COPY . .

EXPOSE 5000

# Build in debug mode and run
CMD ["nimble", "run"]
```

## Cross-Compilation

Nim's C backend enables cross-compilation. Build for Linux from macOS or Windows:

```dockerfile
# Build for Linux AMD64 specifically
FROM --platform=linux/amd64 nimlang/nim:2.0.2-alpine AS builder

WORKDIR /app
RUN apk add --no-cache musl-dev

COPY nim_docker_demo.nimble ./
RUN nimble install -y --depsOnly

COPY src/ src/
RUN nim compile -d:release --opt:speed --passL:"-static" -o:server src/server.nim

FROM --platform=linux/amd64 scratch
COPY --from=builder /app/server /server
EXPOSE 5000
CMD ["/server"]
```

## Running Tests in Docker

```dockerfile
# Add a test stage
FROM nimlang/nim:2.0.2 AS test

WORKDIR /app
COPY . .
RUN nimble install -y --depsOnly
RUN nimble test

# Build stage follows the test stage
FROM nimlang/nim:2.0.2-alpine AS builder
# ... continues with build
```

Run tests:

```bash
# Execute only the test stage
docker build --target test -t nim-test .
```

## Resource Usage

Nim binaries are remarkably efficient:

```bash
# Run with minimal resources - Nim apps are very lightweight
docker run -d \
  --name nim-server \
  -p 5000:5000 \
  -m 64m \
  --cpus="0.5" \
  nim-app:latest
```

A Nim web server typically uses under 5 MB of RAM at idle, making 64 MB a generous allocation.

## Monitoring

Even lightweight applications need monitoring. [OneUptime](https://oneuptime.com) can watch your Nim service's health endpoint and track response times. Nim's ARC garbage collector produces consistent latency, so any deviation in response time patterns likely indicates a real problem rather than GC pauses.

## Summary

Nim produces some of the smallest Docker images of any compiled language. Static linking through the musl libc creates fully self-contained binaries that run in scratch images at 4-5 MB. The compilation flags give you control over optimization level, garbage collector choice, and linking behavior. Combined with Nim's expressive syntax and strong performance, Docker gives you a productive and efficient deployment pipeline for Nim services.
