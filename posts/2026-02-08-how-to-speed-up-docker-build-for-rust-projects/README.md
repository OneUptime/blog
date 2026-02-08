# How to Speed Up Docker Build for Rust Projects

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, rust, build optimization, cargo, layer caching, multi-stage builds

Description: Techniques to dramatically reduce Rust Docker build times using cargo caching and smart layering

---

Rust compilation is famously slow. A fresh build of a medium-sized Rust project can take 10-15 minutes, and inside Docker the problem is worse because the build starts from zero every time. The Rust compiler's incremental compilation, which makes local builds tolerable, does not carry over into Docker by default. But with the right caching strategies, you can get Docker builds to approach local build speeds. Here are the techniques that make it happen.

## The Problem: Why Rust Docker Builds Are Painful

A naive Rust Dockerfile looks like this:

```dockerfile
# BAD: Compiles EVERYTHING from scratch on every change
FROM rust:1.77
WORKDIR /app
COPY . .
RUN cargo build --release
CMD ["./target/release/myapp"]
```

Every time you change a single line of code, Docker invalidates the `COPY . .` layer. Cargo then downloads all crates, compiles every dependency, and compiles your application code. For a project with 200 dependencies, this easily takes 10+ minutes.

The core issue is that Rust dependencies represent 90% of build time, but they change rarely. Your application code, which changes frequently, represents only 10% of build time. We need to cache the dependency compilation.

## Technique 1: The Dummy Build Trick

This classic technique builds dependencies first using a fake `main.rs`, then compiles the real application:

```dockerfile
FROM rust:1.77-slim AS builder
WORKDIR /app

# Copy only Cargo files
COPY Cargo.toml Cargo.lock ./

# Create a dummy source file so cargo can build dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs

# Build dependencies only - this layer is cached unless Cargo files change
RUN cargo build --release

# Remove the dummy build artifacts (but keep compiled dependencies)
RUN rm -rf src target/release/deps/myapp* target/release/myapp*

# Copy real source code
COPY src ./src

# Build only the application code (dependencies are already compiled)
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/myapp /usr/local/bin/
CMD ["myapp"]
```

The key insight: `cargo build --release` with the dummy `main.rs` compiles all dependencies and caches them in `target/release/deps/`. When you copy the real source and rebuild, Cargo recognizes that the dependencies have not changed and only recompiles your crate.

## Technique 2: BuildKit Cache Mounts

Cache mounts persist Cargo's registry and build caches between Docker builds:

```dockerfile
# syntax=docker/dockerfile:1
FROM rust:1.77-slim AS builder
WORKDIR /app

COPY Cargo.toml Cargo.lock ./
COPY src ./src

# Mount Cargo caches: registry index, downloaded crates, and compiled output
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/usr/local/cargo/git \
    --mount=type=cache,target=/app/target \
    cargo build --release && \
    cp target/release/myapp /usr/local/bin/myapp

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /usr/local/bin/myapp /usr/local/bin/
CMD ["myapp"]
```

```bash
# BuildKit must be enabled
DOCKER_BUILDKIT=1 docker build -t myapp .
```

Notice the `cp` command after `cargo build`. The `target/` directory is a cache mount, so its contents are not available in subsequent layers. You must copy the binary out before the RUN instruction ends.

## Technique 3: Combine Dummy Build with Cache Mounts

For maximum speed, use both techniques together:

```dockerfile
# syntax=docker/dockerfile:1
FROM rust:1.77-slim AS builder
WORKDIR /app

# Copy dependency manifests
COPY Cargo.toml Cargo.lock ./

# Create dummy source to compile dependencies
RUN mkdir src && echo "fn main() {}" > src/main.rs

# Build dependencies with persistent cache
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/usr/local/cargo/git \
    --mount=type=cache,target=/app/target \
    cargo build --release

# Replace dummy source with real code
COPY src ./src

# Touch the main source file to force recompilation of our crate only
RUN touch src/main.rs

# Build again - only our code recompiles, deps are cached in both layers
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/usr/local/cargo/git \
    --mount=type=cache,target=/app/target \
    cargo build --release && \
    cp target/release/myapp /usr/local/bin/myapp

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /usr/local/bin/myapp /usr/local/bin/
CMD ["myapp"]
```

## Technique 4: Use cargo-chef for Better Caching

`cargo-chef` is a tool designed specifically for Docker layer caching in Rust projects. It creates a recipe file that represents your dependency tree without including source code:

