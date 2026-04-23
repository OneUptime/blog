# Validation Summary: Rancher Fleet vs Flux CD: GitOps Comparison

## Status
validated

## Post Type
Comparison Guide

## Technologies Covered
- Rancher Fleet
- Flux CD
- Kubernetes GitOps
- Helm
- Kustomize
- OCI registries
- Rancher
- Flux image automation

## Sources Consulted
- CNCF Flux project page: https://www.cncf.io/projects/flux/
- Flux documentation overview: https://fluxcd.io/flux
- Flux FAQ: https://fluxcd.io/flux/faq/
- Flux GitRepository docs: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization docs: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease docs: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux notification controller docs: https://fluxcd.io/flux/components/notification/
- Flux alerts guide: https://fluxcd.io/flux/monitoring/alerts/
- Flux image automation docs: https://fluxcd.io/flux/components/image/
- Flux ImagePolicy docs: https://fluxcd.io/flux/components/image/imagepolicies/
- Flux image update guide: https://fluxcd.io/flux/guides/image-update/
- Flux install command docs: https://fluxcd.io/flux/cmd/flux_install/
- Flux multi-tenancy docs: https://fluxcd.io/flux/installation/configuration/multitenancy/
- Flux air-gapped installation docs: https://fluxcd.io/flux/installation/configuration/air-gapped/
- Fleet core concepts: https://fleet.rancher.io/explanations/concepts
- Fleet installation details: https://fleet.rancher.io/how-tos-for-operators/installation
- Fleet `fleet.yaml` reference: https://fleet.rancher.io/reference/ref-fleet-yaml
- Fleet Image Scan docs: https://fleet.rancher.io/how-tos-for-users/imagescan
- Fleet GitRepo targeting docs: https://fleet.rancher.io/0.10/how-tos-for-users/gitrepo-targets
- Fleet multi-user / RBAC docs: https://fleet.rancher.io/0.11/how-tos-for-operators/multi-user
- Fleet troubleshooting and reconciliation docs: https://fleet.rancher.io/troubleshooting

## Issues Found

1. **Flux controller description was inaccurate.** The post described Flux image automation as a single controller and implied it was part of the standard controller set. Updated the text and architecture diagram to reflect the actual model: Flux has separate `image-reflector-controller` and `image-automation-controller` components, and they are optional extra components.

2. **The comparison table contained incorrect or overly strong claims.** Changed Fleet image automation from `No` to `Experimental (Image Scan)`, replaced the unsupported `Thousands vs Hundreds` scale row with a documented multi-cluster model comparison, removed the unsupported edge-support comparison, changed the Flux UI row to `No built-in UI`, and clarified RBAC and multi-tenancy wording to match the documented authorization models of both projects.

3. **The Flux ImagePolicy manifest used an outdated API version.** Updated `image.toolkit.fluxcd.io/v1beta2` to the current `image.toolkit.fluxcd.io/v1`.

4. **The multi-cluster explanation for Flux was too restrictive and Fleet’s architecture was oversimplified.** Updated the Flux section to note that while a per-cluster install pattern is common, Flux can also reconcile to remote clusters using `.spec.kubeConfig` on resources such as `Kustomization` and `HelmRelease`. Updated the Fleet section to describe the documented manager-plus-agent architecture instead of implying a single controller manages all clusters directly.

5. **Several manifests depended on existing resources or namespaces without saying so.** Added short comments clarifying the `targetNamespace` prerequisite for the Flux `Kustomization`, the required `HelmRepository` for the `HelmRelease`, and the required `ImageRepository` for the `ImagePolicy`.

## Review Notes
- Flux does not ship a built-in UI, but the official Flux ecosystem lists multiple compatible UIs, including Weave GitOps.
- Fleet’s Image Scan feature is documented as experimental and disabled by default, so Flux still has the more mature built-in image automation story.
- The post is technically relevant and salvageable; after the corrections above, it is accurate enough to keep as a comparison guide.
