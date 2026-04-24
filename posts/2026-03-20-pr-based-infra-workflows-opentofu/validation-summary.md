# Validation Summary: How to Set Up Pull Request-Based Infrastructure Workflows with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- GitHub Actions
- GitHub pull requests
- AWS OIDC for GitHub Actions
- Checkov
- tfsec
- Infracost
- Terraform GitHub provider

## Sources Consulted
- OpenTofu `tofu plan` command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `tofu fmt` command: https://opentofu.org/docs/cli/commands/fmt/
- OpenTofu `tofu validate` command: https://opentofu.org/docs/cli/commands/validate/
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Actions contexts reference: https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- GitHub Actions expressions reference: https://docs.github.com/en/actions/reference/workflows-and-actions/expressions
- `actions/github-script` README: https://github.com/actions/github-script
- `aws-actions/configure-aws-credentials` README: https://github.com/aws-actions/configure-aws-credentials
- `bridgecrewio/checkov-action` README: https://github.com/bridgecrewio/checkov-action
- `aquasecurity/tfsec-action` README: https://github.com/aquasecurity/tfsec-action
- Infracost CLI docs: https://www.infracost.io/docs/features/cli_commands/
- Infracost GitHub Actions README: https://github.com/infracost/actions

## Issues Found
- The workflow overview said the CI stage ran `fmt + validate + lint`, but the example workflow only ran formatting plus security scanners. I corrected the diagram text to match the actual example instead of claiming a `tofu validate` step that was not present.
- The section title called the snippet a “Complete PR Workflow,” but the example only covered PR checks/comments, not the merge-triggered apply path shown in the diagram. I changed the heading to “Example PR Workflow” so the snippet is described accurately.
- The Checkov example used `bridgecrewio/checkov-action@master`. I changed it to `@v12`, which matches the current official README examples and avoids pointing readers at a moving branch.
- The action versions for AWS credentials, GitHub Script, and Infracost setup were behind the current official examples. I updated them to `aws-actions/configure-aws-credentials@v6`, `actions/github-script@v9`, and `infracost/actions/setup@v3`.
- The `github-script` step would not work as written. Its Markdown code fence broke the JavaScript template literal, and the exit-code logic incorrectly labeled plan failures as success. I rewrote the step to pass values through `env`, use a valid fenced block in the comment body, `await` the REST call, and map exit codes `0`, `1`, and `2` to `✅`, `❌`, and `⚠️`.

## Review Notes
- The post is technically relevant and suitable for publication after these corrections.
- The sample workflow assumes the PR job can access AWS and Infracost secrets. On public repositories, `pull_request` workflows triggered from forks will not receive those secrets, so this pattern is best suited to same-repository or internal infrastructure PRs unless a different trust model is used.
- `tofu plan` includes an implied validation pass, but if the author wants the post to show an explicit configuration-validation stage in the future, the example should add `tofu init -backend=false` and `tofu validate` as documented by OpenTofu.
