# Validation Summary: How to Profile and Reduce Go Binary Size

## Status
validated

## Post Type
Technical guide/tutorial

## Technologies Covered
- Go compiler and linker
- Go modules and dependency analysis
- Docker multi-stage builds
- UPX executable compression
- TinyGo
- WebAssembly
- GitHub Actions

## Sources Consulted
- Go `cmd/nm` documentation: https://pkg.go.dev/cmd/nm
- Go `cmd/link` documentation: https://pkg.go.dev/cmd/link
- Go `cmd/go` documentation: https://pkg.go.dev/cmd/go
- Go `log/slog` package documentation: https://pkg.go.dev/log/slog
- Go `net/http` package documentation: https://pkg.go.dev/net/http
- TinyGo Linux install documentation: https://tinygo.org/getting-started/install/linux/
- TinyGo Docker documentation: https://tinygo.org/getting-started/install/using-docker/
- TinyGo build options documentation: https://tinygo.org/docs/reference/usage/important-options/
- TinyGo language and standard-library support documentation: https://tinygo.org/docs/reference/lang-support/stdlib/
- TinyGo WebAssembly documentation: https://tinygo.org/docs/guides/webassembly/wasm/
- UPX homepage and documentation: https://upx.github.io/
- UPX command manual: https://manpages.debian.org/unstable/upx-ucl/upx-ucl.1.en.html
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- Docker Official Go image tags: https://hub.docker.com/_/golang/tags
- Alpine Linux releases: https://alpinelinux.org/releases/
- GitHub Actions `setup-go` documentation: https://github.com/actions/setup-go

## Issues Found
- The opening sentence said Go produces statically linked binaries unconditionally. Updated it to say Go can produce self-contained binaries, because cgo and platform-specific linking can make the original statement too broad.
- `go tool nm` examples sorted with external `sort` on space-delimited output, which is unreliable for `nm` output. Replaced those examples with `go tool nm -size -sort size`.
- The sample `go tool nm -size` output omitted the size field and showed decimal-looking addresses. Updated it to match the documented address, size, type, and name fields.
- The `go build -x` description claimed it showed package sizes. Changed it to say it shows build commands.
- The `-X main.version=...` linker example was described as a size optimization. Clarified that it embeds metadata and requires a package-level string variable.
- The Docker UPX example copied CA certificates but did not explicitly install `ca-certificates`. Added it to the Alpine builder package install.
- `go list -m all` was described as listing direct dependencies. Changed the description to modules in the build list.
- A dependency command was described as calculating size impact, but it only listed imported packages. Corrected the description.
- The `analyze-deps.go` example imported `sort` without using it and listed only local packages. Removed the unused import and changed the command to `go list -deps`.
- TinyGo installation examples used outdated `0.30.0` artifacts. Updated them to the current documented `0.41.1` examples.
- Docker and GitHub Actions examples used outdated Go 1.21-era image/action versions. Updated examples to Go 1.26, Alpine 3.24, `actions/checkout@v6`, and `actions/setup-go@v6`.
- The Makefile and CI symbol-analysis examples analyzed stripped binaries, which remove the symbol table needed by `go tool nm`. Changed them to analyze unstripped build artifacts.

## Review Notes
The post is technically relevant and useful. Some recommendations, such as dependency alternatives and UPX suitability, are context-dependent and should be benchmarked for each project, but the corrected guidance is technically sound.
