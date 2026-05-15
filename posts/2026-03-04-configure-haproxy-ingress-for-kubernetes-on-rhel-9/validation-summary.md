# Validation Summary: How to Configure HAProxy Ingress for Kubernetes on RHEL

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Red Hat Enterprise Linux
- Kubernetes
- Kubernetes Ingress and IngressClass
- HAProxy Ingress
- Helm
- TLS secrets
- Prometheus metrics

## Sources Consulted
- HAProxy Ingress Getting Started documentation: https://haproxy-ingress.github.io/docs/getting-started/
- HAProxy Ingress configuration keys: https://haproxy-ingress.github.io/docs/configuration/keys/
- HAProxy Ingress Helm chart README: https://github.com/haproxy-ingress/charts/blob/release-0.16/haproxy-ingress/README.md
- HAProxy Ingress metrics example: https://haproxy-ingress.github.io/docs/examples/metrics/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/

## Issues Found
- The Ingress manifests used the legacy `kubernetes.io/ingress.class` annotation. Updated the examples to use `spec.ingressClassName: haproxy`, which is the current Kubernetes Ingress field, and added `controller.ingressClassResource.enabled=true` to the Helm install command so the chart creates the matching IngressClass.
- The backend health-check annotations used `health-check-rise` and `health-check-fall`, which are not HAProxy Ingress v0.16 configuration keys. Replaced them with `health-check-rise-count` and `health-check-fall-count`.
- The rate limiting explanation described `limit-rps` as requests per second. Adjusted the wording to describe it as new connections per second, while leaving `limit-connections` as concurrent connections.
- The Prometheus metrics snippet enabled `controller.metrics.enabled` without also enabling stats, which the chart requires for metrics. Added `controller.stats.enabled: true` and changed the scrape port annotation to `9101` for the HAProxy metrics service port.
- Updated troubleshooting and conclusion wording so they match the corrected IngressClass-based examples.

## Review Notes
The tutorial remains valid for HAProxy Ingress v0.16 and Kubernetes clusters using the stable `networking.k8s.io/v1` Ingress API. The Kubernetes project recommends Gateway API for new development, but the Ingress API remains generally available and is not planned for removal.
