# Validation Summary: How to Configure Health Checks for Spring Boot with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Spring Boot Actuator
- Spring Boot application availability and graceful shutdown
- Kubernetes liveness, readiness, and startup probes
- Istio sidecar injection and probe rewriting
- Istio AuthorizationPolicy
- HikariCP
- Spring Retry
- Micrometer / Prometheus metrics
- Java
- Maven and Gradle

## Sources Consulted
- Spring Boot Actuator endpoint and Kubernetes probe documentation: https://docs.spring.io/spring-boot/reference/actuator/endpoints.html
- Spring Boot graceful shutdown documentation: https://docs.spring.io/spring-boot/reference/web/graceful-shutdown.html
- Kubernetes liveness, readiness, and startup probe documentation: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/
- Istio health checking and probe rewrite documentation: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio sidecar startup ordering documentation: https://istio.io/latest/docs/ops/common-problems/injection/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- HikariCP configuration documentation: https://github.com/brettwooldridge/HikariCP
- Spring Retry API documentation: https://docs.spring.io/spring-retry/docs/api/current/org/springframework/retry/annotation/Retryable.html

## Issues Found
- Istio probe rewrite forwarding was described as going through the Envoy sidecar. Istio's documentation describes the rewritten probe target as the sidecar agent, so the text was changed to "Istio sidecar agent."
- The post said Istio stores original probe path and port values in an annotation. Istio stores the rewritten probe mapping in the sidecar's `ISTIO_KUBE_APP_PROBERS` environment variable, so that bullet was corrected.
- The global probe rewrite disabling example incorrectly used `meshConfig.defaultConfig.holdApplicationUntilProxyStarts`, which controls startup ordering and does not disable probe rewriting. It was replaced with the IstioOperator `values.sidecarInjectorWebhook.rewriteAppHTTPProbe: false` setting documented by Istio.
- The HikariCP `initialization-fail-timeout: -1` explanation said Hikari would retry indefinitely. HikariCP documents negative values as bypassing the initial connection attempt and starting the pool while trying to obtain connections in the background, so the explanation was corrected.

## Review Notes
- Spring Boot's official documentation notes that when actuator probes run on a separate management port, they may not exercise the same web infrastructure as the main application port. The separate-port pattern is still usable, especially with Istio, but future revisions could mention `management.endpoint.health.probes.add-additional-paths=true` for teams that want probe paths exposed on the main server port as well.
