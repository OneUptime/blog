# Validation Summary: How to Create Custom JSON Marshaler in Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- encoding/json
- Custom JSON marshaling and unmarshaling
- time.Time and Unix timestamps
- Enum-style constants
- Struct tags and omitempty

## Sources Consulted
- Go encoding/json package documentation: https://pkg.go.dev/encoding/json
- Go strings package documentation: https://pkg.go.dev/strings
- Go x/text/cases package documentation: https://pkg.go.dev/golang.org/x/text/cases

## Issues Found
- The post used `strings.Title`, which is deprecated in the Go standard library because its word-boundary handling does not handle Unicode punctuation properly. Changed the example to use `cases.Title(language.Und).String(u.Name)`, matching the official recommendation to use `golang.org/x/text/cases`.
- The `omitempty` comments incorrectly said an empty slice is not omitted and only nil maps are omitted. The official `encoding/json` documentation defines empty values to include arrays, slices, maps, and strings of length zero. Updated the comments to state that nil and empty slices/maps are omitted.
- The post described custom marshaling as applying to any type implementing the interfaces without mentioning the marshaling nil-pointer exception. Updated the wording to match `encoding/json` behavior for non-nil `Marshaler` values and `Unmarshaler` targets.
- The post referred to the recursion-avoidance pattern as `type Alias`; in Go, `type Alias User` defines a new local type rather than a true type alias. Clarified the wording as the local `type Alias User` pattern.

## Review Notes
The code blocks are illustrative fragments rather than complete standalone programs, so imports are not shown. With the referenced packages imported, the examples use current APIs and align with the official `encoding/json` behavior.
