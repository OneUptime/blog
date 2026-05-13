# Validation Summary: How to Configure FluxInstance Sync Settings for OCIRepository

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux
- Flux Operator
- FluxInstance
- OCIRepository
- Kubernetes
- OCI registries
- GitHub Actions
- Amazon ECR

## Sources Consulted
- Flux Operator FluxInstance CRD documentation: https://fluxoperator.dev/docs/crd/fluxinstance/
- Flux Operator cluster sync configuration guide: https://fluxoperator.dev/docs/instance/sync/
- Flux Operator instance customization guide: https://fluxoperator.dev/docs/instance/customization/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux `push artifact` CLI documentation: https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux `tag artifact` CLI documentation: https://fluxcd.io/flux/cmd/flux_tag_artifact/
- Flux GitHub Action documentation: https://fluxcd.io/flux/flux-gh-action/
- Flux OCI artifacts cheatsheet: https://fluxcd.io/flux/cheatsheets/oci-artifacts/

## Issues Found
- The semver example used `spec.sync.ref: ">=1.0.0 <2.0.0"` directly. FluxInstance `sync.ref` is documented as the source reference string such as an OCI tag, while semver tracking for the generated OCIRepository requires patching `/spec/ref` to an object with `semver`. Updated the example to keep the sync source definition and add a Flux Operator `kustomize.patches` entry targeting the generated OCIRepository.
- The GitHub Actions workflow used `flux oci login`, which is not a documented Flux CLI command. Flux artifact commands read registry credentials from Docker config, and the official Flux GitHub Action examples use `docker/login-action@v3` for GHCR. Replaced the login step with `docker/login-action@v3`.

## Review Notes
- The ECR static credential example is technically valid but uses an ECR authorization token that expires, so production setups should prefer Flux's AWS provider with EKS workload identity where possible.
- The examples use `latest` for simplicity; immutable version or digest-based promotion is preferable for production auditability.
