# Validation Summary: How to Avoid Skipping Plan Review Before Apply in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu CLI
- GitHub Actions
- GitHub Actions artifacts
- GitHub deployment environments
- `actions/github-script`
- AWS RDS/Aurora provider examples

## Sources Consulted
- OpenTofu `plan` command docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command docs: https://opentofu.org/docs/v1.11/cli/commands/apply/
- OpenTofu `show` command docs: https://opentofu.org/docs/v1.10/cli/commands/show/
- OpenTofu `init` docs: https://opentofu.org/docs/cli/init/
- OpenTofu core workflow docs: https://opentofu.org/docs/cli/run/
- `opentofu/setup-opentofu` README: https://github.com/opentofu/setup-opentofu
- GitHub deployment environments docs: https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments
- `actions/github-script` README: https://github.com/actions/github-script
- AWS provider `aws_db_instance` docs source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/db_instance.html.markdown
- AWS provider `aws_rds_cluster` docs source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/rds_cluster.html.markdown

## Issues Found
- The introduction said a plan tells you exactly what OpenTofu will do. I changed this to say a plan shows the changes OpenTofu plans to make, which is more accurate for speculative plans per the official `plan` docs.
- The destructive-change example used `aws_db_instance.parameter_group_name` as a replacement-triggering change. The AWS provider docs do not mark that argument as ForceNew, so I replaced the example with an `aws_rds_cluster.cluster_identifier` change, which is documented to force replacement.
- The CI/CD workflow snippet attempted to run `tofu plan` and `tofu apply` on GitHub-hosted runners without installing OpenTofu or initializing the working directory. I added `opentofu/setup-opentofu@v2` and `tofu init -input=false` to both jobs.
- The CI/CD workflow comment implied that `environment: production` automatically requires approval. GitHub documents that approval depends on configured environment protection rules, so I corrected the comment.
- The PR-comment snippet was not runnable as written: it referenced `steps.plan.outputs.stdout` without defining a `plan` step, relied on output capture without `opentofu/setup-opentofu`, embedded raw backticks in a JavaScript template literal, and injected workflow expressions directly into the script body. I replaced it with a working job example that uses `actions/github-script@v9`, passes the plan through `env`, and calls `github.rest.issues.createComment(...)` correctly.

## Review Notes
- Saved OpenTofu plan files can contain sensitive values in cleartext. Uploading them as workflow artifacts is valid, but those artifacts should be handled as sensitive.
- When applying a saved plan, OpenTofu executes the actions recorded in that plan file. If ephemeral variables were used during planning, they must also be provided again at apply time.
