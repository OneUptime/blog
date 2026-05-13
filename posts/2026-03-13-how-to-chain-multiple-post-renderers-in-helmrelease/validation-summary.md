# Validation Summary: How to Chain Multiple Post-Renderers in HelmRelease

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Helm Controller
- HelmRelease
- Helm post-renderers
- Kustomize patches
- Kustomize images transformer
- Kubernetes strategic merge patches
- JSON Patch / JSON Pointer
- Helm CLI

## Sources Consulted
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Helm Controller documentation: https://fluxcd.io/flux/components/helm/
- Flux Kustomization patches and images documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux 2.3 GA deprecations and HelmRelease v2 migration notes: https://v2-6.docs.fluxcd.io/blog/2024/05/flux-v2.3.0/
- RFC 6902 JSON Patch: https://www.rfc-editor.org/rfc/rfc6902
- Helm template command reference: https://helm.sh/docs/v3/helm/helm_template/

## Issues Found
- The HelmRelease v2 examples used `spec.postRenderers[].kustomize.patchesStrategicMerge`, which was removed from the Flux HelmRelease v2 API. I replaced those examples with the supported `patches` field containing inline strategic merge patch documents.
- Several JSON Patch examples added nested labels or annotations through paths such as `/spec/template/metadata/annotations/...`. JSON Patch requires the parent object or array to exist, so those examples could fail when the rendered resource does not already contain the relevant map. I changed these examples to inline strategic merge patches, which can add or merge the metadata maps safely.
- The multi-resource labels example used JSON Patch operations against `/metadata/labels/...`, which can fail if a rendered Deployment or Service has no labels map. I changed those entries to targeted inline strategic merge patches.
- The prerequisites said Flux v2.x or later, but the examples use the GA HelmRelease v2 API. I changed the prerequisite to Flux v2.3 or later, matching the Flux release that introduced the GA v2 APIs and removed the deprecated post-renderer patch fields.

## Review Notes
The remaining HelmRelease examples use the current `helm.toolkit.fluxcd.io/v2` API and valid `postRenderers.kustomize.patches` / `postRenderers.kustomize.images` fields. Flux documents that multiple post-renderers are applied in definition order, and the Helm `template` command and `--version` flag are valid for locally rendering a chart at a specific chart version. The edited Markdown YAML snippets and their inline patch payloads were parsed successfully.
