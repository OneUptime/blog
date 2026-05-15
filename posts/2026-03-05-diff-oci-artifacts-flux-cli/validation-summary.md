# Validation Summary: How to Diff OCI Artifacts with Flux CLI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CLI
- Flux CD OCI artifacts
- Kubernetes manifests
- OCI-compatible container registries
- GitHub Actions
- GitHub Container Registry
- Docker registry authentication

## Sources Consulted
- Flux CLI documentation for `flux diff artifact`: https://fluxcd.io/flux/cmd/flux_diff_artifact/
- Flux OCI artifacts cheatsheet: https://fluxcd.io/flux/cheatsheets/oci-artifacts/
- Flux CLI source for `flux diff artifact`: https://github.com/fluxcd/flux2/blob/main/cmd/flux/diff_artifact.go
- Flux OCI package source for artifact comparison behavior: https://github.com/fluxcd/pkg/blob/main/oci/diff.go
- Flux GitHub Action documentation: https://github.com/fluxcd/flux2/tree/main/action

## Issues Found
- The post claimed `flux diff artifact` prints a unified, file-level diff showing additions, modifications, and deletions. The Flux OCI implementation compares the locally built artifact with the remote artifact content and returns an error when they differ; it does not print a file-by-file unified diff. I updated the description, explanations, output example, CI wording, best practices, and conclusion to describe content comparison behavior accurately.
- The prerequisites listed Flux CLI v2.1.0 or later, but Flux v2.0 documentation already includes `flux diff artifact`. I changed the minimum version to v2.0.0 or later.
- The GitHub Actions example used `flux oci login`, which is not a documented Flux CLI command. Flux artifact commands use Docker credential config or `--creds`; I changed the workflow to use `docker login ghcr.io`.
- The digest example used an ellipsis in the digest, which would not be a valid digest if copied. I replaced it with a full-length placeholder SHA-256 digest.
- The `flux push artifact --revision` example used `branch/sha`, while Flux examples use `branch@sha1:<sha>`. I updated the revision format.
- The PR comment example wrapped command output in a `diff` fence even though the command does not output a unified diff. I changed it to a plain code fence and renamed the comment heading.

## Review Notes
The command name is still `flux diff artifact`, but users should not expect detailed file-level change output from it. For production gating, scripts should distinguish content differences from operational failures such as registry authentication or network errors.
