# Validation Summary: How to Configure Flagger Canary Promotion Thresholds in Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flagger
- Kubernetes
- HelmRelease and HelmRepository resources
- Kustomization resources
- Prometheus metrics and PromQL
- Kubernetes kubectl commands

## Sources Consulted
- Flagger install with Flux documentation: https://fluxcd.io/flagger/install/flagger-install-with-flux/
- Flagger "How it works" documentation: https://docs.flagger.app/usage/how-it-works
- Flagger deployment strategies documentation: https://docs.flagger.app/main/usage/deployment-strategies
- Flagger metrics analysis documentation: https://docs.flagger.app/main/usage/metrics
- Flagger webhooks documentation: https://docs.flagger.app/usage/webhooks
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Kubernetes kubectl generated reference: https://kubernetes.io/docs/reference/kubectl/generated/

## Issues Found
- The introduction described Flagger as working with Flux CD in a way that could imply Flux is required for Flagger canaries. Changed this to say Flagger can be managed with Flux CD.
- The post described `analysis.threshold` as failed metric checks only. Flagger counts failed analysis checks, including metric and webhook failures, so the wording was broadened.
- The post described `analysis.iterations` as the number of successful checks required before promotion in a traffic-shifting canary. Flagger uses `iterations` for A/B testing and blue/green deployments; progressive canaries promote after successful traffic shifting up to `maxWeight`. Removed `iterations` from traffic-shifting examples and adjusted the reference table.
- The Flux install example used the older HTTP Helm repository URL. Updated it to the current Flux Flagger OCI chart repository (`oci://ghcr.io/fluxcd/charts` with `type: oci`) and added CRD handling shown in the official Flux install guide.
- The built-in metrics section said it was configuring custom metric templates. Changed the wording to built-in and custom metrics.
- The custom Prometheus metric was named `error-rate` but calculated success rate by subtracting non-5xx traffic from 100. Updated the query to calculate the percentage of 5xx responses directly.
- The Flux Kustomization comment claimed a Deployment health check waits for canary completion. Flux health checks on the Deployment wait for deployment readiness, so the comment was corrected.

## Review Notes
The examples assume an Istio-backed Flagger installation and Prometheus metrics whose labels match the sample queries. Real clusters may need provider-specific metric labels and service names.
