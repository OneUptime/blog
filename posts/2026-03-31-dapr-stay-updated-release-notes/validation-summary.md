# Validation Summary: How to Stay Updated with Dapr Release Notes

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr CLI
- Kubernetes (kubectl)
- GitHub Releases / GitHub API
- RSS/Atom feeds
- jq (JSON processor)

## Sources Consulted
- Dapr CLI documentation: https://docs.dapr.io/reference/cli/
- Dapr CLI `dapr init` command reference: https://docs.dapr.io/reference/cli/dapr-init/
- GitHub REST API releases endpoint: https://docs.github.com/en/rest/releases/releases
- GitHub Atom feed format for releases: https://github.com/dapr/dapr/releases.atom
- Dapr release process: https://github.com/dapr/dapr/blob/master/docs/release_process.md

## Issues Found
1. **Incorrect command for listing available Dapr runtime versions** (line 52-53):
   - **What was wrong:** The post used `dapr init --runtime-version --help` with a comment claiming it lists available Dapr runtime versions. The `--runtime-version` flag requires a version string value, so passing `--help` would either error or be misinterpreted. There is no built-in Dapr CLI command to list all available runtime versions.
   - **What was changed:** Replaced with `curl -s https://api.github.com/repos/dapr/dapr/releases | jq -r '.[].tag_name'`, which actually lists available Dapr release versions via the GitHub API.
   - **Why:** The original command would not produce the expected output and could confuse readers trying to discover available versions.

## Review Notes
- The section title "Checking the Kubernetes Operator Version" is slightly imprecise — Dapr's control plane includes multiple components (dapr-operator, dapr-sidecar-injector, dapr-sentry, dapr-placement), not just the operator. However, the kubectl command correctly lists all pod images in the dapr-system namespace, so the output is accurate.
- The RSS feed URL code block uses `yaml` syntax highlighting for a plain URL. This is a minor formatting choice, not a technical error.
- The GitHub deprecation label search URL (`label:deprecation`) may not match the exact label used in the Dapr repository — actual label names may differ. Readers should verify the available labels in the repository.
- `dapr --version` works but `dapr version` is the more commonly documented form that also shows the runtime version alongside the CLI version. Both are valid.
