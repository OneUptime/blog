# Validation Summary: Install Cilium with External Installers

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- Kustomize
- Flux CD HelmRelease
- Hubble observability
- Prometheus ServiceMonitor

## Sources Consulted
- Cilium installation using Helm: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Cilium Helm reference: https://docs.cilium.io/en/latest/helm-reference/
- Cilium Hubble setup: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium Hubble UI documentation: https://docs.cilium.io/en/stable/observability/hubble/hubble-ui/
- Cilium metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium CLI status command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium CLI connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Flux HelmRelease guide: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Helm API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Source API reference: https://fluxcd.io/flux/components/source/api/v1/

## Issues Found
- The post pinned Cilium `1.15.0` and used the Flux semver range `1.15.x`, which is outdated for a 2026 installation guide. Updated Helm and Kustomize examples to `1.19.3`, matching the current stable Cilium Helm documentation, and updated the Flux range and best-practice example to `1.19.x`.
- The short Helm and Flux examples enabled Hubble Relay/UI without explicitly enabling Hubble. Current Cilium Helm defaults enable Hubble, but the official Hubble metrics/setup examples explicitly set `hubble.enabled=true` when relying on Hubble features. Added `hubble.enabled=true` to make the examples robust and self-documenting.
- The Flux HelmRelease comment said the remediation block installs Cilium as a dependency before other Flux resources. Flux install/upgrade remediation only configures retries; ordering is handled with dependency fields such as Flux `dependsOn`. Reworded the comment to describe retry behavior accurately.

## Review Notes
- The Cilium docs now recommend OCI Helm charts for stronger reproducibility and signature verification, but the traditional `https://helm.cilium.io/` repository used in the post remains officially supported.
- The examples use `k8sServiceHost` and `k8sServicePort` for kube-proxy replacement. These values must be adjusted per cluster, as the post already notes.
- `prometheus.serviceMonitor.enabled=true` requires Prometheus Operator ServiceMonitor CRDs to exist in the cluster.
