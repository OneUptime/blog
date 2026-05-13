# Validation Summary: How to Migrate from Raw YAML to Timoni Modules with Flux

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Flux
- Kubernetes custom resources
- GitRepository
- Kustomization
- HelmRepository
- HelmRelease
- Timoni modules
- YAML configuration

## Sources Consulted
- Timoni Flux AIO Distribution documentation: https://timoni.sh/flux-aio/
- Timoni `apply` CLI reference: https://timoni.sh/cmd/timoni_apply/
- Timoni `build` CLI reference: https://timoni.sh/cmd/timoni_build/
- Timoni `status` CLI reference: https://timoni.sh/cmd/timoni_status/
- `flux-git-sync` module README and schema: https://github.com/stefanprodan/flux-aio/tree/main/modules/flux-git-sync
- `flux-helm-release` module README and schema: https://github.com/stefanprodan/flux-aio/tree/main/modules/flux-helm-release
- Flux `get sources all` CLI reference: https://fluxcd.io/flux/cmd/flux_get_sources_all/
- Flux troubleshooting cheatsheet for `flux get all` and status selectors: https://fluxcd.io/flux/cheatsheets/troubleshooting/

## Issues Found
- The `flux-git-sync` Timoni values example used `git.ref.branch`, string duration values such as `"5m"`, `git.secretRef`, `sync.interval`, and nested `sync.postBuild`. The published module schema expects `git.ref` as a string, integer minute values for `git.interval` and `sync.timeout`, no `sync.interval`, top-level `substitute` and `substituteFrom`, and token-based module-managed Git credentials. Updated the snippet accordingly.
- The parity guidance implied the generated resources could exactly match the raw YAML. The current `flux-git-sync` module sets some defaults, including the generated Kustomization reconcile interval, so the comparison note now calls out module defaults.
- The `flux-helm-release` Timoni values example used unsupported `repository.interval`, `release.interval`, `release.targetNamespace`, `release.createNamespace`, and `release.values` fields. The module schema expects `sync.interval`, `sync.targetNamespace`, `sync.createNamespace`, and top-level `helmValues`. Updated the snippet accordingly.

## Review Notes
- Flux CRD examples use current `source.toolkit.fluxcd.io/v1`, `kustomize.toolkit.fluxcd.io/v1`, and `helm.toolkit.fluxcd.io/v2` API groups for modern Flux installations.
- Timoni was not installed in the local workspace, so CLI behavior was verified against official Timoni CLI documentation and the published module source rather than by running `timoni build`.
