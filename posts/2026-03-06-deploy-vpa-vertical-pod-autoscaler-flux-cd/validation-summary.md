# Validation Summary: How to Deploy VPA (Vertical Pod Autoscaler) with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Vertical Pod Autoscaler (VPA)
- Horizontal Pod Autoscaler (HPA)
- Flux CD
- HelmRelease and HelmRepository custom resources
- Kustomize
- Fairwinds VPA Helm chart
- PodDisruptionBudget

## Sources Consulted
- Kubernetes Vertical Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes Autoscaler VPA API source: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/apis/autoscaling.k8s.io/v1/types.go
- Kubernetes Autoscaler VPA known limitations: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/known-limitations.md
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Helm API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Fairwinds VPA Helm chart source and values: https://github.com/FairwindsOps/charts/tree/master/stable/vpa
- Fairwinds VPA chart repository index: https://charts.fairwinds.com/stable/index.yaml

## Issues Found
- The HelmRelease used Fairwinds chart values `replicas`, `admissionController.certGen.enabled`, and `metrics.serviceMonitor.enabled`, which do not match the chart values for the referenced Fairwinds VPA chart. Updated the examples to use `replicaCount` and `admissionController.generateCertificate`, and removed the unsupported metrics block.
- The post used VPA `updateMode: "Auto"` for automatic updates. Current VPA documentation marks `Auto` as deprecated and recommends explicit modes. Updated automatic update examples to use `updateMode: "Recreate"`.
- The recommender example included `oom-min-bump-up-bytes`, which is not a current recommender flag. Removed that flag.
- The comment for `memory-saver` described a metrics retention period, but the flag limits tracking to pods associated with a VPA. Updated the comment.
- The updater comments for `eviction-tolerance` and `min-replicas` described the wrong behavior. Updated them to match the upstream updater flags.
- The repository layout placed the Flux `Kustomization` custom resource at `clusters/my-cluster/vpa/kustomization.yaml`, which conflicts with Kustomize's own `kustomization.yaml`. Added a Kustomize `kustomization.yaml` under the VPA directory and moved the Flux custom resource example to `clusters/my-cluster/vpa-kustomization.yaml`.
- The repository structure omitted the `vpa-with-hpa.yaml` and `pdb.yaml` files used later in the tutorial. Added them to the structure and Kustomize resources list.
- The log commands used label selectors such as `app=vpa-recommender`, but the Fairwinds chart labels component pods with `app.kubernetes.io/component`. Updated the commands to use the chart's labels.
- The HPA coexistence best practice was too narrow. Updated it to state that VPA and HPA should manage different resource metrics.

## Review Notes
Local `helm`, `kubectl`, and `flux` binaries were not installed in the workspace, so CLI and chart behavior were checked against official documentation and upstream chart/source files. YAML code fences in the post were parsed successfully after edits.
