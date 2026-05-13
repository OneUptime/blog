# Validation Summary: How to Configure Flagger with Contour HTTPProxy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flagger
- Contour
- Contour HTTPProxy
- Envoy
- Kubernetes Deployments and Services
- Helm
- Prometheus-based canary analysis

## Sources Consulted
- Flagger Contour Canary Deployments tutorial: https://docs.flagger.app/main/tutorials/contour-progressive-delivery
- Flagger installation documentation: https://docs.flagger.app/install/flagger-install-on-kubernetes
- Flagger "How it works" documentation: https://docs.flagger.app/usage/how-it-works
- Project Contour Getting Started guide: https://projectcontour.io/getting-started/
- Project Contour HTTPProxy reference: https://projectcontour.io/docs/v1.8.2/httpproxy/
- Flagger loadtester Helm chart listing: https://artifacthub.io/packages/helm/flagger/loadtester

## Issues Found
- The Contour installation used the Bitnami Helm repository while describing it as the official Helm chart. Changed the commands to use Project Contour's official Helm chart repository and `contour/contour` chart.
- The Flagger Helm values omitted `ingressClass: contour`, which is included in the official Contour provider Helm installation guidance. Added the value.
- The application manifest pre-created the `podinfo` ClusterIP Service. Flagger's documented workflow creates and manages the apex, primary, and canary Services from the Canary spec, so the static Service was removed.
- The HTTPProxy example created a root HTTPProxy named `podinfo`, which conflicts with the HTTPProxy Flagger generates and manages for the canary service. Changed the example to create a separate root HTTPProxy named `podinfo-ingress` that includes Flagger's generated `podinfo` HTTPProxy.
- The load-test webhook sent traffic directly to `podinfo-canary.test`, bypassing Contour/Envoy and therefore not producing the Contour ingress metrics used by the built-in request metrics. Changed the command to send traffic through Envoy with the `app.example.com` host header.
- The initialization description said Flagger creates primary and canary Deployments. Flagger keeps the target Deployment as the canary workload and creates a primary Deployment plus generated Services and HTTPProxy resources, so the wording was corrected.

## Review Notes
The examples now match the documented Flagger and Contour integration pattern. The Prometheus URL remains environment-specific and assumes a Prometheus service named `prometheus` in the `monitoring` namespace.
