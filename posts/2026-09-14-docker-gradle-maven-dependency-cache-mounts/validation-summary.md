# Validation Summary: Cache Gradle and Maven Dependencies in Docker with BuildKit Mounts

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker and multi-stage Dockerfiles
- Docker BuildKit cache mounts and secret mounts
- Docker Buildx
- Apache Maven 3.9
- Gradle Wrapper and Gradle dependency/build caches
- Eclipse Temurin JDK/JRE 21 images
- CI/CD dependency-cache persistence

## Sources Consulted
- [Dockerfile reference: `RUN --mount`](https://docs.docker.com/reference/dockerfile/#run---mount)
- [Docker Build secrets](https://docs.docker.com/build/building/secrets/)
- [Docker Buildx build CLI reference](https://docs.docker.com/reference/cli/docker/buildx/build/)
- [Docker Build cache backends](https://docs.docker.com/build/cache/backends/)
- [BuildKit cache export/import reference](https://github.com/moby/buildkit/blob/master/docs/reference/buildctl.md#cache)
- [Maven 3.9.11 settings reference](https://maven.apache.org/ref/3.9.11/maven-settings/settings.html)
- [Maven Dependency Plugin: `dependency:go-offline`](https://maven.apache.org/plugins/maven-dependency-plugin/go-offline-mojo.html)
- [Gradle dependency caching](https://docs.gradle.org/current/userguide/dependency_caching.html)
- [Gradle-managed directories and caches](https://docs.gradle.org/current/userguide/directory_layout.html)
- [Gradle Build Cache](https://docs.gradle.org/current/userguide/build_cache.html)

## Issues Found
No technical issues found.

## Review Notes
The examples intentionally depend on project-specific files and configuration: the Maven example requires a `pom.xml`, source tree, and configured `service.jar`, while the Gradle example requires a Wrapper project. The post states these constraints accurately. BuildKit cache mounts are builder-local mutable cache state and may be garbage-collected, so the post correctly requires cold-cache correctness and warns that ordinary external layer-cache export does not by itself guarantee cache-mount persistence across CI runners.
