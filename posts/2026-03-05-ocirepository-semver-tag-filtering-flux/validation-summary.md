# Validation Summary: How to Configure OCIRepository SemVer Tag Filtering in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux source-controller
- OCIRepository custom resources
- OCI artifacts and registries
- Kubernetes custom resources
- Semantic Versioning constraints
- Flux CLI
- kubectl

## Sources Consulted
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux `push artifact` CLI reference: https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux `list artifacts` CLI reference: https://fluxcd.io/flux/cmd/flux_list_artifacts/
- Flux `get sources oci` CLI reference: https://fluxcd.io/flux/cmd/flux_get_sources_oci/
- Flux `reconcile source oci` CLI reference: https://fluxcd.io/flux/cmd/flux_reconcile_source_oci/
- Flux 2.6 GA announcement for OCIRepository v1 API availability: https://fluxcd.io/blog/2025/05/flux-v2.6.0/
- Masterminds SemVer documentation used by Flux for range syntax: https://github.com/Masterminds/semver
- Semantic Versioning specification: https://semver.org/

## Issues Found
- The prerequisites said Flux CD `v0.35 or later`, but the YAML examples use `apiVersion: source.toolkit.fluxcd.io/v1` for `OCIRepository`. The stable `OCIRepository` v1 API is documented as available with Flux v2.6 and later, so the prerequisite was updated to Flux CD v2.6 or later for that API.
- The troubleshooting section implied `v1.0.0` was not an acceptable tag while also saying Flux strips the `v` prefix. Masterminds SemVer parsing supports a leading `v`, and Flux documentation references this parser for SemVer constraints. The example was corrected to show `1.0.0` and `v1.0.0` as acceptable parseable tags, with `release-1.0.0` as the non-matching example.

## Review Notes
The SemVer range examples, prerelease `-0` guidance, OCIRepository `spec.ref.semver` field, reconciliation behavior, status artifact revision path, and Flux CLI commands were consistent with the official Flux and Masterminds SemVer documentation. The local environment did not have the `flux` CLI installed, so command validation was performed against the official Flux CLI reference instead of local `--help` output.
