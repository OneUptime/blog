# Validation Summary: How to Prevent Stale Buildkite Working Directories from Breaking Git Pushes

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Buildkite Pipelines and self-hosted agents
- Git clones, refs, commits, and push fast-forward checks
- Bash automation
- CI/CD concurrency control

## Sources Consulted
- [Buildkite agent security: Force clean checkouts](https://buildkite.com/docs/agent/self-hosted/security)
- [Buildkite: Controlling concurrency](https://buildkite.com/docs/pipelines/configure/workflows/controlling-concurrency)
- [Git: git-clone documentation](https://git-scm.com/docs/git-clone)
- [Git: git-push documentation](https://git-scm.com/docs/git-push)
- [Git: git-status documentation](https://git-scm.com/docs/git-status)
- [Git: git-rev-parse documentation](https://git-scm.com/docs/git-rev-parse)
- [Git: git-symbolic-ref documentation](https://git-scm.com/docs/git-symbolic-ref)
- [Git: git-add documentation](https://git-scm.com/docs/git-add)
- [Git: git-diff documentation](https://git-scm.com/docs/git-diff)
- [GNU Bash Reference Manual: The Set Builtin](https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html)

## Issues Found
No technical issues found.

## Review Notes
The isolated-clone script is syntactically sound and correctly limits staging to the automation-owned path. Its explicit `HEAD:refs/heads/main` refspec and unforced push preserve Git's normal fast-forward protection. The no-change check is valid with `set -e` because the command is used as an `if` condition. The Buildkite `concurrency` and `concurrency_group` fields are current and correctly described as organization-scoped coordination among participating Buildkite jobs, not as a repository-wide lock. No version-specific or deprecated APIs are used.
