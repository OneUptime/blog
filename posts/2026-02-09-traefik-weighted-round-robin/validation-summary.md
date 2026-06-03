# Validation Summary: How to Configure Traefik IngressRoute with Weighted Round Robin Load Balancing

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Kubernetes
- Traefik IngressRoute CRD
- TraefikService weighted round robin routing
- Kubernetes Services and ExternalName Services
- kubectl
- Bash deployment automation
- Traefik Prometheus metrics

## Sources Consulted
- Traefik IngressRoute CRD documentation: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/http/ingressroute/
- Traefik Kubernetes CRD Service documentation: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/http/service/
- Traefik TraefikService WRR documentation: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/http/traefikservice/
- Traefik HTTP router rules and priority documentation: https://doc.traefik.io/traefik/v3.3/reference/routing-configuration/http/router/rules-and-priority/
- Traefik metrics documentation: https://doc.traefik.io/traefik/reference/install-configuration/observability/metrics/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The A/B testing example used the old `Headers()` matcher. Updated it to the current Traefik v3 `Header()` matcher, which is the documented exact-header matcher.
- The health check example applied Traefik `healthCheck` fields to normal Kubernetes Services backed by pods. Traefik documents those CRD service health check fields as only for Kubernetes `ExternalName` Services, so the example now uses ExternalName service references.
- The section title claimed "Circuit Breaking" but did not configure a Traefik CircuitBreaker middleware. Renamed the section to "Service Health Checks" to match the actual configuration shown.
- The ApacheBench example piped `ab` output through `grep "Version"`, but `ab` does not emit response bodies for version counting. Changed it to generate load and direct readers to verify distribution through application logs or Traefik metrics.
- The metrics command grepped for `service_backend`, which is not the documented Traefik Prometheus service request metric. Updated it to `traefik_service_requests_total`.
- The automated rollback patch replaced the CRD `routes` array with an entry missing `match` and `kind`. Updated the patch to include those required route fields.

## Review Notes
- The post uses current `traefik.io/v1alpha1` CRD examples and the Kubernetes `apps/v1` Deployment / `v1` Service APIs.
- The canary automation still uses `check_error_rate` as pseudo-code, which is acceptable because the post labels it as pseudo-code.
