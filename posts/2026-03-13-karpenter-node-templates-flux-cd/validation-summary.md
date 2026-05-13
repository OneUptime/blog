# Validation Summary: Karpenter Node Templates with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Karpenter
- Amazon EKS
- AWS IAM and IRSA
- Kubernetes
- Helm
- Kustomize

## Sources Consulted
- Karpenter Getting Started with Karpenter: https://karpenter.sh/docs/getting-started/getting-started-with-karpenter/
- Karpenter NodePools documentation: https://karpenter.sh/docs/concepts/nodepools/
- Karpenter NodeClasses documentation: https://karpenter.sh/docs/concepts/nodeclasses/
- Karpenter Settings reference: https://karpenter.sh/docs/reference/settings/
- Karpenter Disruption documentation: https://karpenter.sh/docs/concepts/disruption/
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The Karpenter Helm source used the old `https://charts.karpenter.sh` repository and a `0.x` chart range. Karpenter charts are now distributed through the public ECR OCI registry, and Flux recommends `OCIRepository` for OCI Helm charts. Updated the source to `OCIRepository` with `oci://public.ecr.aws/karpenter/karpenter` and a v1 semver range.
- The HelmRelease used older chart-template syntax and old top-level/`settings.aws` values. Updated it to reference the `OCIRepository` with `chartRef` and to use current `settings.clusterName` and optional `settings.interruptionQueue` values.
- The EC2NodeClass and NodePool examples used `v1beta1` APIs. Updated them to Karpenter `v1`.
- The EC2NodeClass relied on `amiFamily: AL2` as if it selected an EKS optimized AMI. Current Karpenter requires `amiSelectorTerms` for AMI selection, and aliases are the documented way to select EKS optimized AMIs. Updated the example to use an AL2023 alias.
- The NodePool `nodeClassRef` used `apiVersion`. Current Karpenter v1 examples use `group`, `kind`, and `name`, and Karpenter v1.1+ requires `group` and `kind`. Updated both NodePools.
- The disruption policy used `WhenUnderutilized`, which is from older Karpenter versions. Updated it to the current `WhenEmptyOrUnderutilized`.
- The Flux Kustomization health check referenced the old NodePool API version. Updated it to `karpenter.sh/v1`.
- The Flux `dependsOn` comment implied it depended directly on the HelmRelease. Flux `dependsOn` references Kustomization objects, so the comment now states that it expects a Flux Kustomization named `karpenter`.

## Review Notes
The snippets are now aligned with current Karpenter v1 and Flux APIs. The AMI alias is pinned for production safety, but future readers should update the alias version after testing newer EKS optimized AMIs in their own environment.
