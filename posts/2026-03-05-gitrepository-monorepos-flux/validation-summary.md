# Validation Summary: How to Use GitRepository with Monorepos in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux GitRepository
- Flux Kustomization
- Kubernetes
- Kustomize
- GitOps monorepo patterns

## Sources Consulted
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux repository structure guide: https://fluxcd.io/flux/guides/repository-structure/
- Flux CLI `get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux ArtifactGenerator documentation for path-scoped monorepo artifacts: https://fluxcd.io/flux/components/source/artifactgenerators/

## Issues Found
- The post described multiple GitRepository sources as using "include/exclude patterns." Flux GitRepository supports `.spec.ignore` for exclusions and `.spec.sparseCheckout` for directory-scoped artifacts; `.spec.include` has a different meaning. Updated the wording to reference source-level filtering with `sparseCheckout` and `ignore` rules.
- The multiple GitRepository example did not actually reduce artifact size because both sources checked out the whole monorepo. Added `sparseCheckout` entries to make the example match the stated optimization.
- The examples used `targetNamespace` without noting Flux's requirement that the target namespace must already exist or be included in the applied manifests. Added a concise caveat after the Kustomization examples.
- The reconciliation diagram checked whether files under each app path changed, but Flux applies rendered manifests and shared bases can affect rendered output even when files under the app path are unchanged. Updated the diagram to refer to rendered manifest changes.
- The shared base example said an app overlay could reference `../base`, but the shown directory layout requires `../../base` from `apps/frontend`. Corrected the comment.

## Review Notes
The core API versions, resource kinds, `sourceRef`, `path`, `prune`, `dependsOn`, `targetNamespace`, `GitRepository` `ref.branch`, and status field examples are consistent with current Flux documentation. In future revisions, the post could mention `wait` or `healthChecks` when dependencies should wait for workload health rather than only Kustomization reconciliation readiness.
