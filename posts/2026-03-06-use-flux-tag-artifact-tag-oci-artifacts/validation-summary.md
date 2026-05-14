# Validation Summary: How to Use flux tag artifact to Tag OCI Artifacts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CLI
- Flux OCI artifacts
- OCI container registries
- Kubernetes OCIRepository resources
- GitHub Actions
- Bash scripting

## Sources Consulted
- Flux CLI `flux tag artifact` documentation: https://fluxcd.io/flux/cmd/flux_tag_artifact/
- Flux CLI `flux push artifact` documentation: https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux CLI `flux pull artifact` documentation: https://fluxcd.io/flux/cmd/flux_pull_artifact/
- Flux CLI `flux list artifacts` documentation: https://v2-6.docs.fluxcd.io/flux/cmd/flux_list_artifacts/
- Flux OCI artifacts cheatsheet: https://v2-6.docs.fluxcd.io/flux/cheatsheets/oci-artifacts/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux GitHub Action documentation: https://fluxcd.io/flux/flux-gh-action/
- Open Container Initiative Distribution Specification: https://oci-playground.github.io/specs-latest/specs/distribution/v1.0.0/oci-distribution-spec.html

## Issues Found
- The introduction described tagging as creating a reference to an existing artifact layer. OCI tags identify manifests, not individual layers. Changed the wording to say the new reference points to an existing artifact manifest.

## Review Notes
- The Flux CLI examples use current commands and flags for `flux tag artifact`, `flux push artifact`, `flux pull artifact`, and `flux list artifacts`.
- The `OCIRepository` examples use the current `source.toolkit.fluxcd.io/v1` API and valid `spec.ref.tag` and `spec.ref.semver` fields.
- The local environment did not have the `flux` binary installed, so command validation was performed against current official Flux documentation rather than local `--help` output.
