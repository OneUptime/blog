# Validation Summary: How to Configure Vertical Pod Autoscaling with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Flux CD v2
- Flux HelmRelease, HelmRepository, Kustomization, and Alert resources
- Vertical Pod Autoscaler
- Horizontal Pod Autoscaler
- Metrics Server
- Kustomize overlays and JSON 6902 patches
- kubectl and flux CLI commands

## Sources Consulted
- Kubernetes Vertical Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes Metrics Server documentation: https://kubernetes-sigs.github.io/metrics-server/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux CLI documentation for `flux get kustomizations`: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Fairwinds VPA Helm chart on Artifact Hub: https://artifacthub.io/packages/helm/fairwinds-stable/vpa

## Issues Found
- The HelmRelease example used `apiVersion: helm.toolkit.fluxcd.io/v1`, but the current Flux HelmRelease API is `helm.toolkit.fluxcd.io/v2`. Updated the snippet to `helm.toolkit.fluxcd.io/v2`.
- Several VPA examples used `updateMode: "Auto"`. Kubernetes VPA documentation marks `Auto` as deprecated since VPA 1.4.0 and recommends `Recreate` for eviction-based updates. Updated the relevant examples, heading, and comments to use `Recreate`.
- The production Kustomize patch changed the VPA to deprecated `Auto` mode. Updated the patch value and comment to use `Recreate`.
- The Flux Alert example used `apiVersion: notification.toolkit.fluxcd.io/v1`, but current Flux Alert documentation uses `notification.toolkit.fluxcd.io/v1beta3`. Updated the Alert apiVersion.
- The Flux `dependsOn` comment implied dependency on the controller directly. Flux Kustomization `dependsOn` references other Flux Kustomization objects, so the comment now clarifies that the dependency is on the Kustomization that installs the VPA controller.

## Review Notes
- The Fairwinds VPA chart and values shown are plausible for the current chart family, including `recommender`, `updater`, and `admissionController` settings. Helm was not installed locally, so chart values were verified via Artifact Hub rather than `helm show values`.
- The HPA and VPA combination pattern is technically valid because VPA controls memory only while HPA scales on CPU. CPU utilization HPAs depend on CPU requests being present on the target pods.
