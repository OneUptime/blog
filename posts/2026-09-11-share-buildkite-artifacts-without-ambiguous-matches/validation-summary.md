# Validation Summary: How to Share Buildkite Artifacts Without Ambiguous Matches

## Status
validated

## Post Type
Technical guide with pipeline configuration and Bash examples.

## Technologies Covered
- Buildkite Pipelines and agent artifact CLI
- Buildkite artifacts REST API
- YAML pipeline configuration
- Bash scripting
- tar/gzip archives and SHA-256 checksums

## Sources Consulted
- Buildkite artifact CLI reference: https://buildkite.com/docs/agent/cli/reference/artifact
- Buildkite build artifacts guide: https://buildkite.com/docs/pipelines/configure/artifacts
- Buildkite command step reference: https://buildkite.com/docs/pipelines/configure/step-types/command-step
- Buildkite dependencies: https://buildkite.com/docs/pipelines/configure/depends-on
- Buildkite environment variables: https://buildkite.com/docs/pipelines/configure/environment-variables
- Buildkite artifacts REST API: https://buildkite.com/docs/apis/rest-api/artifacts
- Perl shasum documentation: https://perldoc.perl.org/shasum
- Installed Bash documentation: `help set`.
- Installed GNU Coreutils documentation: `sha256sum --help`.
- Installed libarchive tar documentation: `tar --help`.
- Author profile link verified: https://github.com/nawazdhandala

## Issues Found
- The producer snippet lacked error handling. When run by the pipeline's explicit `bash` invocation, a failed archive command could be followed by a successful checksum command, masking the packaging failure. Added a Bash shebang and `set -euo pipefail` so the script stops when archive creation fails. No sections or unrelated wording were changed.

## Review Notes
- Confirmed the pipeline fields and dependency syntax against the command-step and dependency references.
- Confirmed upload, download, and search syntax; build and producer selectors; retained destination paths; wildcard matching across subdirectories; and search output containing job IDs and paths.
- Confirmed that a parallel-step selector includes all its jobs, while a job UUID selects one producer. Unique shard paths remain necessary to keep outputs distinct.
- Confirmed the documented latest-attempt default, inclusion of earlier retries, triggering-build UUID, zero-based parallel-job index, cluster access rules, and REST API use outside running jobs.
- All five Bash code blocks passed `bash -n`. A temporary sample package successfully produced an archive and checksum, passed checksum verification, and listed its archive contents. A missing-package test failed before checksum creation as intended.
- Local execution used Bash, GNU sha256sum, and macOS libarchive tar. No Buildkite agent was installed, so remote artifact transfers and pipeline scheduling were verified against official documentation rather than executed in a live build.
- The shard example deliberately leaves the repository-specific test runner as a documented placeholder. The producer similarly assumes an already-populated package directory.
- The linked Buildkite pages and author profile resolved. GNU web manual fetches timed out; installed command documentation and local execution supplied shell, archive, and checksum verification.
- No version-specific API migrations or deprecated flags were required.
