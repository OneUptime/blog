# Validation Summary: How to Use Go Workspaces for Monorepos

## Status
validated

## Post Type
Tutorial / Practical guide

## Technologies Covered
- Go (Golang) language toolchain (1.18+)
- Go modules (`go.mod`, `go.sum`)
- Go workspaces (`go.work`, `go.work.sum`)
- `go work` subcommands (`init`, `use`, `sync`, `edit`)
- GitHub Actions (`actions/checkout@v4`, `actions/setup-go@v5`)

## Sources Consulted
- Go module reference / workspaces: https://go.dev/ref/mod#workspaces
- `go work` command documentation: https://pkg.go.dev/cmd/go#hdr-Workspace_maintenance
- `go work use` reference: https://go.dev/ref/mod#go-work-use
- `go work edit` reference: https://go.dev/ref/mod#go-work-edit
- `go work sync` reference: https://go.dev/ref/mod#go-work-sync
- Go 1.18 release notes (workspaces introduction): https://go.dev/doc/go1.18
- GitHub Actions setup-go: https://github.com/actions/setup-go

## Issues Found

1. **Incorrect description of `go work use -r`** (under "### go work use").
   - **What was wrong:** The post claimed `cd oldservice && go work use -r .` is how you remove a module from the workspace, and described `go work use` as "Adds or removes modules from an existing workspace."
   - **Reality:** The `-r` flag in `go work use` is for *recursive search* — it walks subdirectories and adds every module (directory containing a `go.mod`) it finds to the workspace. It does not remove modules. The canonical way to drop a module from `go.work` is `go work edit -dropuse=<path>`. (`go work use` only implicitly drops a directive when the target directory no longer exists on disk.)
   - **Fix:** Updated the section heading sentence to "Adds modules to an existing workspace," replaced the misleading "Remove a module" example with a correct `-r` usage example (recursively adding modules under a subtree), and added a one-line pointer to `go work edit -dropuse` for removal — which is already documented later in the same section.

## Review Notes
- Other technical claims spot-checked and confirmed accurate:
  - Workspaces were introduced in Go 1.18 — correct.
  - `go.work` syntax (`go <version>`, `use ( ... )`) — correct.
  - `go work init [moddirs...]` — correct.
  - `go work sync` syncs the workspace build list back into per-module `go.mod` files via MVS — correct.
  - `go work edit` flags `-go=`, `-use=`, `-dropuse=` — correct (also supports `-replace`/`-dropreplace` and `-json`, not all of which are shown, which is fine).
  - `go work edit -json` prints the parsed workspace file as JSON — correct.
  - GitHub Actions versions (`actions/checkout@v4`, `actions/setup-go@v5`) — current and correct.
  - The `require github.com/myorg/myproject/shared v0.0.0` placeholder in `api/go.mod` is valid; the workspace overrides resolution locally.
- Minor stylistic notes (not changed, since they are not technical errors):
  - The Go version in the `go.mod`/`go.work` examples (`go 1.21`) is slightly behind the current stable Go release line as of mid-2026, but it remains valid and supported. Readers should bump to whatever their target Go version is.
  - The post correctly recommends `.gitignore`'ing `go.work` and `go.work.sum` for libraries/published modules — this matches Go's own guidance.