```dockerfile
# syntax=docker/dockerfile:1
FROM rust:1.77-slim AS chef
RUN cargo install cargo-chef
WORKDIR /app

# Stage 1: Analyze dependencies and create a recipe
FROM chef AS planner
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

# Stage 2: Build dependencies using the recipe (cached layer)
FROM chef AS builder
COPY --from=planner /app/recipe.json recipe.json

# Build dependencies only - this layer is cached unless dependencies change
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/usr/local/cargo/git \
    cargo chef cook --release --recipe-path recipe.json

# Copy source and build application
COPY . .
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/usr/local/cargo/git \
    cargo build --release

# Stage 3: Minimal runtime image
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/myapp /usr/local/bin/
CMD ["myapp"]
```

`cargo-chef` handles the complexity of workspace dependencies, build scripts, and feature flags better than the manual dummy build approach. It is the recommended solution for production Rust Docker builds.

## Technique 5: Static Linking with musl

Produce a fully static binary that runs on `scratch`:

```dockerfile
# syntax=docker/dockerfile:1
FROM rust:1.77-alpine AS builder
RUN apk add --no-cache musl-dev

WORKDIR /app
COPY Cargo.toml Cargo.lock ./
COPY src ./src

# Build a statically linked binary using musl
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/usr/local/cargo/git \
    --mount=type=cache,target=/app/target \
    cargo build --release --target x86_64-unknown-linux-musl && \
    cp target/x86_64-unknown-linux-musl/release/myapp /usr/local/bin/myapp

# Scratch image: just the binary, nothing else
FROM scratch
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /usr/local/bin/myapp /myapp
USER 65534
ENTRYPOINT ["/myapp"]
```

The musl-linked binary requires zero runtime dependencies, producing a final image that is typically 5-15MB.

## Technique 6: Use sccache for Distributed Caching

For CI/CD environments where cache mounts are not persistent between runs, `sccache` stores compiled artifacts in cloud storage:

```dockerfile
# syntax=docker/dockerfile:1
FROM rust:1.77-slim AS builder

# Install sccache for distributed compile caching
RUN cargo install sccache

# Configure sccache to use S3 for storage
ENV RUSTC_WRAPPER=sccache
ENV SCCACHE_BUCKET=my-rust-cache-bucket
ENV SCCACHE_REGION=us-east-1
# AWS credentials passed as build secrets
ARG AWS_ACCESS_KEY_ID
ARG AWS_SECRET_ACCESS_KEY

WORKDIR /app
COPY . .
RUN cargo build --release

# Show cache statistics
RUN sccache --show-stats

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/myapp /usr/local/bin/
CMD ["myapp"]
```

sccache is particularly valuable in CI where Docker layer caches might not be available. It caches compiled object files, so even without Docker layer caching, previously compiled crates are reused.

## Technique 7: Workspace Builds

For Rust workspaces with multiple crates, structure the Dockerfile to cache the entire workspace's dependencies:

```dockerfile
# syntax=docker/dockerfile:1
FROM rust:1.77-slim AS chef
RUN cargo install cargo-chef
WORKDIR /app

FROM chef AS planner
# Copy the entire workspace
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

FROM chef AS builder
COPY --from=planner /app/recipe.json recipe.json

# Cook all workspace dependencies at once
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/usr/local/cargo/git \
    cargo chef cook --release --recipe-path recipe.json

COPY . .
# Build specific workspace member
RUN cargo build --release -p myapp-server

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/myapp-server /usr/local/bin/
CMD ["myapp-server"]
```

## Technique 8: Use a .dockerignore File

```
# .dockerignore - exclude build artifacts and unnecessary files
target
.git
.gitignore
*.md
.env
.env.*
docker-compose*.yml
Dockerfile*
.dockerignore
.vscode
.idea
```

Excluding the `target/` directory is critical. A Rust project's target directory can easily be several gigabytes. Sending that as build context wastes significant time.

## Build Time Comparison

| Approach | Clean Build | Incremental Build |
|---|---|---|
| Naive Dockerfile | 10-15 min | 10-15 min |
| Dummy build trick | 10-15 min | 30-60 sec |
| BuildKit cache mounts | 3-5 min | 20-40 sec |
| cargo-chef + cache mounts | 3-5 min | 15-30 sec |
| sccache (CI, warm cache) | 1-2 min | 15-30 sec |

Start with `cargo-chef` and BuildKit cache mounts. This combination handles most projects well. Add `sccache` if you need cross-machine cache sharing in CI. The initial investment in setting up proper caching pays for itself within a single day of development.
