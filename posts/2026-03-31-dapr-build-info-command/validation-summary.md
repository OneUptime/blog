# Validation Summary: How to Use the dapr build-info Command

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Dapr CLI (`dapr build-info` command)
- Dapr runtime (`daprd`)
- Bash scripting
- jq (JSON processor)
- diff (file comparison)

## Sources Consulted
- Dapr CLI source code on GitHub: https://github.com/dapr/cli (specifically `cmd/buildinfo.go` and `pkg/standalone/version.go`)
- Dapr CLI command reference: `cmd/version.go` for comparison with `dapr version`

## Issues Found

1. **Incorrect output fields in Basic Usage**: The post claimed `dapr build-info` outputs `Version`, `Commit`, `Date`, `Go version`, and `Os/Arch` in a flat format. The real output has two sections (`CLI:` and `Runtime:`) each with `Version`, `Git Commit`, and `Git Version`. Fields `Date`, `Go version`, and `Os/Arch` do not exist. Fixed the sample output to match the actual command output.

2. **Non-existent `--output json` flag**: The post included an entire section on JSON output using `dapr build-info --output json`. This flag does not exist on the `build-info` subcommand (only `dapr version` supports `--output json`). Removed the JSON Output section entirely as the feature does not exist.

3. **Fabricated JSON schema**: The JSON output example with fields `version`, `commit`, `date`, `goVersion`, `os`, `arch` was entirely fabricated. Removed along with the JSON Output section.

4. **CI script used non-existent JSON flag**: The CI example piped `dapr build-info --output json` through `jq`. Rewrote to capture plain text output to a file instead.

5. **Comparison script used non-existent JSON flag**: The cross-machine comparison example also used `--output json` with `jq`. Rewrote to compare plain text output files with `diff`.

6. **Incorrect "When to Use" item**: Point 4 suggested comparing Go versions, but `dapr build-info` does not output Go version information. Removed this item.

7. **Inaccurate comparison table**: The table claimed `build-info` shows "CLI commit hash, Go version, OS/arch, build date". Corrected to "CLI and runtime version, Git commit, and Git version".

8. **Overview described wrong fields**: The overview mentioned "Go version, OS and architecture, and build timestamp" as output fields. Corrected to describe the actual output: version, Git commit hash, and Git version for both CLI and runtime.

## Review Notes
- The `dapr build-info` command is a real command, but it only outputs plain text. The `--output json` flag is available on `dapr version` but not on `dapr build-info`.
- The Runtime section of `build-info` output depends on `daprd` being available. If the Dapr runtime is not installed, that section may show an error or be absent. The post does not mention this caveat.
- Note that `dapr version` supports `--output json` if JSON-formatted version data is needed, but this is a different command with different output fields.
