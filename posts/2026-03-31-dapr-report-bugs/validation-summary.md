# Validation Summary: How to Report Bugs in Dapr

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (CLI and runtime)
- Dapr Go SDK (`github.com/dapr/go-sdk/client`)
- GitHub CLI (`gh`)
- Kubernetes (`kubectl`)
- Redis (as Dapr state store component)
- Docker

## Sources Consulted
- GitHub CLI manual (`gh issue list --help`, `gh release list --help`, `gh issue create --help`, `gh api --help`)
- GitHub REST API documentation for subscriptions endpoints (https://docs.github.com/en/rest/activity/watching, https://docs.github.com/en/rest/activity/notifications)
- kubectl CLI help (`kubectl version --help`, `kubectl set env --help`)
- kubectl 1.28 release notes regarding `--short` flag deprecation and removal
- Dapr CLI reference documentation (https://docs.dapr.io/reference/cli/)
- Dapr Go SDK client package API (https://pkg.go.dev/github.com/dapr/go-sdk/client)
- Dapr component specification for Redis state store (https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/)

## Issues Found

1. **`dapr --version` incorrect command** (line 40): The Dapr CLI uses `dapr version` as a subcommand, not `--version` as a flag. Changed to `dapr version`.

2. **`kubectl version --short` removed flag** (line 47): The `--short` flag was deprecated in kubectl 1.27 and removed in kubectl 1.28+. Running it on modern kubectl versions produces an "unknown flag" error. Changed to `kubectl version`.

3. **Invalid GitHub API endpoint for issue subscriptions** (line 181): The command `gh api repos/dapr/dapr/issues/1234/subscriptions -X PUT` references a non-existent GitHub REST API endpoint. There is no `repos/{owner}/{repo}/issues/{number}/subscriptions` endpoint. Users are auto-subscribed to issues they create. Replaced with `gh issue view 1234 --repo dapr/dapr --comments` which is a practical way to check for updates.

4. **Broken nested code blocks in bug report template** (lines 123-158): The template section used triple-backtick fences (` ``` `) for both the outer markdown code block and inner code blocks (` ```go `, ` ```json `). The inner fences prematurely closed the outer block, breaking rendering. Fixed by using quadruple-backtick fences (` ```` `) for the outer block. Also fixed the erroneous closing ` ```text ` to a proper ` ```` ` close.

## Review Notes
- The Go SDK code and Dapr component YAML are correct and follow current best practices.
- All `gh` CLI commands (except the API subscription endpoint) use valid flags and syntax.
- The `kubectl set env -c` flag for container selection is correct and documented.
- The `dapr run --log-level debug` flag and `--` separator syntax are correct.
- The bug report template content itself is well-structured and covers the right information for an effective Dapr bug report.
