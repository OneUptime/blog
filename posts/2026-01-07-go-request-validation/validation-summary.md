# Validation Summary: How to Implement Request Validation in Go with go-playground/validator

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- go-playground/validator/v10
- go-playground/universal-translator
- Gin binding and validation
- Echo request binding and validation
- net/http JSON request handling

## Sources Consulted
- go-playground/validator v10 package documentation: https://pkg.go.dev/github.com/go-playground/validator/v10
- go-playground/validator GitHub repository: https://github.com/go-playground/validator
- go-playground/universal-translator package documentation: https://pkg.go.dev/github.com/go-playground/universal-translator
- go-playground/validator English translations package documentation: https://pkg.go.dev/github.com/go-playground/validator/v10/translations/en
- Gin model binding and validation documentation: https://gin-gonic.com/en/docs/binding/binding-and-validation/
- Gin custom validators documentation: https://gin-gonic.com/en/docs/binding/custom-validators/
- Echo request validation documentation: https://echo.labstack.com/guide/request/

## Issues Found
- The string validation example used `validate:"regexp=^[a-z0-9-]+$"`, but `regexp` is not a built-in go-playground/validator/v10 validation tag. Replaced it with the documented built-in `printascii` tag and updated the comment.
- The conditional validation example said `Country` was required if any listed field was present, but used `required_with_all`, which requires all listed fields to be present. Changed the tag to `required_with=City Street` to match the comment.
- The `inList` custom validator comment described a comma-separated list, but the implementation and validation tag use semicolon-separated values. Updated the comment.
- The `time.Time` examples used `required` on non-pointer struct fields. In validator v10 this behavior is opt-in, so the examples now use `validator.New(validator.WithRequiredStructEnabled())` where those `required` tags matter.
- The Gin custom validator implemented a local `contains` helper that only worked correctly for single-character substrings. Replaced it with `strings.Contains`.

## Review Notes
- The container did not have the Go toolchain installed, so code examples were reviewed against official documentation and static inspection rather than compiled locally.
- Some best-practices code blocks are illustrative fragments rather than complete standalone programs.
