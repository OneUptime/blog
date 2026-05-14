# Validation Summary: How to Configure Flagger with Traefik Ingress and Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Flux CD
- Flux HelmRepository and HelmRelease resources
- Flagger
- Traefik IngressRoute and TraefikService
- Prometheus
- Helm charts
- GitOps canary deployments

## Sources Consulted
- Flux `flux bootstrap github` CLI documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux HelmRelease API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flagger Traefik canary deployment tutorial: https://docs.flagger.app/tutorials/traefik-progressive-delivery
- Flagger "How it works" documentation: https://docs.flagger.app/usage/how-it-works
- Flagger Helm chart values: https://raw.githubusercontent.com/fluxcd/flagger/main/charts/flagger/values.yaml
- Traefik Kubernetes CRD TraefikService documentation: https://doc.traefik.io/traefik/reference/routing-configuration/kubernetes/crd/http/traefikservice/
- Traefik metrics documentation: https://doc.traefik.io/traefik/reference/install-configuration/observability/metrics/
- Traefik Helm chart repository index: https://traefik.github.io/charts/index.yaml
- Traefik Helm chart values: https://raw.githubusercontent.com/traefik/traefik-helm-chart/master/traefik/values.yaml
- Prometheus community Helm chart repository index: https://prometheus-community.github.io/helm-charts/index.yaml
- Prometheus community Helm chart values: https://raw.githubusercontent.com/prometheus-community/helm-charts/main/charts/prometheus/values.yaml

## Issues Found
- The Flux `HelmRelease` snippets used `helm.toolkit.fluxcd.io/v1`. Updated them to the current documented `helm.toolkit.fluxcd.io/v2` API version.
- The Traefik and Prometheus `HelmRelease` resources were placed in namespaces that the post expected Helm to create. A `HelmRelease` object's own namespace must already exist; only `spec.targetNamespace` can be created by `install.createNamespace`. Moved those `HelmRelease` objects to `flux-system` and added `targetNamespace`.
- Adding `targetNamespace` changes Flux's default Helm release name. Added explicit `releaseName` values so later references such as `prometheus-server.monitoring` remain correct.
- The Traefik and Prometheus chart version ranges were outdated. Updated Traefik from `26.x` to `40.x` and Prometheus from `25.x` to `29.x`, matching the current chart repository major versions available on 2026-05-14.
- The Traefik metrics scrape example built `__address__` from `prometheus.io/port`, which would produce an invalid address such as `9100:9100` and also depended on annotations that were not configured. Added Traefik Prometheus scrape annotations and changed the relabeling to use the Traefik pod IP with port `9100`.

## Review Notes
The tutorial remains technically valid after the fixes. I could not run Flux, Helm, or kubectl locally because those CLIs are not installed in this workspace, so validation was done against official documentation, chart indexes, chart values, and YAML parsing of the snippets.
