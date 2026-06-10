# Validation Summary: How to Use Go Embed for Static File Bundling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go (Golang) 1.16+
- Go `embed` package (`//go:embed` directive)
- `embed.FS` type
- `io/fs` package (`fs.FS`, `fs.Sub`, `fs.WalkDir`, `os.DirFS`)
- `net/http` (`http.FileServer`, `http.FS`, `http.StripPrefix`)
- `html/template` (`template.ParseFS`, `template.Must`)
- `encoding/json`
- Go build tags / build constraints (`//go:build`)
- `go list` tooling

## Sources Consulted
- Official `embed` package documentation: https://pkg.go.dev/embed
- Go 1.16 release notes: https://go.dev/doc/go1.16
- Go 1.18 release notes: https://go.dev/doc/go1.18 (for `all:` prefix verification)
- `io/fs` package documentation: https://pkg.go.dev/io/fs
- `html/template` package documentation: https://pkg.go.dev/html/template
- `net/http` package documentation: https://pkg.go.dev/net/http

## Issues Found
- **Incorrect Go version requirement for `go list` EmbedFiles field**: The post claimed `go list -f '{{.EmbedFiles}}' ./...` "requires Go 1.18+". This is incorrect — the `EmbedFiles`/`EmbedPatterns` fields on the `Package` struct were added in Go 1.16, alongside the introduction of the `embed` package itself (confirmed in the Go 1.16 release notes). Changed the comment to "requires Go 1.16+".

## Review Notes
- The claim that `embed` was introduced in Go 1.16 is correct (March 2021).
- The `all:` prefix description is correct — it was added in Go 1.18 to include files starting with `.` or `_`. The post doesn't explicitly call out the 1.18 requirement for `all:`, but since the post targets a general modern Go audience, this is acceptable.
- The `//go:build` build constraint syntax shown is the modern form introduced in Go 1.17 (replacing `// +build`). For code that needs to support Go 1.16 specifically, both forms would be needed, but using only `//go:build` is the modern best practice.
- All code examples are syntactically correct and use current, non-deprecated APIs.
- The `//go:embed` directive syntax rules described (no space between `//` and `go:embed`, must directly precede a var declaration, valid target types are `string`, `[]byte`, `embed.FS`) are all accurate per the official docs.
- The note about needing a blank import of `embed` when embedding into `string` or `[]byte` is correct.
- `fs.Sub`, `fs.WalkDir`, `os.DirFS`, `http.FS`, and `template.ParseFS` were all added in Go 1.16 and are used correctly in the examples.
- The default behavior of skipping files starting with `.` or `_` is accurately described.
- Tips on minification, image compression, and binary size considerations are reasonable and not technology-version-specific.
