# How to Containerize a Zig Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Zig, Containerization, DevOps, Systems Programming, Low-Level Programming

Description: How to containerize Zig applications with Docker, including cross-compilation, static linking, and creating minimal production images from scratch.

---

Zig is a systems programming language that aims to replace C while providing better safety guarantees and a simpler build system. It produces small, fast, statically-linked binaries with no runtime dependencies, making it ideal for Docker containers. This guide covers building and deploying Zig applications in Docker, from basic setups to optimized production images.

## Prerequisites

Docker needs to be installed. Basic familiarity with Zig syntax helps but is not strictly necessary. We will build a complete HTTP server from scratch.

## Creating a Sample Zig Application

Let's build an HTTP server using Zig's standard library. Zig's stdlib includes a capable HTTP server.

Initialize the project:

```bash
# Create a new Zig project
mkdir zig-docker-demo
cd zig-docker-demo
zig init
```

Replace `src/main.zig` with an HTTP server:

```zig
// src/main.zig - HTTP server using Zig's standard library
const std = @import("std");
const http = std.http;

pub fn main() !void {
    // Read port from environment or default to 8080
    const port_str = std.posix.getenv("PORT") orelse "8080";
    const port: u16 = std.fmt.parseInt(u16, port_str, 10) catch 8080;

    const address = std.net.Address.parseIp("0.0.0.0", port) catch unreachable;

    var server = try address.listen(.{
        .reuse_address = true,
    });
    defer server.deinit();

    std.debug.print("Zig server listening on port {d}\n", .{port});

    // Accept and handle connections
    while (true) {
        const connection = try server.accept();
        defer connection.stream.close();

        var buf: [4096]u8 = undefined;
        var http_server = http.Server.init(connection, &buf);

        while (http_server.state == .ready) {
            var request = http_server.receiveHead() catch |err| {
                std.debug.print("Error receiving head: {}\n", .{err});
                break;
            };
            handleRequest(&request) catch |err| {
                std.debug.print("Error handling request: {}\n", .{err});
                break;
            };
        }
    }
}

fn handleRequest(request: *http.Server.Request) !void {
    const path = request.head.target;

    if (std.mem.eql(u8, path, "/")) {
        try request.respond("Hello from Zig in Docker!", .{});
    } else if (std.mem.eql(u8, path, "/health")) {
        try request.respond(
            \\{"status":"ok","language":"Zig"}
        , .{
            .extra_headers = &.{
                .{ .name = "content-type", .value = "application/json" },
            },
        });
    } else {
        try request.respond("Not Found", .{ .status = .not_found });
    }
}
```

Create `build.zig`:

```zig
// build.zig - Zig build configuration
const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});

    const exe = b.addExecutable(.{
        .name = "server",
        .root_source_file = b.path("src/main.zig"),
        .target = target,
        .optimize = optimize,
    });

    b.installArtifact(exe);

    const run_cmd = b.addRunArtifact(exe);
    run_cmd.step.dependOn(b.getInstallStep());
    const run_step = b.step("run", "Run the application");
    run_step.dependOn(&run_cmd.step);
}
```

## Basic Dockerfile

```dockerfile
# Basic Zig Dockerfile
FROM alpine:3.19 AS builder

# Install Zig from the official tarball
RUN apk add --no-cache curl xz && \
    curl -L https://ziglang.org/download/0.13.0/zig-linux-x86_64-0.13.0.tar.xz | \
    tar -xJ -C /usr/local && \
    ln -s /usr/local/zig-linux-x86_64-0.13.0/zig /usr/local/bin/zig

WORKDIR /app

# Copy source files
COPY build.zig build.zig.zon* ./
COPY src/ src/

# Build in release mode with safety checks disabled for maximum performance
RUN zig build -Doptimize=ReleaseFast

# The binary is in zig-out/bin/
FROM alpine:3.19

COPY --from=builder /app/zig-out/bin/server /server

RUN adduser -D -H ziguser
USER ziguser

EXPOSE 8080

CMD ["/server"]
```

## Optimized Scratch-Based Build

Zig excels at producing static binaries with zero runtime dependencies. This is perfect for scratch images.

```dockerfile
# Stage 1: Build a static binary targeting musl
FROM alpine:3.19 AS builder

RUN apk add --no-cache curl xz

# Install Zig
RUN curl -L https://ziglang.org/download/0.13.0/zig-linux-x86_64-0.13.0.tar.xz | \
    tar -xJ -C /usr/local && \
    ln -s /usr/local/zig-linux-x86_64-0.13.0/zig /usr/local/bin/zig

WORKDIR /app

COPY build.zig build.zig.zon* ./
COPY src/ src/

# Build targeting musl for static linking
RUN zig build -Doptimize=ReleaseFast -Dtarget=x86_64-linux-musl

# Stage 2: Scratch image with just the binary
FROM scratch

COPY --from=builder /app/zig-out/bin/server /server

EXPOSE 8080
CMD ["/server"]
```

