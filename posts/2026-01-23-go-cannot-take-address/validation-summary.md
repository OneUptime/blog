# Validation Summary: How to Fix 'cannot take address of' Errors in Go

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Go
- Go pointers
- Go addressability rules
- Go maps
- Go generics

## Sources Consulted
- Go Language Specification - Variables: https://go.dev/ref/spec#Variables
- Go Language Specification - Address operators: https://go.dev/ref/spec#Address_operators
- Go Language Specification - Composite literals: https://go.dev/ref/spec#Composite_literals
- Go Language Specification - Index expressions: https://go.dev/ref/spec#Index_expressions
- Go Language Specification - Assignments: https://go.dev/ref/spec#Assignments
- Go 1.18 Release Notes - Generics: https://go.dev/doc/go1.18
- GitHub author profile URL: https://github.com/nawazdhandala
- OneUptime website URL: https://oneuptime.com

## Issues Found
- The opening explanation described non-addressable values as values that "don't have a memory address you can reference" and listed "literals" broadly. This was imprecise because Go permits taking the address of a composite literal as a documented exception. Changed the wording to "not addressable" and "basic literals."
- The map element scenario labeled `users["alice"].Age = 31` as a "cannot take address of" error. The expression is still invalid because map element fields are not assignable, but the compiler error is about assigning to a struct field in a map. Updated the comment to use the correct error category.
- The Mermaid diagram explained function return values as non-addressable because the "Stack Frame Gone." That is misleading in Go because returning a pointer to a local variable is valid when the variable escapes. Updated the diagram to describe function returns as non-addressable result expressions.
- The non-addressable list used "Literals" broadly. Updated it to "Basic literals" to avoid conflicting with Go's composite literal addressability exception.

## Review Notes
The local environment did not have the `go` command installed, so code snippets were reviewed against the official Go specification and release notes rather than compiled locally. The examples otherwise match current Go addressability rules, including pointer helper functions and Go 1.18+ generic helper syntax.
