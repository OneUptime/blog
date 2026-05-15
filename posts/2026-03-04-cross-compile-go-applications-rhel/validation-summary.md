# Validation Summary: How to Cross-Compile Go Applications on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- Go cross-compilation
- GOOS and GOARCH
- CGo
- RHEL
- GCC cross-compilers

## Sources Consulted
- Go source installation documentation for GOOS and GOARCH target environment variables: https://go.dev/doc/install/source
- Go cgo command documentation for CGO_ENABLED, CC, and cross-compilation requirements: https://pkg.go.dev/cmd/cgo
- Go linker documentation for `-X importpath.name=value`: https://go.dev/cmd/link/
- Red Hat Customer Portal note on RHEL 9 GCC user-space cross-compilation support: https://access.redhat.com/solutions/7130773
- Fedora package information for `gcc-aarch64-linux-gnu`, including its user-space limitation: https://packages.fedoraproject.org/pkgs/cross-gcc/gcc-aarch64-linux-gnu/

## Issues Found
- The post stated that binaries could be cross-compiled without extra toolchains. That is correct for pure Go applications, but not for CGo. Updated the wording to qualify this as pure Go / no extra C toolchains.
- The sample `-ldflags="-X main.version=..."` and `-X main.buildDate=...` examples referenced variables that were not declared in the sample application. Added `version` and `buildDate` string variables and included them in the HTTP response so the linker injection examples are meaningful.
- The CGo section recommended `sudo dnf install -y gcc-aarch64-linux-gnu` on RHEL. That package is not a stock supported RHEL user-space cross-compilation path, and the Fedora/EPEL package notes that user-space cross-building is not provided. Replaced the command with accurate guidance to install a supported cross-compiler and target C library headers appropriate to the enabled repositories, then use `CC=... CGO_ENABLED=1`.
- The closing sentence implied any platform was trivial from RHEL. Updated it to "many platforms" and scoped it to pure Go applications.

## Review Notes
The Go code and commands are otherwise current: `go tool dist list`, GOOS/GOARCH environment overrides, `CGO_ENABLED=0`, `go build -ldflags="-s -w"`, and the Windows `.exe` output naming are all technically valid.
