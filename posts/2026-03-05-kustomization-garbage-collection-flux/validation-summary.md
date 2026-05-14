# Validation Summary: How to Configure Kustomization Garbage Collection in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Kustomization API
- Kustomize Controller
- Kubernetes manifests
- kubectl
- Flux CLI

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference v1: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux CLI `flux events` documentation: https://fluxcd.io/flux/cmd/flux_events/
- Flux CLI `flux get kustomizations` documentation: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux FAQ on safely moving and renaming Kustomizations: https://fluxcd.io/flux/faq/

## Issues Found
- The post said `spec.prune` could be omitted because `false` is the default. Flux's current v1 Kustomization API documents `spec.prune` as a required boolean, so the text was changed to say the field is required and garbage collection is only enabled when it is set to `true`.
- The post described Kustomization deletion behavior as depending only on `prune`. Current Flux supports `spec.deletionPolicy`, with `MirrorPrune` as the default and `Orphan` available to keep managed resources. The deletion section and command example were updated to use `deletionPolicy: Orphan` when deleting a Kustomization without deleting managed resources.

## Review Notes
The remaining examples and commands align with current Flux documentation. The `flux events` command is documented by Flux as preview, so future CLI changes may require a minor update.
