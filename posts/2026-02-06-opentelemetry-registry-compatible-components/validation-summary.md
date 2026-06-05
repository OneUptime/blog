# Validation Summary: How to Use the OpenTelemetry Registry to Find Compatible Components

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Registry
- OpenTelemetry Collector
- OpenTelemetry Collector Builder (`ocb`)
- OpenTelemetry Collector core and contrib components
- Go modules
- GitHub CLI and GitHub REST/Search APIs
- Bash scripting
- YAML collector builder manifests

## Sources Consulted
- OpenTelemetry Registry: https://opentelemetry.io/ecosystem/registry/
- OpenTelemetry custom Collector builder documentation: https://opentelemetry.io/docs/collector/extend/ocb/
- OpenTelemetry Collector builder package documentation: https://pkg.go.dev/go.opentelemetry.io/collector/cmd/builder
- OpenTelemetry Collector receiver component list and stability table: https://opentelemetry.io/docs/collector/components/receiver/
- OpenTelemetry Collector processor component list and stability table: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector extension component list and stability table: https://opentelemetry.io/docs/collector/components/extension/
- Go modules reference: https://go.dev/ref/mod
- GitHub CLI `gh api` manual: https://cli.github.com/manual/gh_api
- GitHub issue and pull request search documentation: https://docs.github.com/en/search-github/searching-on-github/searching-issues-and-pull-requests
- GitHub REST commits API documentation: https://docs.github.com/en/rest/commits/commits

## Issues Found
- The registry filter list was outdated. The post said the registry filters by source and stability, but the current registry exposes Language, Type, and Flags filters. Updated the filter list and PostgreSQL search steps accordingly.
- The post said the registry page shows signal stability. The registry exposes version, language, component type, license, package details, documentation, and repository links, while signal stability is documented in component documentation and component lists. Updated that explanation.
- The GitHub API health script used `open_issues_count` as an issue count. That repository field can be misleading when the intent is to exclude pull requests, so the script now uses GitHub issue search with `is:issue is:open`.
- The GitHub API health script counted only the first page of recent commits. Added `--paginate` and counted returned commit SHAs so active repositories are not capped at 100 commits.
- The third-party component compatibility command used `go list -m -json`, which does not show a module's `go.mod` requirements. Replaced it with `go mod download -json`, then reading the downloaded `GoMod` file and grepping for OpenTelemetry Collector module requirements.
- Several manifest comments labeled component stability too broadly or incorrectly. Removed broad stability labels for hostmetrics and PostgreSQL, changed the filter processor label to Alpha, and changed the health check extension label to Alpha based on current OpenTelemetry component stability docs.
- The "new components" script claimed to list directories added in the last 90 days, but it actually lists recent commits under component paths. Updated the wording and changed the grep invocation to `grep -Ei` for clearer extended-regex syntax.

## Review Notes
- The examples intentionally keep `v0.96.0` as a versioned example. Current registry entries show newer releases, but the post's compatibility guidance is version-specific and still valid when all core and contrib component versions are aligned with the chosen Collector release line.
