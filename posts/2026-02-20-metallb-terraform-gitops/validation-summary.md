# Validation Summary: How to Manage MetalLB Configuration with Terraform and GitOps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- MetalLB
- Terraform
- Terraform Kubernetes provider
- Terraform Helm provider
- Flux
- Helm
- GitHub Actions
- yamllint

## Sources Consulted
- MetalLB configuration documentation: https://metallb.io/configuration/
- MetalLB API reference documentation: https://metallb.io/apis/
- MetalLB GitHub releases: https://github.com/metallb/metallb/releases
- MetalLB v0.16.0 Helm chart values: https://raw.githubusercontent.com/metallb/metallb/v0.16.0/charts/metallb/values.yaml
- MetalLB v0.16.0 BGPPeer CRD: https://raw.githubusercontent.com/metallb/metallb/v0.16.0/config/crd/bases/metallb.io_bgppeers.yaml
- MetalLB v0.16.0 IPAddressPool CRD: https://raw.githubusercontent.com/metallb/metallb/v0.16.0/config/crd/bases/metallb.io_ipaddresspools.yaml
- MetalLB v0.16.0 BGPAdvertisement CRD: https://raw.githubusercontent.com/metallb/metallb/v0.16.0/config/crd/bases/metallb.io_bgpadvertisements.yaml
- Terraform Kubernetes provider `kubernetes_manifest` documentation: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/manifest
- HashiCorp tutorial on Kubernetes CRDs with Terraform: https://developer.hashicorp.com/terraform/tutorials/kubernetes/kubernetes-provider
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- HashiCorp setup-terraform GitHub Action: https://github.com/hashicorp/setup-terraform

## Issues Found
- The MetalLB Helm chart version was pinned to `0.14.9`, which is outdated as of this review. Updated the Terraform and Flux examples to `0.16.0`, the current MetalLB release listed in the official GitHub releases.
- The examples enabled `speaker.frr.enabled`, but MetalLB 0.16.0 marks legacy FRR mode as deprecated and uses `frrk8s.enabled` by default. Removed the explicit legacy FRR setting from both Terraform and Flux snippets.
- The Terraform flow implied `depends_on` alone is enough for `kubernetes_manifest` resources that use CRDs installed by the same run. The Kubernetes provider needs the CRDs present at plan time, so the apply workflow now installs MetalLB and its CRDs before planning the MetalLB custom resources.
- The Flux Kustomization `dependsOn` example pointed at `metallb`, which would be a HelmRelease in the shown layout. Flux Kustomization dependencies must refer to other Flux Kustomization objects, so the example now depends on `metallb-install`.
- The Flux repository layout omitted the HelmRepository and separate Flux Kustomization manifests needed by the corrected Flux examples. Updated the layout snippet to include `helmrepository.yaml`, `metallb-install.yaml`, and `metallb-config.yaml`.
- The GitHub Actions workflow ran Terraform and yamllint without installing them, and the path filter did not cover the separate Flux Kustomization files added to the repository layout. Added `hashicorp/setup-terraform@v4`, an explicit `yamllint` installation step, and a path pattern for `metallb*.yaml`.

## Review Notes
The core MetalLB CR examples use valid current CRD versions: `IPAddressPool` and `BGPAdvertisement` use `metallb.io/v1beta1`, while `BGPPeer` uses the non-deprecated `metallb.io/v1beta2`. The tutorial remains a concise example rather than a complete production repository; a real implementation should also include the omitted Flux `HelmRepository` manifest content and environment-specific authentication for Terraform state and Kubernetes access.