The resulting image is typically 1-3 MB total. Zig produces some of the smallest Docker images of any language.

## Cross-Compilation

One of Zig's killer features is built-in cross-compilation without any additional toolchains:

```bash
# Build for Linux ARM64 from any platform
zig build -Doptimize=ReleaseFast -Dtarget=aarch64-linux-musl

# Build for Linux AMD64
zig build -Doptimize=ReleaseFast -Dtarget=x86_64-linux-musl
```

Multi-architecture Docker images become trivial:

```dockerfile
# Multi-architecture build
FROM alpine:3.19 AS builder-amd64
RUN apk add --no-cache curl xz && \
    curl -L https://ziglang.org/download/0.13.0/zig-linux-x86_64-0.13.0.tar.xz | \
    tar -xJ -C /usr/local && \
    ln -s /usr/local/zig-linux-x86_64-0.13.0/zig /usr/local/bin/zig
WORKDIR /app
COPY . .
RUN zig build -Doptimize=ReleaseFast -Dtarget=x86_64-linux-musl

FROM scratch
COPY --from=builder-amd64 /app/zig-out/bin/server /server
EXPOSE 8080
CMD ["/server"]
```

## The .dockerignore File

```text
# .dockerignore
.git/
zig-out/
zig-cache/
.zig-cache/
README.md
```

## Build Optimization Modes

Zig offers four optimization modes. Choose based on your needs:

```bash
# Debug - fast compilation, includes safety checks and debug info
zig build -Doptimize=Debug

# ReleaseSafe - optimized with safety checks (recommended for servers)
zig build -Doptimize=ReleaseSafe

# ReleaseFast - maximum speed, no safety checks
zig build -Doptimize=ReleaseFast

# ReleaseSmall - optimize for binary size
zig build -Doptimize=ReleaseSmall
```

For Docker production images, `ReleaseSafe` is a good default. It keeps bounds checking and other safety features while still producing fast code. Use `ReleaseFast` only when you have thoroughly tested your code and need every bit of performance.

```dockerfile
# Build with safety checks for production
RUN zig build -Doptimize=ReleaseSafe -Dtarget=x86_64-linux-musl
```

## Managing Dependencies with build.zig.zon

Zig's package manager uses `build.zig.zon` for dependency declarations:

```zig
// build.zig.zon - Zig package dependencies
.{
    .name = "zig-docker-demo",
    .version = "0.1.0",
    .dependencies = .{
        .httpz = .{
            .url = "https://github.com/zig-zap/superhtml/archive/refs/tags/v0.1.0.tar.gz",
            .hash = "1220abc123...",
        },
    },
}
```

In Docker, Zig fetches dependencies during the build:

```dockerfile
# Dependencies are fetched and cached during build
COPY build.zig build.zig.zon ./
COPY src/ src/
RUN zig build -Doptimize=ReleaseSafe
```

## Docker Compose for Development

```yaml
# docker-compose.yml - development setup
version: "3.8"
services:
  app:
    build:
      context: .
    ports:
      - "8080:8080"
    environment:
      - PORT=8080

  # Example dependent service
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

For development, build and run locally since Zig compiles quickly:

```bash
# Zig builds are fast enough for local development
zig build -Doptimize=Debug && ./zig-out/bin/server
```

## Health Checks

For scratch-based images without shell utilities, use Docker's native health check with a custom approach:

```dockerfile
# For Alpine-based images
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1
```

For scratch-based images, rely on external health checks from your orchestrator (Kubernetes liveness probes, Docker Swarm service checks).

## Performance and Resource Usage

Zig binaries are extremely resource-efficient:

```bash
# Run with very minimal resource allocation
docker run -d \
  --name zig-server \
  -p 8080:8080 \
  -m 32m \
  --cpus="0.25" \
  zig-app:latest
```

A Zig HTTP server typically uses under 2 MB of RAM at idle. The 32 MB limit is generous and provides ample room for handling concurrent connections.

## Monitoring

Even ultra-lightweight Zig services need monitoring. [OneUptime](https://oneuptime.com) can monitor your `/health` endpoint and alert on downtime. Zig's deterministic performance (no garbage collector, no runtime overhead) means response time deviations almost certainly indicate infrastructure problems rather than application-level issues.

## Summary

Zig produces the smallest Docker images of practically any programming language. Static linking to musl, combined with scratch base images, yields containers under 3 MB. Built-in cross-compilation eliminates the need for complex multi-platform build setups. The four optimization modes give you fine-grained control over the trade-off between safety, speed, and binary size. For systems-level services where every megabyte counts, Zig with Docker is hard to beat.
