# Validation Summary: Why Does My Build Pass Locally but Fail in CI? A Systematic Environment-Diff Checklist

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- CI/CD and reproducible builds
- Git, Git submodules, Git LFS, and sparse checkout
- GitHub Actions workflows, hosted runners, variables, caches, artifacts, and secrets
- Node.js and npm
- Bash and POSIX-style shell commands
- Containers and Bazel hermeticity

## Sources Consulted

- [GitHub-hosted runners reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)
- [GitHub Actions variables reference](https://docs.github.com/en/actions/reference/workflows-and-actions/variables)
- [Events that trigger workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows)
- [Workflow syntax for GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- [Building and testing Node.js in GitHub Actions](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs)
- [GitHub Actions dependency caching reference](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching)
- [GitHub Actions workflow artifacts](https://docs.github.com/en/actions/concepts/workflows-and-actions/workflow-artifacts)
- [GitHub Actions secure use reference](https://docs.github.com/en/actions/reference/security/secure-use)
- [Official `actions/checkout` documentation](https://github.com/actions/checkout)
- [npm `ci` documentation](https://docs.npmjs.com/cli/commands/npm-ci/)
- [npm `test` documentation](https://docs.npmjs.com/cli/commands/npm-test/)
- [Git `rev-parse` documentation](https://git-scm.com/docs/git-rev-parse)
- [Git `status` documentation](https://git-scm.com/docs/git-status)
- [Git `submodule` documentation](https://git-scm.com/docs/git-submodule)
- [Git `clone` documentation](https://git-scm.com/docs/git-clone)
- [GNU Bash variable documentation](https://www.gnu.org/software/bash/manual/html_node/Bash-Variables.html)
- [Bazel hermeticity documentation](https://bazel.build/concepts/hermeticity)

## Issues Found

- The environment fingerprint labeled `$SHELL` as the executing shell, but that variable normally identifies the configured login shell and can differ from the process running a CI step. Replaced it with `ps -p "$$" -o command= || true` so the diagnostic reports the current shell process.
- The command-comparison paragraph could imply that `npm test` and `npm run test` use different defaults. Clarified that both invoke the package's `test` script, while a direct test-runner invocation can behave differently.

## Review Notes

- The Bash snippets are valid for POSIX-like runner shells. Windows jobs using PowerShell or `cmd.exe` require the corresponding platform-specific syntax, as the post already notes.
- The `rm -rf node_modules` command before `npm ci` is redundant because `npm ci` removes an existing `node_modules` directory automatically, but it is technically correct and makes the clean-install intent explicit.
- All six documentation links in the post resolved successfully during validation. The Bazel hermeticity URL currently redirects to Bazel's canonical `/basics/hermeticity` page.
