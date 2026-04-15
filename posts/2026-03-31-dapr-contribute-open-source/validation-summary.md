# Validation Summary: How to Contribute to the Dapr Open Source Project

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (CNCF distributed application runtime)
- Go (primary language for dapr/dapr and components-contrib)
- Git and GitHub (fork/clone/PR workflow)
- GitHub CLI (`gh`)
- Make (build system)
- gofmt (Go formatting tool)
- Developer Certificate of Origin (DCO)

## Sources Consulted
- https://github.com/dapr/dapr — verified default branch (`master`), Makefile targets, go.mod
- https://github.com/dapr/dapr/blob/master/CONTRIBUTING.md — verified DCO requirement and contribution workflow
- https://github.com/dapr/components-contrib — verified repo exists and purpose (note: uses `main` branch, not `master`)
- https://github.com/dapr/dotnet-sdk — verified .NET SDK repo exists
- https://github.com/dapr/python-sdk — verified Python SDK repo exists
- https://github.com/dapr/js-sdk — verified JavaScript/TypeScript SDK repo exists
- https://github.com/dapr/java-sdk — verified Java SDK repo exists
- https://github.com/dapr/docs — verified documentation repo exists
- https://github.com/dapr/dapr/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22 — verified issue label name

## Issues Found
1. **Outdated Go version requirement**: The post stated "Requires Go 1.21+" but the dapr/dapr `go.mod` specifies a newer Go version. Changed to "Check go.mod in the repo for the required Go version" so the advice stays evergreen.
2. **Inconsistent GitHub label naming**: The comment on line 32 said "good-first-issue" (hyphenated) and the Summary section said "good-first-issue", but the actual GitHub label is "good first issue" (with spaces). Fixed both occurrences to match the real label name.

## Review Notes
- The `dapr/dapr` repo uses `master` as its default branch, but `dapr/components-contrib` uses `main`. The post's branch command (`upstream/master`) is correct for dapr/dapr but contributors working on components-contrib would need to use `upstream/main` instead. This is not an error since the post focuses on dapr/dapr, but could be a helpful clarification in the future.
- The `gh pr create --label "bug"` command requires the contributor to have triage/write permissions on the target repo. First-time external contributors typically cannot add labels; the command will still create the PR but the label may not be applied. This is a minor practical note, not a syntax error.
- All git commands, GitHub CLI commands, and Make targets were verified as syntactically correct and consistent with the Dapr project's actual workflow.
