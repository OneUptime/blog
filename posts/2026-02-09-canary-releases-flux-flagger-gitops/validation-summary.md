# Validation Summary: How to Implement Canary Releases with Flux and Flagger Using GitOps Workflows

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Flux
- Flagger
- Kubernetes Deployments and Services
- Kubernetes Custom Resources
- Helm and HelmRelease
- Istio
- Prometheus
- Canary, blue/green, A/B, and traffic mirroring deployment strategies

## Sources Consulted
- Flagger documentation: Introduction - https://docs.flagger.app/main
- Flagger documentation: How it works - https://docs.flagger.app/main/usage/how-it-works
- Flagger documentation: Deployment Strategies - https://docs.flagger.app/main/usage/deployment-strategies
- Flagger documentation: Webhooks - https://docs.flagger.app/main/usage/webhooks
- Flux documentation: Flagger install on Kubernetes - https://fluxcd.io/flagger/install/flagger-install-on-kubernetes/
- Flux documentation: Metrics Analysis - https://fluxcd.io/flagger/usage/metrics/
- Flux documentation: Helm API reference v2 - https://fluxcd.io/flux/components/helm/api/v2/
- Flux documentation: Kustomization - https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes documentation: Deployments - https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes documentation: Services - https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The Canary analysis comments had `threshold` and `maxWeight` reversed. In Flagger, `threshold` is the maximum number of failed checks before rollback, while `maxWeight` is the maximum canary traffic percentage. Updated the comments to match the official Flagger schema.
- The explanation said the rollout "rolls back if any check fails." Flagger pauses advancement and increments the failed-check count; rollback occurs when the configured threshold is reached. Updated the explanation accordingly.
- The blue/green example used an unsupported `analysis.canaryAnalysis` block. Replaced it with the documented blue/green pattern that uses `iterations` instead of `stepWeight` and `maxWeight`.
- The notification example used unsupported webhook types, including `rollout-failure`. Updated it to use Flagger `event` webhooks and route events to notification receiver services.
- The Flagger chart version was pinned to the old `1.34.x` line. Updated it to `1.x` so the example follows the current Flagger 1.x chart stream.

## Review Notes
- The post assumes Istio telemetry and a reachable Prometheus instance are already installed and correctly scraping the mesh metrics that Flagger needs.
- The `autoscalerRef` example assumes a matching HPA named `podinfo` exists; readers should omit that block unless they define the HPA.
- The custom Prometheus metric query is illustrative and depends on the application exposing an `http_requests_total` metric with the shown labels.
