# Validation Summary: How to Configure K3s with NGINX Ingress Instead of Traefik

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes Ingress
- ingress-nginx
- Helm
- cert-manager

## Sources Consulted
- K3s Networking Services: https://docs.k3s.io/networking/networking-services
- K3s Managing Packaged Components: https://docs.k3s.io/installation/packaged-components
- K3s Helm: https://docs.k3s.io/add-ons/helm
- ingress-nginx Installation Guide: https://kubernetes.github.io/ingress-nginx/deploy/
- ingress-nginx Monitoring: https://kubernetes.github.io/ingress-nginx/user-guide/monitoring/
- ingress-nginx Rewrite example: https://kubernetes.github.io/ingress-nginx/examples/rewrite/
- ingress-nginx TLS/HTTPS: https://kubernetes.github.io/ingress-nginx/user-guide/tls/
- ingress-nginx annotations reference: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- ingress-nginx chart index: https://kubernetes.github.io/ingress-nginx/index.yaml
- Kubernetes Ingress documentation: https://v1-33.docs.kubernetes.io/docs/concepts/services-networking/ingress/
- cert-manager Ingress usage: https://cert-manager.io/docs/usage/ingress/

## Issues Found
- The fresh-install example was updated to use the documented `sh -s - --disable=traefik` flag form directly.
- The existing-cluster section told readers to delete Traefik `HelmChart` resources manually after restart. K3s documents that disabled packaged AddOns are actively uninstalled, so those commands were removed.
- The existing-cluster instructions did not mention that packaged-component disable flags must be applied on every K3s server in a multi-server cluster. A note was added to make the HA case correct.
- The Helm install example used `--set` for annotation values that must be strings. This was corrected to `--set-string` for the Prometheus pod annotation keys.
- The K3s auto-deploy `HelmChart` example pinned `ingress-nginx` chart version `4.9.1`, which is outdated. It was updated to `4.15.1`, which is present in the official chart index as of 2026-04-29.
- The verification step tried to call `/healthz` over the external HTTPS listener. ingress-nginx documents health and metrics on controller port `10254`, so that check was replaced with `kubectl rollout status` for a correct readiness validation step.
- The example Ingress resources used the deprecated `kubernetes.io/ingress.class` annotation alongside `ingressClassName`. The deprecated annotation was removed.
- The first test Ingress enabled `nginx.ingress.kubernetes.io/ssl-redirect: "true"` before any TLS configuration existed, which would conflict with the HTTP test flow. That annotation was removed from the non-TLS example.
- The cert-manager example did not state that cert-manager and a matching `ClusterIssuer` must already exist. A prerequisite note was added.
- The rewrite annotation example used `/$2` without the corresponding regex context. `nginx.ingress.kubernetes.io/use-regex: "true"` and an explanatory note were added so the capture-group example is accurate.

## Review Notes
- On K3s, a `LoadBalancer` Service typically relies on the built-in ServiceLB unless you have disabled it or replaced it with another load balancer implementation.
- The pinned ingress-nginx chart version should be revalidated in future reviews if the post remains version-specific.
