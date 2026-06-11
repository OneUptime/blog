# Validation Summary: How to Create Falco Required Engine Version

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Falco
- Falco rules YAML
- Falco CLI
- Falco plugins
- Docker
- GitHub Actions

## Sources Consulted
- Falco rule format version documentation: https://falco.org/docs/concepts/rules/versioning/
- Falco rules documentation: https://falco.org/docs/concepts/rules/
- Falco rule fields reference: https://falco.org/docs/reference/rules/rule-fields/
- Falco supported fields reference: https://falco.org/docs/reference/rules/supported-fields/
- Falco plugin usage documentation: https://falco.org/docs/concepts/plugins/usage/
- Falco CLI arguments reference: https://falco.org/docs/reference/daemon/cli-arguments/
- Falco 0.37.0 release notes: https://falco.org/blog/falco-0-37-0/
- Official Falco rules repository: https://github.com/falcosecurity/rules
- Verified `falco --version` output with official Docker images for Falco 0.35.0, 0.36.0, 0.37.0, and 0.44.1.

## Issues Found
- The post treated Falco engine versions as always matching Falco release versions, such as engine `0.37.0` for Falco `0.37.0`. Corrected this with observed values: Falco 0.35.0 reports engine `17`, Falco 0.36.0 reports engine `26`, Falco 0.37.0 reports engine `0.31.0`, and Falco 0.44.1 reports engine `0.62.0`.
- The post did not distinguish legacy integer engine versions from current SemVer engine versions. Added the distinction that Falco 0.37.0 and newer use SemVer-style engine versions, while older releases used integer engine versions.
- The `falco --version` example and parsing command used stale output labels. Updated the example and the `awk` command to handle current `Engine:` output and older `Engine version:` output.
- The feature/version table included unverified and inaccurate minimum versions. Replaced it with verified version signals and guidance to validate with `falco --version`, `falco --list=<source>`, and `falco --validate`.
- The mismatch flow implied warning-only behavior and strict mode. Corrected it to show rule-loading failure when the required engine version exceeds the running engine.
- Several examples used incorrect required engine versions such as `0.28.0`, `0.32.0`, and `0.35.0`. Updated examples to use validated values or legacy integer values as appropriate.
- The Docker validation command incorrectly included `falco` after the Falco image name, which would be passed as an argument to the image entrypoint. Updated it to call `--validate` directly.
- The GitHub Actions example installed a bare Debian package version that may not match package revision suffixes. Updated the workflow to validate with the official Falco Docker image for each matrix version.
- The `grep`/`awk` extraction for `required_engine_version` returned the key instead of the value. Updated it to extract the third field from `- required_engine_version: ...` lines.

## Review Notes
The official Falco docs page for rule format versioning still shows the older integer example, while the official rules repository documents the SemVer transition for rules version 3.0.0 and Falco 0.37.0+. The post now calls out both schemes explicitly.
