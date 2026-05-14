# Validation Summary: How to Configure Flagger with Contour Ingress and Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Flux
- Flagger
- Contour
- Envoy
- Prometheus
- HelmRepository and HelmRelease resources
- HTTPProxy
- Progressive delivery and canary deployments

## Sources Consulted
- Flux documentation: Bootstrap for GitHub: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux documentation: HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flagger documentation: Install on Kubernetes with Flux: https://fluxcd.io/flagger/install/flagger-install-with-flux/
- Flagger documentation: Contour Canary Deployments: https://docs.flagger.app/main/tutorials/contour-progressive-delivery
- Flagger documentation: Webhooks: https://docs.flagger.app/main/usage/webhooks
- Flagger chart values: https://github.com/fluxcd/flagger/blob/main/charts/flagger/values.yaml
- Project Contour documentation: Getting Started with Contour: https://projectcontour.io/getting-started/
- Project Contour documentation: HTTPProxy reference: https://projectcontour.io/docs/main/config/fundamentals/
- Project Contour documentation: Collecting Metrics with Prometheus: https://projectcontour.io/docs/main/guides/prometheus/
- Project Contour Helm chart: https://github.com/projectcontour/helm-charts/tree/main/charts/contour
- Prometheus Community Helm chart values: https://github.com/prometheus-community/helm-charts/blob/main/charts/prometheus/values.yaml

## Issues Found
- The Flux bootstrap command used `--personal` with an organization-style owner. The example was changed to `--owner=your-github-username` so it matches Flux's personal-account bootstrap mode.
- The Contour installation used the discontinued Bitnami chart repository and old chart values (`envoy.prometheus.enabled` and `contour.prometheus.enabled`). It was updated to the current Project Contour Helm chart repository and current service annotation/metrics port values.
- The Contour HelmRelease did not specify CRD handling. `install.crds: CreateReplace` and `upgrade.crds: CreateReplace` were added so the HTTPProxy CRDs are installed and updated by Flux.
- The Flagger HelmRepository used the legacy `https://flagger.app` chart repository. It was updated to the current OCI source `oci://ghcr.io/fluxcd/charts`, with the repository and release placed in `flagger-system` as shown in the current Flagger Flux install docs.
- The Flagger HelmRelease omitted CRD handling and the Contour ingress class value. CRD install/upgrade settings and `ingressClass: contour` were added.
- The HTTPProxy example incorrectly defined the Flagger-managed traffic-splitting HTTPProxy by hand. It was changed to a root HTTPProxy named `podinfo-ingress` that includes the HTTPProxy generated and managed by Flagger.
- The rollout diagram and explanation implied that the public HTTPProxy itself was directly modified by Flagger. They were corrected to show the root HTTPProxy including the generated `podinfo` HTTPProxy, where Flagger adjusts service weights.
- The Flagger log command still referenced `flux-system`. It was updated to `flagger-system`.
- The custom Envoy MetricTemplate used the pre-Prometheus counter name `envoy_cluster_upstream_rq`. It was updated to `envoy_cluster_upstream_rq_total`, which matches Envoy's Prometheus counter naming.
- The load tester troubleshooting command applied only the Deployment manifest. It now applies both the Deployment and Service manifests into the `demo` namespace.

## Review Notes
The Prometheus setup is suitable for a tutorial but intentionally minimal: it disables persistence and uses the standalone Prometheus chart instead of Prometheus Operator. A production version should use persistent storage, TLS for public ingress, and a more explicit scrape configuration or ServiceMonitor-based setup.
