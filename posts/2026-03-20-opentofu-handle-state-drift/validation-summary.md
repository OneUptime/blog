# Validation Summary: How to Handle State Drift in OpenTofu - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- OpenTofu (CLI: `tofu refresh`, `tofu plan`, `tofu apply`, `tofu import`)
- Terraform HCL configuration language
- AWS provider resources (`aws_security_group`, `aws_s3_bucket`, `aws_organizations_policy`)
- AWS Service Control Policies (SCPs) / AWS Organizations
- GitHub Actions (CI/CD workflow for drift detection)

## Sources Consulted
- OpenTofu CLI documentation (https://opentofu.org/docs/cli/commands/)
- OpenTofu `plan` command and `-detailed-exitcode` flag (https://opentofu.org/docs/cli/commands/plan/)
- OpenTofu `refresh` command (https://opentofu.org/docs/cli/commands/refresh/)
- OpenTofu `import` command (https://opentofu.org/docs/cli/commands/import/)
- Terraform AWS provider — `aws_organizations_policy` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/organizations_policy)
- Terraform AWS provider — `aws_security_group` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group)
- AWS Service Control Policies documentation (https://docs.aws.amazon.com/organizations/latest/userguide/orgs_manage_policies_scps.html)
- GitHub Actions: `actions/checkout@v4` and `aws-actions/configure-aws-credentials@v4`
- POSIX cron syntax (`'0 8 * * *'` = 08:00 UTC daily)

## Issues Found
No technical issues found.

All commands, exit codes, HCL syntax, AWS provider resource schemas, GitHub Actions configuration, and cron expression are correct and align with current official documentation.

## Review Notes
- `tofu refresh` is included as a separate command. While the command remains available in OpenTofu (inherited from Terraform), it has been deprecated upstream in favor of `tofu apply -refresh-only`. The post correctly notes that `tofu plan` refreshes by default, which is the preferred modern approach. The mention of `tofu refresh` is still valid but a future revision could note the deprecation.
- The plan output snippet under "Detecting Drift" omits the `protocol` attribute from the `ingress` block for brevity. Real plan output would also display `protocol`. This is an illustrative example rather than a technical error.
- The SCP example uses `aws_organizations_policy` with `name` and `content` only; `type` defaults to `SERVICE_CONTROL_POLICY`, so the example is correct as written. In production, an `aws_organizations_policy_attachment` resource would also be needed to attach the policy to a target (root, OU, or account), but that is outside the scope of this drift-focused post.
- The post references a Terraform IAM role (`role/TerraformRole`) in the SCP condition while the rest of the post uses OpenTofu — naming consistency aside, this is functionally fine since the policy is tied to a role ARN, not the tool.
