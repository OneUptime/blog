# Validation Summary: How to Speed Up Docker Build for Java/Maven Projects

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker and Dockerfile layer caching
- Docker BuildKit cache mounts
- Java 21
- Maven and Maven Dependency Plugin
- Multi-stage Docker builds
- Eclipse Temurin JDK/JRE images
- jdeps and jlink
- Spring Boot layered JARs and layertools
- Gradle builds
- .dockerignore

## Sources Consulted
- Docker Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker build cache optimization and cache mounts: https://docs.docker.com/build/cache/optimize/
- Docker build context and .dockerignore documentation: https://docs.docker.com/build/concepts/context/
- Apache Maven Dependency Plugin `dependency:go-offline`: https://maven.apache.org/plugins/maven-dependency-plugin/go-offline-mojo.html
- Apache Maven CLI options reference: https://maven.apache.org/components/ref/3.9.11/maven-embedder/cli.html
- Oracle Java 21 `jdeps` manual: https://docs.oracle.com/en/java/javase/21/docs/specs/man/jdeps.html
- Oracle Java 21 `jlink` manual: https://docs.oracle.com/en/java/javase/21/docs/specs/man/jlink.html
- Spring Boot 2.7 container image and layered JAR documentation: https://docs.spring.io/spring-boot/docs/2.7.14/reference/html/container-images.html
- Spring Boot executable JAR launcher documentation: https://docs.spring.io/spring-boot/specification/executable-jar/launching.html
- Gradle Daemon documentation: https://docs.gradle.org/current/userguide/gradle_daemon.html
- Gradle dependency reporting documentation: https://docs.gradle.org/current/userguide/viewing_debugging_dependencies.html
- Gradle Java compatibility matrix: https://docs.gradle.org/current/userguide/compatibility.html

## Issues Found
- The `jlink` example used `--compress=zip-6`, but the Java 21 `jlink` manual documents `--compress={0|1|2}` and uses `--compress=2` for ZIP compression. Changed the Dockerfile snippet to `--compress=2`.
- The Spring Boot layered JAR Dockerfile used `org.springframework.boot.loader.launch.JarLauncher`, which is correct for Spring Boot 3.x but not Spring Boot 2.x. Added a version note that Spring Boot 2.x uses `org.springframework.boot.loader.JarLauncher`.
- The Gradle Dockerfile comment said it copied the Gradle wrapper and downloaded dependencies only, but the snippet uses the Gradle executable from the `gradle` image and the `dependencies` task is officially a dependency report task. Updated the comments to say it copies Gradle build files and resolves the dependency graph before source is copied.

## Review Notes
The Docker BuildKit cache mount examples, Maven `dependency:go-offline`, Maven `-B` and `-o` flags, multi-stage JRE runtime pattern, Spring Boot layertools extraction order, Gradle `--no-daemon`, and `.dockerignore` usage are consistent with the consulted official documentation. Docker Hub rate limiting prevented live manifest inspection of the example image tags, but Docker Hub official image documentation lists the Maven and Gradle tag families used in the post.
