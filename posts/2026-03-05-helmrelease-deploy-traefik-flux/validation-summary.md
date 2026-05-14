# Validation Summary: How to Use HelmRelease for Deploying Traefik with Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux HelmRepository and HelmRelease APIs
- Kubernetes
- Helm
- Traefik Proxy
- Traefik IngressRoute and Middleware CRDs
- Let's Encrypt ACME
- Prometheus metrics and ServiceMonitor

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux CLI `flux get helmreleases` reference: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Traefik Kubernetes quick start: https://doc.traefik.io/traefik/getting-started/kubernetes/
- Traefik IngressRoute CRD reference: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/http/ingressroute/
- Traefik ACME certificate resolver documentation: https://doc.traefik.io/traefik/reference/install-configuration/tls/certificate-resolvers/acme/
- Traefik certificate resolver overview: https://doc.traefik.io/traefik/reference/install-configuration/tls/certificate-resolvers/overview/
- Traefik Helm chart repository README: https://github.com/traefik/traefik-helm-chart
- Traefik Helm chart v32.1.1 values and schema: https://github.com/traefik/traefik-helm-chart/tree/v32.1.1/traefik

## Issues Found
- The HelmRelease example used `install.atomic` and `upgrade.atomic`, which are Helm CLI options but not valid Flux HelmRelease v2 fields. Removed those fields and kept Flux remediation settings.
- The dashboard route matched only `Host(...)`. Updated it to include Traefik's documented dashboard and API path prefixes so `/dashboard` and `/api` are routed explicitly.
- The Flux verification command used `flux get helmrelease`. Updated it to the documented `flux get helmreleases` subcommand.
- The dashboard port-forward command targeted service port `9000`, but the Traefik Helm chart does not expose the internal `traefik` port on the Service by default. Updated the command to forward the HTTPS service port, `8443:443`.
- The Let's Encrypt snippet used file-backed ACME storage while the main example configured two Traefik replicas. Added a note that file-backed ACME storage should not be shared across multiple Traefik instances and that high availability should use a different certificate approach such as cert-manager.

## Review Notes
- The `metrics.prometheus.serviceMonitor.enabled: true` setting requires Prometheus Operator CRDs to be installed in the cluster; otherwise, the chart's API check may fail. This is technically valid but should be called out in a future expanded version of the tutorial.
- The chart version constraint `32.x` resolves to the Traefik Helm chart 32 series, which deploys Traefik Proxy v3.1.x. Newer chart majors exist, so readers should check chart release notes before upgrading beyond the pinned range.
