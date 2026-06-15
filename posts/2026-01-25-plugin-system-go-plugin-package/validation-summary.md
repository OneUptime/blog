# Validation Summary: How to Build a Plugin System with Go's plugin Package

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- Go standard library `plugin` package
- Go `go build` command
- Dynamic loading with `-buildmode=plugin`
- Plugin lifecycle and interface contracts

## Sources Consulted
- Go standard library `plugin` package documentation: https://pkg.go.dev/plugin
- Go command build modes documentation: https://pkg.go.dev/cmd/go#hdr-Build_modes

## Issues Found
- The `contract` package example used `context.Context` without importing the `context` package. Added `import "context"` so the code snippet is syntactically correct.
- The post described `Shutdown` as running before a plugin unloads, but Go plugins cannot be closed or unloaded once opened. Changed the wording to say shutdown runs before the application exits or stops using the plugin.
- The post described plugins as shared objects compiled with `-buildmode=plugin` but did not state that this build mode applies to `main` packages. Clarified that a Go plugin is compiled from a `main` package, matching the Go command documentation.
- The compatibility note only mentioned Go version and platform. Expanded it to include the same toolchain version, build tags, relevant flags, environment settings, and common dependency source, matching the official `plugin` package warnings.
- The no-unloading pitfall said hot reload is impossible without restart. Refined it to the precise limitation: an already opened plugin at the same path cannot be unloaded or replaced, so hot reload requires new plugin filenames or a restart.

## Review Notes
- The main loading pattern using `plugin.Open`, `Lookup`, and a type assertion to `*contract.Plugin` is consistent with the Go documentation because `Lookup` returns a pointer to exported variables.
- The local environment did not have the `go` binary installed, so command execution and compilation checks could not be run locally. The review was performed against the official Go documentation.
