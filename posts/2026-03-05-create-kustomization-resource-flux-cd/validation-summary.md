# Validation Summary: How to Create a Kustomization Resource in Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Kustomize controller
- Flux Kustomization custom resource
- Kubernetes custom resources
- Kustomize
- Flux CLI
- kubectl

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CLI `flux create kustomization` reference: https://fluxcd.io/flux/cmd/flux_create_kustomization/

## Issues Found
- The prerequisites listed only `GitRepository` and `OCIRepository` sources, while the post correctly states elsewhere that Flux Kustomizations also support `Bucket` sources. Updated the prerequisite to say "A GitRepository, OCIRepository, or Bucket source already configured" to match the official Flux source reference documentation.

## Review Notes
- The examples use the current `kustomize.toolkit.fluxcd.io/v1` API version and valid Kustomization fields.
- The `flux create kustomization` command and `--export` flag match the official Flux CLI documentation.
- `spec.wait: false` with explicit `healthChecks` is valid; Flux ignores `healthChecks` only when `wait` is enabled.
