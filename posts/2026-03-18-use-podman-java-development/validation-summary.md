# Validation Summary: How to Use Podman for Java Development

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Java 21 / OpenJDK distributions
- Maven
- Gradle
- Spring Boot
- PostgreSQL
- Compose-based local development
- JDWP remote debugging

## Sources Consulted
- Podman documentation, `podman compose`: https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- Podman documentation, volume mount options (`:z` / `:Z`): https://docs.podman.io/en/v4.3/markdown/options/volume.html
- Eclipse Temurin Docker Official Image: https://hub.docker.com/_/eclipse-temurin
- Amazon Corretto Docker Official Image: https://hub.docker.com/_/amazoncorretto
- IBM Semeru Runtimes Docker Official Image: https://hub.docker.com/_/ibm-semeru-runtimes
- OpenJDK Docker Official Image: https://hub.docker.com/_/openjdk
- Maven Docker Official Image: https://hub.docker.com/_/maven
- Docker Compose docs, `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose docs, Compose file behavior and naming: https://docs.docker.com/compose/compose-application-model/
- Gradle Wrapper docs: https://docs.gradle.org/current/userguide/gradle_wrapper.html
- Gradle 8.5 release notes: https://docs.gradle.org/8.5/release-notes.html
- Gradle compatibility matrix: https://docs.gradle.org/current/userguide/compatibility.html
- Oracle JDK 21 `java` command reference: https://docs.oracle.com/en/java/javase/21/docs/specs/man/java.html
- IntelliJ IDEA remote debugging docs: https://www.jetbrains.com/help/idea/tutorial-remote-debug.html

## Issues Found
- The post referenced `openjdk:21-slim` as a current option. The Docker Official `openjdk` image is deprecated and only keeps early-access builds updated, so I replaced that example with a current vendor-maintained Java 21 image (`ibm-semeru-runtimes:open-21-jdk`) and clarified the deprecation status.
- The Compose example included a top-level `version: "3.8"` line. Current Compose documentation marks the `version` field as obsolete, so I removed it.
- The production-image section implied that Java 21 needs `-XX:+UseContainerSupport` to respect container limits. Oracle’s JDK 21 docs state container support is enabled by default, so I removed the redundant flag and corrected the explanation to focus on `-XX:MaxRAMPercentage`.

## Review Notes
- The post is technically correct after the fixes above.
- The compose workflow in this post uses `podman-compose`, which is an external compose provider. Podman’s official `podman compose` command is a wrapper around an installed provider, so readers still need a compose provider available locally.
- Several image tags are intentionally floating (`21-jdk`, `3.9-eclipse-temurin-21`). They are valid, but pinning distro or patch tags would make the guide more reproducible over time.
- Podman was not installed in the review environment, so command verification was done against upstream documentation rather than local `podman --help` output.
