# Validation Summary: How to Share Build Logic Between Developer Machines and CI Without Duplicating YAML

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- GitHub Actions
- Reusable workflows
- Composite actions
- YAML anchors and workflow templates
- GNU Make
- npm scripts and `npm ci`
- Bash
- CI/CD build and artifact orchestration

## Sources Consulted

- [GitHub Docs: Reuse workflows](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows)
- [GitHub Docs: Reusing workflow configurations](https://docs.github.com/en/actions/reference/workflows-and-actions/reusing-workflow-configurations)
- [GitHub Docs: Creating a composite action](https://docs.github.com/en/actions/tutorials/create-actions/create-a-composite-action)
- [GitHub Docs: Workflow syntax for GitHub Actions](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- [GitHub Docs: Store and share data with workflow artifacts](https://docs.github.com/en/actions/tutorials/store-and-share-data)
- [GitHub Docs: Secure use reference](https://docs.github.com/en/actions/reference/security/secure-use)
- [actions/checkout official repository and usage documentation](https://github.com/actions/checkout)
- [actions/checkout v7.0.1 release](https://github.com/actions/checkout/releases/tag/v7.0.1)
- [actions/upload-artifact official repository and usage documentation](https://github.com/actions/upload-artifact)
- [actions/upload-artifact v7.0.1 release](https://github.com/actions/upload-artifact/releases/tag/v7.0.1)
- [GNU Make manual: Phony targets](https://www.gnu.org/software/make/manual/html_node/Phony-Targets.html)
- [GNU Make manual: Parallel execution](https://www.gnu.org/software/make/manual/html_node/Parallel.html)
- [npm CLI documentation: `npm ci`](https://docs.npmjs.com/cli/v11/commands/npm-ci/)
- [npm documentation: Scripts](https://docs.npmjs.com/cli/using-npm/scripts/)
- [Bash Reference Manual: Conditional constructs](https://www.gnu.org/software/bash/manual/html_node/Conditional-Constructs.html)
- [Bash Reference Manual: Bourne shell builtins](https://www.gnu.org/software/bash/manual/html_node/Bourne-Shell-Builtins.html)
- [Bash Reference Manual: Shell parameter expansion](https://www.gnu.org/software/bash/manual/html_node/Shell-Parameter-Expansion.html)

## Issues Found

- The workflow used `actions/checkout@v6` in three jobs, but `v7` was the current major release on the validation date. Updated all three references to `actions/checkout@v7`.
- The artifact step used `actions/upload-artifact@v6`, but `v7` was the current major release on the validation date. Updated the reference to `actions/upload-artifact@v7`; the documented `name` and `path` inputs remain valid.
- The illustrative Bash `if` statement contained only a comment in its `then` branch, so it failed Bash syntax validation. Added the `:` null command to keep the placeholder example syntactically valid without changing its intent.

## Review Notes

- The Make fragment, GitHub Actions YAML structure, and `BUILD_MODE` Bash `case` statement were syntax-checked successfully.
- The reusable-workflow guidance correctly describes job-level calls, declared typed inputs and secrets, matrix use, outputs, same-commit behavior for same-repository calls, immutable SHA references for cross-repository stability and security, and permission reduction through nested workflow chains.
- Major-version action tags are conventional and receive compatible updates, but a full commit SHA is the immutable choice for environments that require strict supply-chain pinning.
