# Validation Summary: How to Use Flux 2.8 Web UI for Kustomization Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux 2.8
- Flux Operator
- Flux Web UI
- Flux Kustomization
- Flux GitRepository
- Kubernetes
- Helm
- kubectl
- Kustomize

## Sources Consulted
- Flux 2.8 GA announcement: https://fluxcd.io/blog/2026/02/flux-v2.8.0/
- Flux Operator installation guide: https://fluxoperator.dev/docs/guides/install/
- Flux Operator Helm chart reference: https://fluxoperator.dev/docs/charts/flux-operator/
- Flux Web UI overview: https://fluxoperator.dev/web-ui/
- Flux Web UI ingress configuration: https://fluxoperator.dev/docs/web-ui/ingress/
- Flux Web UI standalone installation: https://fluxoperator.dev/docs/web-ui/standalone-install/
- Flux Kustomization API documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Operator Kustomization API documentation: https://fluxoperator.dev/docs/crd/kustomization/

## Issues Found
- The title, description, and introduction referred to a "Flux 2.8 Web UI" as if it were a core Flux component. Updated the wording to clarify that the Web UI comes from the Flux Operator and is used alongside Flux 2.8.
- The prerequisites recommended Kubernetes v1.28 or later. Updated this to say Flux 2.8 requires a supported Kubernetes version and noted the official Flux 2.8 support range of Kubernetes 1.33 to 1.35.
- The access command used `kubectl -n flux-system port-forward svc/flux-web 9080:9080` immediately after installing the default Flux Operator Helm chart. Official docs show the embedded Web UI is exposed through the `flux-operator` service, while `flux-web` applies to the standalone Web UI install. Updated the command and added the standalone variant as a caveat.
- The sample conditions included a `Healthy` condition with `HealthCheckSucceeded`. The Kustomization status documentation describes `Ready`, `Reconciling`, and `Stalled` compatibility, with health check failures represented through condition reasons such as `HealthCheckFailed`; it does not document a successful `Healthy` condition in this form. Removed the unsupported condition from the example.
- The post claimed the UI provides a `Prune count`. Flux Kustomization status documents inventory and revision fields, and events can report pruning activity, but no Kustomization status field named prune count is documented. Changed this to "Pruning events."
- The conclusion called the feature the "Flux 2.8 Web UI." Updated it to "Flux Operator Web UI" for accuracy.

## Review Notes
Some UI navigation labels, exact panel names, and filter labels are difficult to verify from static public documentation because they may change between Flux Operator Web UI releases. The general claims about dashboards for Kustomizations, search and filtering, GitOps graphs, workload monitoring, reconciliation history, and Flux resource status are supported by the official Flux Operator Web UI documentation.
