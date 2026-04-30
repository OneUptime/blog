# Validation Summary: How to Implement GitOps Workflows with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- GitHub Actions
- GitHub REST API via `actions/github-script`
- AWS OIDC authentication for GitHub Actions
- GitOps workflows for infrastructure as code

## Sources Consulted
- OpenTofu `plan` command docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command docs: https://opentofu.org/docs/v1.11/cli/commands/apply/
- OpenTofu S3 backend permissions and locking docs: https://opentofu.org/docs/language/settings/backends/s3/
- OpenTofu documentation index (current docs line): https://opentofu.org/docs/
- OpenTofu releases: https://github.com/opentofu/opentofu/releases
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub `GITHUB_TOKEN` permissions docs: https://docs.github.com/en/actions/tutorials/authenticate-with-github_token
- GitHub REST API for issue comments: https://docs.github.com/en/rest/issues/comments
- GitHub REST API for issues: https://docs.github.com/en/rest/issues/issues
- GitHub secrets docs: https://docs.github.com/en/actions/how-tos/security-for-github-actions/security-guides/using-secrets-in-github-actions
- `actions/github-script` README: https://github.com/actions/github-script
- `aws-actions/configure-aws-credentials` README: https://github.com/aws-actions/configure-aws-credentials
- `opentofu/setup-opentofu` README: https://github.com/opentofu/setup-opentofu

## Issues Found
- The PR comment example in `actions/github-script` was syntactically invalid because it embedded Markdown code fences inside a JavaScript template literal without escaping them. I rewrote the body construction to use `Array.join('\n')`, which is valid JavaScript and works in `actions/github-script`.
- The plan workflow captured `PIPESTATUS[0]` but never failed the step when `tofu plan` returned an error. I added explicit exit-code handling so plan failures now fail the job instead of appearing successful.
- The PR comment step would be skipped after a failed `tofu plan`, which defeats the point of posting plan output back to the pull request. I added `if: always() && steps.plan.outcome != 'skipped'` so the comment still posts when the plan step ran but failed.
- The drift-detection workflow was missing `id-token: write`, which is required by the AWS OIDC flow documented for `aws-actions/configure-aws-credentials`. I added the missing permission.
- The drift-detection workflow was also missing `issues: write`, which is required for `github.rest.issues.create(...)` when opening a drift issue. I added the missing permission.
- The drift-detection step handled exit code `2` correctly in principle, but it also treated exit code `1` as success because the script never exited nonzero. I added explicit handling so actual OpenTofu errors now fail the job while drift still produces exit code `2`.
- The post pinned `opentofu/setup-opentofu@v1` and `tofu_version: "1.7.0"`, which were outdated relative to the current OpenTofu documentation and releases as of 2026-04-30. I updated the examples to `opentofu/setup-opentofu@v2` and the current `1.11` release line.
- The post used older major versions of `aws-actions/configure-aws-credentials` and `actions/github-script`. I updated those examples to current major versions from the official repositories.
- The statement that the plan role "only needs read access" was too broad. OpenTofu backend docs show that remote state backends and locking commonly require additional write/lock permissions even for `tofu plan`, so I corrected that wording.
- The statement that stored plan output lets reviewers see "exactly" what will change was too strong for a pull-request plan preview. OpenTofu documents that speculative plans can diverge from the final apply if state changes in the meantime, so I adjusted the wording to "inspect the proposed changes before merge."

## Review Notes
- The apply example remains a common GitOps pattern, but it still creates a fresh plan at merge time because it runs `tofu apply -auto-approve` without a saved plan file. That is technically valid; it just means the pull-request plan is a review aid, not a guarantee of byte-for-byte identical apply input.
- If this repository accepts pull requests from forks, the PR plan workflow will need additional design work because GitHub does not pass repository secrets to workflows triggered from forked pull requests. The example is most straightforward for same-repository PRs or trusted contributor models.
