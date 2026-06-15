# Validation Summary: How to Use Docker Copy vs Add

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker
- Dockerfile
- Docker Build
- BuildKit
- Node.js Docker images
- Python Docker images

## Sources Consulted
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker build best practices: https://docs.docker.com/build/building/best-practices/
- Docker build context and .dockerignore documentation: https://docs.docker.com/build/concepts/context/
- Local Docker Engine behavior check with Docker Engine 29.4.2

## Issues Found
- The post implied ADD extracted tar archives from remote URLs by default. Docker only extracts recognized local tar archives by default; remote archives require `ADD --unpack=true` with a Dockerfile syntax version that supports it. Updated the remote archive example to use `# syntax=docker/dockerfile:1.17` and `ADD --unpack=true`.
- The post said using ADD with an explicit archive filename destination would preserve a local tar archive. Docker still unpacks local tar archives by default, and the destination path becomes a directory. Updated the example to use `ADD --unpack=false`.
- The post stated ADD URL downloads had no checksum verification or caching control. Current Dockerfile syntax supports `ADD --checksum`, and Docker's current best-practices documentation describes ADD as useful for public remote artifacts with precise cache behavior. Updated the URL guidance to distinguish cases where `RUN curl` is useful from cases where `ADD --checksum` is appropriate.
- The post described ADD as doing everything COPY does. COPY also supports sources such as build stages, named contexts, and images through `COPY --from`, so the statement was narrowed to build-context file copying.

## Review Notes
The remaining examples are technically valid for Linux containers. `--chown` and `--chmod` behavior is Linux-container specific; future revisions could call this out if the article expands to Windows container builds.
