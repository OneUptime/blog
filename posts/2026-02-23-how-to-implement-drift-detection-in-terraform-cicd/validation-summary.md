# Validation Summary: How to Implement Drift Detection in Terraform CI/CD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Terraform CLI
- Terraform plan JSON output
- GitHub Actions
- actions/github-script
- AWS IAM OIDC role assumption for GitHub Actions
- AWS Config managed rules
- Python JSON parsing
- Slack incoming webhook notifications

## Sources Consulted
- Terraform `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform `show` command reference: https://developer.hashicorp.com/terraform/cli/commands/show
- Terraform JSON output format: https://developer.hashicorp.com/terraform/internals/json-format
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- HashiCorp `setup-terraform` action README: https://github.com/hashicorp/setup-terraform
- AWS `configure-aws-credentials` action README: https://github.com/aws-actions/configure-aws-credentials
- `actions/github-script` README: https://github.com/actions/github-script
- AWS Config `REQUIRED_TAGS` managed rule documentation: https://docs.aws.amazon.com/config/latest/developerguide/required-tags.html
- Terraform AWS provider `aws_config_config_rule` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/config_config_rule

## Issues Found
- The GitHub Actions `github-script` example used a JavaScript template literal for the issue body but included raw Markdown triple-backtick fences inside it. Raw backticks terminate template literals, so the snippet would fail to parse. I added a `const fence = '```';` variable and interpolated it into the body.
- The GitHub Actions drift check treated Terraform plan errors the same as "no drift" because `set +e` disabled shell error handling and only exit code `2` was handled specially. I added explicit handling for exit code `0` and made other exit codes fail the job.
- The multi-environment workflow also ignored `terraform plan` exit code `1` after `set +e`. I added explicit error handling so plan failures fail the job.
- The AWS Config section heading and inline comment described broad drift prevention/manual change detection, but the example uses the `REQUIRED_TAGS` managed rule, which checks tag compliance. I changed the heading/comment to describe tag drift detection.

## Review Notes
- Terraform was not installed in the local environment, so Terraform command behavior was verified against official HashiCorp CLI documentation rather than local `terraform -help` output.
- The examples pin Terraform CLI `1.7.0` and older major versions of some GitHub Actions. They are still technically valid examples, but future maintenance could update the pinned versions to match the latest tested toolchain.
- Saved Terraform plan files and `terraform show -json` output can include sensitive values in clear text; teams should treat generated plan artifacts and logs as sensitive.
