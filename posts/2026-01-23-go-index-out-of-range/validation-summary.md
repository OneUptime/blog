# Validation Summary: How to Fix 'index out of range' Panics in Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- Go arrays, slices, and strings
- Go generics
- Go panic and recover

## Sources Consulted
- Go Language Specification: Index expressions - https://go.dev/ref/spec#Index_expressions
- Go Language Specification: Slice expressions - https://go.dev/ref/spec#Slice_expressions
- Go Language Specification: For statements with range clause - https://go.dev/ref/spec#For_statements
- Go Blog: Defer, Panic, and Recover - https://go.dev/blog/defer-panic-and-recover

## Issues Found
- The initial panic example used `nums[-1]` as a runtime panic example. In Go, a constant negative index is invalid at compile time because constant indices must be non-negative. Removed that line and changed the positive out-of-range access to use a variable index, which correctly demonstrates a runtime bounds panic for a slice.
- The string rune access example checked only `index < len(runes)`. A negative index would pass that condition and still panic. Added `index >= 0` to match the safe byte-index check above it.
- The slice bounds example did not clamp a negative `end` value before slicing. Added an `end < 0` guard so the demonstrated safe slicing pattern preserves valid bounds before evaluating `nums[start:end]`.

## Review Notes
Local compilation was not available because the `go` command is not installed in this environment. The examples were reviewed against the official Go specification and panic/recover documentation instead.
