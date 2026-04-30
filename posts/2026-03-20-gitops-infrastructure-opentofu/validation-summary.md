# Validation Summary: How to Set Up GitOps for Infrastructure with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- GitHub Actions
- GitHub REST API via `actions/github-script`
- AWS IAM and GitHub OIDC federation
- GitHub Environments
- GitOps for infrastructure

## Sources Consulted
- OpenTofu `plan` command docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command docs: https://opentofu.org/docs/v1.11/cli/commands/apply/
- GitHub Docs on `GITHUB_TOKEN` authentication and permissions: https://docs.github.com/en/actions/tutorials/authenticate-with-github_token
- `actions/checkout` README, including recommended `contents: read` permission: https://github.com/actions/checkout
- GitHub REST API docs for issue and pull request comments: https://docs.github.com/en/rest/issues/comments
- `actions/github-script` README and examples: https://github.com/actions/github-script
- GitHub Docs on deployments and environments, including required reviewers: https://docs.github.com/en/actions/reference/deployments-and-environments
- GitHub Docs on OIDC with AWS in Actions: https://docs.github.com/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services

## Issues Found
- The PR plan comment example used GitHub Actions expressions directly inside `actions/github-script` JavaScript and built the Markdown fence with raw backticks, which makes the snippet invalid JavaScript. I changed the step to pass values through `env`, build the comment body safely in JavaScript, and `await` `github.rest.issues.createComment()`.
- The drift detection workflow explicitly set job permissions but omitted `contents: read`, which `actions/checkout` recommends for repository checkout when using `GITHUB_TOKEN`. I added `contents: read` to the drift job permissions.
- The best-practice guidance said `environment: production` enforces manual approval by itself. GitHub Environments only block the job for approval when protection rules such as required reviewers are configured. I corrected that sentence to include the required reviewers requirement.

## Review Notes
- `tofu plan -detailed-exitcode` is documented to return `0` for no changes, `1` for error, and `2` for changes, so the drift-detection explanation is correct.
- `tofu apply -auto-approve` is valid and current. OpenTofu also documents saved plan files as the primary two-step pattern for automation, but re-planning on merge is still a technically valid workflow design for this post.
- The action versions shown are usable, but they are not necessarily the latest available majors. Revisit pinned action versions periodically to keep the examples current.
