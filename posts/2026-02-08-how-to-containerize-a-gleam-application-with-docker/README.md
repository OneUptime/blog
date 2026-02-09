# How to Containerize a Gleam Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Gleam, Containerization, DevOps, BEAM, Erlang, Functional Programming

Description: Learn how to containerize Gleam applications with Docker, covering both Erlang and JavaScript targets, Wisp framework, and BEAM runtime optimization.

---

Gleam is a type-safe functional language that runs on the BEAM (Erlang virtual machine) or compiles to JavaScript. Its BEAM target gives you access to Erlang's legendary concurrency and fault tolerance, while its type system catches errors at compile time. Docker helps package Gleam applications with their BEAM runtime dependencies into portable, reproducible containers. This guide covers both BEAM and JavaScript compilation targets.

## Prerequisites

Docker must be installed. Basic understanding of functional programming concepts helps. We will build a complete web application from scratch.

## Creating a Sample Gleam Application

Let's build a web API using Wisp, Gleam's web framework, running on the BEAM.

Initialize the project:

```bash
# Create a new Gleam project
gleam new gleam_docker_demo
cd gleam_docker_demo
```

Update `gleam.toml`:

```toml
# gleam.toml - project configuration
name = "gleam_docker_demo"
version = "1.0.0"
target = "erlang"

[dependencies]
gleam_stdlib = ">= 0.34.0 and < 2.0.0"
gleam_http = ">= 3.5.0 and < 4.0.0"
gleam_erlang = ">= 0.25.0 and < 1.0.0"
mist = ">= 1.0.0 and < 2.0.0"
wisp = ">= 0.14.0 and < 1.0.0"
gleam_json = ">= 1.0.0 and < 2.0.0"

[dev-dependencies]
gleeunit = ">= 1.0.0 and < 2.0.0"
```

Create the main application:

```gleam
// src/gleam_docker_demo.gleam - main entry point
import gleam/erlang/process
import gleam/io
import gleam/int
import gleam/result
import gleam/erlang/os
import mist
import wisp
import wisp/wisp_mist

pub fn main() {
  // Get port from environment or default to 8080
  let port = os.get_env("PORT")
    |> result.then(int.parse)
    |> result.unwrap(8080)

  let secret_key_base = wisp.random_string(64)

  io.println("Starting Gleam server on port " <> int.to_string(port))

  let assert Ok(_) =
    wisp_mist.handler(handle_request, secret_key_base)
    |> mist.new
    |> mist.port(port)
    |> mist.start_http

  process.sleep_forever()
}
```

Create the request handler:

```gleam
// src/router.gleam - request routing and handlers
import gleam/http.{Get}
import gleam/json
import gleam/string_builder
import wisp.{type Request, type Response}

pub fn handle_request(req: Request) -> Response {
  case wisp.path_segments(req) {
    // Root endpoint
    [] -> {
      wisp.ok()
      |> wisp.string_body("Hello from Gleam in Docker!")
    }

    // Health check
    ["health"] -> {
      let body = json.object([
        #("status", json.string("ok")),
        #("language", json.string("Gleam")),
        #("runtime", json.string("BEAM")),
      ])
      |> json.to_string_builder
      |> string_builder.to_string

      wisp.ok()
      |> wisp.set_header("content-type", "application/json")
      |> wisp.string_body(body)
    }

    // Computation endpoint
    ["compute"] -> handle_compute(req)

    // 404 for everything else
    _ -> wisp.not_found()
  }
}

fn handle_compute(req: Request) -> Response {
  case req.method {
    Get -> {
      // Simple computation - sum of series
      let result = list_sum(1, 100_000)
      let body = json.object([
        #("sum_1_to_100000", json.int(result)),
      ])
      |> json.to_string_builder
      |> string_builder.to_string

      wisp.ok()
      |> wisp.set_header("content-type", "application/json")
      |> wisp.string_body(body)
    }
    _ -> wisp.method_not_allowed([Get])
  }
}

fn list_sum(from: Int, to: Int) -> Int {
  case from > to {
    True -> 0
    False -> from + list_sum(from + 1, to)
  }
}
```

## Basic Dockerfile

```dockerfile
# Basic Gleam Dockerfile
FROM ghcr.io/gleam-lang/gleam:v1.0.0-erlang-alpine

WORKDIR /app

# Copy manifest files for dependency caching
COPY gleam.toml manifest.toml ./

# Download dependencies
RUN gleam deps download

# Copy source code and build
COPY src/ src/
COPY test/ test/
RUN gleam build

EXPOSE 8080

CMD ["gleam", "run"]
```

## Multi-Stage Build for Production

