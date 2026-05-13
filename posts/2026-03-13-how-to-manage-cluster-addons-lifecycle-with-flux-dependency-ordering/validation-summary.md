# Validation Summary: How to Manage Cluster Addons Lifecycle with Flux Dependency Ordering

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux Kustomization API
- Flux source-controller HelmRepository API
- Flux CLI
- Kubernetes kubectl
- Kubernetes CustomResourceDefinitions
- HelmReleases
- Kustomize

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux CLI `flux get kustomizations` reference: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux CLI `flux reconcile kustomization` reference: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Kubernetes `kubectl events` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/

## Issues Found
- The cert-manager Kustomization example used both `wait: true` and `healthChecks`. Flux documentation states that when `wait: true` is set, `.spec.healthChecks` is ignored. Removed `wait: true` from that custom health check example so the explicit Deployment checks are effective.
- The Health Checks and Readiness section said custom health checks could be used alongside `wait: true` for more granular control. Updated the wording to explain that custom health checks should be used without `wait: true`.
- The debugging command `flux get kustomization cert-manager -n flux-system -o yaml` used an unsupported singular `flux get kustomization` form for YAML status output. Replaced it with `kubectl get kustomization cert-manager -n flux-system -o yaml`.
- The event filtering example used a lowercase resource kind. Updated it to `kubectl events -n flux-system --for Kustomization/ingress-nginx` to match the Kubernetes documented `TYPE/NAME` form more clearly.

## Review Notes
The Flux API versions used in the examples are current according to the official Flux documentation. The examples assume the referenced `GitRepository` named `flux-system` and the addon manifests exist in the repository paths shown.
