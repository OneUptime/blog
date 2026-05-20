# Validation Summary: How to Deploy VPA Configuration with ArgoCD

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Kubernetes Vertical Pod Autoscaler
- Argo CD Applications and diff customization
- Kubernetes Horizontal Pod Autoscaler
- Kubernetes manifests and CRDs
- Helm
- Kustomize

## Sources Consulted
- Kubernetes Vertical Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HPA walkthrough and autoscaling/v2 custom metric examples: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/
- Argo CD diff customization documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD resource health customization documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Kubernetes autoscaler VPA CRD for vpa-release-1.6: https://raw.githubusercontent.com/kubernetes/autoscaler/vpa-release-1.6/vertical-pod-autoscaler/deploy/vpa-v1-crd-gen.yaml
- Fairwinds VPA Helm chart metadata and values: https://artifacthub.io/packages/helm/fairwinds-stable/vpa

## Issues Found
- The post used older VPA component and Helm chart versions. Updated the Git target revision from `vpa-release-1.0` to `vpa-release-1.6` and the Fairwinds chart from `4.4.0` to `4.11.0`, matching the current VPA 1.6 chart.
- Several examples used `updateMode: "Auto"`. Current Kubernetes VPA documentation marks `Auto` as deprecated and says to use `Recreate` for eviction-based updates or `InPlaceOrRecreate` where supported. Updated examples and text to use `Recreate`, with a note that `Auto` remains an alias but is deprecated.
- The Argo CD diff section incorrectly implied that VPA rewrites Deployment pod templates and therefore commonly makes Deployment Applications OutOfSync. Revised the section to clarify that VPA normally mutates created Pods, not Deployment or StatefulSet templates tracked by Argo CD, and that `ignoreDifferences` is only needed for resources Argo CD directly manages and that are actually mutated after sync.
- The `ignoreDifferences` examples targeted `apps/Deployment` pod template resources. Updated them to target directly managed `Pod` resources, which matches the scenario described.
- The Argo CD Application example in the diff section was missing `metadata.namespace` and `spec.project`. Added `namespace: argocd` and `project: default` to make the manifest complete.

## Review Notes
The remaining examples use valid current Kubernetes APIs (`autoscaling.k8s.io/v1` for VPA and `autoscaling/v2` for HPA). The HPA custom Pods metric example is structurally correct, but it assumes a custom metrics adapter exposes `http_requests_per_second`.
