# Validation Summary: How to Containerize a Groovy Application with Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Groovy
- Gradle
- Micronaut
- GraalVM Native Image
- JVM container tuning
- Eclipse Temurin container images
- Distroless container images

## Sources Consulted
- Gradle releases: https://gradle.org/releases
- Gradle Java compatibility matrix: https://docs.gradle.org/current/userguide/compatibility.html
- Gradle official Docker image tags: https://hub.docker.com/_/gradle
- Micronaut Gradle Plugin documentation: https://micronaut-projects.github.io/micronaut-gradle-plugin/latest/
- Micronaut Groovy application guide: https://guides.micronaut.io/latest/creating-your-first-micronaut-app-gradle-groovy.html
- Micronaut health endpoint guide: https://guides.micronaut.io/latest/micronaut-health-endpoint-gradle-groovy.html
- GraalVM Community Edition container image documentation: https://www.graalvm.org/dev/getting-started/container-images/
- Docker Compose file reference and obsolete `version` field documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Eclipse Temurin official Docker image tags: https://hub.docker.com/_/eclipse-temurin
- Groovy official Docker image tags: https://hub.docker.com/_/groovy
- Shadow Gradle Plugin portal page: https://plugins.gradle.org/plugin/com.gradleup.shadow

## Issues Found
- The Groovy `compute` endpoint incorrectly treated descending Groovy ranges such as `2..1` as divisor ranges, which misclassified small primes. Updated the logic to guard `n < 2` and skip divisor checks when the square-root bound is below 2.
- The GraalVM Dockerfile used `ghcr.io/graalvm/native-image:ol9-java26`, which does not match the current GraalVM Community image naming documented by GraalVM. Updated it to `ghcr.io/graalvm/native-image-community:25` and installed `curl` and `unzip` with `microdnf`, the documented package manager for those images.
- The Docker Compose example used the obsolete top-level `version: "3.8"` field. Removed it so the file follows the current Compose Specification.
- The standalone Groovy script image used `groovy:9.5.1-jdk26-alpine`, mixing a Gradle version with the Groovy image. Updated it to the current official Groovy image tag `groovy:5.0.4-jdk21-alpine`.
- The `docker run` JVM tuning example set `JAVA_OPTS`, but the earlier image `CMD` does not read that environment variable. Changed the command to pass JVM flags directly to `java`.
- The monitoring section implied Micronaut health endpoints are available without adding the management dependency. Clarified that Micronaut Management must be added for Micronaut's built-in health endpoints.

## Review Notes
The Gradle, Micronaut, Shadow plugin, Eclipse Temurin, and Gradle Docker image versions referenced in the remaining examples were current or plausible as of 2026-06-05. Docker Hub manifest inspection was rate-limited in the local environment, so image validation used Docker Hub tag pages/API search results and official image documentation.
