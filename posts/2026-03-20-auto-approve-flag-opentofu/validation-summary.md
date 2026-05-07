# Validation Summary: How to Use the -auto-approve Flag in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- Infrastructure as Code
- GitHub Actions
- YAML workflow configuration
- Bash scripting
- CI/CD

## Sources Consulted
- OpenTofu `apply` command docs: https://opentofu.org/docs/cli/commands/apply/
- OpenTofu `destroy` command docs: https://opentofu.org/docs/cli/commands/destroy/
- OpenTofu `plan` command docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu initialization docs: https://opentofu.org/docs/cli/init/
- GitHub Docs, choosing the runner for a job: https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job
- GitHub Docs, deployments and environments: https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
- GitHub Docs, creating an example workflow: https://docs.github.com/en/actions/tutorials/create-an-example-workflow
- GitHub Docs, storing and sharing workflow artifacts: https://docs.github.com/actions/guides/storing-workflow-data-as-artifacts
- `opentofu/setup-opentofu` action README: https://github.com/opentofu/setup-opentofu

## Issues Found
1. The post said `-auto-approve` was required in automated pipelines in general. OpenTofu documents that `tofu apply` does not prompt at all when you pass a saved plan file, and that `-auto-approve` is ignored in that case. I corrected the introduction, saved-plan examples, and conclusion to reflect that distinction.
2. The safe usage example used `tofu apply -auto-approve deployment.tfplan`. That flag has no effect when applying a previously saved plan, so I changed the command to `tofu apply deployment.tfplan` and clarified why.
3. The GitHub Actions example was not runnable as written. The `apply` job was missing `runs-on`, and both jobs omitted checkout and initialization even though GitHub-hosted jobs run on fresh runners and OpenTofu requires `tofu init` before `plan` or `apply`. I added `runs-on`, repository checkout, OpenTofu setup, and `tofu init -input=false` to both jobs.
4. The workflow used `actions/download-artifact@v4`, while current GitHub documentation shows `download-artifact@v5`. I updated the example to `@v5` and made the download path explicit.
5. The “Appropriate use cases” list incorrectly included applying pre-reviewed plan files as a reason to use `-auto-approve`. Since saved plan files are already non-interactive, I changed that bullet to a real `-auto-approve` use case: non-interactive applies that generate a plan at runtime.
6. The `environment: production` comment implied manual approval always happens automatically. GitHub only blocks a job for approval when environment protection rules such as required reviewers are configured, so I corrected that comment.

## Review Notes
- Saved OpenTofu plan files can contain sensitive values in cleartext. The post’s artifact-based workflow is valid, but those artifacts should be treated as sensitive.
- The local environment did not have the `tofu` binary installed, so CLI verification was done against the current OpenTofu documentation rather than `tofu -help`.
