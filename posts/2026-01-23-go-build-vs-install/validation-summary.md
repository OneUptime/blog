# Validation Summary: How to Understand go build vs go install in Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- Go modules
- Go CLI commands: `go build`, `go install`, `go get`, `go clean`, `go env`
- Go build cache
- Cross-compilation with `GOOS` and `GOARCH`

## Sources Consulted
- Official Go command documentation for `go build`, `go install`, build flags, install destinations, build cache, and `go get`: https://pkg.go.dev/cmd/go
- Official Go modules reference for `go install` with version suffixes: https://go.dev/ref/mod#go-install
- Official Go GOPATH wiki for GOPATH mode background and install directories: https://go.dev/wiki/GOPATH
- Official Air repository for current install path: https://github.com/air-verse/air

## Issues Found
- The post said or implied that `go install` only targets the current platform. Official Go documentation says cross-compiled binaries are installed in `$GOOS_$GOARCH` subdirectories of the install directory, so the text now explains that `go install` can cross-compile but has a fixed output location and name.
- The post used `$GOBIN` in examples where `go env GOBIN` may be empty. The shell examples now fall back to `$(go env GOPATH)/bin` before listing or checking the install directory.
- The remote package section said installing a remote package without a version always errors in module mode. The text now states the more precise behavior: without a version, `go install` uses the current module context and works only when the package is available there.
- The build flags section implied full flag parity. It now notes that both commands share many build flags, but `go install` does not use `go build`'s `-o` output flag.
- The install script referenced the old Air module path `github.com/cosmtrek/air@latest`. It now uses the current official path `github.com/air-verse/air@latest`.

## Review Notes
The local environment did not have the `go` executable installed, so commands could not be verified with local `go help` output. The review was performed against official Go documentation and the current official Air repository.
