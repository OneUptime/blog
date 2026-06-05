# Validation Summary: How to Containerize a Swift Application with Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Swift
- Swift Package Manager
- Vapor
- Docker
- Docker Compose
- BuildKit
- Ubuntu container images
- Distroless container images
- PostgreSQL
- Redis

## Sources Consulted
- Vapor website and current examples: https://vapor.codes/
- Vapor release notes for async `Application.make()`: https://github.com/vapor/vapor/releases/tag/4.98.0
- Swift Package Manager dependency resolution documentation: https://docs.swift.org/swiftpm/documentation/packagemanagerdocs/resolvingpackageversions/
- Swift `build` command documentation: https://docs.swift.org/swiftpm/documentation/packagemanagerdocs/swiftbuild/
- Swift.org server packaging guide: https://www.swift.org/documentation/server/guides/packaging.html
- Swift Docker installation documentation: https://www.swift.org/install/linux/docker/
- Dockerfile reference, including `HEALTHCHECK` and BuildKit `RUN --mount`: https://docs.docker.com/reference/dockerfile/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker CLI help output for `docker build`, `docker buildx build`, `docker run`, and `docker compose config`

## Issues Found
- The Vapor dependency used `from: "4.89.0"` while the sample code uses async `Application.make(.detect())`. That async factory was added in Vapor 4.98.0, so the dependency floor was updated to `from: "4.98.0"`.
- The Dockerfile snippets copied `Package.resolved` directly even though the tutorial starts from scratch and that file might not exist yet. The snippets now use `COPY Package.* ./`, which includes `Package.swift` and `Package.resolved` when present without failing for a new project.
- The production runtime Dockerfile used a `curl` health check but did not install the `curl` CLI. The package list now includes `curl`.
- The distroless image size claim was too absolute for Vapor applications with app-specific dynamic library requirements. The wording now says it can be under 50 MB for simple services and tells readers to test runtime dependencies.
- The Docker Compose section claimed automatic rebuilding, but the shown setup only mounts source and requires restarting the app container to rebuild and rerun. The wording was corrected.
- The Compose example used the legacy top-level `version` key. It was removed to match the current Compose Specification.
- The `Package.resolved` description called it a lockfile. SwiftPM documents more nuanced behavior, so the text now says it records resolved dependency versions for top-level application builds.

## Review Notes
- Swift was not installed in the local environment, so Swift compilation was not run locally. Swift and Vapor API checks were performed against official documentation and release notes.
- The edited Compose example was validated with `docker compose config -q`.
- Docker CLI flags for SSH forwarding, cache mounts, memory limits, CPU limits, port publishing, container naming, and detached mode were checked against local Docker help output.
