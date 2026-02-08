# How to Containerize a Dart Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Dart, Containerization, DevOps, Shelf, Backend Development

Description: A complete guide to containerizing Dart backend applications with Docker, covering AOT compilation, shelf servers, and optimized production images.

---

Dart has expanded well beyond Flutter into server-side development. With its AOT (Ahead-of-Time) compilation, Dart produces fast native binaries that pair perfectly with Docker's multi-stage builds. This guide walks through containerizing Dart backend applications, from simple HTTP servers to full Shelf-based APIs.

## Prerequisites

Docker needs to be installed on your machine. Basic Dart knowledge is helpful. We will build a complete backend project from scratch.

## Creating a Sample Dart Backend

Let's create a REST API using the Shelf framework, which is Dart's standard HTTP middleware library.

Initialize the project:

```bash
# Create a new Dart project
dart create -t server-shelf dart_docker_demo
cd dart_docker_demo
```

Update `pubspec.yaml` with dependencies:

```yaml
# pubspec.yaml - project metadata and dependencies
name: dart_docker_demo
description: A Dart backend application for Docker
version: 1.0.0
environment:
  sdk: ^3.2.0
dependencies:
  shelf: ^1.4.1
  shelf_router: ^1.1.4
  shelf_static: ^1.1.2
dev_dependencies:
  lints: ^3.0.0
  test: ^1.24.0
```

Create the main server file:

```dart
// bin/server.dart - main entry point for the HTTP server
import 'dart:io';
import 'package:shelf/shelf.dart';
import 'package:shelf/shelf_io.dart' as shelf_io;
import 'package:shelf_router/shelf_router.dart';

void main() async {
  final router = Router();

  // Root endpoint
  router.get('/', (Request request) {
    return Response.ok('Hello from Dart in Docker!');
  });

  // Health check for container orchestration
  router.get('/health', (Request request) {
    return Response.ok(
      '{"status":"ok","pid":${pid}}',
      headers: {'content-type': 'application/json'},
    );
  });

  // API info endpoint
  router.get('/api/info', (Request request) {
    return Response.ok(
      '{"language":"Dart","version":"${Platform.version.split(' ').first}"}',
      headers: {'content-type': 'application/json'},
    );
  });

  // Add logging middleware
  final handler = Pipeline()
      .addMiddleware(logRequests())
      .addHandler(router.call);

  // Read port from environment or default to 8080
  final port = int.parse(Platform.environment['PORT'] ?? '8080');
  final server = await shelf_io.serve(handler, '0.0.0.0', port);

  print('Server running on port ${server.port}');
}
```

## Basic Dockerfile

Start with a straightforward Dockerfile:

```dockerfile
# Basic Dart Dockerfile using the official SDK image
FROM dart:stable

WORKDIR /app

# Copy pubspec files and resolve dependencies
COPY pubspec.* ./
RUN dart pub get

# Copy the rest of the source code
COPY . .

EXPOSE 8080

# Run the server directly with the Dart VM
CMD ["dart", "run", "bin/server.dart"]
```

This works for development but includes the full Dart SDK in the image.

## Production Multi-Stage Build with AOT Compilation

Dart's AOT compilation produces standalone native binaries. This is where Docker multi-stage builds really shine.

```dockerfile
# Stage 1: Resolve dependencies and compile to native binary
FROM dart:stable AS builder

WORKDIR /app

# Copy dependency files first for caching
COPY pubspec.* ./
RUN dart pub get

# Copy source code
COPY . .

# Ensure dependencies are up to date and compile to native
RUN dart pub get --offline
RUN dart compile exe bin/server.dart -o bin/server

# Stage 2: Minimal runtime image
FROM scratch

# Copy the compiled binary - it is self-contained
COPY --from=builder /runtime/ /
COPY --from=builder /app/bin/server /app/bin/server

# Copy static files if needed
# COPY --from=builder /app/public /app/public

EXPOSE 8080

CMD ["/app/bin/server"]
```

The official Dart Docker image provides a `/runtime/` directory containing only the minimal libraries needed to run AOT-compiled binaries. Combined with `FROM scratch`, this creates an incredibly small image, often under 20 MB.

## Understanding the FROM scratch Approach

Using `FROM scratch` means the image contains nothing except your binary and the required runtime libraries. There is no shell, no package manager, no utilities. This is excellent for security because there is almost nothing for an attacker to exploit.

If you need a shell for debugging, use Alpine instead:

