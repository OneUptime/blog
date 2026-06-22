# Validation Summary: How to Set Up GOPATH vs GOROOT Correctly in Go

## Status
validated

## Post Type
Tutorial / Setup guide

## Technologies Covered
- Go
- Go modules
- GOPATH
- GOROOT
- GOBIN
- Go environment variables
- `go env`
- `go install`

## Sources Consulted
- Go command documentation: https://pkg.go.dev/cmd/go
- Go GOPATH wiki: https://go.dev/wiki/GOPATH
- Go modules reference: https://go.dev/ref/mod
- Go download and install documentation: https://go.dev/doc/install
- Go managing installations documentation: https://go.dev/doc/manage-install
- `golang.org/dl/go1.20.1` package documentation: https://pkg.go.dev/golang.org/dl/go1.20.1

## Issues Found
- The Homebrew GOROOT example used a version-specific Cellar path. Changed it to `/opt/homebrew/opt/go/libexec`, which is the stable Homebrew path users are more likely to see from `go env GOROOT`.
- The Windows GOROOT example used `C:\Go`. Changed it to `C:\Program Files\Go`, matching the current official installer default.
- The GOPATH default comment combined macOS and Linux under `/Users/username/go`. Changed it to `$HOME/go` for Unix-like systems and `%USERPROFILE%\go` for Windows, matching the Go command documentation.
- The `$GOPATH/pkg` description only mentioned `pkg/mod`. Expanded it to include `pkg/sumdb` and legacy package objects, matching current and GOPATH-mode behavior.

## Review Notes
The article is technically relevant and current for modern Go. The local environment did not have the `go` binary installed, so command behavior was validated against official Go documentation rather than local CLI output.
