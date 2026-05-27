# Validation Summary: How to Containerize Spring Boot Applications with Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java 21
- Spring Boot
- Spring Boot Actuator
- Maven
- Docker
- Docker Compose
- PostgreSQL container image
- JVM container memory options

## Sources Consulted
- Spring Boot container image and layered JAR documentation: https://docs.spring.io/spring-boot/docs/3.2.4/reference/html/container-images.html
- Spring Boot Actuator endpoints documentation: https://docs.spring.io/spring-boot/3.5/reference/actuator/endpoints.html
- Spring Boot graceful shutdown documentation: https://docs.spring.io/spring-boot/reference/web/graceful-shutdown.html
- Dockerfile reference, including HEALTHCHECK: https://docs.docker.com/reference/dockerfile/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose services reference, including depends_on and deploy: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Oracle Java 21 java command documentation for JVM options: https://docs.oracle.com/en/java/javase/21/docs/specs/man/java.html

## Issues Found
- The Compose example used `JAVA_OPTS`, but the Dockerfiles use exec-form `ENTRYPOINT` commands that do not automatically expand or consume that environment variable. Changed the Compose environment variable to `JAVA_TOOL_OPTIONS`, which the Java launcher reads automatically.
- The Docker Compose file included `version: '3.8'`. Docker's current Compose Specification treats the top-level `version` property as obsolete and informative only, so it was removed.
- The Dockerfile healthcheck used `curl`, but the Temurin runtime image should not be assumed to include it. Added an explicit `apt-get install --no-install-recommends curl` line for the runtime stage before the `HEALTHCHECK`.
- Clarified that the Actuator healthcheck endpoint is available when Spring Boot Actuator is on the classpath.
- Corrected the Maven dependency caching comment: that layer also rebuilds when Maven wrapper files change, not only when `pom.xml` changes.

## Review Notes
- The Spring Boot layered JAR extraction and `org.springframework.boot.loader.launch.JarLauncher` entrypoint match Spring Boot 3.x documentation. Older Spring Boot 2.x applications used a different launcher package name.
- `-XX:+UseContainerSupport` is valid for Java 21, but Java 21 enables container support by default on Linux. Keeping it explicit is harmless.
- `-XX:+UseStringDeduplication` requires G1 GC; the script also enables G1 GC, and Java 21 uses G1 by default on typical server configurations.
