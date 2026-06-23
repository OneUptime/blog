# Validation Summary: How to Mock External APIs in Go Tests with httptest and gomock

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- Go testing package
- net/http and net/http/httptest
- net/url
- go.uber.org/mock/gomock
- go.uber.org/mock/mockgen

## Sources Consulted
- Go net/http/httptest package documentation: https://pkg.go.dev/net/http/httptest
- Go net/url package documentation: https://pkg.go.dev/net/url
- Go go generate command documentation: https://pkg.go.dev/cmd/go#hdr-Generate_Go_files_by_processing_source
- gomock package documentation: https://pkg.go.dev/go.uber.org/mock/gomock
- mockgen command documentation: https://pkg.go.dev/go.uber.org/mock/mockgen
- uber-go/mock README: https://github.com/uber-go/mock
- Go testing tutorial: https://go.dev/doc/tutorial/add-a-test

## Issues Found
- The initial weather client import block included test-only packages that would be unused in that standalone production-code snippet. Removed the unused imports and added `net/url`.
- The weather client interpolated the city directly into a query string. Updated it to use `url.QueryEscape(city)` so city names with spaces or special characters are encoded correctly.
- The payment service example used `fmt.Sprintf` but did not import `fmt`, while importing `errors` in a block where it was unused. Replaced that import with `fmt`.
- The gomock examples manually called `ctrl.Finish()` after `gomock.NewController(t)`. Current `go.uber.org/mock/gomock` documentation states that passing `*testing.T` registers cleanup automatically and that `Finish` is not idempotent, so the manual `Finish` calls were removed.
- The dependency injection example referenced `InventoryService` without defining it. Added a minimal interface definition for the example.
- The hardcoded HTTP-client anti-pattern example assigned `resp, err` and did not use either variable. Changed it to return the error from the request.
- The fixture example still returned a removed controller field after cleanup changes. Removed that stale field assignment.

## Review Notes
- The main guidance is technically correct: `httptest.Server` is appropriate for HTTP-level tests, and gomock/mockgen are appropriate for interface-based mocks.
- I could not compile the snippets locally because the workspace environment does not have the `go` command on `PATH`; validation was performed against official documentation and by static review of the examples.
