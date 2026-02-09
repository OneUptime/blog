# How to Containerize a Haskell Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Haskell, Containerization, Functional Programming, GHC, DevOps, Production

Description: Build minimal Docker images for Haskell applications using multi-stage builds with Stack or Cabal for production deployments.

---

Haskell compiles to native binaries, which makes Docker containerization straightforward in principle. The challenge is the build process: GHC (the Glasgow Haskell Compiler) and its dependency ecosystem are large. A naive Dockerfile produces a multi-gigabyte image. With multi-stage builds, you compile in a fat build image and copy just the binary to a tiny runtime image. The final container can be under 30MB.

This guide covers containerizing Haskell applications built with both Stack and Cabal, the two main build tools in the Haskell ecosystem.

## A Simple Haskell Web Application

Here is a minimal web server using the Scotty framework:

```haskell
-- app/Main.hs
{-# LANGUAGE OverloadedStrings #-}

module Main where

import Web.Scotty
import Data.Aeson (object, (.=))
import Network.Wai.Middleware.RequestLogger (logStdout)
import System.Environment (lookupEnv)
import Data.Maybe (fromMaybe)

main :: IO ()
main = do
    portStr <- lookupEnv "PORT"
    let port = read (fromMaybe "8080" portStr) :: Int
    putStrLn $ "Starting server on port " ++ show port

    scotty port $ do
        middleware logStdout

        get "/" $ do
            text "Hello from Haskell in Docker!"

        get "/health" $ do
            json $ object ["status" .= ("UP" :: String)]

        get "/info" $ do
            json $ object
                [ "language" .= ("Haskell" :: String)
                , "compiler" .= ("GHC" :: String)
                , "framework" .= ("Scotty" :: String)
                ]
```

The package definition:

```yaml
# package.yaml (for Stack) or as cabal file
name: my-haskell-app
version: 0.1.0.0

dependencies:
  - base >= 4.7 && < 5
  - scotty
  - aeson
  - wai-extra
  - text

executables:
  my-haskell-app:
    main: Main.hs
    source-dirs: app
    ghc-options:
      - -threaded
      - -rtsopts
      - -with-rtsopts=-N
      - -O2
```

## Dockerfile with Stack

Stack is the most popular Haskell build tool. It manages GHC versions and dependencies through curated package sets (Stackage).

```dockerfile
# Dockerfile.stack - Haskell application built with Stack

# === Build Stage ===
# Use the official Stack image which includes GHC
FROM fpco/stack-build:lts-22.4 AS builder

WORKDIR /build

# Copy dependency files first for layer caching
# Stack resolves dependencies based on stack.yaml and package.yaml
COPY stack.yaml stack.yaml.lock package.yaml ./

# Download and build dependencies (cached unless dependency files change)
RUN stack build --only-dependencies --system-ghc

# Copy the source code
COPY app ./app
COPY src ./src

# Build the application with optimizations
RUN stack build --system-ghc --copy-bins

# Find the built binary
RUN cp $(stack path --local-install-root)/bin/my-haskell-app /build/app-binary

# === Runtime Stage ===
# Use a minimal base image - Haskell compiles to native code
FROM debian:bookworm-slim

# Install only the runtime libraries needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgmp10 \
    ca-certificates \
    curl \
    netbase \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -r -d /app appuser

WORKDIR /app

# Copy the compiled binary from the build stage
COPY --from=builder /build/app-binary ./my-haskell-app

# Set ownership
RUN chown appuser:appuser /app/my-haskell-app

USER appuser

EXPOSE 8080

# Health check
HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=10s \
  CMD curl -f http://localhost:8080/health || exit 1

# RTS options: -N uses all available cores, -T enables runtime statistics
ENTRYPOINT ["./my-haskell-app", "+RTS", "-N", "-T", "-RTS"]
```

Build and run:

```bash
# Build the Docker image (this takes a while the first time)
docker build -f Dockerfile.stack -t haskell-app:1.0 .

# Check the image size
docker images haskell-app

# Run the container
docker run -d \
  --name haskell-app \
  -p 8080:8080 \
  -e PORT=8080 \
  haskell-app:1.0

# Test it
curl http://localhost:8080/
curl http://localhost:8080/health
```

## Dockerfile with Cabal

Cabal is Haskell's built-in build tool. It is lighter weight than Stack and uses Hackage directly.

```dockerfile
# Dockerfile.cabal - Haskell application built with Cabal

# === Build Stage ===
FROM haskell:9.6 AS builder

WORKDIR /build

# Update Cabal package index
RUN cabal update

# Copy the cabal file first for dependency caching
COPY my-haskell-app.cabal cabal.project.freeze ./

# Build only dependencies
RUN cabal build --only-dependencies

# Copy source code
COPY app ./app
COPY src ./src

# Build the application
RUN cabal build exe:my-haskell-app

# Copy the binary to a known location
RUN cp $(cabal list-bin my-haskell-app) /build/app-binary

# === Runtime Stage ===
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgmp10 \
    ca-certificates \
    curl \
    netbase \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -r -d /app appuser

WORKDIR /app

COPY --from=builder /build/app-binary ./my-haskell-app

RUN chown appuser:appuser /app/my-haskell-app

USER appuser

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=10s \
  CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["./my-haskell-app", "+RTS", "-N", "-T", "-RTS"]
```

## Static Linking for Minimal Images

For the smallest possible images, statically link the binary. This eliminates the need for any system libraries in the runtime image, allowing you to use a scratch or distroless base.

