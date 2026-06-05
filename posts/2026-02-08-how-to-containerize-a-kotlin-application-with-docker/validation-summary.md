# Validation Summary: How to Containerize a Kotlin Application with Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kotlin
- JVM
- Ktor
- Spring Boot
- Kotlin/Native
- Gradle Kotlin DSL
- Docker
- Docker Compose
- PostgreSQL
- Docker Scout
- Trivy

## Sources Consulted
- Ktor documentation, "Creating fat JARs using the Ktor Gradle plugin": https://ktor.io/docs/server-fatjar.html
- Ktor documentation, "Adding server dependencies": https://ktor.io/docs/server-dependencies.html
- Spring Boot documentation, "Container Images" and layered JAR Dockerfile example: https://docs.spring.io/spring-boot/docs/current/reference/html/container-images.html
- Spring Boot executable JAR documentation, JarLauncher: https://docs.spring.io/spring-boot/specification/executable-jar/launching.html
- Gradle documentation, "Declaring Repositories Basics": https://docs.gradle.org/current/userguide/declaring_repositories_basics.html
- Docker documentation, Dockerfile HEALTHCHECK reference: https://docs.docker.com/reference/dockerfile/
- Docker documentation, Compose file `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker documentation, `docker scout cves`: https://docs.docker.com/reference/cli/docker/scout/cves/
- Kotlin documentation, "Get started with Kotlin/Native": https://kotlinlang.org/docs/native-get-started.html
- Kotlin documentation, "Multiplatform Gradle DSL reference": https://kotlinlang.org/docs/multiplatform/multiplatform-dsl-reference.html
- Ktor documentation, "Native server": https://ktor.io/docs/server-native.html

## Issues Found
- The Ktor `build.gradle.kts` example declared external dependencies but did not declare a repository. Added `repositories { mavenCentral() }`, matching Gradle's repository resolution requirements.
- The Ktor Dockerfile copied `gradle.properties` even though the article did not define one and Gradle projects do not require one. Removed it from the `COPY` instruction so the Docker build does not fail for the shown project shape.
- The Ktor and Spring Boot runtime images used Docker health checks with `curl` but did not install `curl`. Added a minimal `apt-get install --no-install-recommends curl` step in both runtime stages.
- The Spring Boot Dockerfile health check targeted `/actuator/health`, but the sample application defines `/health` and does not show Spring Boot Actuator. Changed the health check to `/health`.
- The Docker Compose snippets used the obsolete top-level `version` field. Removed it, consistent with the current Compose Specification.
- The development Compose section claimed hot reload, but the snippet only exposes a JVM debug port and does not mount source or run a continuous build. Updated the wording to describe a debugger port.
- The production Compose snippet referenced a `db` hostname without defining a `db` service. Changed `DATABASE_URL` to read from the environment so the configuration does not imply a missing Compose service.

## Review Notes
- Docker Hub rate limits prevented local verification of the Eclipse Temurin image contents with `docker run`; this is why the review relies on making the health-check dependency explicit in the Dockerfile.
- The Kotlin/Native Dockerfile assumes a Gradle target named `native`, which is consistent with Ktor's native-server documentation pattern and Kotlin/Native's target-named source set conventions.
