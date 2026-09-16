# Validation Summary: How to Stop Duplicate Buildkite Runs from Overwriting GitHub Commit Status Links

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered

- Buildkite Pipelines
- Buildkite GitHub integration
- GitHub commit statuses and required status checks
- GitHub REST API
- GitHub CLI
- YAML pipeline configuration

## Sources Consulted

- [GitHub REST API endpoints for commit statuses](https://docs.github.com/en/rest/commits/statuses)
- [GitHub status checks](https://docs.github.com/en/pull-requests/reference/status-checks)
- [GitHub available rules for rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets)
- [GitHub CLI `gh api` manual](https://cli.github.com/manual/gh_api)
- [Buildkite GitHub integration](https://buildkite.com/docs/pipelines/source-control/github)
- [Buildkite notification configuration](https://buildkite.com/docs/pipelines/configure/notify)

## Issues Found

- The description referred generally to “GitHub check ownership,” although the post specifically diagnoses commit statuses and later distinguishes them from check runs. Changed this to “GitHub commit status ownership” to use the correct object name.
- The status identity explanation omitted that GitHub treats the `context` field as case-insensitive. Added that qualification so contexts that differ only by letter case are not incorrectly treated as independent.

## Review Notes

- The `gh api --paginate` command, endpoint, and jq expression are valid and provide the status history fields described.
- The Buildkite `notify.github_commit_status.context` YAML is valid at build level. Buildkite's automatic **Update commit statuses** setting should be considered alongside custom notifications, as the post correctly notes, because both can publish statuses.
- The Buildkite duplicate-prevention setting name, purpose, and enabled-by-default behavior match the current GitHub integration documentation.
- No product versions are pinned; the review reflects the official documentation available on 2026-09-16.
