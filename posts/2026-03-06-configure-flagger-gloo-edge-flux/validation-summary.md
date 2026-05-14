# Validation Summary: How to Configure Flagger with Gloo Edge and Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Flux
- HelmRelease and HelmRepository custom resources
- Flagger
- Gloo Edge / Gloo Gateway
- Envoy
- Prometheus
- GitOps progressive delivery

## Sources Consulted
- Flagger Gloo Canary Deployments: https://docs.flagger.app/main/tutorials/gloo-progressive-delivery
- Flagger Helm chart documentation: https://artifacthub.io/packages/helm/flagger/flagger
- Flagger metrics analysis documentation: https://fluxcd.io/flagger/usage/metrics/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux GitHub bootstrap CLI documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Gloo Edge open source Helm chart values: https://docs.solo.io/gloo-edge/main/reference/helm_chart_values/open_source_helm_chart_values/
- Gloo Edge Prometheus observability documentation: https://docs.solo.io/gloo-edge/main/guides/observability/prometheus/
- Envoy cluster statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html

## Issues Found
- The Gloo and Prometheus HelmRelease examples used `metadata.namespace` as the desired install namespace while also relying on `install.createNamespace`. Flux creates the target namespace named by `spec.targetNamespace`, so I moved those HelmRelease objects to `flux-system` and added `targetNamespace: gloo-system` and `targetNamespace: monitoring`.
- The original Gloo VirtualService used static weighted destinations and implied that Flagger directly manages VirtualService route weights. The official Flagger Gloo integration uses a VirtualService that delegates to a Flagger-generated RouteTable. I changed the VirtualService to use `delegateAction` and updated the explanation and verification commands to inspect the RouteTable.
- The Canary example omitted `spec.provider: gloo` and included an `upstreamRef` that pointed to a discovered upstream name. In Flagger's Gloo provider, `provider: gloo` is required for this resource and `upstreamRef` is optional for copying nonstandard upstream configuration. I added `provider: gloo` and removed the misleading `upstreamRef`.
- Generated Gloo upstream names were shown with `primary` and `canary` naming that did not match Flagger's documented `primaryupstream` and `canaryupstream` naming. I corrected the metric query to target the documented canary upstream name pattern.
- The custom Envoy metric query used a metric and labels that did not match Envoy's documented cluster response-code statistics. I updated it to use the Prometheus-formatted aggregate response-code metric and the completed-request counter.
- The monitoring and Mermaid examples still referred to VirtualService-managed weights. I updated them to show VirtualService delegation, RouteTable weights, and separate primary/canary upstream routing.

## Review Notes
- I could not run Helm locally because `helm` is not installed in this environment, so chart value verification was done against official chart and API documentation rather than local `helm show values` output.
- The Prometheus example relies on annotation-based scraping from the community Prometheus chart. Production installations commonly use a more explicit scrape configuration or ServiceMonitor setup.
