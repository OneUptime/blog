# Validation Summary: How to Use a Cluster Directory Structure with Flux CD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Flux CLI bootstrap
- Flux Kustomization API
- Kustomize
- Kubernetes ConfigMaps
- SOPS secret decryption
- Bash scripting
- YAML

## Sources Consulted
- Flux documentation: Ways of structuring your repositories - https://fluxcd.io/flux/guides/repository-structure/
- Flux CLI documentation: flux bootstrap github - https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Flux documentation: Kustomization - https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux documentation: Kustomize API reference v1 - https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux example repository: flux2-kustomize-helm-example - https://github.com/fluxcd/flux2-kustomize-helm-example

## Issues Found
- The tiered cluster `infrastructure.yaml` example set `wait: true` while also listing explicit `healthChecks`. Flux documentation states that when `.spec.wait` is `true`, `.spec.healthChecks` is ignored. Removed `wait: true` from that example so the listed health checks are evaluated as the surrounding text describes.

## Review Notes
- The `flux bootstrap github` examples use documented flags, including `--owner`, `--repository`, `--branch`, `--path`, and the boolean `--personal` flag.
- The Flux `Kustomization` snippets use the current `kustomize.toolkit.fluxcd.io/v1` API and documented fields such as `interval`, `retryInterval`, `timeout`, `sourceRef`, `path`, `prune`, `dependsOn`, `decryption`, `postBuild.substitute`, and `postBuild.substituteFrom`.
- The guide's repository structure matches Flux's documented monorepo pattern where each cluster state is defined in a dedicated directory and points to shared apps and infrastructure overlays.
