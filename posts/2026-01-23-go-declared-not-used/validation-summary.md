# Validation Summary: How to Fix 'declared and not used' Errors in Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go local variable declarations
- Go blank identifier (`_`)
- Go range loops
- Go function parameters
- Go package-level variables
- Go build constraints / build tags

## Sources Consulted
- Go Language Specification: Declarations, scope, and blank identifier - https://go.dev/ref/spec
- Effective Go: Blank identifier and unused variables - https://go.dev/doc/effective_go
- Go FAQ: Unused variable/import compiler errors - https://go.dev/doc/faq
- Go command documentation: Build constraints - https://pkg.go.dev/cmd/go

## Issues Found
- The introduction said Go requires all declared variables to be used. This was too broad because unused function parameters and package-level variables are allowed. Updated the wording to specify local variables declared inside functions.
- The "Conditional Compilation" heading described a runtime `if debug` check, not conditional compilation. Renamed the heading to "Conditional Debug Code"; the separate build-tags example remains the conditional compilation example.

## Review Notes
The examples and explanations match the official Go documentation for unused variables, the blank identifier, function-parameter scope, package-level declarations, and build constraints. A local compile/run check could not be performed because the `go` binary is not installed in the review environment.
