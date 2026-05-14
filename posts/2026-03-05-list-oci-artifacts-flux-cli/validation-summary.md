# Validation Summary: How to List OCI Artifacts with Flux CLI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux CLI
- OCI artifacts
- Container registries
- GitHub Container Registry
- Docker Hub
- AWS ECR
- Azure Container Registry
- Google Artifact Registry
- GitHub Actions

## Sources Consulted
- Flux CLI command documentation for `flux list artifacts`: https://fluxcd.io/flux/cmd/flux_list_artifacts/
- Flux CLI command documentation for `flux push artifact`: https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux CLI command documentation for `flux tag artifact`: https://fluxcd.io/flux/cmd/flux_tag_artifact/
- Flux OCI artifacts cheatsheet: https://fluxcd.io/flux/cheatsheets/oci-artifacts/
- Flux GitHub Action documentation: https://fluxcd.io/flux/flux-gh-action/
- Flux v2.8.6 source for `cmd/flux/list_artifact.go`: https://github.com/fluxcd/flux2/blob/v2.8.6/cmd/flux/list_artifact.go
- Flux OCI package source for list ordering and metadata handling: https://github.com/fluxcd/pkg/tree/oci/v0.60.1/oci
- Local temporary Flux CLI v2.8.6 `--help` output for `flux list artifacts`

## Issues Found
- The example output only showed `ARTIFACT` and `DIGEST`, but current Flux prints `ARTIFACT`, `DIGEST`, `SOURCE`, and `REVISION`. Updated the text and example output to include the source and revision columns.
- The example output omitted the `oci://` prefix from artifact URLs. Updated examples to match Flux's output format.
- The post claimed tags are listed alphabetically. Flux sorts tags in descending lexicographic order. Updated the explanation.
- The post claimed the SHA256 digest is truncated in output. Flux prints the full digest. Updated the explanation.
- The `flux push artifact --revision` example used `main/<sha>`, but Flux documents the revision format as `<branch|tag>@sha1:<commit-sha>`. Updated the push examples to use `$(git branch --show-current)@sha1:$(git rev-parse HEAD)`.
- The troubleshooting section used `docker pull` to test an OCI artifact repository. Flux artifacts use custom OCI media types, so `flux list artifacts ... --timeout=30s` is a more accurate test for this workflow. Updated the command.
- The prerequisites said credentials must be configured via `docker login`. Flux also supports `--creds` and provider authentication. Updated the prerequisite to reflect those supported methods.
- The prerequisite referenced an old `v0.35 or later` version style. Updated it to require a current Flux CLI release.

## Review Notes
The post is technically relevant and the commands now align with current Flux CLI documentation. The CI example uses `fluxcd/flux2/action@main`, which is documented by Flux, though pinning to a specific action ref would be a reasonable future hardening improvement.
