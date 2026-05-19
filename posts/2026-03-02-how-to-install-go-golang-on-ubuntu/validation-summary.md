# Validation Summary: How to Install Go (Golang) on Ubuntu

## Status
validated

## Post Type
Tutorial / Installation Guide

## Technologies Covered
- Go (Golang) programming language
- Ubuntu Linux
- Bash shell environment configuration
- Go modules (`go mod`)
- Go tooling: `gopls`, `staticcheck`, `golangci-lint`, `go-cover-treemap`
- Snap package manager
- Multi-architecture installation (amd64, arm64, armv6l)

## Sources Consulted
- Official Go installation guide: https://go.dev/doc/install
- Go downloads page: https://go.dev/dl/
- Go modules reference: https://go.dev/ref/mod
- `go install` documentation: https://go.dev/ref/mod#go-install
- gopls repository: https://pkg.go.dev/golang.org/x/tools/gopls
- staticcheck documentation: https://staticcheck.dev/docs/getting-started/
- golangci-lint installation docs: https://golangci-lint.run/welcome/install/
- Snap store Go package: https://snapcraft.io/go
- Ubuntu package archive (golang, golang-go)

## Issues Found
1. **`golangci-lint` install path was outdated** — The post used `go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest`, which is the v1 module path. golangci-lint v2 (released March 2025) is hosted under a new module path `github.com/golangci/golangci-lint/v2`, and using `@latest` with the old path no longer resolves to the current version. Updated the install command to `go install github.com/golangci/golangci-lint/v2/cmd/golangci-lint@latest` and adjusted the inline comment to reflect the v2 module path requirement.

## Review Notes
- The post references Go 1.22 as "current at the time of writing." Although Go 1.22 is no longer current as of May 2026, the author explicitly tells readers to "always check for the actual latest" at go.dev/dl, and uses `${GO_VERSION}` as a variable throughout. The instructions remain accurate for whatever version the reader substitutes. Left as-is since the substitution pattern is correct.
- `/usr/local/go` is the official, documented install location per https://go.dev/doc/install.
- Removing the old `/usr/local/go` before extracting matches the official upgrade procedure.
- `GOPATH` defaulting to `$HOME/go` has been the default since Go 1.8, so the configuration shown is consistent with current Go behavior.
- The note that modules were introduced in Go 1.11 is correct.
- Snap install with `--classic` confinement is the documented installation method on the Snap store.
- ARM filenames (`linux-arm64.tar.gz`, `linux-armv6l.tar.gz`) match the actual download names on go.dev/dl.
- Note for future maintenance: the golangci-lint maintainers officially recommend installing via their install script rather than `go install`, but the `go install` path remains supported and functional with the corrected `/v2/` path.
