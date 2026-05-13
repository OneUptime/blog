# Validation Summary: How to Manage a Fleet of Edge Clusters with Flux CD

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Flux CD
- Kubernetes
- Kustomize
- GitOps
- Bash scripting
- kubectl

## Sources Consulted
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux bootstrap for GitHub documentation: https://fluxcd.io/flux/installation/bootstrap/github/
- Flux CLI reference for `flux bootstrap` and `flux bootstrap github`: https://fluxcd.io/flux/cmd/flux_bootstrap/ and https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux repository structure guide: https://fluxcd.io/flux/guides/repository-structure/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes kubectl JSONPath documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The `flux bootstrap github` example used `--token-env=GITHUB_TOKEN`, which is not a documented or current Flux CLI flag. I changed the example to explicitly require `GITHUB_TOKEN` in the environment and use the documented `--token-auth` flag.
- The repository tree listed only `cluster-001` and `cluster-002` under `tier-1`, while the tier Kustomization referenced `cluster-003` as well. I added `cluster-003` to the sample tree so the example is internally consistent.

## Review Notes
- The Flux `Kustomization` examples use the current `kustomize.toolkit.fluxcd.io/v1` API and valid fields such as `interval`, `path`, `prune`, `sourceRef`, and `postBuild.substitute`.
- The Kustomize `kustomization.yaml` snippet uses the standard `kustomize.config.k8s.io/v1beta1` format and valid `resources` entries.
- The rollout scripts are illustrative and assume a specific secret format for storing kubeconfigs (`.data.value`). Production implementations should adapt that part to their actual secret manager and cleanup requirements.
