# Validation Summary: How to Configure FluxInstance Sync Settings for GitRepository

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux Operator
- FluxInstance
- Flux GitRepository
- Flux Kustomization
- Kubernetes
- kubectl
- GitOps

## Sources Consulted
- Flux Operator FluxInstance CRD documentation: https://fluxoperator.dev/docs/crd/fluxinstance/
- Flux Operator cluster sync configuration documentation: https://fluxoperator.dev/docs/instance/sync/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux source API reference: https://fluxcd.io/flux/components/source/api/v1/
- Kubernetes kubectl create secret generic reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/

## Issues Found
- The post showed `ref: refs/tags/v1.x` as a way to track a semver range through FluxInstance `sync.ref`. Flux Operator documents `sync.ref` for Git sources as a Git ref name, while Flux GitRepository semver selection uses the separate `.spec.ref.semver` field. I replaced the example with a direct GitRepository `.spec.ref.semver` example and clarified that semver tag selection is not expressed through `sync.ref`.

## Review Notes
- The FluxInstance `sync` examples use fields documented by Flux Operator: `kind`, `url`, `ref`, `path`, `interval`, and `pullSecret`.
- The generated Flux source and Kustomization default name is the FluxInstance namespace name, so the verification command for `gitrepository flux-system -n flux-system` is consistent with the documented default naming behavior.
- `kubectl` was not installed in the local environment, so command validation was checked against the official Kubernetes command reference instead of local `--help` output.
