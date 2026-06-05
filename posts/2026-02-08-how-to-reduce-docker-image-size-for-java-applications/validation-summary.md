# Validation Summary: How to Reduce Docker Image Size for Java Applications

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Docker and Dockerfiles
- Java 21
- Maven
- Eclipse Temurin container images
- Alpine Linux
- jdeps and jlink
- Spring Boot layered JARs
- GraalVM Native Image
- Google Distroless Java images

## Sources Consulted
- Docker Docs: Multi-stage builds - https://docs.docker.com/build/building/multi-stage/
- Docker Docs: Dockerfile reference - https://docs.docker.com/reference/builder
- Docker Docs: docker image ls / docker images formatting - https://docs.docker.com/reference/cli/docker/image/ls/
- Oracle Java SE 21 jlink command documentation - https://docs.oracle.com/en/java/javase/21/docs/specs/man/jlink.html
- Oracle Java SE 21 jdeps command documentation - https://docs.oracle.com/en/java/javase/21/docs/specs/man/jdeps.html
- Spring Boot reference: Dockerfiles and layered JAR extraction - https://docs.spring.io/spring-boot/reference/packaging/container-images/dockerfiles.html
- Spring Boot reference: GraalVM Native Images - https://docs.spring.io/spring-boot/reference/packaging/native-image/
- GraalVM for JDK 21: Community Edition container images - https://www.graalvm.org/jdk21/docs/getting-started/container-images/
- GoogleContainerTools Distroless README - https://github.com/GoogleContainerTools/distroless
- GoogleContainerTools Distroless Java README - https://github.com/GoogleContainerTools/distroless/blob/main/java/README.md
- Alpine Linux About page - https://www.alpinelinux.org/about/
- Apache Maven Dependency Plugin go-offline goal - https://maven.apache.org/plugins/maven-dependency-plugin/go-offline-mojo.html

## Issues Found
- JDK 21 `jlink` uses `--compress={0|1|2}`, not `--compress=zip-6`. Updated both jlink examples to use `--compress=2`, which is the ZIP compression option documented for Java 21.
- The `jdeps` examples analyzed only the Spring Boot executable JAR and did not include nested dependency JARs on the class path. Added extraction of `BOOT-INF/lib` and `--class-path 'BOOT-INF/lib/*'` so `jdeps --print-module-deps` can account for application dependencies.
- The Spring Boot layered JAR example used the older `layertools` jarmode and launched the extracted layout with `JarLauncher`. Updated it to the current documented `tools` jarmode command, extraction destination, copy paths, and `java -jar application.jar` launch form.
- The GraalVM Dockerfile used `ghcr.io/graalvm/graalvm-community:21` plus `gu install native-image`. Current GraalVM container documentation provides `ghcr.io/graalvm/native-image-community:21` for native-image builds, so the example now uses that image and installs Maven for the build command.
- The distroless Java example used `gcr.io/distroless/java21-debian12`. Current distroless documentation lists Debian 13 Java images as the active tags, so the example now uses `gcr.io/distroless/java21-debian13`.

## Review Notes
- The size figures are plausible example measurements, but actual sizes vary by CPU architecture, image tag digest, application dependencies, and time as base images are updated.
- Alpine images can be smaller, but musl libc compatibility should still be tested with native libraries and observability agents.
- jlink module detection for Spring Boot applications may still need manual validation for reflection, service loading, optional drivers, or dynamically loaded code.
