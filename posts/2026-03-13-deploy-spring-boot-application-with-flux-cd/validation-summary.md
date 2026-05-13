# Validation Summary: How to Deploy a Spring Boot Application with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Spring Boot 3.x
- Spring Boot Actuator
- Java / JVM container settings
- Docker multi-stage builds
- Kubernetes Deployments, Services, ConfigMaps, and Secrets
- Flux CD GitRepository and Kustomization
- Flux image automation

## Sources Consulted
- Spring Boot Dockerfiles documentation: https://docs.spring.io/spring-boot/reference/packaging/container-images/dockerfiles.html
- Spring Boot 3.3 Dockerfiles documentation: https://docs.spring.io/spring-boot/3.3/reference/packaging/container-images/dockerfiles.html
- Spring Boot Actuator Kubernetes probes documentation: https://docs.spring.io/spring-boot/3.5/reference/actuator/endpoints.html#actuator.endpoints.kubernetes-probes
- Spring Boot graceful shutdown documentation: https://docs.spring.io/spring-boot/3.3/reference/web/graceful-shutdown.html and https://docs.spring.io/spring-boot/3.5/reference/web/graceful-shutdown.html
- Spring on Kubernetes guide: https://spring.io/guides/topicals/spring-on-kubernetes/
- Kubernetes liveness, readiness, and startup probes documentation: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- Kubernetes ConfigMap environment variable documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/
- Kubernetes Secret environment variable documentation: https://kubernetes.io/docs/tasks/inject-data-application/distribute-credentials-secure/
- Flux image update automation guide: https://fluxcd.io/flux/guides/image-update/
- Flux ImageUpdateAutomation API documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux ImagePolicy API documentation: https://fluxcd.io/flux/components/image/imagepolicies/

## Issues Found
- The Dockerfile launched the extracted Spring Boot application with `org.springframework.boot.loader.launch.JarLauncher`. Spring Boot's current documented `jarmode=tools` extracted layout launches the generated application jar with `java -jar application.jar`, so the entrypoint was changed accordingly while keeping the JVM flags.
- The application properties referenced `DB_USERNAME` and `DB_PASSWORD`, but the Deployment only injected `DATABASE_URL` from the `spring-secrets` Secret. Added Secret-backed environment variables for `DB_USERNAME` and `DB_PASSWORD` so the application configuration resolves.
- The ConfigMap used `LOG_LEVEL`, which is not a standard Spring Boot logging property by itself. Changed it to `LOGGING_LEVEL_ROOT`, which Spring Boot maps to `logging.level.root` through relaxed binding.
- The ConfigMap included `JAVA_OPTS`, but the container entrypoint did not consume it and the Dockerfile already sets the JVM flags directly. Removed the unused key to avoid implying that it affects the JVM.

## Review Notes
- Spring Boot 3.5 and later document graceful shutdown as enabled by default, while Spring Boot 3.3 requires `server.shutdown=graceful`. Keeping the property is still valid for the Spring Boot 3.x range used by the article.
- Spring Boot Actuator's liveness and readiness probe endpoints and the Flux image policy marker syntax matched the official documentation.
