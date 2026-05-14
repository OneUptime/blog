# Validation Summary: How to Use flux list artifacts to List OCI Artifacts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CLI
- Flux OCI artifacts
- OCI-compatible container registries
- Docker registry authentication
- GitHub Container Registry
- AWS ECR
- GitHub Actions
- Bash scripting

## Sources Consulted
- Flux CLI documentation for `flux list artifacts`: https://fluxcd.io/flux/cmd/flux_list_artifacts/
- Flux CLI documentation for `flux push artifact`: https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux OCI artifacts cheatsheet: https://fluxcd.io/flux/cheatsheets/oci-artifacts/
- Flux v2.0 archived CLI documentation for `flux list artifacts`: https://v2-0.docs.fluxcd.io/flux/cmd/flux_list_artifacts/
- Flux CLI source for `flux list artifacts`: https://raw.githubusercontent.com/fluxcd/flux2/main/cmd/flux/list_artifact.go

## Issues Found
- The post described `flux list artifacts` output as including last-modified timestamps and size. The current Flux CLI prints `ARTIFACT`, `DIGEST`, `SOURCE`, and `REVISION`, so the output description and example table were corrected.
- A grep example searched for artifacts by date, but the command output does not include timestamps. It was changed to search by source revision.
- Digest-sorting and digest-extraction examples parsed the table header as data. `tail -n +2` was added before sorting and `awk` extraction.
- Counting examples counted the table header as an artifact. `tail -n +2` was added before `wc -l` and digest extraction.
- The promotion-check script parsed the full output including the header row. It now strips the header before processing.
- The old-artifact cleanup example depended on a last-updated column that `flux list artifacts` does not provide. It was replaced with a tag-pattern identification example using the official `--filter-regex` option.
- The GitHub Actions count example counted the header row. It now strips the header before counting.
- The troubleshooting `flux push artifact` example used a revision value that did not match the documented `<branch|tag>@sha1:<commit-sha>` format. It now uses a valid revision format.

## Review Notes
The Flux CLI was not installed in the local environment, so local `flux --help` verification could not be performed. The review was completed against current official Flux documentation, archived v2.0 documentation, and the current Flux CLI source.
