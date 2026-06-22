# Validation Summary: How to Bundle Static Resources Inside Go Binaries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- Go `embed` package
- Go build constraints and build tags
- `io/fs`
- `net/http`
- `html/template`
- JSON configuration with `encoding/json`
- SQL migrations with `database/sql`

## Sources Consulted
- Go `embed` package documentation: https://pkg.go.dev/embed
- Go command documentation for `go build` and `-tags`: https://pkg.go.dev/cmd/go
- Go build constraints documentation: https://pkg.go.dev/cmd/go/internal/help

## Issues Found
- The opening `string` example imported `embed` as a named import even though it did not reference `embed.FS`. Changed it to `_ "embed"` because the official documentation requires importing `embed`, and recommends a blank import when only using `string` or `[]byte`.
- The single-file `[]byte` example used `fmt.Printf` without importing `fmt`. Added the missing import.
- The directory `embed.FS` example used `fmt.Println` without importing `fmt`. Added the missing import.
- The `Recursive Embedding` example claimed `static/*` excludes files starting with `.` or `_`. Official documentation distinguishes glob patterns from directory-walk patterns: a named directory is walked recursively and excludes such files, while `all:` changes that directory-walk behavior. Changed the example to use `static` and `all:static`.
- The pattern-matching example described `config/**/*.json` as recursive. Go embed patterns use `path.Match`; `**` is not a recursive glob operator. Changed the example to `config/*/*.json` and described it as matching JSON files one directory below `config/`.

## Review Notes
The local environment did not have the `go` command installed, so snippets could not be compiled locally. Validation was performed against the official Go documentation. Some examples intentionally ignore returned errors for brevity, such as `http.ListenAndServe`, `ExecuteTemplate`, and `fs.Sub`; these are acceptable for a concise tutorial but could be improved in production-oriented examples.
