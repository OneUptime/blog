# Validation Summary: How to Implement Request Validation with Go-Playground

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- go-playground/validator v10
- Gin
- Echo v4
- HTTP request validation

## Sources Consulted
- go-playground/validator v10 package documentation: https://pkg.go.dev/github.com/go-playground/validator/v10
- Gin model binding and validation documentation: https://gin-gonic.com/en/docs/binding/binding-and-validation/
- Gin custom validators documentation: https://gin-gonic.com/en/docs/binding/custom-validators/
- Echo request validation documentation: https://echo.labstack.com/docs/request
- Echo v4 package documentation: https://pkg.go.dev/github.com/labstack/echo/v4

## Issues Found
- The Gin integration example registered `validatePhoneNumber` but did not define that function in the standalone code block. I added the validator function and a `Phone` field using `binding:"required,phone"` so the registered custom validator is used and the snippet is internally consistent.
- The Echo integration example referenced `CreateUserRequest` without defining it in the standalone code block. I added the struct to the Echo example.
- The Echo example needs go-playground/validator tags, not Gin `binding` tags, because Echo calls the configured validator directly through `Validate(i interface{}) error`. I defined the Echo request struct with `validate` tags.

## Review Notes
- The current go-playground/validator documentation recommends `validator.New(validator.WithRequiredStructEnabled())` for new users because this opt-in behavior will become the default in v11. The post's use of `validator.New()` remains valid for v10, so no change was required.
- I could not compile the Go snippets locally because the `go` toolchain is not installed in this environment. The examples were reviewed against official package and framework documentation.
