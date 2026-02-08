# How to Containerize a Swift Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Swift, Containerization, DevOps, Server-Side Swift, Vapor

Description: Learn how to containerize server-side Swift applications with Docker using Vapor, multi-stage builds, and production optimization techniques.

---

Swift is not just for iOS development anymore. Server-side Swift frameworks like Vapor have matured significantly, and Docker makes it possible to deploy Swift applications on Linux servers with ease. This guide covers building Docker images for Swift applications, from simple command-line tools to full Vapor web applications.

## Prerequisites

You need Docker installed on your machine. A basic understanding of Swift and Swift Package Manager (SPM) helps. We will create a complete project from scratch, so you do not need an existing codebase.

## Creating a Sample Vapor Application

Let's build a Vapor web application. First, set up the project structure.

Create a `Package.swift` file:

```swift
// Package.swift - Swift Package Manager manifest for our Vapor app
// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "swift-docker-demo",
    platforms: [
        .macOS(.v13)
    ],
    dependencies: [
        .package(url: "https://github.com/vapor/vapor.git", from: "4.89.0"),
    ],
    targets: [
        .executableTarget(
            name: "App",
            dependencies: [
                .product(name: "Vapor", package: "vapor"),
            ],
            path: "Sources/App"
        ),
    ]
)
```

Create the main application file:

```swift
// Sources/App/entrypoint.swift - application entry point
import Vapor

@main
struct App {
    static func main() async throws {
        let app = try await Application.make(.detect())

        // Register routes
        app.get { req in
            "Hello from Swift in Docker!"
        }

        app.get("health") { req -> [String: String] in
            ["status": "ok"]
        }

        app.get("api", "info") { req -> [String: String] in
            [
                "language": "Swift",
                "framework": "Vapor",
                "pid": "\(ProcessInfo.processInfo.processIdentifier)"
            ]
        }

        // Bind to 0.0.0.0 so Docker can forward the port
        app.http.server.configuration.hostname = "0.0.0.0"
        app.http.server.configuration.port = 8080

        try await app.execute()
    }
}
```

## Basic Dockerfile

The official Swift Docker images provide a solid foundation:

```dockerfile
# Basic Dockerfile for Swift application
FROM swift:5.9-jammy

WORKDIR /app

# Copy the package manifest first for dependency caching
COPY Package.swift Package.resolved ./

# Resolve dependencies (cached unless Package.swift changes)
RUN swift package resolve

# Copy source code
COPY Sources/ Sources/

# Build in release mode
RUN swift build -c release

EXPOSE 8080

# Run the compiled binary
CMD [".build/release/App"]
```

This produces a working image, but at over 2 GB it is far too large for production.

## Multi-Stage Build for Production

Swift compiles to native binaries, so the runtime image does not need the Swift compiler at all. This makes multi-stage builds extremely effective.

```dockerfile
# Stage 1: Build the Swift binary
FROM swift:5.9-jammy AS builder

WORKDIR /app

# Copy manifest files for dependency resolution
COPY Package.swift Package.resolved ./
RUN swift package resolve

# Copy source and build in release mode
COPY Sources/ Sources/
RUN swift build -c release --static-swift-stdlib

# Stage 2: Minimal runtime image
FROM ubuntu:22.04

WORKDIR /app

# Install only the runtime libraries Swift needs
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libcurl4 \
    libxml2 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy the compiled binary from the builder
COPY --from=builder /app/.build/release/App /app/App

# Create non-root user
RUN useradd -m -r appuser
USER appuser

EXPOSE 8080

# Health check against the /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

CMD ["/app/App"]
```

The `--static-swift-stdlib` flag statically links the Swift standard library into the binary, reducing runtime dependencies. The final image is typically around 80-100 MB.

## Even Smaller with Distroless

For maximum security and minimum size, use a distroless base:

