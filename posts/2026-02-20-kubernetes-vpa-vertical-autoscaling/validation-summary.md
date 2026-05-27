# Validation Summary: How to Use Kubernetes Vertical Pod Autoscaler (VPA)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Vertical Pod Autoscaler (VPA)
- Horizontal Pod Autoscaler (HPA)
- Metrics Server
- kubectl
- Helm
- YAML manifests

## Sources Consulted
- Kubernetes documentation: Vertical Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes autoscaler VPA README: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/README.md
- Kubernetes autoscaler VPA installation guide: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/installation.md
- Kubernetes autoscaler VPA quickstart: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/quickstart.md
- Kubernetes autoscaler VPA known limitations: https://raw.githubusercontent.com/kubernetes/autoscaler/master/vertical-pod-autoscaler/docs/known-limitations.md
- Kubernetes documentation: Field Selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Fairwinds VPA Helm chart: https://artifacthub.io/packages/helm/fairwinds-stable/vpa

## Issues Found
- The post used `updateMode: "Auto"` as the main automatic mode. Current Kubernetes VPA documentation marks `Auto` as deprecated since VPA 1.4.0 and recommends explicit modes such as `Recreate` or `InPlaceOrRecreate`. I changed the example and surrounding text to use `Recreate` for eviction-based updates.
- The update modes diagram omitted `Recreate` and `InPlaceOrRecreate` while presenting `Auto` as the primary automatic mode. I updated the diagram to show the current explicit modes used by VPA.
- The introduction said that requesting too little causes OOMKills or CPU throttling. OOMKills and CPU throttling are tied to limits; oversized requests waste schedulable cluster capacity. I adjusted the wording to distinguish requests from limits.
- The post described VPA as always adjusting requests and limits. VPA always works from resource recommendations, but limit adjustment depends on `controlledValues`. I clarified this as requests and, when configured, limits.

## Review Notes
- The Fairwinds Helm chart is a third-party chart, not the upstream Kubernetes installation path, but the repository and chart are current and the command shown is plausible.
- `InPlaceOrRecreate` depends on Kubernetes in-place pod resize support and VPA version/feature-gate compatibility. The post mentions the mode only in the update-mode overview and keeps the worked example on `Recreate`.
