# Validation Summary: How to Deploy Traefik Ingress Controller on Kubernetes with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Traefik Proxy
- Traefik Kubernetes CRDs
- Traefik Helm chart
- OpenTofu / Terraform HCL
- Helm provider
- Kubernetes provider `kubernetes_manifest`
- Let's Encrypt / ACME
- Traefik middleware and rate limiting

## Sources Consulted
- Traefik Helm chart repository and current chart documentation — https://github.com/traefik/traefik-helm-chart
- Traefik Helm chart 39.0.8 package, values, schema, and examples — https://traefik.github.io/charts/traefik/traefik-39.0.8.tgz
- Traefik release support policy — https://doc.traefik.io/traefik/deprecation/releases/
- Traefik ACME certificate resolver documentation — https://doc.traefik.io/traefik/reference/install-configuration/tls/certificate-resolvers/acme/
- Traefik Kubernetes IngressRoute documentation — https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/http/ingressroute/
- Traefik Kubernetes Middleware documentation — https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/http/middleware/
- Traefik RateLimit middleware documentation — https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/ratelimit/
- Traefik BasicAuth middleware documentation — https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/basicauth/
- HashiCorp Helm provider `helm_release` documentation source — https://github.com/hashicorp/terraform-provider-helm/blob/main/docs/resources/release.md
- HashiCorp Kubernetes provider `kubernetes_manifest` documentation source — https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/docs/resources/manifest.md
- OpenTofu `yamlencode` documentation — https://opentofu.org/docs/language/functions/yamlencode/

## Issues Found
- The Helm chart was pinned to `26.1.0`, which deploys Traefik `v2.11.0`. Traefik's official support table lists `2.11` security support as ending on February 1, 2026, so the example was outdated for this post date. Updated the chart to `39.0.8`, which deploys Traefik `v3.6.13`.
- The Helm values used the older chart schema: `certResolvers`, boolean `ports.*.expose`, `ports.web.redirectTo`, and top-level `ports.websecure.tls`. Updated them to the current chart schema: `certificatesResolvers.<name>.acme`, `ports.*.expose.default`, `ports.web.http.redirections.entryPoint`, and `ports.websecure.http.tls`.
- The example configured built-in ACME with two replicas and HPA. Traefik's ACME documentation warns that Let's Encrypt HA with multiple Traefik Proxy instances should use Traefik Enterprise distributed ACME or cert-manager. Changed the example to a single replica and removed the HPA block.
- The `kubernetes_manifest` resources create Traefik CRD objects that depend on the Helm release installing the Traefik CRDs. Added `depends_on = [helm_release.traefik]` to the IngressRoute and Middleware resources.
- The summary said built-in Let's Encrypt eliminates cert-manager in "simpler setups." Clarified this to "single-instance setups" to avoid implying HA ACME support with the file-backed resolver.

## Review Notes
- On a brand-new cluster, the Terraform Kubernetes provider may still require Traefik CRDs to exist at plan time before `kubernetes_manifest` custom resources can be planned. If that occurs, apply the Helm release first, then apply the IngressRoute and Middleware resources.
- The BasicAuth middleware references a Kubernetes Secret named `traefik-basic-auth`; the post does not create that Secret, so users must provide it before attaching the middleware to a route.
