# Validation Summary: How to Bundle Static Assets into Go Binaries with go:embed

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- `embed` package and `//go:embed` directive
- `embed.FS` and `io/fs`
- `net/http` static file serving
- `html/template`
- Go build tags

## Sources Consulted
- Official Go `embed` package documentation: https://pkg.go.dev/embed
- Official Go `go/build` package documentation for build constraints: https://pkg.go.dev/go/build
- Official Go command build constraints documentation: https://pkg.go.dev/cmd/go#hdr-Build_constraints
- Official Go `net/http` package documentation for `http.FS` and `http.FileServer`: https://pkg.go.dev/net/http
- Official Go `html/template` package documentation: https://pkg.go.dev/html/template
- Official Go `io/fs` package documentation: https://pkg.go.dev/io/fs

## Issues Found
- The pattern matching section described `dir/*` as "all files in a directory (not recursive)." The official `embed` documentation specifies that patterns use `path.Match`; if a glob pattern matches a directory entry, the directory's subtree is embedded, excluding names beginning with `.` or `_` unless `all:` is used. Updated the wording to say `dir/*` matches direct entries and that matched directories include their non-hidden subtrees.

## Review Notes
The code examples use current standard library APIs introduced in Go 1.16, including `embed.FS`, `fs.Sub`, `http.FS`, and `template.ParseFS`. The build tag examples use the modern `//go:build` syntax. The local environment did not have the `go` command installed, so examples were reviewed against official documentation rather than compiled locally.
