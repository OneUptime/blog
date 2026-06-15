# Validation Summary: How to Build Custom Struct Validators with Field Tags in Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- Go struct tags
- Go reflection
- Standard library packages: `reflect`, `regexp`, `strconv`, `strings`, `errors`, `fmt`, `unicode`
- Runtime data validation

## Sources Consulted
- Go `reflect` package documentation: https://pkg.go.dev/reflect
- Go language specification, struct tags: https://go.dev/ref/spec
- Go `regexp` package documentation: https://pkg.go.dev/regexp
- Go `strconv` package documentation: https://pkg.go.dev/strconv
- Go `strings` package documentation: https://pkg.go.dev/strings

## Issues Found
- The custom-rule and complete-example snippets referenced `validator.New()` and `validator.ValidationErrors` without importing the validator package. Added an illustrative module import path, `example.com/myapp/validator`, so the examples are syntactically complete once adapted to the reader's module path.
- The `validateMin` and `validateMax` comments described numeric validation generally, but the implementation only handles signed integer kinds plus string and collection lengths. Updated the comments to say signed integers.
- The text described validating "embedded structs", which has a specific meaning in Go. The code validates nested struct fields using a `dive` tag, so the wording was changed to "nested structs".
- The nested validation code used `strings.Contains(tag, "dive")`, which could match unrelated rule names containing that substring. Added a `hasRule` helper that parses comma-separated tag rules and checks for an exact rule name.
- The original comment said unexported fields cannot be validated via reflection. Reflection can inspect some unexported values, but converting them with `Interface` can panic. Updated the comment to describe the actual reason for skipping them.

## Review Notes
The examples use a deliberately simple email regular expression and a compact validator design. That is acceptable for a tutorial, but production systems often need more complete email handling, richer nested pointer/slice behavior, and cached parsed tags for high-throughput validation.
