# Validation Summary: How to Manage Helm Value Overrides Across Environments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux Helm Controller
- Flux HelmRelease
- Helm
- Kubernetes
- Kustomize
- ConfigMaps and Secrets
- JSON Patch

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRelease API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux `flux debug helmrelease` CLI documentation: https://fluxcd.io/flux/cmd/flux_debug_helmrelease/
- Flux secrets management documentation: https://fluxcd.io/flux/security/secrets-management/
- Flux SOPS guide: https://fluxcd.io/flux/guides/mozilla-sops/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization
- Helm `helm get values` documentation: https://helm.sh/docs/helm/helm_get_values/
- RFC 6902 JSON Patch: https://www.rfc-editor.org/info/rfc6902

## Issues Found
- The post said JSON patches use JSONPath selectors. JSON Patch operations use JSON Pointer paths, so the wording was corrected.
- The post described Flux value precedence as inline values, then ConfigMap values, then Secret values. Flux merges `valuesFrom` entries in list order first, then inline `spec.values` overwrites those. The example comments and explanatory sentence were corrected.
- The `valuesFiles` example placed `valuesFiles` directly under `spec`. In Flux HelmRelease v2, `valuesFiles` belongs under `spec.chart.spec`, and the paths are relative to the chart source. The snippet was corrected and given a `GitRepository` source reference.
- The troubleshooting command using `kubectl get helmrelease ... -o jsonpath='{.spec.values}'` was described as showing effective values after all overrides, but it only shows inline values. It was replaced with `flux debug helmrelease ... --show-values`.
- The Helm command for checking release values omitted `--all`, which is needed to include computed values. The command was updated to `helm get values ... --all`.
- The best-practice sentence said never to commit secrets to Git even if encrypted. Flux documents SOPS as a supported workflow for safely storing encrypted secrets in Git, so the sentence was corrected to warn against plaintext secrets and mention SOPS or another supported workflow.

## Review Notes
Several snippets are intentionally abbreviated to focus on values configuration. In a real HelmRelease, ensure required chart source configuration, namespaces, and release settings are present for the specific chart source being used.
