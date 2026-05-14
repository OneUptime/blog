# Validation Summary: How to Use HelmRelease with JSON 6902 Patches in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Helm Controller
- HelmRelease API v2
- Kubernetes
- Kustomize post-renderers
- JSON Patch / RFC 6902
- kubectl
- flux CLI

## Sources Consulted
- Flux HelmRelease API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRelease guide, post-renderers section: https://fluxcd.io/flux/components/helm/helmreleases/#post-renderers
- Flux Helm Controller HelmRelease CRD: https://github.com/fluxcd/helm-controller/blob/main/config/crd/bases/helm.toolkit.fluxcd.io_helmreleases.yaml
- Flux shared Kustomize API types: https://github.com/fluxcd/pkg/blob/main/apis/kustomize/kustomize_types.go
- Flux CLI `flux get helmreleases` reference: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- RFC 6902, JavaScript Object Notation (JSON) Patch: https://www.rfc-editor.org/rfc/rfc6902.html
- Kubernetes kubectl JSONPath reference: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The post used `spec.postRenderers[].kustomize.patchesJson6902`, but the current Flux HelmRelease v2 API exposes `spec.postRenderers[].kustomize.patches` for both strategic merge and JSON 6902 patch documents. Updated all examples and explanatory text to use `patches`.
- The JSON 6902 examples represented `patch` as a YAML array. Flux's current `patches` field expects `patch` to be a string containing either a strategic merge patch or a JSON 6902 array. Updated examples to use `patch: |` block scalars.
- The post described Flux `patches` as JSON Merge Patches. Flux documents them as strategic merge and JSON patches. Updated headings, descriptions, comments, and best practices accordingly.
- The description of JSON Patch operation fields implied `value` was the only optional field. Updated it to mention operation-specific fields such as `value` or `from`.
- The `test` operation was described as checking that a value exists. RFC 6902 defines it as testing equality at the target path. Updated the explanation and best-practice bullet wording.
- The verification command used `flux get helmrelease my-app`. The official Flux CLI command is `flux get helmreleases`; updated the example to `flux get helmreleases -n default` to match the sample HelmRelease namespace.
- The array example appended to `/env/-` without making clear that the array must already exist. Updated the inline comment to clarify it appends to the first container's existing `env` array.

## Review Notes
The corrected examples are aligned with current Flux HelmRelease v2 documentation. JSON 6902 paths still depend on the chart's rendered output; users must verify parent maps and arrays exist before applying nested `add` operations.
