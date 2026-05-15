# Validation Summary: How to Use HelmRelease with JSON Merge Patches in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Helm Controller
- HelmRelease
- Kubernetes
- Helm
- Kustomize
- Strategic merge patches
- JSON 6902 patches

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/#post-renderers
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux CLI reference for `flux get helmreleases`: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Kustomize `patches` reference: https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/patches/
- Kubernetes API concepts for patch mechanisms: https://kubernetes.io/docs/reference/using-api/api-concepts/
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The verification command used `flux get helmrelease my-app`, but the official Flux CLI documents the resource command as `flux get helmreleases`. Changed it to `flux get helmreleases -n default` so it matches the current Flux CLI reference.

## Review Notes
- The post content is technically about strategic merge patches, not JSON Merge Patch as a distinct Kubernetes patch type. The README title and body already use "Strategic Merge Patches"; the directory name and requested validation summary title still mention JSON Merge Patches.
- Flux HelmRelease `spec.postRenderers[].kustomize.patches` is current and documented for strategic merge and JSON 6902 patches. Older dedicated Kustomize fields such as `patchesStrategicMerge` and `patchesJson6902` should not be preferred for current Flux examples.
- Strategic merge patch behavior for list merging depends on Kubernetes patch metadata/OpenAPI information. The examples in the post target built-in Kubernetes resources where the shown container-name merge behavior is expected.