```dockerfile
# Dockerfile.static - Statically linked Haskell binary

# === Build Stage ===
FROM fpco/stack-build:lts-22.4 AS builder

# Install static libraries
RUN apt-get update && apt-get install -y \
    libgmp-dev \
    zlib1g-dev

WORKDIR /build

COPY stack.yaml stack.yaml.lock package.yaml ./
RUN stack build --only-dependencies --system-ghc

COPY app ./app
COPY src ./src

# Build with static linking flags
RUN stack build --system-ghc \
    --ghc-options='-optl-static -optl-pthread -fPIC' \
    --copy-bins

RUN cp $(stack path --local-install-root)/bin/my-haskell-app /build/app-binary

# Verify the binary is statically linked
RUN ldd /build/app-binary 2>&1 | grep -q "not a dynamic executable" && \
    echo "Binary is statically linked" || \
    echo "WARNING: Binary has dynamic dependencies"

# === Runtime Stage ===
# Scratch image - literally nothing but the binary
FROM scratch

# Copy CA certificates for HTTPS requests
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy the statically linked binary
COPY --from=builder /build/app-binary /my-haskell-app

EXPOSE 8080

ENTRYPOINT ["/my-haskell-app", "+RTS", "-N", "-T", "-RTS"]
```

A statically linked Haskell binary in a scratch image produces a container as small as 15-25MB.

## Optimizing Build Times

Haskell builds are notoriously slow, especially the first build. Several techniques speed up iterative builds:

Use Docker BuildKit's cache mounts to persist the Stack/Cabal cache between builds:

```dockerfile
# Use BuildKit cache mounts for Stack
FROM fpco/stack-build:lts-22.4 AS builder

WORKDIR /build

COPY stack.yaml stack.yaml.lock package.yaml ./

# Cache the Stack work directory between builds
RUN --mount=type=cache,target=/root/.stack \
    stack build --only-dependencies --system-ghc

COPY app ./app
COPY src ./src

RUN --mount=type=cache,target=/root/.stack \
    stack build --system-ghc --copy-bins
```

Enable BuildKit when building:

```bash
# Enable BuildKit for cache mount support
DOCKER_BUILDKIT=1 docker build -f Dockerfile.stack -t haskell-app:1.0 .
```

## GHC Runtime System Options

Haskell's runtime system (RTS) has options that affect how the application behaves in containers. Pass these through the entrypoint:

```dockerfile
# Common RTS options for containerized Haskell applications
ENTRYPOINT ["./my-haskell-app", "+RTS", \
  "-N",          # Use all available CPU cores \
  "-T",          # Enable runtime statistics \
  "-A64m",       # Set the allocation area size (nursery) \
  "-H256m",      # Suggested heap size \
  "-I0",         # Disable idle GC (containers should not waste CPU on idle GC) \
  "-RTS"]
```

Key RTS options for containers:

- `-N` - Use all CPU cores available to the container
- `-A64m` - Larger allocation area reduces GC frequency
- `-H256m` - Suggested heap size, helps avoid repeated heap growth
- `-I0` - Disable idle GC, useful for always-busy server processes
- `-T` - Enable runtime statistics for monitoring

## Docker Compose for Development

```yaml
# docker-compose.yml - Haskell development environment
version: "3.9"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.stack
    ports:
      - "8080:8080"
    environment:
      - PORT=8080
      - DATABASE_URL=postgres://postgres:devpass@db:5432/myapp
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: devpass
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "postgres"]
      interval: 5s
      retries: 5

volumes:
  pgdata:
```

## Docker Compose for Production

```yaml
# docker-compose.prod.yml - Haskell production deployment
version: "3.9"

services:
  app:
    image: haskell-app:${VERSION:-latest}
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      PORT: 8080
      DATABASE_URL: ${DATABASE_URL}
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 256M
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 10s
    logging:
      driver: "json-file"
      options:
        max-size: "25m"
        max-file: "5"
```

## Monitoring Haskell Containers

The `-T` RTS flag enables runtime statistics. Expose them through an endpoint for monitoring:

```haskell
-- Add an endpoint that returns GHC runtime statistics
import GHC.Stats (getRTSStats, RTSStats(..))

get "/metrics" $ do
    stats <- liftIO getRTSStats
    json $ object
        [ "gc_bytes_allocated" .= allocated_bytes stats
        , "gc_num_gcs" .= gcs stats
        , "gc_max_live_bytes" .= max_live_bytes stats
        , "gc_cumulative_live_bytes" .= cumulative_live_bytes stats
        ]
```

## Common Issues

1. **Missing libgmp.** The GMP library (GNU Multiple Precision Arithmetic) is required by GHC-compiled binaries. Include `libgmp10` in your runtime image.

2. **Large build images.** The GHC compiler and its libraries are large. Always use multi-stage builds. Never ship the build image to production.

3. **Slow first builds.** Compiling all dependencies from scratch takes 10-30 minutes. Use Docker BuildKit cache mounts to persist the dependency cache between builds.

4. **Thread count.** The `-N` RTS option defaults to the number of CPU cores visible to the process. In containers without CPU limits, this might be the host's core count, which is too many. Set `-N4` or similar if you set specific CPU limits on the container.

Haskell's compilation to native code makes it a natural fit for Docker. The final container is small, starts instantly, and performs well. The main investment is in the build pipeline, and multi-stage Docker builds handle that cleanly.
