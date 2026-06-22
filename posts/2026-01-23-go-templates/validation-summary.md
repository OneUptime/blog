# Validation Summary: How to Use text/template and html/template in Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- `text/template`
- `html/template`
- Go standard library template functions
- Go HTTP handlers

## Sources Consulted
- Go `text/template` package documentation: https://pkg.go.dev/text/template
- Go `html/template` package documentation: https://pkg.go.dev/html/template
- Go `strings` package documentation: https://pkg.go.dev/strings
- Go `net/http` package documentation: https://pkg.go.dev/net/http

## Issues Found
- The custom functions example used `strings.Title`, which is deprecated because its word-boundary handling is not Unicode-correct. I replaced it with non-deprecated `strings.TrimSpace` while preserving the custom function and pipeline chaining examples.
- The HTML auto-escaping example said both the script tags and `javascript:` URL are escaped. In `html/template`, unsafe URL contexts are filtered to a safe replacement such as `#ZgotmplZ`, so I changed the comment to say the URL is filtered.
- The summary said `template.Must()` provides compile-time validation. Templates are parsed at runtime, and `template.Must()` panics if parsing returns an error, so I changed the wording to "fail fast when parsing templates."

## Review Notes
The examples use valid current APIs after the fixes. The workspace does not have the Go toolchain installed, so validation was performed against official Go documentation rather than by compiling the snippets locally.
