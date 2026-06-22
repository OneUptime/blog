# Validation Summary: How to Avoid and Debug Nil Pointer Dereference Panics in Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- Go pointers and interfaces
- Go error handling
- Delve debugger
- NilAway
- Staticcheck
- golangci-lint / govet analyzers

## Sources Consulted
- Go Language Specification: https://go.dev/ref/spec
- Go FAQ, nil error values: https://go.dev/doc/faq#nil_error
- Go builtin package documentation: https://pkg.go.dev/builtin
- Go nilness analyzer documentation: https://pkg.go.dev/golang.org/x/tools/go/analysis/passes/nilness
- Delve CLI documentation: https://github.com/go-delve/delve/blob/master/Documentation/cli/README.md
- NilAway command documentation: https://pkg.go.dev/go.uber.org/nilaway/cmd/nilaway
- Staticcheck getting started documentation: https://staticcheck.dev/docs/getting-started/
- golangci-lint linters documentation: https://golangci-lint.run/docs/linters/
- golangci-lint linter settings documentation: https://golangci-lint.run/docs/linters/configuration/

## Issues Found
- The introduction said that accessing a field or method on a nil pointer causes a nil pointer dereference panic. Method calls on nil receivers can be valid if the method handles nil. Updated the wording to focus on dereferencing a nil pointer through field access.
- The "Interface Nil Checks Gone Wrong" example used a nil interface, so `logger != nil` would be false and the described panic path would not occur. Replaced it with a typed nil pointer stored in an interface, which correctly demonstrates the gotcha.
- The `findUser` example claimed that the returned user was guaranteed non-nil after checking `err`, but a map entry could exist with a nil `*User` value. Updated the function to treat missing or nil users as an error.
- The constructor example used `*Logger`, a pointer to an interface type. Updated it to use `Logger` directly, which is the idiomatic and technically appropriate form for an interface dependency.
- The interface nil gotcha example had contradictory comments saying an explicit `err.Error()` call would panic but also "Works but confusing." Corrected the comment and changed the diagnostic print to `%#v` to avoid invoking the nil receiver's `Error` method for the value display.
- The safe helper snippet declared `package safe` but then showed a `main` function in the same snippet calling `safe.Deref`, which would not compile inside package `safe`. Reworked the usage lines as comments showing usage from another package.
- The golangci-lint command used `--enable=nilness`, but `nilness` is not listed as a top-level golangci-lint linter; it is a Go analysis / govet analyzer. Updated the command to enable `govet` instead and clarified that nilness applies when enabled in govet settings.

## Review Notes
The local environment did not have the `go` binary installed, so snippets were reviewed against official documentation rather than compiled locally. The snippets are illustrative and still omit surrounding imports or definitions in a few places, which is acceptable for a blog post but could be expanded in the future for fully copy-pasteable examples.
