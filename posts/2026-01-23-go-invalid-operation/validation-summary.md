# Validation Summary: How to Fix 'invalid operation' Errors in Go

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Go
- Go compiler type checking
- Go standard library packages: `reflect`, `slices`, `maps`, `strings`, `fmt`

## Sources Consulted
- Go Language Specification: https://go.dev/ref/spec
- Go Language Specification, Operators: https://go.dev/ref/spec#Operators
- Go Language Specification, Comparison operators: https://go.dev/ref/spec#Comparison_operators
- Go Language Specification, Index expressions: https://go.dev/ref/spec#Index_expressions
- Go `reflect.DeepEqual` documentation: https://pkg.go.dev/reflect#DeepEqual
- Go `slices.Equal` documentation: https://pkg.go.dev/slices#Equal
- Go `maps.Equal` documentation: https://pkg.go.dev/maps#Equal
- Go 1.21 release notes: https://go.dev/doc/go1.21

## Issues Found
- The common examples described `s == []int{}` as "cannot compare slice with nil", but the code compares a slice to a non-nil slice literal. Updated the comment to say slices can only be compared to `nil`.
- The common examples referred to `x < y` while the code uses `a < b`. Updated the comment to match the code.
- Two problem snippets used `fmt.Println` without importing `fmt`, which would introduce an unrelated `undefined: fmt` error. Added the missing imports.
- The invalid index example used an inaccurate map-index error message. Updated the comment to reflect that `0` is not assignable to the map's `string` key type.
- The string example said strings cannot be sliced, but Go strings can be indexed and sliced; they cannot be assigned through. Replaced the commented-out assignment with the actual invalid assignment and corrected the error comment.
- The operator summary omitted valid comparison operators such as `!=`, `<=`, and `>=`, omitted integer `&^`, and said slices/maps support only `==` with `nil` while `!= nil` is also valid. Updated the table.

## Review Notes
The local environment did not have the `go` command installed, so examples were reviewed against official Go documentation rather than compiled locally.
