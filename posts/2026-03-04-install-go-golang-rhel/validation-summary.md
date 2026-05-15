# Validation Summary: How to Install Go (Golang) on RHEL

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- Red Hat Enterprise Linux
- Red Hat Go Toolset
- Go programming language
- Go modules
- Go command-line tools
- Bash shell configuration

## Sources Consulted
- Official Go installation documentation: https://go.dev/doc/install
- Official Go downloads page: https://go.dev/dl/
- Official Go command documentation: https://pkg.go.dev/cmd/go
- Official Go GOPATH documentation: https://go.dev/wiki/GOPATH
- Red Hat Go 1.25 Toolset documentation: https://docs.redhat.com/en/documentation/red_hat_developer_tools/1/html/using_go_1.25_toolset/go-toolset

## Issues Found
- The Red Hat package install section used `sudo dnf install -y golang` as the AppStream path. Red Hat's current Go Toolset documentation recommends installing the `go-toolset` module on RHEL 8 and the `go-toolset` package on RHEL 9 and 10, so the install commands were updated.
- The official tarball example used Go `1.22.1`, which is no longer the current featured Go release. The version was updated to `1.26.3`, matching the official Go downloads page on 2026-05-15.
- The environment configuration exported `GOROOT=/usr/local/go` for all installs. This is unnecessary for the upstream tarball and can be wrong for Red Hat package installs, so the snippet now only adds `/usr/local/go/bin` and `$HOME/go/bin` to `PATH`.
- The update section still referenced the old AppStream `golang` package. It was updated to use the Red Hat Go Toolset package/module names.
- The final claim said Go compiles to static binaries by default. This is too broad because cgo and platform linking behavior can make binaries dynamically linked, so it was changed to the more accurate claim that Go compiles to native binaries.

## Review Notes
The Go code sample and common `go` commands are syntactically valid. The post still uses `~/go/src/hello` for the example project; this works with modules, but future updates could simplify it by creating the module outside the historical GOPATH-style `src` layout.
