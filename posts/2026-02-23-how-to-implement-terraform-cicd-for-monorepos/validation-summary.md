# Validation Summary: How to Implement Terraform CI/CD for Monorepos

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Terraform CLI
- GitHub Actions
- dorny/paths-filter
- hashicorp/setup-terraform
- actions/upload-artifact and actions/download-artifact
- actions/github-script
- Bash, Git, and jq
- AWS credential configuration for GitHub Actions

## Sources Consulted
- Terraform plan command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform show command reference: https://developer.hashicorp.com/terraform/cli/commands/show
- Terraform install/latest version page: https://developer.hashicorp.com/terraform/install
- hashicorp/setup-terraform README: https://github.com/hashicorp/setup-terraform
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions expressions reference: https://docs.github.com/en/actions/reference/workflows-and-actions/expressions
- GitHub Actions workflow commands and GITHUB_OUTPUT reference: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
- GitHub Actions script injection guidance: https://docs.github.com/en/actions/concepts/security/script-injections
- dorny/paths-filter README: https://github.com/dorny/paths-filter
- actions/upload-artifact README: https://github.com/actions/upload-artifact
- actions/download-artifact v4 migration guidance: https://github.com/actions/upload-artifact/blob/main/docs/MIGRATION.md
- actions/github-script README: https://github.com/actions/github-script

## Issues Found
- The Bash change-detection script appended `\n` inside a double-quoted string, which produces a literal backslash-n in Bash rather than a newline. Updated it to use `printf` so dependent directories are emitted on separate lines.
- The workflow examples used older action versions for `dorny/paths-filter`, `hashicorp/setup-terraform`, and `actions/github-script`. Updated the examples to current major versions documented by those projects.
- The Terraform examples pinned Terraform `1.7.0`, while the current HashiCorp documentation lists Terraform `1.15.x` as latest. Updated the examples to `1.15.2`.
- The matrix `run` steps interpolated `${{ matrix.directory }}` directly into shell commands. Updated those examples to pass the value through an environment variable and quote it in shell, matching GitHub's script injection hardening guidance.
- The plan workflow uploaded only the binary `tfplan`, while the PR comment example tried to read `plan-output.txt`. Added `terraform show -no-color tfplan > plan-output.txt` and uploaded both files.
- The artifact upload used a content hash for the artifact name, which can collide for directories with identical content under upload-artifact v4's immutable artifact model. Changed the artifact name to use `strategy.job-index`.
- The dependency-ordering example referenced `needs.detect.outputs.directories` from jobs that did not declare `detect` in `needs`. Added the missing dependencies and changed string checks to `contains(fromJSON(...), ...)`.
- The dependency-ordering example could skip downstream jobs when an upstream dependency was intentionally skipped. Added guarded `always()` conditions that allow downstream jobs to run after skipped dependencies but not after failed detection or failed required applies.
- The module-dependency expansion example iterated a JSON array as shell words. Updated it to parse the JSON output with `jq -r '.[]'`.
- The PR comment example read files from the local workspace even though plan output is produced in matrix jobs. Added a download-artifact step using `pattern` and `merge-multiple`.
- The PR comment example interpolated JSON inside a quoted JavaScript string. Changed it to inject the JSON array as a JavaScript value so paths containing quotes do not break parsing.
- The PR comment YAML snippet contained JavaScript markdown fences inside a Markdown fenced code block. Changed the outer fence to four backticks so the snippet renders correctly.

## Review Notes
- The workflow examples remain illustrative and still require real backend configuration, AWS role values, repository permissions, and environment protection rules before production use.
- The apply example runs a fresh `terraform apply` on push rather than applying the saved pull-request plan. That is a valid Terraform workflow, but teams that require exact reviewed plans should download and apply saved plan files in the same trusted workflow context.