```dockerfile
# Alternative: Alpine-based runtime for debugging access
FROM alpine:3.19

RUN apk add --no-cache libstdc++ ca-certificates

COPY --from=builder /app/bin/server /app/bin/server

RUN adduser -D appuser
USER appuser

EXPOSE 8080
CMD ["/app/bin/server"]
```

## The .dockerignore File

```text
# .dockerignore - exclude unnecessary files from build context
.dart_tool/
.packages
build/
.git/
.gitignore
README.md
Dockerfile
docker-compose.yml
*.md
```

## Docker Compose for Development

Set up a development environment with hot reload:

```yaml
# docker-compose.yml - development setup with database
version: "3.8"
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "8080:8080"
    volumes:
      - ./bin:/app/bin
      - ./lib:/app/lib
    environment:
      - PORT=8080
      - DATABASE_URL=postgres://dart:devpass@db:5432/dartapp
    depends_on:
      - db

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: dart
      POSTGRES_PASSWORD: devpass
      POSTGRES_DB: dartapp
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

Create a development Dockerfile:

```dockerfile
# Dockerfile.dev - development image with hot reload support
FROM dart:stable

WORKDIR /app

COPY pubspec.* ./
RUN dart pub get

COPY . .

EXPOSE 8080

# Use dart run for development (supports hot reload with tools)
CMD ["dart", "run", "--enable-vm-service", "bin/server.dart"]
```

## Dependency Caching with BuildKit

Speed up builds by caching the pub cache:

```dockerfile
# Optimized build with persistent pub cache
FROM dart:stable AS builder

WORKDIR /app

COPY pubspec.* ./

# Cache the Dart pub download cache
RUN --mount=type=cache,target=/root/.pub-cache \
    dart pub get

COPY . .

RUN --mount=type=cache,target=/root/.pub-cache \
    dart pub get --offline && \
    dart compile exe bin/server.dart -o bin/server

FROM scratch
COPY --from=builder /runtime/ /
COPY --from=builder /app/bin/server /app/bin/server

EXPOSE 8080
CMD ["/app/bin/server"]
```

## Adding Health Checks

Since `FROM scratch` has no curl or wget, use a custom health check approach:

```dockerfile
# For Alpine-based images, use wget for health checks
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1
```

For `scratch`-based images, rely on your orchestrator's health check mechanism (Kubernetes liveness probes, Docker Swarm health checks via external tools).

## Running Tests in Docker

Create a test stage in your Dockerfile:

```dockerfile
# Multi-stage build with test stage
FROM dart:stable AS deps
WORKDIR /app
COPY pubspec.* ./
RUN dart pub get

# Test stage - runs unit tests
FROM deps AS test
COPY . .
RUN dart test

# Build stage - compiles the binary
FROM deps AS builder
COPY . .
RUN dart compile exe bin/server.dart -o bin/server

# Production stage
FROM scratch
COPY --from=builder /runtime/ /
COPY --from=builder /app/bin/server /app/bin/server
EXPOSE 8080
CMD ["/app/bin/server"]
```

Run only tests without building the production image:

```bash
# Run tests only using the test target
docker build --target test -t dart-app-test .
```

## Performance Characteristics

AOT-compiled Dart binaries start in milliseconds, which is ideal for containerized deployments. They also have predictable memory usage since there is no JIT warmup period.

```bash
# Benchmark startup time
time docker run --rm dart-app:latest /app/bin/server --help
```

You will typically see startup times under 50ms, making Dart containers excellent candidates for auto-scaling scenarios where fast cold starts matter.

## Resource Limits

```bash
# Run with appropriate resource limits
docker run -d \
  --name dart-server \
  -p 8080:8080 \
  -m 128m \
  --cpus="0.5" \
  dart-app:latest
```

Dart's AOT binaries are efficient with memory. A basic HTTP server typically uses less than 30 MB, so 128 MB gives plenty of headroom.

## Monitoring and Observability

Once deployed, monitor your Dart services with [OneUptime](https://oneuptime.com). Set up endpoint monitoring for `/health` and track response latency trends. AOT-compiled Dart services tend to have very consistent response times, making it easy to detect anomalies.

## Summary

Dart's AOT compilation makes it one of the best languages for Docker containerization. The multi-stage build from `dart:stable` to `scratch` produces images under 20 MB with sub-50ms startup times. There is no runtime, no interpreter, and no virtual machine in the final image, just a single native binary and its minimal dependencies. This combination of small images, fast startup, and low memory usage makes Dart an excellent choice for containerized microservices.
