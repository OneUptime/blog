# Validation Summary: How to Deploy HAProxy Ingress with Flux CD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- HAProxy Ingress Controller
- Flux CD HelmRelease, Kustomization, and Notification Alert resources
- Kubernetes Ingress, Namespace, and ConfigMap-style controller configuration
- Helm chart values
- Prometheus ServiceMonitor
- ModSecurity WAF integration

## Sources Consulted
- HAProxy Ingress Getting Started: https://haproxy-ingress.github.io/docs/getting-started/
- HAProxy Ingress configuration keys: https://haproxy-ingress.github.io/docs/configuration/keys/
- HAProxy Ingress blue/green example: https://haproxy-ingress.github.io/docs/examples/blue-green/
- HAProxy Ingress ModSecurity example: https://haproxy-ingress.github.io/docs/examples/modsecurity/
- HAProxy Ingress metrics example: https://haproxy-ingress.github.io/docs/examples/metrics/
- HAProxy Ingress chart README and values: https://github.com/haproxy-ingress/charts/tree/release-0.16/haproxy-ingress
- HAProxy Ingress v0.14 chart values: https://raw.githubusercontent.com/haproxy-ingress/charts/release-0.14/haproxy-ingress/values.yaml
- HAProxy Ingress command-line options: https://haproxy-ingress.github.io/docs/configuration/command-line/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://v2-0.docs.fluxcd.io/flux/components/kustomize/kustomization/
- Flux Notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/

## Issues Found
- The Helm chart value `controller.ingressClassResource.controllerValue` was not a valid HAProxy Ingress chart value. Changed it to `controller.ingressClassResource.controllerClass` and added `controller.ingressClass: haproxy`.
- Prometheus metrics were enabled without enabling the stats endpoint required by the chart. Added `controller.stats.enabled: true`.
- The stdout syslog configuration was incomplete for embedded HAProxy on v0.14. Added `controller.extraArgs.master-worker: "true"`.
- Health check annotations used non-existent `health-check-fall` and `health-check-rise` keys. Changed them to `health-check-fall-count` and `health-check-rise-count`.
- The guide used `http2: "true"`, which is not a current HAProxy Ingress configuration key. Replaced it with `use-htx: "true"` for HTTP/2 backend support.
- The Flux Kustomization combined `wait: true` with explicit `healthChecks`, but Flux ignores `healthChecks` when `wait` is true. Removed `wait: true` and changed the health check to target the HelmRelease.
- The blue/green example used deprecated `blue-green-deploy` and an incorrect weight syntax. Replaced it with `blue-green-balance` using `label=value=weight` syntax and corrected the header selector format.
- The WAF section implied ModSecurity works from the per-Ingress annotations alone. Added the required `modsecurity-endpoints` controller configuration example.
- The TCP services example used the deprecated ConfigMap-based argument path. Replaced it with the current chart `controller.tcp` values.
- The standalone global ConfigMap example conflicted with the Helm chart-managed controller ConfigMap. Changed it to a `controller.config` Helm values example.
- The Flux Alert example used the wrong API version and field name. Changed it to `notification.toolkit.fluxcd.io/v1beta3` with `eventSeverity`.

## Review Notes
The article pins the HAProxy Ingress chart to `0.14.x`, while newer chart documentation now tracks later releases. The examples were kept compatible with the pinned series where relevant, but future updates should consider whether to move the guide to the latest stable chart version and refresh any version-specific defaults.
