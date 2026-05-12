# Validation Summary: How to Set Up Flux on GKE Autopilot with Resource Constraints

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD v2.x (source-controller, kustomize-controller, image-reflector-controller, image-automation-controller)
- GKE Autopilot (Google Kubernetes Engine)
- Kubernetes (Deployments, GitRepository, Kustomization CRDs)
- Kustomize (strategic merge patches with target selectors)
- gcloud CLI / kubectl / flux CLI
- GitOps workflow with GitHub

## Sources Consulted
- [Resource requests in Autopilot — Google Cloud docs](https://docs.cloud.google.com/kubernetes-engine/docs/concepts/autopilot-resource-requests)
- [Choose compute classes for Autopilot Pods — Google Cloud docs](https://docs.cloud.google.com/kubernetes-engine/docs/how-to/autopilot-compute-classes)
- [About Balanced and Scale-Out ComputeClasses in Autopilot clusters](https://docs.cloud.google.com/kubernetes-engine/docs/concepts/balanced-scale-out-autopilot)
- [Flux Vertical Scaling docs (customizing controller resources)](https://fluxcd.io/flux/installation/configuration/vertical-scaling/)
- [Flux Bootstrap Customization docs](https://fluxcd.io/flux/installation/configuration/bootstrap-customization/)
- [Extend the run time of Autopilot Pods — Google Cloud docs](https://docs.cloud.google.com/kubernetes-engine/docs/how-to/extended-duration-pods)

## Issues Found

1. **Incorrect compute class terminology (Step 1).** The post referred to "Standard workload class" and "Balanced workload class". GKE Autopilot uses "general-purpose compute class" (the default) and "Balanced compute class". Updated to use the official naming.

2. **Minimums claimed as "per container" (Step 1).** Autopilot enforces resource minimums per Pod (summed across all containers), not per container. Changed wording to reflect this.

3. **Inaccurate general-purpose minimums (Step 1).** The minimum depends on whether the cluster supports bursting: 250m CPU / 512Mi memory per Pod without burst support, or 50m CPU / 52Mi memory per Pod with burst support. The post only listed the higher value. Updated to mention both cases.

4. **Inaccurate Balanced class minimums (Step 1).** The post stated "minimum 500m CPU, 512Mi memory" for Balanced. The actual minimum per Pod is 250m CPU and 0.5Gi memory with a CPU:memory ratio between 1:1 and 1:8. Corrected.

5. **Incorrect `safe-to-evict` annotation claim (Best Practices).** The post claimed GKE Autopilot automatically applies `cluster-autoscaler.kubernetes.io/safe-to-evict: "true"`. Autopilot does not auto-apply this annotation; Pods are evictable by default, and users opt out by setting the annotation to `"false"`. Reworded the bullet to reflect the correct behavior and how to combine it with PDBs.

6. **Patch comment update (Step 2 patch file).** Updated the inline comment from "Autopilot standard class minimum" to "Autopilot general-purpose class minimum (no burst)" to match the corrected terminology.

## Review Notes

- The Flux API versions used (`source.toolkit.fluxcd.io/v1`, `kustomize.toolkit.fluxcd.io/v1`, `kustomize.config.k8s.io/v1beta1`) are current for Flux v2.x.
- The `app.kubernetes.io/part-of=flux` label selector used to target all Flux controllers is correct and matches Flux's vertical-scaling docs.
- The container name `manager` is the correct name for Flux controller containers.
- The `flux bootstrap github` command flags (`--owner`, `--repository`, `--branch`, `--path`, `--personal`, `--components-extra`) are valid in the current Flux CLI.
- The Kustomize patch pattern using `metadata.name: not-used` with a `target.labelSelector` is valid — when a target selector is provided, the metadata.name in the patch is ignored for matching, though it must still be present syntactically.
- The post's approach of describing the patches before bootstrap is conceptually correct, though in practice you typically run `flux bootstrap` first (which creates `gotk-components.yaml`, `gotk-sync.yaml`, and `kustomization.yaml`) and then edit the generated `kustomization.yaml` in the repo to add patches before the next reconciliation. Readers may need to merge the example into the generated `kustomization.yaml` rather than create a separate one.
- The example deployment `securityContext` (`allowPrivilegeEscalation: false`, `readOnlyRootFilesystem: true`) is good practice but does not by itself satisfy Autopilot's full PodSecurity / built-in admission constraints; readers should also avoid host namespaces, NET_RAW, and unsafe sysctls.
