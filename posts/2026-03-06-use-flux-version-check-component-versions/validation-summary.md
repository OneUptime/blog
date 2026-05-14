# Validation Summary: How to Use flux version to Check Component Versions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux CLI
- Kubernetes
- Bash scripting
- JSON and jq
- Kubernetes CronJobs and CRDs

## Sources Consulted
- Flux CLI `flux version` official documentation: https://fluxcd.io/flux/cmd/flux_version/
- Flux CLI `flux install` official documentation: https://fluxcd.io/flux/cmd/flux_install/
- Flux CLI `flux check` official documentation: https://fluxcd.io/flux/cmd/flux_check/
- Flux CLI installation documentation: https://fluxcd.io/flux/cmd/
- Flux optional components documentation: https://fluxcd.io/flux/installation/configuration/optional-components/
- Flux upgrade documentation: https://fluxcd.io/flux/installation/upgrade/
- Flux release documentation: https://fluxcd.io/flux/releases
- Flux v2.4.0 GitHub release notes: https://github.com/fluxcd/flux2/releases/tag/v2.4.0
- Flux v2.4.0 release manifest: https://github.com/fluxcd/flux2/releases/download/v2.4.0/install.yaml

## Issues Found
- The examples paired `flux: v2.4.0` with controller versions from the Flux v2.2.x release line. Updated the default and optional controller versions to the versions listed in the official Flux v2.4.0 release notes and release manifest.
- The JSON parsing example for `source-controller` used the stale `v1.2.4` value. Updated it to `v1.4.1` to match the corrected v2.4.0 example output.
- The version mismatch script only detected missing components and did not actually compare installed controller versions against expected versions. Updated it to render the expected manifests for the CLI's Flux release with `flux install --version ... --export` and compare the expected controller image tags to `flux version -o json`.
- The latest-release upgrade hint suggested `flux install` as the generic cluster upgrade path. Updated it to reflect the official GitOps-oriented upgrade path: rerun bootstrap or update `gotk-components.yaml` using `flux install --export`.
- The upgrade workflow only showed direct `flux install`. Updated it to show the Git-managed manifest update path first, while preserving `flux install` for direct installations.
- The GitRepository CRD version example omitted `v1beta1` for the referenced Flux v2.4.0 manifest. Updated the example output to `v1 v1beta1 v1beta2`.

## Review Notes
The local environment did not have the `flux` binary installed, so command behavior was verified against the official generated Flux CLI documentation and the published Flux v2.4.0 release manifest instead of local `--help` output. The CronJob example is syntactically valid, but a production-ready deployment should include the service account's required RBAC permissions.
