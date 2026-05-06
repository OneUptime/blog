# Validation Summary: How to Set Up Code Review Workflows for OpenTofu Changes

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- GitHub Actions
- GitHub branch protection rules
- GitHub deployment environments
- AWS OIDC authentication for GitHub Actions
- HCL / Infrastructure as Code workflows

## Sources Consulted
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `init` command: https://opentofu.org/docs/v1.11/cli/commands/init/
- OpenTofu CLI configuration file and plugin cache settings: https://opentofu.org/docs/v1.11/cli/config/config-file/
- `opentofu/setup-opentofu` action README: https://github.com/opentofu/setup-opentofu
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions default shell and working directory rules: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/set-default-values-for-jobs
- GitHub Actions expressions and `always()`: https://docs.github.com/en/actions/learn-github-actions/expressions
- GitHub OIDC for AWS: https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws
- `aws-actions/configure-aws-credentials` action README: https://github.com/aws-actions/configure-aws-credentials
- GitHub deployment environments: https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments
- GitHub deployments and environments reference: https://docs.github.com/en/actions/reference/deployments-and-environments
- GitHub protected branches: https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
- GitHub troubleshooting for required status checks: https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/troubleshooting-required-status-checks

## Issues Found
- The PR workflow used `defaults.run.working-directory` with a matrix expression. GitHub's docs say `defaults.run` does not support contexts or expressions, so I changed the OpenTofu commands to use the documented `-chdir` pattern instead.
- The cache snippet restored `~/.terraform.d/plugin-cache` but never enabled plugin caching for OpenTofu and did not ensure the directory existed. I added a step that creates the directory and exports `TF_PLUGIN_CACHE_DIR` through `GITHUB_ENV`, which matches the OpenTofu CLI configuration docs.
- The `tofu plan` step would not reliably post a PR comment on failure, because a non-zero exit could stop the step before the comment step ran. I changed the step to capture the exit code explicitly, made the comment step run with `if: ${{ always() }}`, and added a final failure step so the workflow still fails when the plan fails.
- The PR comment JavaScript built the markdown body with raw triple backticks inside a template literal, which is invalid JavaScript. I replaced it with a newline-joined array so the snippet is syntactically valid.
- The apply workflow used AWS OIDC but omitted the required workflow permissions. I added `id-token: write` and `contents: read`, which the GitHub OIDC and `configure-aws-credentials` docs require.
- The inline comment on `environment: production` implied that referencing an environment always requires approval. I corrected it to reflect GitHub's documented behavior: approval is enforced only when the environment has protection rules such as required reviewers.
- The branch-protection guidance used an overly specific required-check name and omitted GitHub's path-filter caveat. I updated it to use the actual job check name pattern and noted that skipped path-filtered workflows remain pending if marked as required.

## Review Notes
- The PR workflow still assumes same-repository pull requests. GitHub documents that fork-triggered `pull_request` workflows typically do not receive write-capable `GITHUB_TOKEN` permissions, so PR comment posting may need a different design for external contributors or Dependabot.
- The PR workflow saves a plan file for the branch under review, but the merge workflow does not reuse that exact artifact; it re-runs `tofu apply` on `main`. That is a reasonable pattern, but it does not guarantee applying the exact reviewed plan artifact.
- I did not run the workflows end-to-end, because the post contains illustrative snippets and this repository does not provide the AWS/OpenTofu environment needed to execute them.
