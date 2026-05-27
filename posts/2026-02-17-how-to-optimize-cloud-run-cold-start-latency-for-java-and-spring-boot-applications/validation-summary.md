# Validation Summary: How to Optimize Cloud Run Cold Start Latency for Java

## Status
validated

## Post Type
Tutorial / optimization guide

## Technologies Covered
- Google Cloud Run
- gcloud CLI
- Java 17 / JVM tuning
- Spring Boot
- Spring Boot lazy initialization
- Spring Boot AOT processing
- GraalVM Native Image
- Docker
- Maven

## Sources Consulted
- Google Cloud SDK `gcloud run deploy` reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- Google Cloud Run minimum instances documentation: https://cloud.google.com/run/docs/configuring/min-instances
- Google Cloud Run CPU limits and startup CPU boost documentation: https://cloud.google.com/run/docs/configuring/services/cpu
- Spring Boot lazy initialization reference: https://docs.spring.io/spring-boot/reference/features/spring-application.html
- Spring Boot Maven plugin AOT documentation: https://docs.spring.io/spring-boot/maven-plugin/aot.html
- Spring Boot AOT with JVM documentation: https://docs.spring.io/spring-boot/reference/packaging/aot.html
- Spring Boot GraalVM native image documentation: https://docs.spring.io/spring-boot/how-to/native-image/developing-your-first-application.html
- GraalVM Community Edition container image documentation: https://www.graalvm.org/jdk17/docs/getting-started/container-images/
- Spring Boot `BackgroundPreinitializer` API documentation: https://docs.spring.io/spring-boot/3.3/api/java/org/springframework/boot/autoconfigure/BackgroundPreinitializer.html

## Issues Found
- The Spring AOT section implied that adding `process-aot` alone was enough for an optimized JVM deployment. Updated the text to clarify that JVM deployments must run with `spring.aot.enabled=true`, and added the matching build/run commands.
- The GraalVM Dockerfile used `ghcr.io/graalvm/graalvm-community:17`, which is not the documented image for builds requiring the `native-image` tool. Changed it to `ghcr.io/graalvm/native-image-community:17`.
- The startup CPU boost section and summary said the feature is free or should always be enabled. Google Cloud documentation states boosted CPU is charged during instance startup and for 10 seconds after startup. Updated the text accordingly.
- The recommended Dockerfile ran `./mvnw` without copying `mvnw` and `.mvn` into the build stage. Added the missing `COPY` lines.

## Review Notes
The numeric cold-start improvements in the post are experience-based estimates and will vary by application, dependency graph, Cloud Run configuration, and region. The reviewed commands, configuration keys, and APIs are current as of 2026-05-27.
