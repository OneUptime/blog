# Validation Summary: How to Containerize a Java Application with GraalVM Native Image in Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Java
- Spring Boot
- GraalVM Native Image
- GraalVM Native Build Tools Maven plugin
- Docker
- Docker Compose
- Google Distroless container images
- Alpine Linux container images

## Sources Consulted
- Spring Boot GraalVM Native Application guide: https://docs.spring.io/spring-boot/how-to/native-image/developing-your-first-application.html
- Spring Boot 3.5 documentation overview and supported documentation versions: https://docs.spring.io/spring-boot/3.5/documentation.html
- GraalVM Native Build Tools Maven plugin documentation: https://graalvm.github.io/native-build-tools/latest/maven-plugin
- GraalVM Community Edition container image documentation: https://www.graalvm.org/jdk22/docs/getting-started/container-images/
- GraalVM Native Image tracing agent documentation: https://www.graalvm.org/22.0/reference-manual/native-image/Agent/
- GraalVM static and mostly static native image documentation: https://www.graalvm.org/22.0/reference-manual/native-image/StaticImages/
- Docker Compose service healthcheck reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose deploy resources reference: https://docs.docker.com/reference/compose-file/deploy/
- Docker Compose version element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Google Distroless project documentation: https://github.com/GoogleContainerTools/distroless

## Issues Found
- The Maven snippet used Spring Boot 3.2.0 and omitted project coordinates while the Dockerfile copied `target/app`. Updated the example to Spring Boot 3.5.14, added `groupId`, `artifactId`, `version`, `java.version`, and `finalName` so the generated JAR and native executable names match later commands.
- The Dockerfile accepted `--build-arg MAVEN_OPTS` in the build command but did not declare the build argument. Added `ARG MAVEN_OPTS`.
- The distroless Dockerfile defined `HEALTHCHECK CMD ["/app/app", "--health-check"]`, but the sample Spring Boot app does not implement a `--health-check` command. Removed the invalid health check.
- The tracing-agent Docker command did not mount the application JAR into the container or publish port 8080, so the later `curl` commands could not work. Added a package step, mounted `target`, set a working directory, published the port, named the container, and stopped it by name.
- The quick-build example used the old `spring-boot.native-image.argline` property. Replaced it with the Native Build Tools quick-build configuration via `-DquickBuild=true`.
- The Alpine runtime example reused a glibc-built binary, which is not valid for Alpine's musl environment. Updated the section to use the `native-image-community:21-muslib` builder and documented `--static --libc=musl` build arguments.
- The Docker Compose example used a `curl` health check inside a distroless application image, but distroless images do not include curl or a shell by default. Removed the health check and added a note to use orchestrator HTTP probes or include a purpose-built health-check binary.
- The Compose snippet included the obsolete top-level `version` field. Removed it to match the current Compose Specification.

## Review Notes
The performance numbers and image sizes are plausible examples, not guarantees. Actual startup time, memory use, and image size depend on the Spring Boot version, dependencies, native-image options, CPU architecture, and container base image.
