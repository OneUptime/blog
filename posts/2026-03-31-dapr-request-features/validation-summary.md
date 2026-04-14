# Validation Summary: How to Request Features in Dapr

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (feature request process, proposals workflow)
- GitHub CLI (`gh`) for issue management, PR creation, and API calls
- GitHub REST API (reactions endpoint)
- Git (branching, committing, signing commits)

## Sources Consulted
- `gh issue list --help` — verified `--repo`, `--label`, `--state`, `--search`, `--limit` flags
- `gh issue create --help` — verified `--repo`, `--title`, `--label`, `--body` flags
- `gh issue comment --help` — verified positional issue number, `--repo`, `--body` flags
- `gh issue view --help` — verified `--repo`, `--json`, `--web` flags
- `gh pr create --help` — verified `--repo`, `--title`, `--body` flags
- `gh api --help` — verified `-X` (`--method`), `-f` (`--raw-field`) flags
- GitHub REST API documentation for reactions endpoint (`POST /repos/{owner}/{repo}/issues/{issue_number}/reactions`)
- GitHub REST API documentation for subscription endpoints (`PUT /repos/{owner}/{repo}/subscription`, `PUT /notifications/threads/{thread_id}/subscription`)

## Issues Found

1. **Markdown syntax error on line 92**: The code block opened at line 48 was "closed" with ` ```bash ` instead of ` ``` `. This opened a new fenced code block instead of closing the existing one, corrupting the markdown rendering for the entire remainder of the post. Fixed by changing ` ```bash ` to ` ``` `.

2. **Invalid GitHub API endpoint on line 154**: The command `gh api repos/dapr/dapr/issues/1234/subscriptions -X PUT` referenced a non-existent GitHub REST API endpoint. GitHub does not expose an issue-level subscription endpoint at `/repos/{owner}/{repo}/issues/{issue_number}/subscriptions`. The valid subscription endpoints are `/repos/{owner}/{repo}/subscription` (repo-level) and `/notifications/threads/{thread_id}/subscription` (thread-level, requires knowing the thread ID). Replaced with `gh issue view 1234 --repo dapr/dapr --web`, which opens the issue in the browser where the user can subscribe to notifications.

## Review Notes
- The Dapr Component YAML example (`workflow.dapr` with `workflowRetentionPolicy`) is a hypothetical proposed feature, not an existing Dapr capability. This is appropriate in the context of demonstrating how to write a feature request.
- The `dapr/proposals` repository and `dapr/components-contrib` repository references are accurate to the Dapr project structure.
- The claim that Temporal supports per-workflow-type retention is accurate.
- All `gh` CLI commands use correct flags and syntax as verified against `--help` output.
- The `gh api` reactions endpoint (`POST /repos/{owner}/{repo}/issues/{issue_number}/reactions` with `content="+1"`) is correct per the GitHub REST API.
