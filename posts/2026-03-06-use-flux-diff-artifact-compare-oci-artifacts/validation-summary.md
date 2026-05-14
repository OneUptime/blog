# Validation Summary: How to Use flux diff artifact to Compare OCI Artifacts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CLI
- Flux OCI artifacts
- OCI-compatible container registries
- Kubernetes manifests
- Bash scripting
- Docker registry authentication
- AWS ECR authentication

## Sources Consulted
- Flux CLI reference: `flux diff artifact` - https://fluxcd.io/flux/cmd/flux_diff_artifact/
- Flux CLI reference: `flux push artifact` - https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux CLI reference: `flux pull artifact` - https://fluxcd.io/flux/cmd/flux_pull_artifact/
- Flux CLI reference: `flux tag artifact` - https://fluxcd.io/flux/cmd/flux_tag_artifact/
- Flux CLI reference: `flux list artifacts` - https://fluxcd.io/flux/cmd/flux_list_artifacts/
- Flux OCI artifacts cheatsheet - https://fluxcd.io/flux/cheatsheets/oci-artifacts/
- Flux source code for `flux diff artifact` behavior - https://github.com/fluxcd/flux2/blob/main/cmd/flux/diff_artifact.go

## Issues Found
- The prerequisite list implied that cluster access is required for the examples. The reviewed commands operate primarily against local files and OCI registries, so the prerequisite was changed to make `kubectl` cluster access conditional on applying manifests.
- Several `flux push artifact --revision` examples used only a tag value such as `v1.0.0`. Flux documentation describes the revision format as `<branch|tag>@sha1:<commit-sha>`, so the examples were updated to include `@sha1:$(git rev-parse HEAD)`.
- The post claimed `flux diff artifact` produces no output when no differences exist. Current Flux code logs a success message when no changes are detected, so the wording was corrected.
- The CI/CD example treated any non-zero exit status as a detected diff. Diff-style commands use `1` for differences and values greater than `1` for errors, so the script now handles errors separately.
- The private GHCR authentication example piped a token into `flux push artifact`, which does not read the token from stdin. It was replaced with `docker login`, which Flux can use through Docker registry credentials.
- The AWS ECR example used generic `--creds` with an AWS token. Flux supports provider-based login, so the example was updated to use `--provider=aws`.
- The automated diff report example suppressed all failures with `|| true` and would render errors as diff output. It now captures the exit code and reports command errors separately.
- The exit-code best-practice section incorrectly grouped differences and errors together. It now documents and handles `>1` as an error.

## Review Notes
The commands and flags used in the post match the current official Flux CLI documentation. The local environment did not have the `flux` binary installed, so validation was performed against official Flux documentation and source code rather than local `--help` output.
