# Validation Summary: Karpenter Provisioners with Flux CD

## Status
validated

## Post Type
Tutorial / GitOps configuration guide

## Technologies Covered
- Karpenter
- Flux CD
- AWS EKS
- Kubernetes
- Kustomize
- YAML

## Sources Consulted
- Karpenter NodePools documentation: https://karpenter.sh/docs/concepts/nodepools/
- Karpenter NodeClasses documentation: https://karpenter.sh/docs/concepts/nodeclasses/
- Karpenter Disruption documentation: https://karpenter.sh/docs/concepts/disruption/
- Karpenter v1 migration documentation: https://karpenter.sh/v1.0/upgrading/v1-migration/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Kustomization guide: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- Updated Karpenter NodePool manifests from `apiVersion: karpenter.sh/v1beta1` to `apiVersion: karpenter.sh/v1`, matching the current served API in Karpenter documentation.
- Updated `nodeClassRef` examples from `apiVersion: karpenter.k8s.aws/v1beta1` to `group: karpenter.k8s.aws`, because current Karpenter `v1` NodePools reference NodeClasses with `group`, `kind`, and `name`.
- Replaced the deprecated/renamed `consolidationPolicy: WhenUnderutilized` with `consolidationPolicy: WhenEmptyOrUnderutilized`, which is the current Karpenter `v1` value.
- Removed the unused `nodepool-dev.yaml` reference from the repository layout and adjusted the introduction, because the Kustomize resource list and post content do not define or apply a development NodePool.
- Updated the description from "provisioner configurations" to "NodePool configurations" to match Karpenter's current resource naming.

## Review Notes
The Flux `Kustomization` example uses the current `kustomize.toolkit.fluxcd.io/v1` API and valid fields including `interval`, `path`, `prune`, `sourceRef`, and `dependsOn`. The standalone Kustomize `kustomization.yaml` uses `kustomize.config.k8s.io/v1beta1`, which remains the commonly documented Kustomize API version.
