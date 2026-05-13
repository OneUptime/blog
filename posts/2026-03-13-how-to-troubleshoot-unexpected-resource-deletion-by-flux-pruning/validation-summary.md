# Validation Summary: How to Troubleshoot Unexpected Resource Deletion by Flux Pruning

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux CD v2
- Flux Kustomization
- Flux GitRepository
- Kubernetes
- kubectl
- Kustomize
- Git

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux CLI reference: https://fluxcd.io/flux/cmd/flux/
- Flux `get sources git` CLI reference: https://fluxcd.io/flux/cmd/flux_get_sources_git/
- Flux `events` CLI reference: https://fluxcd.io/flux/cmd/flux_events/
- Kubernetes `kubectl events` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Git log documentation: https://git-scm.com/docs/git-log

## Issues Found
- The prerequisites omitted the `kustomize` CLI even though the post uses `kustomize build`. Added `kustomize` to the CLI prerequisites.
- The post said a trailing slash mismatch could cause Flux to see an empty directory. Flux path examples in the official documentation use paths with and without trailing slashes, so a trailing slash by itself is not the issue. Replaced this with "incorrect path".
- The GitRepository status command used `flux get source git flux-system`. Updated it to the documented Flux command family, `flux get sources git flux-system`.
- The pruning event watch example used `kubectl events --field-selector reason=Prune`, but `field-selector` is not documented for `kubectl events`. Replaced it with `flux events --for Kustomization/my-app --watch | grep -i prune`, which uses the Flux event command documented for Flux resources.

## Review Notes
The `flux events` command is documented by Flux as preview and under development. The post's Flux Kustomization pruning behavior, inventory inspection, `kustomize.toolkit.fluxcd.io/prune: disabled` annotation, GitRepository `.spec.ref`, JSONPath examples, `kubectl logs --since`, and Git deletion-history command are technically consistent with the consulted documentation.