```dockerfile
# Stage 1: Build
FROM swift:5.9-jammy AS builder

WORKDIR /app
COPY Package.swift Package.resolved ./
RUN swift package resolve

COPY Sources/ Sources/
RUN swift build -c release --static-swift-stdlib

# Stage 2: Distroless runtime
FROM gcr.io/distroless/cc-debian12

COPY --from=builder /app/.build/release/App /App

EXPOSE 8080
CMD ["/App"]
```

This gets the image under 50 MB. The trade-off is that you cannot shell into the container for debugging, which is actually a security benefit in production.

## The .dockerignore File

```text
# .dockerignore - exclude build artifacts and unnecessary files
.build/
.swiftpm/
Packages/
*.xcodeproj/
*.xcworkspace/
.git/
README.md
Dockerfile
docker-compose.yml
```

## Docker Compose for Development

Set up a development workflow with automatic rebuilding:

```yaml
# docker-compose.yml - development setup for Swift Vapor app
version: "3.8"
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "8080:8080"
    volumes:
      - ./Sources:/app/Sources
    environment:
      - LOG_LEVEL=debug

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: swiftapp
      POSTGRES_USER: vapor
      POSTGRES_PASSWORD: devpassword
    ports:
      - "5432:5432"
    volumes:
      - pg_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  pg_data:
```

Create a development Dockerfile that rebuilds on source changes:

```dockerfile
# Dockerfile.dev - development image with full toolchain
FROM swift:5.9-jammy

WORKDIR /app

COPY Package.swift Package.resolved ./
RUN swift package resolve

COPY . /app

EXPOSE 8080

# Build and run in debug mode for faster compilation
CMD ["swift", "run", "App"]
```

## Handling Swift Dependencies

Swift Package Manager resolves dependencies during `swift package resolve`. The `Package.resolved` file locks dependency versions. Always commit this file to your repository:

```bash
# Ensure the lockfile is tracked
git add Package.resolved
```

If you have packages from private repositories, pass SSH keys into the build:

```dockerfile
# Mount SSH agent for private package access during build
FROM swift:5.9-jammy AS builder

WORKDIR /app
COPY Package.swift Package.resolved ./

# Use BuildKit secrets to access private repos
RUN --mount=type=ssh swift package resolve

COPY Sources/ Sources/
RUN swift build -c release
```

Build with SSH forwarding:

```bash
# Build with SSH agent forwarding for private packages
DOCKER_BUILDKIT=1 docker build --ssh default -t swift-app .
```

## Optimizing Build Times

Swift compilation is notoriously slow. Layer caching helps, but you can go further.

Use BuildKit cache mounts for the SPM cache:

```dockerfile
# Cache the Swift Package Manager download cache between builds
FROM swift:5.9-jammy AS builder

WORKDIR /app
COPY Package.swift Package.resolved ./

# Mount a persistent cache for SPM packages
RUN --mount=type=cache,target=/root/.cache/org.swift.swiftpm \
    swift package resolve

COPY Sources/ Sources/

# Mount a persistent cache for the build directory
RUN --mount=type=cache,target=/app/.build \
    swift build -c release && \
    cp .build/release/App /app/App
```

## Resource Limits for Production

Swift applications can consume significant memory during traffic spikes. Set appropriate limits:

```bash
# Run with resource constraints
docker run -d \
  --name swift-app \
  -p 8080:8080 \
  -m 256m \
  --cpus="1.0" \
  swift-app:latest
```

## Monitoring

Server-side Swift applications benefit from proper monitoring. Configure [OneUptime](https://oneuptime.com) to watch your `/health` endpoint and track response times. Since Swift services compile to native binaries, they typically have predictable performance characteristics, but memory leaks can still occur in long-running processes.

## Summary

Containerizing Swift applications leverages one of the language's greatest strengths: native binary compilation. Multi-stage builds produce small, efficient images because the runtime does not need the compiler. The `--static-swift-stdlib` flag reduces external dependencies, and distroless bases provide both security and size benefits. With Docker Compose handling the development workflow, you get a productive environment that mirrors production closely.
