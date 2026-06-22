# Validation Summary: How to Modify Values While Iterating Over a Slice in Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- Go slices
- Go range loops
- Go pointers
- Go goroutines and closures
- Go maps
- Go generics

## Sources Consulted
- The Go Programming Language Specification: https://go.dev/ref/spec
- Go 1.22 Release Notes: https://go.dev/doc/go1.22
- Go Blog, "Fixing For Loops in Go 1.22": https://go.dev/blog/loopvar-preview

## Issues Found
- The goroutine loop-variable example described the old closure capture behavior as current behavior. Updated the text and comments to specify that this bug applies to Go 1.21 and earlier.
- The Go 1.22 goroutine fix heading said "Use Index" even though the example did not use an index. Renamed it to describe the actual fix: relying on per-iteration loop variables.
- The Go 1.22 explanation omitted the module/version caveat. Added that per-iteration loop variables apply to packages that declare `go 1.22` or later.
- The summary table listed Go 1.22 loop-variable semantics as if it were a way to modify slice elements. Clarified that it applies to goroutines and closures, not slice mutation.

## Review Notes
- The main slice mutation examples are consistent with the Go specification: ranging over a slice with two iteration variables produces the index and element value, and assigning to the element loop variable does not mutate the original slice element.
- The map iteration notes are broadly correct: map iteration order is unspecified, deletes are allowed during iteration, and entries added during iteration may or may not be visited.
- Local execution of the Go snippets was not possible because the `go` command is not installed in this environment.
