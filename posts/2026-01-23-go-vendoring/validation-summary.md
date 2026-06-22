# Validation Summary: How to Use Vendoring in Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- Go modules
- Go vendoring
- `go` command-line tooling
- GitHub Actions
- Private Go modules

## Sources Consulted
- Go Modules Reference: https://go.dev/ref/mod
- Go command documentation: https://pkg.go.dev/cmd/go
- go.mod file reference: https://go.dev/doc/modules/gomod-ref
- GitHub Actions setup-go README: https://github.com/actions/setup-go
- GitHub Actions checkout README: https://github.com/actions/checkout

## Issues Found
- `go mod verify` was described as verifying that `vendor/` matches `go.mod`. The Go Modules Reference states that `go mod verify` checks downloaded modules in the module cache, not vendored files. Replaced those vendor-check examples with `go list -mod=vendor ./...` and updated the summary table and Makefile target.
- The post implied that a `go.mod` comment could force vendor mode. Go 1.14+ uses `vendor/` automatically when the module's `go` directive is `1.14` or higher and `vendor/` exists; otherwise `-mod=vendor` or `GOFLAGS` can force it. Updated the text and comment.
- The `main.go` example used `http.ResponseWriter` and `*http.Request` without importing `net/http`. Added the missing import.
- The partial vendoring section implied that `go mod vendor` can vendor a specific module. Official Go tooling vendors all packages needed to build and test the main module. Reworded the section to clarify that selective vendoring is not supported and manual deletion is fragile.
- The debugging command `go list -m -json all | jq '.Path'` did not identify which module provides a specific package. Replaced it with a package-specific `go list` format that prints the package's module path and version.
- The GitHub Actions workflow used older action major versions. Updated `actions/checkout` and `actions/setup-go` to the current official major version examples.

## Review Notes
The local environment did not have the `go` binary installed, so command behavior was verified against official Go documentation rather than local `go help` output.
