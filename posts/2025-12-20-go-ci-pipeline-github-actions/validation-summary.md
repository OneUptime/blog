# Validation Summary: How to Set Up Go CI Pipeline with GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go (Golang)
- GitHub Actions
- actions/setup-go, actions/checkout, actions/upload-artifact
- golangci-lint / golangci-lint-action
- Go test tooling (coverage, race detector)
- Codecov
- GoReleaser
- govulncheck, gosec
- PostgreSQL / Redis service containers

## Sources Consulted
- golangci-lint-action repo & version management — https://github.com/golangci/golangci-lint-action
- golangci-lint v2 migration guide — https://golangci-lint.run/docs/product/migration-guide/
- golangci-lint v2 configuration file reference — https://golangci-lint.run/docs/configuration/file/
- GoReleaser archives customization — https://goreleaser.com/customization/archives/
- GoReleaser v2 announcement / config version — https://goreleaser.com/blog/goreleaser-v2/
- actions/setup-go documentation — https://github.com/actions/setup-go

## Issues Found

1. **golangci-lint config used v1 format but the action requires v2 (critical).**
   The post uses `golangci/golangci-lint-action@v7`, which only supports golangci-lint **v2** (minimum v2.1.0). The accompanying `.golangci.yml`, however, was written in the v1 format and would fail to parse under v2. Specifically it: was missing the required `version: "2"` header; used the removed top-level `linters-settings` key (now `linters.settings`); used the removed `issues.exclude-rules` key (now `linters.exclusions.rules`); enabled `gosimple` (merged into `staticcheck` in v2) and `typecheck` (no longer a configurable linter in v2); and listed `gofmt`/`goimports` under `linters` (these moved to the dedicated `formatters` section in v2). I rewrote the config to valid v2 format: added `version: "2"`, moved settings to `linters.settings`, moved the test-file exclusion to `linters.exclusions.rules`, removed `gosimple` and `typecheck`, and moved `gofmt`/`goimports` into a `formatters` section.

2. **GoReleaser config declared `version: 1`.**
   The workflow installs the latest GoReleaser (v2) via `goreleaser-action@v6`. GoReleaser v2 recommends `version: 2` in the config (v1 only produces a deprecation warning, but the current/recommended value is 2). Changed `version: 1` to `version: 2`.

3. **GoReleaser `archives` used the deprecated `format` keys.**
   In GoReleaser v2 the singular `archives.format` and `format_overrides.format` are deprecated in favor of the plural `formats` (a list). Updated `format: tar.gz` to `formats: [tar.gz]` and the Windows override `format: zip` to `formats: [zip]`.

## Review Notes
- `actions/setup-go@v5`, `actions/checkout@v4`, `actions/upload-artifact@v4`, `goreleaser/goreleaser-action@v6`, `govulncheck`, and `securego/gosec@master` references are all current and correct.
- `codecov/codecov-action@v4` still works, though v5 is the current major version; not changed since v4 is not broken.
- Go 1.21/1.22 are used throughout. These are valid but no longer the newest releases; readers may wish to bump `GO_VERSION` to a current Go release. Left as-is since the versions are not incorrect.
- The coverage-threshold step relies on `bc`, which is preinstalled on GitHub-hosted `ubuntu-latest` runners, so the snippet works as written.
- The `errcheck`, `govet`, `staticcheck`, `unused`, and `ineffassign` linters retained in the v2 config are part of golangci-lint's default ("standard") set; listing them explicitly is harmless and intentional for clarity.
