# Validation Summary: How to Use Kustomize Post-Renderer with HelmRelease in Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux HelmRelease
- Helm Controller
- Kustomize post-renderers
- Kubernetes manifests
- kubectl

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation for patches and images behavior: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux `reconcile helmrelease` CLI documentation: https://fluxcd.io/flux/cmd/flux_reconcile_helmrelease/
- Flux installation prerequisites: https://fluxcd.io/flux/installation/

## Issues Found
- The prerequisites claimed Kubernetes v1.25 or later. Current Flux documentation ties support to the Flux release and lists newer supported Kubernetes versions, so the prerequisite now says to use a Kubernetes cluster supported by the installed Flux release.
- The first post-renderer example said it added a label to all resources, but the patch targets only Deployments. The wording now says it labels rendered Deployment resources.
- The post used `commonLabels` and `commonAnnotations` under `spec.postRenderers[].kustomize`, but current Flux HelmRelease post-renderer support lists `kustomize.patches` and `kustomize.images`; common labels and annotations belong under `spec.commonMetadata.labels` and `spec.commonMetadata.annotations`. The affected examples and explanation were corrected.
- The combined example put common labels and annotations inside the Kustomize post-renderer. It now combines `commonMetadata` with a valid `postRenderers[].kustomize` block for patches and images.
- The debugging section said `flux reconcile helmrelease` shows the post-renderer output. The command triggers reconciliation and waits for it, so the wording now describes it as a way to apply the change and surface errors.

## Review Notes
The corrected YAML snippets parse successfully. Flux documentation notes that Helm has a limitation that prevents post-renderers from being applied to chart hooks; that caveat could be added in a future expansion, but it was not necessary to correct the existing examples.
