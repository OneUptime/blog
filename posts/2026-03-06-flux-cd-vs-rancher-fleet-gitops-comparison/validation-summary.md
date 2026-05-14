# Validation Summary: Flux CD vs Rancher Fleet: GitOps Comparison

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- Flux CD
- Rancher Fleet
- Kubernetes custom resources
- GitOps
- Kustomize
- Helm
- OCI registries
- SOPS
- Rancher Continuous Delivery

## Sources Consulted
- Flux GitOps Toolkit components: https://fluxcd.io/flux/components/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Source API reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux image automation documentation: https://fluxcd.io/flux/components/image/imageupdateautomations/
- Flux notification controller documentation: https://fluxcd.io/flux/components/notification/
- CNCF Flux project page: https://www.cncf.io/projects/flux/
- Fleet CRD reference: https://fleet.rancher.io/reference/ref-crds
- Fleet GitRepo reference: https://fleet.rancher.io/reference/ref-gitrepo
- Fleet fleet.yaml reference: https://fleet.rancher.io/reference/ref-fleet-yaml
- Fleet OCI Helm chart documentation: https://fleet.rancher.io/how-tos-for-users/fetch-helm-oci
- Fleet image scan documentation: https://fleet.rancher.io/how-tos-for-users/imagescan
- Fleet installation documentation: https://fleet.rancher.io/how-tos-for-operators/installation
- Rancher Continuous Delivery with Fleet overview: https://ranchermanager.docs.rancher.com/integrations-in-rancher/fleet/overview
- Rancher Fleet architecture: https://ranchermanager.docs.rancher.com/integrations-in-rancher/fleet/architecture

## Issues Found
- The feature table said Fleet has no built-in image automation. Fleet has an experimental `imageScans` feature for updating image references in Git, but it is disabled by default. Updated the table and Flux feature section to distinguish Flux's image controllers from Fleet's experimental image scan model.
- The feature table described Fleet OCI registry support as limited. Current Fleet documentation supports OCI Helm chart sources through `helm.repo`, while Flux supports OCI artifact sources and Helm OCI workflows. Updated the wording to be precise.
- The feature table listed fixed resource footprint estimates. Official docs describe configurable resources for Flux controllers and Fleet manager/agent components rather than stable fixed memory numbers. Replaced the estimates with configurable-resource wording.
- A Rancher integration example implied `provider.cattle.io: rke2` as a Rancher-provided cluster label. I did not find that label in official Rancher documentation, so the example now uses a clearly user-applied `cluster-type: rke2` label.

## Review Notes
All YAML snippets were parsed successfully after the edits. Fleet image scanning is experimental and disabled by default, so Flux remains the more mature choice for image update automation in this comparison.
