# Validation Summary: How to Automate Environment Cleanup with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- GitHub Actions
- GitHub CLI
- Bash
- AWS EventBridge
- AWS Lambda
- AWS IAM / GitHub OIDC
- Git

## Sources Consulted
- OpenTofu `timestamp` function docs: https://opentofu.org/docs/language/functions/timestamp/
- OpenTofu `timeadd` function docs: https://opentofu.org/docs/v1.6/language/functions/timeadd/
- OpenTofu resource behavior docs (`ignore_changes`): https://opentofu.org/docs/v1.11/language/resources/behavior/
- OpenTofu `formatdate` function docs: https://opentofu.org/docs/language/functions/formatdate/
- `opentofu/setup-opentofu` action documentation: https://github.com/opentofu/setup-opentofu
- `aws-actions/configure-aws-credentials` action documentation: https://github.com/aws-actions/configure-aws-credentials
- GitHub Actions workflow syntax and permissions: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
- `actions/checkout` documentation, including pushing commits with the built-in token: https://github.com/actions/checkout
- GitHub CLI `gh pr list` manual: https://cli.github.com/manual/gh_pr_list
- GitHub CLI environment variables: https://cli.github.com/manual/gh_help_environment
- Amazon EventBridge targets documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-targets.html
- Amazon EventBridge resource-based permissions for Lambda targets: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html

## Issues Found
- The TTL tag example used `timestamp()` directly in a resource attribute and truncated it to a date string. OpenTofu documents that `timestamp()` changes on every run, which would create perpetual drift and effectively move the expiry on later applies. I changed the example to store the full RFC3339 timestamp from `timeadd(timestamp(), "24h")` and added `lifecycle.ignore_changes` for `tags["ExpiresAt"]` so the TTL remains fixed after creation.
- The GitHub Actions workflow was missing required permissions for the documented behavior. Assuming an AWS role with GitHub OIDC requires `id-token: write`, and pushing cleanup commits requires `contents: write`. Listing PRs after defining explicit permissions also requires `pull-requests: read`. I added those permissions.
- The workflow committed changes from the cleanup scripts without configuring a Git author. GitHub’s `actions/checkout` examples configure `user.name` and `user.email` before committing. I added a `Configure Git author` step.
- The expired-environment cleanup script compared date strings rather than full timestamps, which did not match the article’s “TTL timestamp” guidance and reduced cleanup precision. I updated it to compare UTC timestamps safely, made the `.ttl` file path explicit, and enabled `nullglob` so the loop behaves correctly when no feature environment directories exist.
- The closed-PR cleanup script had multiple correctness issues: it lacked strict shell mode, it used `gh pr list` without overriding the default 30-item limit, it could fail when no PR environment directories existed, and it removed directories from Git without committing or pushing those removals. I added `set -euo pipefail`, `nullglob`, `--limit 1000`, cleanup counting, and a commit/push block.
- The EventBridge example was incomplete for a Lambda target. EventBridge needs permission to invoke the Lambda function. I added the missing `aws_lambda_permission` resource.

## Review Notes
- The cleanup scripts now assume GNU `date` parsing for RFC3339 timestamps, which is consistent with the `ubuntu-latest` runner used in the workflow.
- The workflow still uses major-version action tags (`@v4`, `@v1`) rather than fully pinned SHAs. That is valid, but pinning can improve supply-chain reproducibility in a future revision.
