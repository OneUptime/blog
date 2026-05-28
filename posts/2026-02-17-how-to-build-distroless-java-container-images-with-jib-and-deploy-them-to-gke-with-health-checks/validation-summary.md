# Validation Summary: How to Build Distroless Java Container Images with Jib and Deploy Them to GKE

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Platform
- Google Kubernetes Engine
- Artifact Registry
- Jib Gradle plugin
- Java
- Spring Boot
- Spring Boot Actuator
- Distroless container images
- Kubernetes Deployments, Services, probes, and HorizontalPodAutoscaler
- kubectl debug and ephemeral containers

## Sources Consulted
- Jib Gradle plugin documentation: https://github.com/GoogleContainerTools/jib/tree/master/jib-gradle-plugin
- Jib project releases: https://github.com/GoogleContainerTools/jib
- Distroless image documentation: https://github.com/GoogleContainerTools/distroless
- Spring Boot Gradle plugin documentation: https://docs.spring.io/spring-boot/gradle-plugin/
- Spring Boot supported versions policy: https://github.com/spring-projects/spring-boot/wiki/Supported-Versions
- Spring support policy: https://spring.io/support-policy/
- Spring Boot Actuator endpoints and Kubernetes probes documentation: https://docs.spring.io/spring-boot/reference/actuator/endpoints.html
- Kubernetes liveness, readiness, and startup probes documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes debug running pods documentation: https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod
- kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Google Cloud Artifact Registry Java authentication documentation: https://docs.cloud.google.com/artifact-registry/docs/java/authentication
- Gradle Plugin Portal for Spring dependency management plugin: https://plugins.gradle.org/plugin/io.spring.dependency-management

## Issues Found
- The sample used Spring Boot `3.2.0`, which is no longer a current supported Spring Boot line. Updated the sample to `3.5.14`, a stable Spring Boot 3.x version listed in the current Spring Boot Gradle plugin documentation.
- The sample used `io.spring.dependency-management` `1.1.4`, while `1.1.7` is the current plugin version. Updated the version.
- The sample used Jib `3.4.0`, while the Jib project lists `3.5.3` as the current release. Updated the version.
- The post used `gcr.io/distroless/java17-debian12` and its debug tag. Current Distroless documentation lists Java runtime images under Debian 13. Updated the base image and debug image to `gcr.io/distroless/java17-debian13` and `gcr.io/distroless/java17-debian13:debug`.
- The Kubernetes startup probe checked `/actuator/health/readiness`. Kubernetes documentation recommends startup probes check the same endpoint as liveness when the goal is to protect slow-starting containers from premature liveness restarts. Updated it to `/actuator/health/liveness`.

## Review Notes
- The Spring Boot Actuator liveness and readiness endpoint paths are correct for applications with probe support enabled, and Spring Boot can expose them automatically in Kubernetes environments.
- The custom `HealthIndicator` example is syntactically valid. By default, Spring Boot does not add arbitrary health indicators to the liveness or readiness health groups, which is usually desirable for liveness checks.
- The `kubectl debug` example is consistent with Kubernetes ephemeral container documentation, including the use of `--target`.
- The Jib `credHelper`, `creationTime`, `format`, `ports`, `jvmFlags`, `mainClass`, and `environment` configuration fields match the Jib Gradle plugin documentation.
