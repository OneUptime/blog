# Validation Summary: How to Run Buildkite Steps Only When Monorepo Files Change

## Status

validated

## Post Type

Technical guide with YAML pipeline configurations and a shell command for testing step selection.

## Technologies Covered

- Buildkite Pipelines and Buildkite Agent v3/v4
- CI/CD and monorepo dependency selection
- YAML and Bash
- Git comparison bases, remote refs, and change detection
- Glob patterns and conditional step dependencies

## Sources Consulted

- [Buildkite: Using if_changed](https://buildkite.com/docs/pipelines/configure/dynamic-pipelines/if-changed)
- [Buildkite: Pipeline upload CLI reference](https://buildkite.com/docs/agent/cli/reference/pipeline)
- [Buildkite: Step dependencies](https://buildkite.com/docs/pipelines/configure/depends-on)
- [Buildkite: Glob pattern syntax](https://buildkite.com/docs/pipelines/configure/glob-pattern-syntax)
- [Buildkite Agent v3.115.0 release](https://github.com/buildkite/agent/releases/tag/v3.115.0)
- [Buildkite Agent v3.117.0 release](https://github.com/buildkite/agent/releases/tag/v3.117.0)
- [Buildkite Agent v4.0.3 release](https://github.com/buildkite/agent/releases/tag/v4.0.3)
- [Buildkite Agent v4.0.3 pipeline upload implementation](https://github.com/buildkite/agent/blob/v4.0.3/clicommand/pipeline_upload.go)
- [Buildkite Agent v4.0.3 shared CLI configuration](https://github.com/buildkite/agent/blob/v4.0.3/clicommand/global.go)
- [Author profile](https://github.com/nawazdhandala)

## Issues Found

1. **Base selection was described as searching for a valid Git ref.** The guide uses similar wording, but the v4.0.3 implementation selects the first nonempty setting with `cmp.Or`, then resolves that one ref. Changed the explanation to distinguish setting selection from Git ref validity, and made the remote branch prefixes explicit. An invalid selected ref does not cause the agent to try the next setting.
2. **The main-branch explanation omitted the agent's same-commit special case.** Although an ordinary comparison of identical commits is empty, v4.0.3 detects a base equal to `HEAD` and obtains the latest commit's changes using `git log --first-parent -1 --name-only --pretty=format:`. Replaced the misleading empty-diff explanation with that behavior and its multi-commit push limitation. Retained the advice to choose a baseline appropriate to the workflow.

## Review Notes

- Confirmed the documented version requirements: v3.99 with explicit enablement, default enablement from v3.103.0, pattern lists and include/exclude mappings from v3.109.0, supplied changed-file lists from v3.115.0, and base fetching from v3.117.0.
- Confirmed upload-time evaluation, repository-relative paths, recursive globs, whitespace-sensitive brace alternatives, and the documented fallback when Git change detection fails.
- Confirmed that skipped dependencies can allow downstream deployment steps to proceed; the post correctly retains independent change, branch, release, and artifact controls.
- Verified the v4.0.3 placeholder explanation against the required access-token field in shared CLI configuration. Dry-run processing outputs the pipeline and bypasses the actual upload.
- Parsed all three YAML examples successfully with PyYAML and checked the Bash example with `bash -n`. The folded upload command and option names match the CLI reference.
- Reviewed the sample selection rules: an API path selects API tests; a shared package or root lockfile selects both application steps; the root README selects documentation checks. The repository-owned test scripts are explicitly placeholders to be implemented by readers.
- All linked documentation pages and the author profile resolved to the intended resources.
- No Buildkite agent was installed locally, so no agent dry run or live pipeline upload was executed. Runtime behavior was checked against official documentation and version-pinned agent source. Real pull requests and repository-specific dependency completeness remain deployment checks for readers.
