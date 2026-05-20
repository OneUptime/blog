# Validation Summary: How to Deploy VerticalPodAutoscalers with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Vertical Pod Autoscaler (VPA)
- Horizontal Pod Autoscaler (HPA)
- Argo CD
- Helm
- GitOps
- PodDisruptionBudgets
- Metrics Server

## Sources Consulted
- Kubernetes Vertical Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes autoscaler VPA quickstart: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/quickstart.md
- Kubernetes autoscaler VPA installation guide: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/installation.md
- Argo CD Diffing Customization documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Fairwinds VPA Helm chart package: https://artifacthub.io/packages/helm/fairwinds-stable/vpa
- GKE Horizontal Pod Autoscaling limitations for HPA with VPA: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/horizontalpodautoscaler

## Issues Found
- The post described VPA as having only three update modes and used `Auto` for active updates. Current VPA documentation lists `Off`, `Initial`, `Recreate`, `InPlaceOrRecreate`, and deprecated `Auto`; `Auto` has been deprecated since VPA 1.4.0 and is currently an alias for `Recreate`. Updated the explanation and examples to use `Recreate`.
- The post implied VPA always adjusts both requests and limits. VPA primarily applies resource requests, with limits controlled when `controlledValues: RequestsAndLimits` is used. Updated wording to say requests, and optionally limits.
- The installation section omitted the Metrics Server prerequisite. Added a note that VPA requires a metrics source such as Metrics Server.
- The Fairwinds Helm chart version was outdated. Updated the Argo CD Helm example from `4.4.0` to `4.11.0`, the current chart version found during review.
- The Argo CD section implied VPA normally changes Deployment template resources and therefore requires `ignoreDifferences`. Upstream VPA documentation notes that VPA updates actual Pod resources through admission and updater behavior rather than modifying the Deployment template. Updated the text to say Argo CD ignore rules are only needed if another mutating webhook or operator changes resource fields that Argo CD manages.

## Review Notes
- The VPA and HPA guidance is correct: avoid combining HPA and VPA on CPU or memory metrics; use HPA with custom or external metrics if active VPA is also managing CPU or memory.
- The `InPlaceOrRecreate` mode depends on Kubernetes in-place pod resize support and VPA feature compatibility, so users should verify their cluster version before using it.
