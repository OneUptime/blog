# Validation Summary: How to Containerize a Dart Application with Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dart
- Docker
- Docker multi-stage builds
- Docker Compose
- Dart AOT compilation
- Shelf
- shelf_router
- BuildKit cache mounts
- Docker health checks

## Sources Consulted
- Dart Docker Official Image documentation: https://hub.docker.com/_/dart
- Dart `dart compile` documentation: https://dart.dev/tools/dart-compile
- Dart `dart run` documentation: https://dart.dev/tools/dart-run
- Shelf package documentation: https://pub.dev/packages/shelf
- Docker Compose version and name documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Dockerfile reference, including `RUN --mount` and `HEALTHCHECK`: https://docs.docker.com/reference/builder
- Docker run documentation: https://docs.docker.com/engine/containers/run/

## Issues Found
- Corrected the description of Shelf from Dart's "standard HTTP middleware library" to a widely used HTTP middleware package, because Shelf is a package rather than part of the Dart SDK standard libraries.
- Corrected the production Dockerfile comment that described the compiled binary as fully self-contained while also copying `/runtime/`; the final image needs the binary plus the required runtime files from the official Dart image.
- Replaced the Alpine debugging runtime example with a Debian-based runtime example that copies `/runtime/`. A binary compiled in the Debian-based `dart:stable` image is not reliably runnable on Alpine with only `libstdc++` and `ca-certificates`.
- Removed the obsolete top-level Compose `version: "3.8"` field, which current Docker Compose keeps only for backward compatibility and warns about.
- Replaced the "hot reload" development claim with mounted source files and Dart VM service support. The original wording implied automatic hot reload for a Shelf server, which `dart run` does not provide by itself.
- Added the VM service port mapping and `EXPOSE 8181` to match the updated development command using `--observe=0.0.0.0:8181`.
- Reworded the health check section to clarify that Docker `HEALTHCHECK` runs a command inside the container, so `scratch` images need either an external orchestrator probe or an included helper binary.
- Replaced the startup benchmark command. The original `time docker run --rm dart-app:latest /app/bin/server --help` would not exit because the sample server does not implement a `--help` mode; it would start the long-running server instead.
- Softened unverified performance and memory claims, including sub-50ms startup times and a fixed memory usage number, to avoid presenting workload-dependent measurements as guarantees.
- Corrected the summary to state that the final image has no full SDK or JIT toolchain, rather than no runtime at all.

## Review Notes
The official Dart Docker image documentation now shows `dart build cli` for generated server Dockerfiles, while `dart compile exe` remains documented and valid for compiling a self-contained executable. Future updates could consider using the official generated Dockerfile pattern if the article wants to align exactly with the latest `dart create -t server-shelf` output.
