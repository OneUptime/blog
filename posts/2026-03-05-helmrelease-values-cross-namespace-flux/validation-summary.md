# Validation Summary: How to Use HelmRelease with Values References Across Namespaces in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux helm-controller
- Flux HelmRelease API
- Kubernetes ConfigMaps and Secrets
- Kubernetes RBAC
- Helm CLI

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux `ValuesReference` Go API documentation: https://pkg.go.dev/github.com/fluxcd/pkg/apis/meta#ValuesReference
- Flux security documentation on cross-namespace reference policy: https://fluxcd.io/flux/security/
- Flux CLI `flux get helmreleases` documentation: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Helm `helm get values` documentation: https://helm.sh/docs/helm/helm_get_values/
- Kubernetes `kubectl describe` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/

## Issues Found
- The original post claimed that `spec.valuesFrom` supports cross-namespace ConfigMap and Secret references through `targetNamespace` or `namespace`. Flux's current `ValuesReference` API does not include either field, and the official docs state that values referents must be in the same namespace as the HelmRelease. I changed the post to explain the same-namespace limitation and removed invalid `namespace` fields from `valuesFrom` examples.
- The original post said `--no-cross-namespace-refs=false` enables cross-namespace values references. That flag applies to supported cross-namespace source references, not to `spec.valuesFrom`. I changed the explanation to distinguish source references from values references.
- The original examples placed shared values objects in central namespaces and referenced them from HelmReleases in other namespaces. Those manifests would not work with the current HelmRelease API. I changed the examples so each referenced ConfigMap or Secret exists in the same namespace as the HelmRelease.
- The original post said omitting `valuesKey` uses the entire ConfigMap data as values. Flux defaults `valuesKey` to `values.yaml`. I corrected the comment in the example.
- The original merge-order explanation said inline `spec.values` always has the highest precedence. Flux documents that `targetPath` can overwrite earlier values including inline values. I qualified the statement to apply when `targetPath` is not used.
- The verification command used `flux get helmrelease my-app`. The official Flux CLI command is `flux get helmreleases`; I updated the command.

## Review Notes
The corrected post no longer describes cross-namespace values references because that behavior is not supported by the current Flux HelmRelease API. A future post could separately cover cross-namespace source references or GitOps patterns for generating same-named ConfigMaps and Secrets into multiple namespaces.
