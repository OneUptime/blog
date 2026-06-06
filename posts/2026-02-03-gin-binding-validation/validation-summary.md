# Validation Summary: How to Use Gin Binding for Request Validation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- Gin web framework (github.com/gin-gonic/gin)
- go-playground/validator v10 (github.com/go-playground/validator/v10)
- HTTP request validation patterns (JSON body, form, URI, query, header binding)

## Sources Consulted
- Gin Context source code: https://github.com/gin-gonic/gin/blob/master/context.go
- Gin official README & binding examples: https://github.com/gin-gonic/gin
- go-playground/validator v10 docs: https://pkg.go.dev/github.com/go-playground/validator/v10
- validator baked-in validation tags reference: https://github.com/go-playground/validator#baked-in-validations

## Issues Found

**Issue 1: Non-existent `MustBindJSON` method**

The post referenced `c.MustBindJSON(&req)` and an "MustBind*" family of methods. This is incorrect — Gin's public API has no `MustBindJSON` (or `MustBindQuery`, `MustBindUri`, etc.). The methods that auto-abort with HTTP 400 on failure are named without the "Must" prefix:

- `c.Bind(obj)`, `c.BindJSON(obj)`, `c.BindQuery(obj)`, `c.BindUri(obj)`, `c.BindHeader(obj)`, `c.BindXML(obj)`, etc.

Internally these all delegate to `c.MustBindWith(obj, binding.X)` (the only public method that does carry the "Must" prefix, and that one takes an explicit binding argument).

**Fix applied:**
- Changed section heading "ShouldBind vs MustBind" → "ShouldBind vs Bind"
- Changed table row "`MustBind*` | Aborts with 400..." → "`Bind*` | Aborts with 400..."
- Changed subsection heading "### MustBind - Automatic Error Response" → "### Bind - Automatic Error Response"
- Changed code call `c.MustBindJSON(&req)` → `c.BindJSON(&req)` and the surrounding comment from "MustBindJSON calls..." → "BindJSON calls..."
- Changed final summary table row "ShouldBind vs MustBind" → "ShouldBind vs Bind"

All other technical content was verified accurate, including:
- `ShouldBindJSON`, `ShouldBind`, `ShouldBindQuery`, `ShouldBindUri`, `ShouldBindHeader` method names
- `header:"…"`, `uri:"…"`, `form:"…"`, `json:"…"` struct tag usage
- Validator v10 tag names (`required`, `email`, `min`, `max`, `gte`, `lte`, `gt`, `lt`, `len`, `url`, `uuid`, `alpha`, `alphanum`, `oneof`, `omitempty`, `dive`, `keys`, `endkeys`, `eqfield`, `gtfield`)
- `binding.Validator.Engine().(*validator.Validate)` access pattern
- `RegisterValidation(tag, fn)` and `RegisterStructValidation(fn, structType)` signatures
- `validator.FieldLevel` / `validator.StructLevel` / `validator.FieldError` interfaces
- `sl.ReportError(field, fieldName, structFieldName, tag, param)` signature
- That `BindJSON` (and friends) call `c.AbortWithError(http.StatusBadRequest, err)` via `MustBindWith`

## Review Notes

- The `RegisterValidation` calls in the code samples ignore the returned `error`. This is fine for tutorial brevity but production code should check it.
- The struct-level `ReportError` example passes a numeric value for the `fl.Field()` interface; semantically this works because `ReportError` accepts `interface{}` for the field value, though it does not actually re-validate that field — it just records a violation. This is correct usage but a subtle point not explained in the post.
- `ShouldBind` and `c.Request.Body` are consumed once; the post sequences `ShouldBindUri` → `ShouldBindQuery` → `ShouldBindJSON`, which is correct because only the JSON call reads the body. If a user later tried to call `ShouldBindJSON` twice, they would need `ShouldBindBodyWith`. Not strictly an error in the post, just a caveat readers should be aware of.
- The post does not pin specific Gin or validator versions. As of this review, Gin v1.10.x and validator v10 are the relevant current releases, and all referenced APIs are stable in those versions.
