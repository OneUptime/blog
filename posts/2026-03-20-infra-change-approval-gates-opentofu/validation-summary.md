# Validation Summary: How to Implement Infrastructure Change Approval Gates with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu CLI
- GitHub Actions
- GitHub Environments and deployment protection rules
- GitHub Terraform/OpenTofu provider (`github_repository_environment`)
- Slack GitHub Action
- Bash shell checks for deployment windows

## Sources Consulted
- GitHub Docs: Deployments and environments — https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments
- GitHub Docs: Deploying with GitHub Actions — https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments
- GitHub Docs: Reviewing deployments — https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/review-deployments
- GitHub REST API: Deployment environments — https://docs.github.com/en/rest/deployments/environments
- Terraform Registry: `github_repository_environment` — https://registry.terraform.io/providers/integrations/github/latest/docs/resources/repository_environment
- OpenTofu Docs: `tofu apply` — https://opentofu.org/docs/v1.11/cli/commands/apply/
- OpenTofu Docs: `tofu init` — https://opentofu.org/docs/cli/init/
- Slack Developer Docs: Slack GitHub Action incoming webhook usage — https://docs.slack.dev/tools/slack-github-action/sending-techniques/sending-data-slack-incoming-webhook/
- GitHub `actions/checkout` repository — https://github.com/actions/checkout

## Issues Found

1. **Reviewer approval semantics were overstated.** The post implied a multi-reviewer production environment acts like a two-person gate, but GitHub Environments proceed after any one required reviewer approves. Updated the intro, diagram, and best-practices guidance to match GitHub's actual behavior and pointed readers to custom deployment protection rules for stricter approval workflows.

2. **The staging environment contradicted the described workflow.** The workflow diagram and comments said staging auto-applies, but the `staging` environment example configured `reviewers`, which would require manual approval. Removed staging reviewers and kept only the wait timer.

3. **The dev environment example did not match its comment.** The original `deployment_branch_policy` for `dev` enabled custom branch policies, which is not "no protection rules." Removed the block so the example actually represents an unrestricted dev environment.

4. **The production environment comment referenced the wrong GitHub control.** "Prevent auto-dismissal of approvals" is a pull-request review concept, not a GitHub Environment protection rule. Replaced it with the valid `prevent_self_review = true` setting.

5. **The change-freeze example was not a reliable deployment gate as written.** A standalone `null_resource` with `local-exec` is not a dependable pre-apply workflow gate for production deployment timing. Replaced it with a GitHub Actions step that runs immediately before `tofu apply` in the production job.

6. **The Slack notification example could not notify about a pending approval in that form.** Steps inside a job that references a protected environment do not run until the environment approval gate passes, so the original snippet could not announce a pending approval. Replaced it with a separate `notify-production-approval` job that runs before the protected production job.

7. **The Slack action example used outdated invocation syntax.** Updated `slackapi/slack-github-action@v1` with `SLACK_WEBHOOK_URL` environment-variable wiring to the current incoming-webhook pattern using `slackapi/slack-github-action@v3`, `webhook`, and `webhook-type`.

8. **Branch-protection guidance was incomplete.** Clarified that `protected_branches = true` only restricts deployments when the target branch actually has branch protection rules configured.

9. **Repository-plan availability caveat was missing.** Added the GitHub plan limitation that required reviewers and wait timers for private or internal repositories require GitHub Enterprise.

## Review Notes
- The workflow examples use `tofu apply -auto-approve`, which is valid, but a stricter change-management process would usually review a saved plan and then apply that exact plan file in production.
- GitHub custom deployment protection rules are currently in public preview, so teams depending on them for strict multi-party approval should verify current availability for their plan and repository type.
