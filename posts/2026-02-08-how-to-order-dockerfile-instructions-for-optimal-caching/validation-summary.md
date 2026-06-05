# Validation Summary: How to Order Dockerfile Instructions for Optimal Caching

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker
- Dockerfile build cache
- Docker BuildKit cache mounts
- Node.js and npm
- Python and pip
- Go modules
- Maven
- Rust and Cargo
- Linux package installation with apt

## Sources Consulted
- Docker Docs: Build cache invalidation - https://docs.docker.com/build/cache/invalidation/
- Docker Docs: Optimize cache usage in builds - https://docs.docker.com/build/cache/optimize/
- Docker Docs: Docker build cache - https://docs.docker.com/build/cache/
- Docker Docs: Dockerfile reference - https://docs.docker.com/reference/dockerfile/
- Docker Docs: Building best practices - https://docs.docker.com/build/building/best-practices/
- Docker Docs: docker buildx build CLI reference - https://docs.docker.com/reference/cli/docker/buildx/build/
- npm Docs: npm ci - https://docs.npmjs.com/cli/commands/npm-ci/
- Go Modules Reference: go mod download - https://go.dev/ref/mod/#go-mod-download
- Apache Maven Dependency Plugin: dependency:go-offline - https://maven.apache.org/plugins/maven-dependency-plugin/go-offline-mojo.html
- The Cargo Book: cargo build - https://doc.rust-lang.org/cargo/commands/cargo-build.html

## Issues Found
- The opening paragraph said every Dockerfile instruction creates a layer. This is imprecise because filesystem-changing instructions such as `RUN`, `COPY`, and `ADD` create image layers, while other instructions primarily affect image configuration or build state. Updated the wording to describe cache participation separately from image-layer creation.
- The cache example described rebuilt "layers C through F" even though `CMD` is better described as a build step/config instruction rather than a filesystem layer. Updated this to "steps C through F."
- The "Using ADD with a remote URL" section said `ADD` always fetches and recommended `RUN curl` for predictable caching. Current Docker best-practice documentation says `ADD` is better for remote artifacts because it provides more precise build cache behavior and supports checksum verification. Updated the example to use `ADD --checksum=sha256:<expected-sha256>`.

## Review Notes
The examples are illustrative and assume the referenced project files exist, such as `package-lock.json`, `requirements.txt`, `go.mod`, `go.sum`, `pom.xml`, and Rust source files. The pinned language/image versions are not the newest available in all cases, but they are valid for demonstrating Docker cache ordering.
