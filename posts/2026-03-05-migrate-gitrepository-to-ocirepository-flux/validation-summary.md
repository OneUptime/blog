# Validation Summary: How to Migrate from GitRepository to OCIRepository in Flux

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Flux CD
- Flux CLI
- Kubernetes custom resources
- GitRepository
- OCIRepository
- Kustomization
- OCI artifacts
- GitHub Actions
- GitHub Container Registry

## Sources Consulted
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux OCI artifacts cheatsheet: https://fluxcd.io/flux/cheatsheets/oci-artifacts/
- Flux `push artifact` CLI documentation: https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux `tag artifact` CLI documentation: https://fluxcd.io/flux/cheatsheets/oci-artifacts/
- Flux GitHub Action documentation: https://fluxcd.io/flux/flux-gh-action/
- GitHub Actions workflow permissions documentation: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
- `actions/checkout` documentation: https://github.com/actions/checkout

## Issues Found
- The GitHub Actions example used `flux oci login ghcr.io`, but the current Flux CLI documentation does not expose a `flux oci login` command. Flux documentation shows authenticating for `flux push artifact` with Docker credentials, credential helpers, `--creds`, or provider-based auth. Changed the example to use `docker login ghcr.io`.
- The GitHub Actions workflow set only `packages: write` permissions. GitHub sets unspecified token permissions to `none` when any permission is specified, and `actions/checkout` recommends `contents: read`. Added `contents: read`.
- The registry pull secret example used `${GITHUB_TOKEN}`, which is a workflow-scoped token and is not a good placeholder for cluster pull credentials created outside the workflow. Changed the placeholders to `${GHCR_USERNAME}` and `${GHCR_TOKEN}`.

## Review Notes
- The Flux `OCIRepository`, `GitRepository`, and `Kustomization` API versions used in the examples are current.
- `flux get sources oci` and related OCI source commands are documented as preview commands, but they are valid in current Flux CLI documentation.
- Using `latest` for OCI artifacts works, but digest or immutable version tags are generally preferable for stronger reproducibility.
