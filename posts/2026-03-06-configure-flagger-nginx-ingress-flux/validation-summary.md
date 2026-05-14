# Validation Summary: How to Configure Flagger with NGINX Ingress and Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Flux CD
- Flagger
- ingress-nginx
- NGINX canary ingress annotations
- HelmRepository and HelmRelease resources
- Prometheus
- PromQL
- GitOps

## Sources Consulted
- Flux HelmRelease guide and API reference: https://fluxcd.io/flux/guides/helmreleases/ and https://fluxcd.io/flux/components/helm/api/v2/
- Flagger NGINX canary deployments: https://docs.flagger.app/main/tutorials/nginx-progressive-delivery
- Flagger metrics and MetricTemplate documentation: https://docs.flagger.app/main/usage/metrics
- Flagger Helm chart values: https://artifacthub.io/packages/helm/flagger/flagger
- ingress-nginx canary annotations: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/ and https://kubernetes.github.io/ingress-nginx/examples/canary/
- ingress-nginx retirement notice: https://kubernetes.github.io/ingress-nginx/ and https://kubernetes.io/blog/2026/01/29/ingress-nginx-statement/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Prometheus Community Helm chart: https://artifacthub.io/packages/helm/prometheus-community/prometheus

## Issues Found
- The HelmRelease examples used `apiVersion: helm.toolkit.fluxcd.io/v1`, which is not the current Flux HelmRelease API. Updated all HelmRelease manifests to `helm.toolkit.fluxcd.io/v2`.
- The ingress example used the deprecated `kubernetes.io/ingress.class` annotation. Updated it to `spec.ingressClassName: nginx` and adjusted the troubleshooting text.
- The ingress-nginx and Prometheus chart constraints were stale for a current 2026 review. Updated ingress-nginx to `4.15.x`, the final ingress-nginx Helm chart line, and Prometheus to `29.x`.
- The post did not mention that the community Kubernetes ingress-nginx controller was retired on March 24, 2026. Added a short note clarifying that existing artifacts remain available but production users should plan migration.

## Review Notes
- The Flagger `Canary`, `ingressRef`, `MetricTemplate`, `thresholdRange`, `maxWeight`, and `stepWeight` examples match the documented Flagger API shape.
- The custom Prometheus metric uses Flagger's documented `{{ namespace }}`, `{{ ingress }}`, and `{{ interval }}` template variables.
- A real production canary needs either live user traffic or a load-test webhook during rollout so Prometheus has request data to evaluate.
