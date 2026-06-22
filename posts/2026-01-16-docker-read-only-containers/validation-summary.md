# Validation Summary: How to Run Read-Only Docker Containers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Docker tmpfs mounts
- Linux capabilities and seccomp options
- Kubernetes security contexts
- Kubernetes emptyDir volumes
- Nginx
- Node.js
- Python
- PostgreSQL
- Redis
- Java container images

## Sources Consulted
- Docker CLI reference for `docker run`, including `--read-only`, `--tmpfs`, capabilities, security options, and user flags: https://docs.docker.com/reference/cli/docker/container/run/
- Docker tmpfs mounts documentation: https://docs.docker.com/engine/storage/tmpfs/
- Docker Compose services reference for `read_only`, `tmpfs`, `cap_drop`, `cap_add`, and `security_opt`: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version and name top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker seccomp security profiles documentation: https://docs.docker.com/engine/security/seccomp/
- Kubernetes security context documentation for `readOnlyRootFilesystem`: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes volume documentation for memory-backed `emptyDir` and `sizeLimit`: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes Pod Security Standards documentation: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Node.js release schedule: https://nodejs.org/en/about/previous-releases
- Docker Hub Node official image page: https://hub.docker.com/_/node
- Docker Hub OpenJDK official image deprecation notice: https://hub.docker.com/_/openjdk
- Docker Hub Eclipse Temurin official image page: https://hub.docker.com/_/eclipse-temurin

## Issues Found
- The Node.js example used `node:20-alpine`, but Node.js 20 reached end of life on April 30, 2026. Changed the example to `node:24-alpine`, which is currently supported.
- The Java example used `openjdk:21-slim`, but Docker's official `openjdk` image is deprecated. Changed the example to `eclipse-temurin:21`.
- The hardened Compose example included `security_opt: seccomp:default`. Docker treats `default` as a seccomp profile file path when explicitly configured, so this fails unless a local file named `default` exists. Removed the explicit seccomp entry because Docker applies its default seccomp profile unless overridden.
- The Compose examples used top-level `version: '3.8'`, which is obsolete in the current Compose Specification and produces warnings. Removed the obsolete `version` lines.
- The `inotifywait` example installed tools with `apk`, which only applies to Alpine-based images. Updated the comment to make that scope explicit.

## Review Notes
The remaining Docker and Kubernetes options are valid against current official documentation. The application-specific writable directory lists are practical defaults, but real production images may need additional writable tmpfs mounts or volumes depending on entrypoint scripts, logging paths, package manager caches, and application configuration.
