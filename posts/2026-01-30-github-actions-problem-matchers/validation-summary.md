# Validation Summary: How to Create GitHub Actions Problem Matchers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions
- GitHub Actions problem matchers
- GitHub Actions workflow commands
- YAML workflow configuration
- JSON matcher configuration
- JavaScript/ECMAScript regular expressions
- ESLint, pytest, Go compiler output, Rust Cargo output

## Sources Consulted
- GitHub Actions Toolkit problem matcher documentation: https://github.com/actions/toolkit/blob/main/docs/problem-matchers.md
- GitHub Actions Toolkit workflow command documentation: https://github.com/actions/toolkit/blob/main/docs/commands.md#problem-matchers
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions debug logging documentation: https://docs.github.com/en/actions/managing-workflow-runs/enabling-debug-logging
- GitHub Actions runner `IssueMatcher` implementation: https://github.com/actions/runner/blob/main/src/Runner.Worker/IssueMatcher.cs
- GitHub Actions runner output manager implementation: https://github.com/actions/runner/blob/main/src/Runner.Worker/Handlers/OutputManager.cs
- Cargo build help for `--message-format`: local `cargo build --help`

## Issues Found
- The field reference marked `file` as required. GitHub's matcher validation requires `owner`, at least one `pattern`, `regexp` on each pattern, and `message` in at least one pattern; `file` is optional, although needed for file annotations. Changed `file` to "No" in the required column.
- The `loop` field was described as a general repeated-error setting and used in single-pattern matchers. GitHub runner validation only permits `loop` on the final pattern of a multi-pattern matcher, and single-pattern matchers already run against each log line. Updated the explanation, changed the looping example to a multi-pattern matcher, removed invalid `loop: true` from the Go single-pattern matcher, and tightened the key takeaway.
- The debug logging section showed `ACTIONS_STEP_DEBUG` as a step-level environment variable. GitHub documents this as a repository or organization secret or variable, not a workflow step `env` override. Updated the text and example.
- One fenced `json` example used `[...]`, which is not valid JSON. Replaced it with a small valid matcher pattern.

## Review Notes
- The runner implementation supports `error`, `warning`, and `notice` severities, even though the Toolkit problem matcher documentation still describes only `warning` and `error` in the field list.
- Go was not installed in the local environment, so the Go compiler output shape was reviewed against common `go build` diagnostics and the matcher regex rather than local `go` command output.
