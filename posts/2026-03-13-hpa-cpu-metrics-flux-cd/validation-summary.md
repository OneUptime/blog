# Validation Summary: HPA CPU Metrics with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes Horizontal Pod Autoscaler
- Kubernetes Deployment resources
- Kubernetes metrics-server
- Flux CD Kustomization
- Flux CD HelmRelease and HelmRepository
- Kustomize manifests

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux FAQ on reconciliation and HPA-managed replicas: https://fluxcd.io/flux/faq/
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Kubernetes metrics-server repository documentation: https://github.com/kubernetes-sigs/metrics-server
- Kubernetes metrics-server releases: https://github.com/kubernetes-sigs/metrics-server/releases

## Issues Found
- The metrics-server Flux example defined a `HelmRelease` but did not define the required `HelmRepository` source. Added a `source.toolkit.fluxcd.io/v1` `HelmRepository` pointing to the official metrics-server Helm chart repository.
- The Deployment manifest included `spec.replicas`, while the post later recommended using HPA for replica management. Removed `spec.replicas` from the Deployment example so Flux does not reconcile the field against HPA changes.
- The HPA-Flux conflict section recommended a non-current `kustomize.toolkit.fluxcd.io/ssa-ignore` field-level annotation and suggested keeping a replica placeholder. Replaced this with Flux's documented recommendation to omit `spec.replicas` from Deployments managed by HPA.
- The HPA behavior comments described stabilization windows as simple waits. Updated the comments to better match Kubernetes HPA behavior, where recent recommendations and scaling policies control scaling behavior.
- The PodDisruptionBudget best-practice note said PDBs ensure availability during HPA scale-down events. Updated it to say PDBs help protect availability during voluntary disruptions, which matches Kubernetes PDB semantics more closely.

## Review Notes
The examples use current Kubernetes `autoscaling/v2` HPA and Flux `kustomize.toolkit.fluxcd.io/v1` / `helm.toolkit.fluxcd.io/v2` APIs. The metrics-server chart version range `3.12.x` remains valid for the chart releases referenced by the post, though newer chart releases may exist.
