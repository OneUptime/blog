# Validation Summary: How to Optimize Dapr for Edge Computing Scenarios

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (self-hosted / slim mode)
- Edge computing (ARM devices: Raspberry Pi, NVIDIA Jetson)
- Go runtime tuning (GOMAXPROCS, GOMEMLIMIT, GOGC)
- SQLite (state store and local event queue)
- Python Dapr SDK
- Dapr Resiliency policies (retries, circuit breakers)

## Sources Consulted
- Dapr CLI reference for `dapr run`: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr CLI reference for `dapr init`: https://docs.dapr.io/reference/cli/dapr-init/
- Dapr arguments and annotations overview: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr SQLite state store documentation: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-sqlite/
- Dapr Resiliency documentation: https://docs.dapr.io/operations/resiliency/
- Dapr Python SDK reference: https://docs.dapr.io/developing-applications/sdks/python/
- Go build command documentation: https://pkg.go.dev/cmd/go#hdr-Compile_packages_and_dependencies
- Go runtime environment variables: https://pkg.go.dev/runtime

## Issues Found

### 1. `daprd` used instead of `dapr run` to launch an application
- **What was wrong:** The command block used `daprd ... -- python sensor_app.py`. The `daprd` binary is the Dapr sidecar runtime and does not launch application processes. The `-- <command>` syntax for launching an app alongside the sidecar is only available via `dapr run`.
- **What was changed:** Replaced `daprd` with `dapr run`.
- **Why:** `daprd` runs only the sidecar process; it does not accept `-- <command>` to start an application. `dapr run` is the CLI command that starts both the sidecar and the application together.

### 2. Broken bash syntax with inline comment after line continuation
- **What was wrong:** `--log-level error \   # Minimal logging` — a `\` followed by spaces and a `#` comment does not produce a valid line continuation. The `\` escapes the space rather than the newline, breaking the multi-line command.
- **What was changed:** Removed the inline comment. The line now reads `--log-level error \` with proper continuation.
- **Why:** In bash, `\` must be the very last character on a line (immediately before the newline) to act as a line continuation. Trailing spaces or comments after `\` break the continuation.

### 3. Deprecated `--components-path` flag
- **What was wrong:** The command used `--components-path ./components`, which is deprecated since Dapr CLI v1.13.
- **What was changed:** Replaced with `--resources-path ./components`.
- **Why:** `--components-path` was renamed to `--resources-path` to reflect that the directory can contain both component and resiliency definitions.

### 4. Invalid Go build tag negation syntax
- **What was wrong:** `go build -tags "!allcomponents"` — negated build tags via the `-tags` command-line flag are not standard or reliable Go syntax. Additionally, `allcomponents` is not a documented Dapr build tag.
- **What was changed:** Removed the `-tags "!allcomponents"` flag. The build command now uses only `-ldflags "-s -w"` to strip debug information and symbol tables. Updated the section title and description accordingly.
- **Why:** The Go `-tags` flag specifies tags that should be considered set/true. The `!` negation operator is used within `//go:build` source directives, not on the command line. Furthermore, Dapr does not expose a documented `allcomponents` build tag for selective component inclusion.

### 5. `GOARCH=arm64` presented as a runtime optimization
- **What was wrong:** `export GOARCH=arm64` was listed alongside runtime environment variables (`GOMAXPROCS`, `GOMEMLIMIT`, `GOGC`) as an "ARM-optimized Go setting". `GOARCH` is a compile-time variable used by the Go toolchain for cross-compilation; setting it at runtime has no effect on an already-compiled binary.
- **What was changed:** Removed the `GOARCH=arm64` line and updated the comment from "Use ARM-optimized Go settings" to "Tune Go runtime for constrained memory".
- **Why:** `GOARCH` only affects the Go compiler/linker at build time. On an ARM device, the binary is already compiled for the correct architecture. The remaining variables (`GOMAXPROCS`, `GOMEMLIMIT`, `GOGC`) are genuine runtime tunables.

## Review Notes
- The `--enable-metrics` flag syntax was changed from `--enable-metrics false` to `--enable-metrics=false` for clarity and to avoid ambiguity with boolean flag parsing.
- The Dapr Resiliency spec, SQLite state store component configuration, and Python SDK usage are all technically correct.
- The local-first architecture pattern (try cloud, fall back to local SQLite queue) is a sound approach for edge scenarios, though a production implementation would need a sync mechanism to drain the local queue when connectivity is restored.
- The `dapr init --slim` command and its description are accurate.