```dockerfile
# Stage 1: Build the Gleam application
FROM ghcr.io/gleam-lang/gleam:v1.0.0-erlang-alpine AS builder

WORKDIR /app

# Copy dependency files first
COPY gleam.toml manifest.toml ./

# Download and compile dependencies
RUN gleam deps download

# Copy source and build for production
COPY src/ src/
RUN gleam build

# Collect the Erlang release
RUN gleam export erlang-shipment

# Stage 2: Minimal Erlang runtime
FROM erlang:26-alpine

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache libstdc++ openssl ncurses-libs

# Copy the Erlang release from builder
COPY --from=builder /app/build/erlang-shipment /app

# Create non-root user
RUN adduser -D -H gleamuser
USER gleamuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Run the Erlang release
CMD ["/app/entrypoint.sh", "run"]
```

The `gleam export erlang-shipment` command creates a self-contained Erlang release that includes everything needed to run the application.

## Understanding the Erlang Shipment

The Erlang shipment includes compiled BEAM bytecode, the application's dependency tree, and a start script. It does not include the Gleam compiler or the Erlang compiler, just the runtime.

```bash
# Inspect the shipment contents
ls build/erlang-shipment/
# entrypoint.sh  - startup script
# lib/           - compiled BEAM files
# erl_args       - VM arguments
```

## The .dockerignore File

```text
# .dockerignore
.git/
build/
_build/
README.md
Dockerfile
docker-compose.yml
test/
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
      - "8080:8080"
    volumes:
      - ./src:/app/src
    environment:
      - PORT=8080

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: gleam
      POSTGRES_PASSWORD: devpass
      POSTGRES_DB: gleamapp
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

Development Dockerfile:

```dockerfile
# Dockerfile.dev - development image with full toolchain
FROM ghcr.io/gleam-lang/gleam:v1.0.0-erlang-alpine

WORKDIR /app

COPY gleam.toml manifest.toml ./
RUN gleam deps download

COPY . .

EXPOSE 8080

CMD ["gleam", "run"]
```

## BEAM VM Tuning for Docker

The BEAM VM has excellent concurrency support. Configure it for container environments:

```dockerfile
# Set BEAM VM flags for container operation
ENV ERL_FLAGS="+S 4:4 +sbwt very_short +sbwtdcpu very_short +sbwtdio very_short"
```

Flag explanations:
- `+S 4:4` - use 4 schedulers (match to container CPU allocation)
- `+sbwt very_short` - scheduler busy wait threshold
- `+sbwtdcpu/io` - dirty scheduler wait thresholds

Set these based on your container's CPU allocation:

```bash
# Run with 4 CPUs and matching scheduler config
docker run -d \
  --name gleam-app \
  -p 8080:8080 \
  --cpus="4" \
  -e ERL_FLAGS="+S 4:4" \
  gleam-app:latest
```

## Running Tests in Docker

```dockerfile
# Test stage
FROM ghcr.io/gleam-lang/gleam:v1.0.0-erlang-alpine AS test

WORKDIR /app
COPY . .
RUN gleam deps download
RUN gleam test

# Build stage
FROM ghcr.io/gleam-lang/gleam:v1.0.0-erlang-alpine AS builder
WORKDIR /app
COPY . .
RUN gleam deps download
RUN gleam build
RUN gleam export erlang-shipment
```

Run tests only:

```bash
docker build --target test -t gleam-test .
```

## JavaScript Target

Gleam can also compile to JavaScript. If you are targeting Node.js:

```dockerfile
# Gleam to JavaScript Dockerfile
FROM ghcr.io/gleam-lang/gleam:v1.0.0-node-alpine AS builder

WORKDIR /app
COPY gleam.toml manifest.toml ./
RUN gleam deps download

COPY src/ src/
RUN gleam build --target javascript

# Stage 2: Node.js runtime
FROM node:21-alpine

WORKDIR /app
COPY --from=builder /app/build/dev/javascript /app

CMD ["node", "gleam_docker_demo/gleam_docker_demo.mjs"]
```

## Fault Tolerance

One of the BEAM's greatest strengths is fault tolerance. Processes that crash are automatically restarted by supervisors. In Docker, this means your application can handle individual request failures without the container going down. Configure your health check to detect systemic failures rather than individual errors:

```dockerfile
# Health check with higher retry tolerance
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=5 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1
```

## Monitoring

Gleam applications running on the BEAM benefit from the runtime's built-in observability. For external monitoring, use [OneUptime](https://oneuptime.com) to track your application's availability and response times. The BEAM's let-it-crash philosophy means individual request failures are normal, so focus monitoring on systemic health rather than individual errors.

## Summary

Containerizing Gleam applications leverages the BEAM's strengths in a portable package. The `gleam export erlang-shipment` command creates a clean, self-contained release that works well in multi-stage Docker builds. The BEAM VM's scheduler configuration should match your container's CPU allocation for optimal performance. Gleam's type safety catches errors at compile time, while the BEAM's fault tolerance handles runtime failures gracefully. Whether targeting Erlang or JavaScript, Docker provides a consistent deployment pipeline for Gleam applications.
