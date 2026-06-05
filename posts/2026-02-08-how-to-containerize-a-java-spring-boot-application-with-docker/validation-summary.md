# Validation Summary: How to Containerize a Java Spring Boot Application with Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Java
- Spring Boot
- Maven
- Gradle
- Docker
- Docker Compose
- JVM container tuning
- Docker Scout
- Trivy

## Sources Consulted
- Spring Boot Maven Plugin documentation, Packaging Executable Archives: https://docs.spring.io/spring-boot/maven-plugin/packaging.html
- Spring Boot documentation, Efficient Container Images: https://docs.spring.io/spring-boot/3.5/reference/packaging/container-images/efficient-images.html
- Spring Boot documentation, Developer Tools: https://docs.enterprise.spring.io/spring-boot/reference/using/devtools.html
- Spring Boot Actuator documentation, Production-ready Features: https://docs.spring.io/spring-boot/docs/3.0.13/reference/html/actuator.html
- Docker Docs, Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker Docs, Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs, Compose Services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Docs, Compose version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs, docker scout cves CLI reference: https://docs.docker.com/reference/cli/docker/scout/cves/
- Oracle Java 21 documentation, The java Command: https://docs.oracle.com/en/java/javase/21/docs/specs/man/java.html

## Issues Found
- The sample application defines a custom `/health` endpoint, but the Dockerfile, production Compose health check, and test command used `/actuator/health`. Changed those examples to `/health` so they work with the application shown in the post. Spring Boot Actuator's `/actuator/health` endpoint is valid only when Actuator is included and configured.
- The Docker health check used `curl` in the `eclipse-temurin:21-jre-jammy` runtime image without installing it. Added an `apt-get install --no-install-recommends curl ca-certificates` step and cleaned `/var/lib/apt/lists`.
- The naive Dockerfile critique said build tools end up in the final image, but the shown example copies an already built JAR and does not include build tools in the image. Reworded the critique to say the build environment is not captured by the Dockerfile.
- The JVM tuning section said the JVM would use host memory without flags. That is outdated for modern HotSpot JVMs where container support is enabled by default. Reworded the explanation to focus on explicit heap percentage configuration.
- The `JAVA_OPTS` shell example placed inline comments inside a quoted string, which would make the comments part of the value if copied literally. Removed the inline comments from the quoted variable.
- The Docker Compose snippets used the obsolete top-level `version` key. Removed it from the development and production Compose examples.
- The development Compose section claimed hot reload by mounting `./src`, but the shown image runs the packaged application and Spring Boot DevTools restarts require classpath updates. Reworded it as a remote debugging setup and removed the misleading source mount.
- The startup optimization snippet used `-noverify`, which is deprecated in modern Java releases. Removed that flag.
- The image size claim was too exact for a result that depends on base image, OS packages, and application dependencies. Added a note that actual size varies.

## Review Notes
- I could not verify the current `eclipse-temurin:21-jre-jammy` image contents locally because Docker Hub returned an unauthenticated pull rate limit. The Dockerfile now installs `curl` explicitly, so the health check no longer depends on undocumented base image contents.
- The Gradle snippet assumes Groovy DSL files named `build.gradle` and `settings.gradle`; Kotlin DSL projects would need adjusted file names.
- For real production services, using Spring Boot Actuator for health checks is often preferable, but that would require adding the Actuator dependency and was outside the minimal application shown in this post.
