# Validation Summary: VPA Auto Mode with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes Vertical Pod Autoscaler
- Kubernetes Horizontal Pod Autoscaler
- Flux CD HelmRelease
- Flux CD Kustomization
- Fairwinds VPA Helm chart
- kubectl
- jq

## Sources Consulted
- Kubernetes Vertical Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes autoscaler VPA API definitions: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/apis/autoscaling.k8s.io/v1/types.go
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux HelmRelease documentation: https://v2-0.docs.fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Fairwinds VPA Helm chart values and chart metadata: https://github.com/FairwindsOps/charts/tree/master/stable/vpa
- Artifact Hub Fairwinds VPA chart package: https://artifacthub.io/packages/helm/fairwinds-stable/vpa

## Issues Found
- The post used VPA `updateMode: "Auto"` throughout. Kubernetes documents `Auto` as deprecated since VPA 1.4.0 and recommends explicit modes. Updated the title, description, examples, best practices, and conclusion to use `updateMode: "Recreate"` for eviction-based automatic updates.
- The Flux `HelmRelease` was in `kube-system` while the referenced `HelmRepository` was in `flux-system` without an explicit `sourceRef.namespace`. Updated the `HelmRelease` to live in `flux-system`, set `targetNamespace: kube-system`, and made the source namespace explicit.
- The "Recommendation-Only mode" wording was not the actual VPA update mode name. Updated it to `Off` mode.
- The `minReplicas` explanation implied a stronger availability guarantee than the VPA API provides. Updated the example and best-practice text to describe the actual requirement: the updater requires the configured number of live replicas before attempting eviction.
- The Flux `dependsOn` comment could be read as depending directly on a `HelmRelease`. Flux Kustomization dependencies refer to other Flux Kustomizations, so the comment now states that the dependency is the Kustomization that installs the VPA CRDs/controller.
- The monitoring command used `jq`, but `jq` was not listed as a prerequisite. Added it to the prerequisites.

## Review Notes
- The YAML examples parse successfully.
- `helm` and `kubectl` were not installed in the local environment, so command behavior was verified against official documentation rather than local CLI execution.
